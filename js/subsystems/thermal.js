export function drawThermal(room) {
  let baseX = room.offsetX + 120;
  let baseY = room.offsetY + 40;

  fill("orange");
  ellipse(baseX, baseY, 20, 20);
  textSize(10);
  text("Thermal", baseX + 25, baseY);
}
