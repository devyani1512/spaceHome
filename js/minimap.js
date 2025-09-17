import { rooms, miniMapX, miniMapY, miniMapW, miniMapH, miniScale } from "./state.js";
import { getRoomPoints } from "./utils.js";

export function drawMiniMap() {
  fill(20, 180);
  rect(miniMapX, miniMapY, miniMapW, miniMapH);

  push();
  translate(miniMapX + miniMapW/2, miniMapY + miniMapH/2);
  scale(miniScale);

  for (let room of rooms) {
    let points = getRoomPoints(room.tiles);
    beginShape();
    fill(100, 200, 250, 100);
    stroke(255);
    for (let p of points) {
      vertex(p.x + room.offsetX, p.y + room.offsetY);
    }
    endShape(CLOSE);
  }
  pop();

  fill(255);
  textSize(12);
  textAlign(CENTER, TOP);
  text("MiniMap", miniMapX + miniMapW/2, miniMapY + miniMapH + 5);
}
