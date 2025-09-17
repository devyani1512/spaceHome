import { finalizeRoom } from "./roomManager.js";

export function handleInput() {
  if (keyIsPressed && key === "f") {
    finalizeRoom();
  }
}
