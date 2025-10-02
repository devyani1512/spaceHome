import uuid
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from app.services.chatbot.prompt_loader import load_prompt
from langgraph.graph import StateGraph, END
from typing import TypedDict, Optional, List
import sqlalchemy
import pandas as pd
from app.services.chatbot.itg_api import get_ai_summary
from scripts.itg_api import generate_text_groq
import os
import logging
from sqlalchemy import text
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any

# You need to install this library: pip install langdetect
from langdetect import detect

# Import performance monitoring
from app.utils.performance import timing_decorator, performance_context, db_perf_tracker, log_slow_query

# Configure logging (same as api.main)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Sentry only in production (Docker environment) and when not disabled
if (
    os.getenv("DYNACONF_DOCKER__HOST")
    and not os.getenv("DISABLE_SENTRY")
    and os.getenv("SENTRY_DSN")
    and os.getenv("SENTRY_DSN") != ""
):  # This env var is only set in Docker
    try:
        import sentry_sdk

        sentry_sdk.init(
            dsn=os.getenv("SENTRY_DSN"),
            send_default_pii=True,
            traces_sample_rate=0.1,
        )
        print("[ChatBot] Sentry initialized for production logging")
    except ImportError:
        print("[ChatBot] Sentry not available, skipping initialization")
else:
    print("[ChatBot] Sentry disabled or not configured")
sqlgen = ""

# --- DEFINE THE MISSING FUNCTION HERE ---
def is_hindi(text):
    """Detects if the given text is in Hindi."""
    try:
        # The detect function returns a language code, 'hi' for Hindi
        return detect(text) == 'hi'
    except:
        # If detection fails (e.g., text is too short), assume it's not Hindi
        return False
# ---------------------------------------


# Agent State
class AgentState(TypedDict):
    user_input: str
    history: list[tuple[str, str]]
    sql_query: Optional[str]
    db_result: Optional[str]
    final_answer: Optional[str]
    sql_prompt: Optional[str]
    formatter_prompt: Optional[str]
    is_hindi: Optional[bool] # New state variable

from datetime import datetime
def timelogger(info:str):
    now = datetime.now()
    logger.info(f"[TIME LOG] {now.strftime('%Y-%m-%d %H:%M:%S')}: {info}")

# New Translation Function using Groq
def translate_text_groq(text, target_lang='hi'):
    """Translates text using a Groq model optimized for language tasks."""
    prompt = f"""You are a highly accurate language translator. Translate the following English text to {target_lang}.
    Text to translate:
    {text}
    Translated text:
    """
    try:
        translated_text = generate_text_groq(prompt, model="llama-3.3-70b-versatile", temperature=0.2, max_tokens=1000)
        return translated_text.strip()
    except Exception as e:
        logger.error(f"Groq translation failed: {e}")
        return text # Return original text on failure

# New Language Detection and Translation Node
def check_and_translate(state: AgentState) -> AgentState:
    user_input = state['user_input']
    is_hindi_question = is_hindi(user_input)

    state['is_hindi'] = is_hindi_question
    
    if is_hindi_question:
        logger.info("[Language Check] Hindi detected. Translating to English.")
        # Call Groq to translate to English for the rest of the pipeline
        translated_input = translate_text_groq(f"Translate this to English: {user_input}", target_lang='en')
        state['user_input'] = translated_input # Update the input for the next agent
    else:
        logger.info("[Language Check] English or other language detected.")
    
    return state


# SQL Generator
class SQLGeneratorAgent:
    def __init__(self, table_schema: str, use_groq: bool = True):
        self.prompt = PromptTemplate(
            input_variables=["question", "schema", "history"],
            template=load_prompt("sql_generator.txt"),
        )
        self.schema = table_schema
        self.use_groq = use_groq

    @timing_decorator("sql_generation", include_system_stats=False)
    def generate_sql(self, state: AgentState) -> AgentState:

        timelogger("Generating SQL")
        global sqlgen
        logger.info("[SQLGenerator] Generating SQL query...")

        history_pairs = state.get("history", [])
        recent_history = history_pairs[-3:] if len(history_pairs) > 3 else history_pairs

        if recent_history:
            history_text = "\n\nConversation History (for context and pronoun resolution):\n" + \
                          "\n".join([f"User: {q}\nAssistant: {a}" for q, a in recent_history]) + \
                          "\n\nCurrent Question:"
        else:
            history_text = ""

        try:
            full_prompt = self.prompt.format(
                question=state["user_input"], schema=self.schema, history=history_text
            )

            state["sql_prompt"] = full_prompt

            if self.use_groq:
                logger.info("🔍 [SQL GENERATION] Calling Groq for SQL generation...")
                with performance_context("groq_sql_call", {"prompt_length": len(full_prompt)}):
                    ai_response = generate_text_groq(
                        full_prompt, 
                        model="moonshotai/kimi-k2-instruct-0905",
                        temperature=0.1,
                        max_tokens=500
                    )
            else:
                logger.info("🔍 [SQL GENERATION] Calling ITG API for SQL generation...")
                with performance_context("itg_sql_call", {"prompt_length": len(full_prompt)}):
                    ai_response = get_ai_summary(full_prompt, max_wait=60, reasoning_effort='low')

            if ai_response is None:
                logger.warning("[SQLGenerator] AI response is None")
                state["sql_query"] = None
                return state

            sql_query = str(ai_response).strip() if ai_response else ""

            if sql_query.startswith("```"):
                sql_query = sql_query.strip("`").lstrip()
                if sql_query.lower().startswith("sql"):
                    sql_query = sql_query[3:].lstrip()

            state["sql_query"] = sql_query.strip()

            logger.info(f"[SQLGenerator] Generated SQL query", extra={
                'sql_length': len(sql_query),
                'sql_preview': sql_query[:100] + "..." if len(sql_query) > 100 else sql_query
            })
            sqlgen = sql_query.strip()
            timelogger("SQL Generation Complete`")
            print(f"[SQLGenerator] SQL: {state['sql_query']}")
        except Exception as e:
            print(f"[SQLGenerator] Error: {e}")
            if (
                os.getenv("DYNACONF_DOCKER__HOST")
                and not os.getenv("DISABLE_SENTRY")
                and os.getenv("SENTRY_DSN") != ""
            ):
                try:
                    import sentry_sdk
                    with sentry_sdk.push_scope() as scope:
                        scope.set_extra("full_user_input", state.get("user_input", "No user input"))
                        scope.set_extra("full_error_message", str(e))
                        scope.set_extra("error_type", "SQL_GENERATION_ERROR")
                        scope.set_extra("exception_type", type(e).__name__)
                        scope.set_extra("full_prompt", (full_prompt if "full_prompt" in locals() else "Prompt not generated"))
                        scope.set_extra("history", state.get("history", []))
                        scope.set_level("error")
                        sentry_sdk.capture_exception(e)
                    print(f"[SQLGenerator] SQL generation error logged to Sentry")
                except Exception as sentry_error:
                    print(f"[SQLGenerator] Failed to log to Sentry: {sentry_error}")

            state["sql_query"] = None
        return state


# Database Executor
class DatabaseExecutorAgent:
    def __init__(self, connection_string: str):
        self.engine = sqlalchemy.create_engine(
            connection_string, pool_size=10, max_overflow=20, pool_pre_ping=True
        )
    def add_log(
        self,
        session_id: str,
        question: str,
        answer: str,
        sql_query: str,
        db_result: str,
    ):
        """
        Insert a log entry into the LOGS table.
        id and created_at are auto-generated by the DB.
        """
        with self.engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO LOGS (session_id, question, answer, sql_query, db_result)
                    VALUES (:session_id, :question, :answer, :sql_query, :db_result)
                """),
                {
                    "session_id": session_id,
                    "question": question,
                    "answer": answer,
                    "sql_query": sql_query,
                    "db_result": db_result,
                },
            )

    @timing_decorator("database_execution", include_system_stats=False)
    def execute_query(self, state: AgentState) -> AgentState:
        timelogger("Executing Query")
        logger.info("[DBExecutor] Executing SQL query...")
        if not state.get("sql_query"):
            state["db_result"] = None
            return state

        sql_query = state["sql_query"]
        start_time = time.time()

        try:
            from sqlalchemy import text
            sql_query = sql_query.replace("\\'", "''")
            sql_text = text(sql_query)
            logger.info(f"[DBExecutor] Executing SQL", extra={
                'query_preview': sql_query[:100] + "..." if len(sql_query) > 100 else sql_query
            })

            with performance_context("sql_execution", {"query_length": len(sql_query)}):
                df = pd.read_sql_query(sql_text, self.engine)

            execution_time_ms = (time.time() - start_time) * 1000

            state["db_result"] = df.to_dict(orient="records")

            logger.info(f"[DBExecutor] Query executed successfully", extra={
                'rows_fetched': len(df),
                'execution_time_ms': execution_time_ms,
                'columns_count': len(df.columns) if not df.empty else 0
            })

            db_perf_tracker.record_query("select_query", execution_time_ms)
            timelogger("SQL Execution Complete")
            log_slow_query(sql_query, execution_time_ms, threshold_ms=2000)
        except Exception as e:
            print(f"[DBExecutor] Error: {e}")
            if (
                os.getenv("DYNACONF_DOCKER__HOST")
                and not os.getenv("DISABLE_SENTRY")
                and os.getenv("SENTRY_DSN") != ""
            ):
                try:
                    import sentry_sdk
                    with sentry_sdk.push_scope() as scope:
                        scope.set_extra("full_sql_query", state.get("sql_query", "No SQL query"))
                        scope.set_extra("full_user_input", state.get("user_input", "No user input"))
                        scope.set_extra("full_error_message", str(e))
                        scope.set_extra("error_type", "SQL_EXECUTION_ERROR")
                        scope.set_extra("exception_type", type(e).__name__)
                        scope.set_extra("history", state.get("history", []))
                        scope.set_level("error")
                        sentry_sdk.capture_exception(e)
                    print(f"[DBExecutor] SQL error logged to Sentry: {str(e)[:100]}...")
                except Exception as sentry_error:
                    print(f"[DBExecutor] Failed to log to Sentry: {sentry_error}")

            state["db_result"] = None
        return state


# Answer Formatter
class AnswerFormatterAgent:
    def __init__(self, use_groq: bool = True):
        self.use_groq = use_groq

    @timing_decorator("answer_formatting", include_system_stats=False)
    def format_answer(self, state: AgentState) -> AgentState:

        timelogger("Starting answer formatting")
        logger.info("[Formatter] Formatting answer...")
        db_state = ""
        db_result = state.get("db_result")

        if db_result:
            result_count = len(db_result) if isinstance(db_result, list) else 1
            db_state = f"Here is what the db returned: {db_result}"
            logger.info(f"[Formatter] Processing DB results", extra={
                'result_count': result_count,
                'has_data': True
            })
        else:
            db_state = "Unfortunately there are no valid results, respond accordingly otherwise give the answer."
            logger.info("[Formatter] No DB results to format")
        history_pairs = state.get("history", [])
        recent_history = history_pairs[-3:] if len(history_pairs) > 3 else history_pairs

        history_context = ""
        if recent_history:
            history_context = "\n\nConversation Context (for reference):\n" + \
                             "\n".join([f"User: {q}\nAssistant: {a}" for q, a in recent_history]) + \
                             "\n\nCurrent Exchange:"

        template_text = load_prompt("answer_formatter.txt")
        prompt = template_text.format(
            history_context=history_context,
            user_input=state['user_input'],
            db_result=db_result
        )

        state["formatter_prompt"] = prompt

        if self.use_groq:
            logger.info("📝 [ANSWER FORMATTING] Calling Groq for answer formatting...")
            with performance_context("groq_formatting_call", {"prompt_length": len(prompt)}):
                ai_response = generate_text_groq(
                    prompt,
                    model="llama-3.3-70b-versatile",
                    temperature=0.3,
                    max_tokens=1000
                )
        else:
            logger.info("📝 [ANSWER FORMATTING] Calling ITG API for answer formatting...")
            with performance_context("itg_formatting_call", {"prompt_length": len(prompt)}):
                ai_response = get_ai_summary(prompt, max_wait=40)

        if ai_response is None:
            logger.warning("[Formatter] AI response is None")
            state["final_answer"] = "I'm sorry, I couldn't process your question right now. Please try again."
            return state

        # Final answer is generated in English. Now check if it needs to be translated.
        answer = str(ai_response).strip()
        
        if state.get('is_hindi'):
            logger.info("[Formatter] Original question was in Hindi. Translating final answer.")
            translated_answer = translate_text_groq(f"Translate this to Hindi: {answer}", target_lang='hi')
            state['final_answer'] = translated_answer
        else:
            state['final_answer'] = answer

        logger.info(f"[Formatter] Answer formatted", extra={
            'answer_length': len(state['final_answer']),
            'answer_preview': state['final_answer'][:100] + "..." if len(state['final_answer']) > 100 else state['final_answer']
        })

        timelogger("Answer Formatting Complete")
        print(f"[Formatter] Final Answer: {state['final_answer']}")
        return state


# LangGraph Build
def build_graph(sql_agent, db_agent, formatter_agent):
    graph = StateGraph(AgentState)
    graph.add_node("check_and_translate", check_and_translate)
    graph.add_node("generate_sql", sql_agent.generate_sql)
    graph.add_node("execute_query", db_agent.execute_query)
    graph.add_node("format_answer", formatter_agent.format_answer)

    graph.set_entry_point("check_and_translate")
    graph.add_edge("check_and_translate", "generate_sql")
    graph.add_edge("generate_sql", "execute_query")
    graph.add_edge("execute_query", "format_answer")
    graph.add_edge("format_answer", END)
    return graph.compile()


# ChatBot
class ChatBot:
    def __init__(self, use_groq: bool = True):
        table_schema = load_prompt("database_schema.txt")

        import os
        db_host = os.getenv("DYNACONF_DOCKER__HOST", "localhost")
        db_port = os.getenv("DYNACONF_DOCKER__PORT", "5432")
        db_user = os.getenv("DYNACONF_DOCKER__USER", "user")
        db_password = os.getenv("DYNACONF_DOCKER__PASSWORD", "password")
        db_name = os.getenv("DYNACONF_DOCKER__DB", "election")
        connection_string = f"postgresql+psycopg2://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

        sql_agent = SQLGeneratorAgent(table_schema, use_groq=use_groq)
        db_agent = DatabaseExecutorAgent(connection_string)
        formatter_agent = AnswerFormatterAgent(use_groq=use_groq)
        self.db_agent = db_agent
        self.graph = build_graph(sql_agent, db_agent, formatter_agent)
        self.history: list[tuple[str, str]] = []
        self.sessions = {}
        self.use_groq = use_groq

    def _log_to_sentry(
        self,
        user_question: str,
        sql_query: str,
        answer: str,
        db_result_count: int = None,
        had_sql_error: bool = False,
        sql_prompt: str = None,
        formatter_prompt: str = None,
    ):
        """Log question and response to Sentry (production only) - FULL DATA NO TRUNCATION"""
        if (
            os.getenv("DYNACONF_DOCKER__HOST")
            and not os.getenv("DISABLE_SENTRY")
            and os.getenv("SENTRY_DSN") != ""
        ):
            try:
                import sentry_sdk
                log_data = {
                    "full_question": user_question,
                    "full_sql_query": (
                        sql_query if sql_query else "No SQL generated"
                    ),
                    "full_response": answer,
                    "result_count": db_result_count,
                    "had_sql_error": had_sql_error,
                    "conversation_history": self.history,
                    "sql_generation_prompt": sql_prompt if sql_prompt else "No SQL prompt captured",
                    "answer_formatting_prompt": formatter_prompt if formatter_prompt else "No formatter prompt captured",
                    "sql_error_indicators": {
                        "no_result_with_sql": sql_query and not db_result_count,
                        "generic_response": answer == "Please rephrase your question.",
                    },
                }

                with sentry_sdk.push_scope() as scope:
                    for key, value in log_data.items():
                        scope.set_extra(key, value)
                    level = "warning" if had_sql_error else "info"
                    scope.set_level(level)
                    message_type = "SQL Error" if had_sql_error else "Q&A"
                    sentry_sdk.capture_message(
                        f"ElectionBot {message_type}: {user_question}",
                        level=level,
                    )
                print(f"[ChatBot] Logged to Sentry: {user_question[:30]}...")
            except Exception as e:
                print(f"[ChatBot] Sentry logging failed: {e}")


    def ask(self, user_question: str, session_id: str = "", conversation_history: Optional[List[tuple[str, str]]] = None):
        if not user_question.strip():
            return ("Please enter a question.", "", {"error": "No DB result"}, session_id or "none")

        if session_id=="":
            session_id = str(uuid.uuid4())

        if conversation_history is not None:
            history = conversation_history[-3:] if len(conversation_history) > 3 else conversation_history
            self.sessions[session_id] = history
        else:
            if session_id not in self.sessions:
                self.sessions[session_id] = []
            history = self.sessions[session_id]

        state: AgentState = {
            "user_input": user_question,
            "history": history,
        }

        result = self.graph.invoke(state)
        answer = result.get("final_answer", "Please rephrase your question.")
        sql_query = result.get("sql_query", "")

        db_result = result.get("db_result")
        db_result_count = (
            len(db_result) if db_result and isinstance(db_result, list) else None
        )
        had_sql_error = sql_query and not db_result

        self._log_to_sentry(
            user_question,
            sql_query,
            answer,
            db_result_count,
            had_sql_error,
            result.get("sql_prompt"),
            result.get("formatter_prompt")
        )
        self.db_agent.add_log(session_id,user_question,answer,sql_query,str(db_result))

        history.append((user_question, answer))
        if len(history) > 3:
            history = history[-3:]
        self.sessions[session_id] = history

        return (
            answer,
            sql_query,
            db_result if db_result is not None else {"error": "No DB result"},
            session_id
        )


# Dual ChatBot for Parallel Comparison
class DualChatBot:
    def __init__(self):
        """Initialize both Groq and ITG API chatbots for parallel comparison"""
        self.groq_bot = ChatBot(use_groq=True)
        self.itg_bot = ChatBot(use_groq=False)
        
    def ask_parallel(self, user_question: str, session_id: str = "", conversation_history: Optional[List[tuple[str, str]]] = None):
        """
        Ask both chatbots in parallel and return results from both approaches
        """
        if not user_question.strip():
            return {
                'groq': ("Please enter a question.", "", {"error": "No DB result"}, 0, session_id or "none"),
                'itg': ("Please enter a question.", "", {"error": "No DB result"}, 0, session_id or "none"),
                'question': user_question
            }
        
        def run_groq():
            start_time = time.time()
            try:
                result = self.groq_bot.ask(user_question, session_id, conversation_history)
                response_time = (time.time() - start_time) * 1000
                return {
                    'answer': result[0],
                    'sql_query': result[1], 
                    'db_result': result[2],
                    'response_time': response_time,
                    'session_id': result[3],
                    'error': None
                }
            except Exception as e:
                response_time = (time.time() - start_time) * 1000
                logger.error(f"Groq approach failed: {e}")
                return {
                    'answer': f"Error with Groq approach: {str(e)}",
                    'sql_query': None,
                    'db_result': {"error": str(e)},
                    'response_time': response_time,
                    'session_id': session_id or "none",
                    'error': str(e)
                }
        
        def run_itg():
            start_time = time.time()
            try:
                result = self.itg_bot.ask(user_question, session_id, conversation_history)
                response_time = (time.time() - start_time) * 1000
                return {
                    'answer': result[0],
                    'sql_query': result[1],
                    'db_result': result[2], 
                    'response_time': response_time,
                    'session_id': result[3],
                    'error': None
                }
            except Exception as e:
                response_time = (time.time() - start_time) * 1000
                logger.error(f"ITG approach failed: {e}")
                return {
                    'answer': f"Error with ITG approach: {str(e)}",
                    'sql_query': None,
                    'db_result': {"error": str(e)},
                    'response_time': response_time,
                    'session_id': session_id or "none",
                    'error': str(e)
                }
        
        logger.info(f"🔄 [DUAL MODE] Running parallel comparison for: {user_question}")
        
        with ThreadPoolExecutor(max_workers=2) as executor:
            groq_future = executor.submit(run_groq)
            itg_future = executor.submit(run_itg)
            
            groq_result = groq_future.result()
            itg_result = itg_future.result()
        
        logger.info(f"✅ [DUAL MODE] Both approaches completed - Groq: {groq_result['response_time']:.0f}ms, ITG: {itg_result['response_time']:.0f}ms")
        
        return {
            'groq': groq_result,
            'itg': itg_result,
            'question': user_question
        }


if __name__ == "__main__":
    def run_app():
        # This is a placeholder for your main application logic
        # You can add code here to run your chatbot in a loop
        bot = ChatBot()
        print("Welcome to the Election ChatBot! Ask me a question about the election data.")
        while True:
            user_question = input("You: ")
            if user_question.lower() in ['exit', 'quit']:
                print("Goodbye!")
                break
            
            answer, sql_query, db_result, session_id = bot.ask(user_question)
            
            print(f"Bot: {answer}")
            print("-" * 50)
            print(f"SQL Query: {sql_query}")
            print(f"DB Result: {db_result}")
            print("-" * 50)

    run_app()