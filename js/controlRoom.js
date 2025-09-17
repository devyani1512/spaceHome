import { controlRoom } from "./state.js";
import { getRoomCenter } from "./utils.js";
import { drawLifeSupport } from "./subsystems/lifeSupport.js";
import { drawThermal } from "./subsystems/thermal.js";
import { drawPower } from "./subsystems/power.js";

export function drawControlRoom() {
  if (!controlRoom) return;

  let c = getRoomCenter(controlRoom.tiles);
  let cx = c.x + controlRoom.offsetX;
  let cy = c.y + controlRoom.offsetY;

  // base Life Support core
  fill("red");
  noStroke();
  ellipse(cx, cy, 40, 40);

  fill(255);
  textSize(12);
  textAlign(CENTER, CENTER);
  text("Control Core", cx, cy - 30);

  // subsystems
  drawLifeSupport(controlRoom);
  drawThermal(controlRoom);
  drawPower(controlRoom);
}
