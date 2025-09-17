import { rooms, mode, miniMapX, miniMapY, miniMapW, miniMapH } from "./state.js";
import { drawControlRoom } from "./controlRoom.js";
import { drawCorridors } from "./corridors.js";
import { drawMiniMap } from "./minimap.js";
import { drawUI } from "./ui.js";
import { handleInput } from "./input.js";

let bgImg;

window.preload = function preload() {
bgImg = loadImage("js/nebula.png");
};

window.setup = function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);

  // reposition minimap (safe now, since miniMapX & miniMapY are `let`)
  miniMapX = width - miniMapW - 20;
  miniMapY = 20;
};

window.draw = function draw() {
  background(0);
  image(bgImg, 0, 0, width, height);
  fill(0, 150);
  rect(0, 0, width, height);

  textSize(24);
  fill(255);
  text("Space Base Builder", width / 2, 30);

  if (mode === "final") {
    drawControlRoom();
    drawCorridors();
  }

  drawMiniMap();
  drawUI();
  handleInput();
};
