"""
Text Cleaner for Bihar Election Bot

Implements a 3-stage pipeline for entity resolution in election queries:
1. spaCy NLP - Named entity detection
2. PostgreSQL fuzzy matching - Database candidate search
3. GPT-5 via Pragya API - Intelligent entity resolution
"""

import os
import time
import logging
from sqlalchemy import create_engine, text
from datetime import datetime
import spacy
from typing import List, Tuple, Dict

from app.utils.performance import timing_decorator, performance_context, db_perf_tracker

logger = logging.getLogger(__name__)


class OrganizedTextCleaner:
    """
    Text cleaner implementing a 3-stage entity resolution pipeline:
    1. spaCy NLP processing for entity detection
    2. PostgreSQL fuzzy matching for candidate search
    3. GPT-5 via Pragya API for intelligent resolution
    """

    def __init__(self):
        """Initialize NLP model and database connection."""
        logger.info("Initializing OrganizedTextCleaner...")

        self._initialize_nlp()
        self._initialize_database()

        logger.info("OrganizedTextCleaner initialization complete")

    def _initialize_nlp(self):
        """Initialize spaCy NLP model."""
        logger.info("Loading spaCy en_core_web_lg model...")
        self.nlp = spacy.load("en_core_web_lg")
        logger.info("spaCy model loaded successfully")

    def _initialize_database(self):
        """Initialize PostgreSQL connection using SQLAlchemy."""
        logger.info("Setting up database connection...")
        
        db_host = os.getenv("DYNACONF_DOCKER__HOST", "localhost")
        db_port = os.getenv("DYNACONF_DOCKER__PORT", "5432")
        db_user = os.getenv("DYNACONF_DOCKER__USER", "user")
        db_password = os.getenv("DYNACONF_DOCKER__PASSWORD", "password")
        db_name = os.getenv("DYNACONF_DOCKER__DB", "election")

        connection_string = f"postgresql+psycopg2://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
        
        self.engine = create_engine(
            connection_string, 
            pool_size=10, 
            max_overflow=20, 
            pool_pre_ping=True
        )
        logger.info("Database connection established")

    @timing_decorator("text_cleaning", include_system_stats=False)
    def clean_text(self, text: str) -> str:
        """
        Process text through 3-stage entity resolution pipeline.
        
        Returns the text with entities resolved to canonical forms.
        """
        if not text or not text.strip():
            return text

        logger.info("Starting 3-stage pipeline", extra={
            'original_length': len(text),
            'text_preview': text[:50] + "..." if len(text) > 50 else text
        })

        # Stage 1: spaCy entity detection
        logger.debug("Starting Stage 1 - spaCy NLP Processing")
        entities = self._stage_1_spacy_detection(text)
        logger.debug("Completed Stage 1")

        # Stage 2: Database fuzzy matching
        logger.debug("Starting Stage 2 - PostgreSQL Fuzzy Matching")
        entity_candidates = self._stage_2_fuzzy_matching(entities)
        logger.debug("Completed Stage 2")

        # Stage 3: GPT-5 resolution
        logger.debug("Starting Stage 3 - GPT-5 Resolution")
        final_result = self._stage_3_gpt_resolution(text, entities, entity_candidates)
        logger.debug("Completed Stage 3")

        logger.info("Pipeline completed", extra={
            'original_length': len(text),
            'entities_found': len(entities),
            'candidates_found': len(entity_candidates)
        })

        return final_result


    def _stage_1_spacy_detection(self, text: str) -> List[Tuple[str, str, int, int]]:
        """
        Stage 1: Use spaCy to detect named entities.
        
        Returns: [(entity_text, entity_label, start_char, end_char), ...]
        """
        with performance_context("spacy_processing", {"text_length": len(text)}):
            doc = self.nlp(text)

        entities = []
        target_labels = ["PERSON", "ORG", "GPE", "NORP"]

        for ent in doc.ents:
            if ent.label_ in target_labels:
                entities.append((ent.text, ent.label_, ent.start_char, ent.end_char))
                logger.debug(f"spaCy detected: {ent.text} ({ent.label_})")

        logger.debug(f"spaCy detection complete. {len(entities)} entities detected")
        return entities

    def _stage_2_fuzzy_matching(self, entities: List[Tuple[str, str, int, int]]) -> List[Dict]:
        """
        Stage 2: Find database candidates using PostgreSQL fuzzy matching.
        
        Returns candidates above threshold for GPT-5 to resolve.
        """
        entity_candidates = []

        for entity_text, entity_label, start_char, end_char in entities:
            logger.debug(f"Finding candidates for: {entity_text}")

            candidates = self._query_database_for_entity(entity_text, limit=5)

            if candidates:
                good_candidates = [c for c in candidates if len(c) > 6 and c[6] > 150]

                if good_candidates:
                    entity_candidates.append({
                        'original_text': entity_text,
                        'spacy_label': entity_label,
                        'start_char': start_char,
                        'end_char': end_char,
                        'candidates': [
                            {
                                'canonical_name': c[1],
                                'entity_type': c[2],
                                'trigram_score': c[3],
                                'edit_distance': c[4],
                                'final_score': c[6] if len(c) > 6 else 0
                            } for c in good_candidates
                        ]
                    })
                    logger.debug(f"Found {len(good_candidates)} candidates for: {entity_text}")

        logger.debug(f"PostgreSQL matching complete. {len(entity_candidates)} entities have candidates")
        return entity_candidates

    def _stage_3_gpt_resolution(self, original_text: str, entities: List, entity_candidates: List[Dict]) -> str:
        """
        Stage 3: Use GPT-5 via Pragya API for intelligent entity resolution.
        
        Sends context to GPT-5 for final entity resolution and question formatting.
        """
        context = {
            'original_question': original_text,
            'spacy_entities': [
                {'text': ent[0], 'label': ent[1]} for ent in entities
            ],
            'database_candidates': entity_candidates
        }

        prompt = self._build_gpt_prompt(context)

        try:
            from app.services.chatbot.itg_api import get_ai_summary

            with performance_context("gpt_entity_resolution", {"prompt_length": len(prompt)}):
                gpt_response = get_ai_summary(prompt, max_wait=30, reasoning_effort='medium')

            if gpt_response:
                logger.debug("GPT-5 resolved entities successfully")
                return str(gpt_response).strip()
            else:
                logger.warning("GPT-5 returned no response, returning original text")
                return original_text

        except Exception as e:
            logger.error(f"GPT-5 entity resolution failed: {e}")
            return original_text

    def _build_gpt_prompt(self, context: Dict) -> str:
        """Build prompt for GPT-5 entity resolution."""

        prompt = f"""You are an expert at resolving entities in Bihar election questions.

ORIGINAL QUESTION: "{context['original_question']}"

SPACY DETECTED ENTITIES:"""

        if context['spacy_entities']:
            for ent in context['spacy_entities']:
                prompt += f"\n- '{ent['text']}' labeled as {ent['label']}"
        else:
            prompt += "\n(None - spaCy failed to detect entities, possibly due to typos)"

        prompt += "\n\nDATABASE CANDIDATES:"

        if context['database_candidates']:
            for entity_data in context['database_candidates']:
                prompt += f"\n\nFor '{entity_data['original_text']}':"
                for i, candidate in enumerate(entity_data['candidates'][:3], 1):  # Top 3 candidates
                    prompt += f"\n  {i}. {candidate['canonical_name']} ({candidate['entity_type']}) - Score: {candidate['final_score']:.0f}"
        else:
            prompt += "\n(None - no database matches found)"

        dynamic_context = self._get_dynamic_context()

        prompt += f"""

CONTEXT: This is a Bihar Assembly Elections database with:
{dynamic_context}

IMPORTANT: For party entities, ALWAYS use abbreviations (BJP, INC, JD(U), RJD) not full names.

TASK:
1. Identify potential entities in the question only from the following types: (candidate_name, party, constituency_name, state_name, district_name, sub_region)
2. Resolve any typos or variations (e.g., "nitsh kumar" → "Nitish Kumar")
3. For parties: Use abbreviated forms only (e.g., "congress" → "INC(party)", not "Indian National Congress(party)")
4. Format with entity types: "Nitish Kumar(candidate_name)", "INC(party)"
5. If you can't confidently resolve an entity, keep it as-is
6. Return ONLY the formatted question

FORMATTED QUESTION:"""

        return prompt

    def _get_dynamic_context(self) -> str:
        """Generate dynamic context from database content."""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT type,
                           STRING_AGG(noun, ', ') as examples
                    FROM (
                        SELECT type, noun,
                               ROW_NUMBER() OVER (PARTITION BY type ORDER BY RANDOM()) as rn
                        FROM nouns
                    ) ranked
                    WHERE rn <= 3
                    GROUP BY type
                    ORDER BY type;
                """))

                context_lines = []
                for row in result:
                    entity_type, examples = row
                    context_lines.append(f"- {entity_type}: {examples}")

                return "\n".join(context_lines)

        except Exception as e:
            logger.warning(f"Failed to get dynamic context: {e}")
            return "- candidate_name: Politicians\n- party: Political parties\n- constituency_name: Electoral areas\n- district_name: Districts"

    @timing_decorator("noun_query", include_system_stats=False)
    def _query_database_for_entity(self, noun: str, limit: int = 5) -> List[Tuple]:
        """
        Query database using PostgreSQL fuzzy matching extensions.
        
        Uses trigram similarity, edit distance, and full-text search with
        complex scoring algorithm for accurate entity matching.
        """
        start_time = time.time()
        escaped_noun = noun.replace("'", "''")

        sql = f"""
        WITH search AS (
            SELECT
                id,
                noun,
                type,
                similarity(noun, '{escaped_noun}') AS trigram_score,
                levenshtein(lower(noun), lower('{escaped_noun}')) AS edit_distance,
                char_length('{escaped_noun}') AS query_length,
                ts_rank_cd(to_tsvector('english', noun), plainto_tsquery('english', '{escaped_noun}')) AS fts_rank,
                (to_tsvector('english', noun) @@ plainto_tsquery('english', '{escaped_noun}')) AS has_fts_match
            FROM nouns
            WHERE
                (
                    similarity(noun, '{escaped_noun}') > 0.6
                    OR levenshtein(lower(noun), lower('{escaped_noun}')) <= GREATEST(2, char_length('{escaped_noun}') / 4)
                    OR to_tsvector('english', noun) @@ plainto_tsquery('english', '{escaped_noun}')
                )
                AND abs(char_length(noun) - char_length('{escaped_noun}')) <= GREATEST(4, char_length('{escaped_noun}') * 0.4)
        )
        SELECT
            id,
            noun,
            type,
            trigram_score,
            edit_distance,
            fts_rank,
            CASE
                WHEN edit_distance = 0 THEN 1000
                WHEN edit_distance <= 2 AND trigram_score > 0.8 THEN 900 + (trigram_score * 50)
                WHEN has_fts_match AND trigram_score > 0.6 THEN 800 + (fts_rank * 100)
                WHEN trigram_score > 0.75 THEN 700 + (trigram_score * 100)
                ELSE trigram_score * 400
            END AS final_score
        FROM search
        WHERE
            edit_distance = 0
            OR (edit_distance <= GREATEST(2, query_length / 4) AND trigram_score > 0.6)
            OR (has_fts_match AND trigram_score > 0.5)
        ORDER BY final_score DESC, edit_distance ASC
        LIMIT {limit};
        """

        with performance_context("noun_search_query", {"noun": noun, "limit": limit}):
            with self.engine.connect() as conn:
                result = conn.execute(text(sql))
                results = result.fetchall()

        execution_time_ms = (time.time() - start_time) * 1000
        db_perf_tracker.record_query("noun_search", execution_time_ms)

        logger.debug("Database query completed", extra={
            'noun': noun,
            'results_count': len(results),
            'execution_time_ms': execution_time_ms
        })

        return results

    def __del__(self):
        """Clean up database connection."""
        if hasattr(self, 'engine'):
            self.engine.dispose()


if __name__ == "__main__":
    cleaner = OrganizedTextCleaner()

    test_cases = [
        "Who is Rabri Devi?",
        "Tejiswi yadav is a candidate for which party?",
        "How many seats did nitsh kumar win?",
        "What was the performance of bjp in 2020?",
        "What was the performance of jdu in 2020?",
        "What was the performance of janata dal in 2020?",
        "What was the performance of congress in 2020?",
        "Which constituencies did RJD win in patna?",
        "How many votes did congress get in bihar?",
        "Who is the incumbent mla from belhar assembly segment"
    ]

    print("Testing OrganizedTextCleaner:")
    print("=" * 60)

    for test in test_cases:
        result = cleaner.clean_text(test)
        print(f"Input:  {test}")
        print(f"Output: {result}")
        print("-" * 40)
