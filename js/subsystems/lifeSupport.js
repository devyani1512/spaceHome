export function drawLifeSupport(room) {
  let baseX = room.offsetX + 40;
  let baseY = room.offsetY + 40;

  fill("cyan");
  ellipse(baseX, baseY, 20, 20);
  textSize(10);
  text("Star Node", baseX + 25, baseY);

  fill("green");
  rect(baseX, baseY + 40, 20, 20);
  text("ISRU", baseX + 25, baseY + 55);
}
