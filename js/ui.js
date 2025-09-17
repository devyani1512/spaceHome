import { energy, cost, used } from "./state.js";

export function drawUI() {
  fill(255);
  textAlign(LEFT, TOP);
  textSize(16);
  text(`Energy: ${used}/${energy}`, 20, 20);
  text(`Cost: ${cost}`, 20, 40);
}
