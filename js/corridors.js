import { rooms, controlRoom } from "./state.js";
import { getRoomCenter } from "./utils.js";

export function drawCorridors() {
  if (!controlRoom) return;

  let c = getRoomCenter(controlRoom.tiles);
  let controlX = c.x + controlRoom.offsetX;
  let controlY = c.y + controlRoom.offsetY;

  stroke(200, 200, 255, 150);
  strokeWeight(2);
  drawingContext.setLineDash([5, 5]);

  for (let room of rooms) {
    if (room === controlRoom) continue;

    let rc = getRoomCenter(room.tiles);
    let x = rc.x + room.offsetX;
    let y = rc.y + room.offsetY;
    line(controlX, controlY, x, y);
  }

  drawingContext.setLineDash([]);
}
