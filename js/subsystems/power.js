export function drawPower(room) {
  let baseX = room.offsetX + 200;
  let baseY = room.offsetY + 40;

  fill("yellow");
  rect(baseX, baseY, 20, 20);
  textSize(10);
  text("Power", baseX + 25, baseY + 5);
}
