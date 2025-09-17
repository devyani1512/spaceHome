import { cellSize } from "./state.js";

export function getRoomPoints(tiles) {
  let points = tiles.map(t => createVector(t.c * cellSize + cellSize/2, t.r * cellSize + cellSize/2));
  if (points.length > 2) {
    let center = createVector(0, 0);
    for (let p of points) center.add(p);
    center.div(points.length);
    points.sort((a, b) => atan2(a.y - center.y, a.x - center.x) - atan2(b.y - center.y, b.x - center.x));
  }
  return points;
}

export function getRoomCenter(tiles) {
  let points = getRoomPoints(tiles);
  let center = createVector(0,0);
  for (let p of points) center.add(p);
  center.div(points.length || 1);
  return center;
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
