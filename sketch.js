let gridSize = 8;
let cellSize = 80;

let rooms = [];           // finalized rooms
let roomTiles = [];       // current room floor tiles
let objects = [];
let decorations = [];

let mode = "room";        // room | place | final
let selectedRoom = null;  // for reform
let reformingRoom = null;

let energy = 100, cost = 200, used = 0;
let draggedItem = null;
let draggingObject = null;
let draggingRoom = null;

//for dropdown inventory
let showDropdown = false;
let dropdownItem = null;
let dropdownX = 0;
let dropdownY = 0;

const inventory = [
  {
    name: "Treadmill",
    energy: 10,
    cost: 20,
    info: {
      description: "Advanced zero-gravity treadmill for cardiovascular fitness",
      specs: ["Speed: 0-20 km/h", "Weight capacity: 150kg", "Compact design"],
      benefits: ["Maintains bone density", "Cardiovascular health"]
    }
  },
  {
    name: "Exercise Bike",
    energy: 15,
    cost: 25,
    info: {
      description: "Stationary bike designed for space station use",
      specs: ["Resistance levels: 20", "Digital display", "Heart rate monitor"],
      benefits: ["Lower body strength", "Endurance training"]
    }
  },
  {
    name: "Medical Scanner",
    energy: 20,
    cost: 30,
    info: {
      description: "Advanced full-body diagnostic scanner for crew health monitoring",
      specs: ["3D imaging capability", "Real-time vital signs", "AI-assisted diagnosis"],
      benefits: ["Early disease detection", "Non-invasive scanning"]
    }
  },
  {
    name: "Defibrillator",
    energy: 5,
    cost: 15,
    info: {
      description: "Portable automated external defibrillator for cardiac emergencies",
      specs: ["Voice-guided operation", "Biphasic waveform", "Pediatric capable"],
      benefits: ["Life-saving intervention", "Easy to operate"]
    }
  }
];

let bgImg, paintingImg;
let confirmBtn, finalizeBtn, newRoomBtn, reformBtn;
let floorColor = [120, 200, 255, 180];
let wallColor = [30, 50, 120, 220];

// minimap settings
let miniMapX, miniMapY, miniMapW = 250, miniMapH = 250;
let miniScale = 0.2;

function preload() {
  bgImg = loadImage("nebula.png");
  paintingImg = loadImage("nebula.png");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);

  // UI reserved space = bottom 80px
  let uiY = height - 70;

  confirmBtn = createButton("Confirm Layout → Place Objects");
  styleButton(confirmBtn);
  confirmBtn.position(width / 2 - 300, uiY);
  confirmBtn.mousePressed(() => {
    if (roomTiles.length > 0) mode = "place";
  });

  finalizeBtn = createButton("Finalize Room");
  styleButton(finalizeBtn);
  finalizeBtn.position(width / 2 - 80, uiY);
  finalizeBtn.mousePressed(() => finalizeRoom());

  newRoomBtn = createButton("Start New Room");
  styleButton(newRoomBtn);
  newRoomBtn.position(width / 2 + 180, uiY);
  newRoomBtn.mousePressed(() => startNewRoom());

  reformBtn = createButton("Reform Selected Room");
  styleButton(reformBtn);
  reformBtn.position(width / 2 + 400, uiY);
  reformBtn.hide();
  reformBtn.mousePressed(() => reformRoom());
}


function draw() {
  background(0);
  image(bgImg, 0, 0, width, height);
  fill(0, 150);
  rect(0, 0, width, height);

  drawTitle();

  if (mode === "room") {
    drawStats();
    drawGrid();
    highlightSelectedTiles();
    drawRoomOutline(roomTiles);
    drawInventory();
  } else if (mode === "place") {
    drawStats();
    drawAllRooms();
    drawRoomWithWalls(roomTiles, floorColor, wallColor);
    drawObjects(objects);
    drawInventory();
    if (draggedItem) drawDraggedItem(draggedItem);
  } else if (mode === "final") {
    drawAllRooms();
    drawCorridors();
    drawLifeSupport();   // ✅ show life support in control room
    drawStats();
    drawMiniMap();
  }
}


function isOverlapping(newTiles) {
  for (let room of rooms) {
    for (let t of newTiles) {
      if (room.tiles.find(rt => rt.r === t.r && rt.c === t.c)) {
        return false;
      }
    }
  }
  return false;
}

// === Control Room variables ===
let controlRoom = null;
let lifeSupportMachine = null;

// modified finalizeRoom to mark first room as Control Room
function finalizeRoom() {
  if (roomTiles.length > 0) {
    if (reformingRoom) {
      reformingRoom.tiles = [...roomTiles];
      reformingRoom.objects = [...objects];
      reformingRoom.decorations = [...decorations];
      reformingRoom.floorColor = [...floorColor];
      reformingRoom.wallColor = [...wallColor];
      reformingRoom = null;
    } else {
      if ((isOverlapping(roomTiles))) {
        alert("⚠️ Cannot finalize: room overlaps with an existing one.");
        return;
      }
      let room = {
        tiles: [...roomTiles],
        objects: [...objects],
        decorations: [...decorations],
        floorColor: [...floorColor],
        wallColor: [...wallColor],
        offsetX: random(100, 300),//to place new rooms away from center in order to remove overlapping
        offsetY: random(100, 300)
      };

      rooms.push(room);

      // ✅ first room becomes Control Room
      if (!controlRoom) {
        controlRoom = room;
      }
    }

    mode = "final";
    roomTiles = [];
    objects = [];
    decorations = [];
    reformBtn.hide();
  }
}


function startNewRoom() {
  if (mode === "final") {
    roomTiles = [];
    objects = [];
    decorations = [];
    floorColor = [random(80, 200), random(120, 200), random(200, 255), 180];
    wallColor = [random(20, 80), random(40, 100), random(150, 220), 220];
    energy = 100;
    cost = 200;
    used = 0;
    mode = "room";
  }
}

function reformRoom() {
  if (selectedRoom) {
    reformingRoom = selectedRoom;
    roomTiles = [...selectedRoom.tiles];
    objects = [...selectedRoom.objects];
    decorations = [...selectedRoom.decorations];
    floorColor = [...selectedRoom.floorColor];
    wallColor = [...selectedRoom.wallColor];
    mode = "room";
    selectedRoom = null;
    reformBtn.hide();
  }
}

// === Draw multiple rooms ===
function drawAllRooms() {
  for (let room of rooms) {
    push();
    translate(room.offsetX, room.offsetY);
    drawRoomWithWalls(room.tiles, room.floorColor, room.wallColor);
    drawObjects(room.objects);
    pop();
  }
}

// === Corridors (lines between room centers) ===
function drawCorridors() {
  if (!controlRoom) return;

  let c1 = getRoomCenter(controlRoom.tiles);
  let cx1 = c1.x + controlRoom.offsetX;
  let cy1 = c1.y + controlRoom.offsetY;

  stroke(200);
  strokeWeight(2);
  drawingContext.setLineDash([5, 5]); // dotted line

  for (let room of rooms) {
    if (room === controlRoom) continue; // skip control room itself

    let c2 = getRoomCenter(room.tiles);
    let cx2 = c2.x + room.offsetX;
    let cy2 = c2.y + room.offsetY;

    line(cx1, cy1, cx2, cy2);
  }

  drawingContext.setLineDash([]); // reset dash
}


function drawLifeSupport() {
  if (controlRoom) {
    // always compute from control room’s current center
    let c = getRoomCenter(controlRoom.tiles);
    let cx = c.x + controlRoom.offsetX;
    let cy = c.y + controlRoom.offsetY;

    fill("red");
    noStroke();
    ellipse(cx, cy, 40, 40);

    fill(255);
    textSize(12);
    textAlign(CENTER, CENTER);
    text("Life Support", cx, cy - 30);
  }
}


// === MiniMap ===
function drawMiniMap() {
  fill(20, 180);
  stroke(200);
  rect(miniMapX, miniMapY, miniMapW, miniMapH);

  fill(255);
  noStroke();
  textSize(14);
  textAlign(CENTER, TOP);
  text("Mini-map", miniMapX + miniMapW / 2, miniMapY + 5);

  push();
  translate(miniMapX + 10, miniMapY + 30);
  scale(miniScale);

  for (let room of rooms) {
    push();
    translate(room.offsetX, room.offsetY);
    let points = getRoomPoints(room.tiles);
    drawRoomWithWalls(room.tiles, room.floorColor, room.wallColor);

    if (points.length > 2) {
      // === side lengths in grid blocks ===
      for (let i = 0; i < points.length; i++) {
        let p1 = points[i];
        let p2 = points[(i + 1) % points.length];

        let dx = (p2.x - p1.x) / cellSize;
        let dy = (p2.y - p1.y) / cellSize;
        let length = sqrt(dx * dx + dy * dy).toFixed(1);

        // midpoint of the side
        let mx = (p1.x + p2.x) / 2;
        let my = (p1.y + p2.y) / 2;

        fill(255, 200, 0);
        noStroke();
        textSize(40); // scales down with minimap
        textAlign(CENTER, CENTER);
        text(length, mx, my);
      }

      // === corner angles ===
      for (let i = 0; i < points.length; i++) {
        let prev = points[(i - 1 + points.length) % points.length];
        let curr = points[i];
        let next = points[(i + 1) % points.length];

        let v1 = createVector(prev.x - curr.x, prev.y - curr.y).normalize();
        let v2 = createVector(next.x - curr.x, next.y - curr.y).normalize();

        let angle = degrees(acos(constrain(v1.dot(v2), -1, 1))).toFixed(0);

        fill(0, 255, 0);
        noStroke();
        textSize(30);
        textAlign(CENTER, CENTER);
        text(angle + "°", curr.x, curr.y - 15);
      }
    }

    pop();
  }
  pop();
}


// === Room geometry helpers ===
function getRoomPoints(tiles) {
  let points = tiles.map(t => createVector(t.c * cellSize + cellSize / 2, t.r * cellSize + cellSize / 2));
  if (points.length > 2) {
    let center = createVector(0, 0);
    for (let p of points) center.add(p);
    center.div(points.length);
    points.sort((a, b) => atan2(a.y - center.y, a.x - center.x) - atan2(b.y - center.y, b.x - center.x));//This ensures the vertices are ordered circularly (so the polygon doesn’t “zig-zag” when drawing).
  }
  return points;
}

function getRoomCenter(tiles) {
  let points = getRoomPoints(tiles);
  let center = createVector(0, 0);
  for (let p of points) center.add(p);
  center.div(points.length || 1);
  return center;
}
//room walls function
function drawRoomWithWalls(tiles, floorCol, wallCol) {
  let points = getRoomPoints(tiles);
  if (points.length > 2) {
    fill(floorCol);
    stroke(0, 200, 255);
    beginShape();
    for (let p of points) vertex(p.x, p.y);
    endShape(CLOSE);

    let wallHeight = 50;
    for (let i = 0; i < points.length; i++) {
      let p1 = points[i];
      let p2 = points[(i + 1) % points.length];
      fill(wallCol);
      stroke(0, 100, 200);
      beginShape();
      vertex(p1.x, p1.y);
      vertex(p2.x, p2.y);
      vertex(p2.x, p2.y - wallHeight);
      vertex(p1.x, p1.y - wallHeight);
      endShape(CLOSE);
    }
  }
}
//room outline function
function drawRoomOutline(tiles) {
  let points = getRoomPoints(tiles);
  if (points.length > 2) {
    noFill();
    stroke(0, 200, 255);
    strokeWeight(2);
    beginShape();
    for (let p of points) vertex(p.x, p.y);
    endShape(CLOSE);
  }
}

// === UI & Inventory ===
function drawGrid() {
  stroke(100, 120);

  let gridW = gridSize * cellSize;
  let gridH = gridSize * cellSize;

  // Reserve top (title) and bottom (buttons) areas
  let topMargin = 100;
  let bottomMargin = 100;

  let offsetX = (width - gridW) / 2;
  let offsetY = (height - gridH - bottomMargin - topMargin) / 2 + topMargin;

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      let x = c * cellSize + offsetX;
      let y = r * cellSize + offsetY;
      noFill();
      rect(x, y, cellSize, cellSize);
    }
  }
}


function highlightSelectedTiles() {
  fill(0, 150, 255, 120);
  noStroke();
  for (let t of roomTiles) {
    let x = t.c * cellSize + width / 2 - (gridSize * cellSize) / 2;
    let y = t.r * cellSize + height / 2 - (gridSize * cellSize) / 2;
    rect(x, y, cellSize, cellSize, 5);
  }
}

function drawObjects(objs) {
  for (let obj of objs) {
    fill(255, 150, 0, 220);
    stroke(0, 150, 255);
    rect(obj.x - 40, obj.y - 20, 90, 45, 8);
    fill(0);
    noStroke();
    textSize(12);
    text(obj.name, obj.x, obj.y);
  }
}

function drawDropdown() {
  let dropW = 280;
  let dropH = 200;

  // Adjust position to stay on screen
  let finalX = min(dropdownX, width - dropW - 10);
  let finalY = min(dropdownY, height - dropH - 10);

  // Background
  fill(20, 20, 40, 240);
  stroke(0, 150, 255);
  strokeWeight(2);
  rect(finalX, finalY, dropW, dropH, 10);

  // Title
  fill(0, 200, 255);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(16);
  text(dropdownItem.name + " - Details", finalX + 15, finalY + 15);

  // Description
  fill(255);
  textSize(12);
  text(dropdownItem.info.description, finalX + 15, finalY + 40, dropW - 30, 30);

  // Specifications
  fill(100, 255, 100);
  textSize(14);
  text("Specifications:", finalX + 15, finalY + 75);

  fill(255);
  textSize(11);
  let specY = finalY + 95;
  for (let spec of dropdownItem.info.specs) {
    text("• " + spec, finalX + 20, specY);
    specY += 15;
  }

  // Benefits
  fill(255, 200, 100);
  textSize(14);
  text("Benefits:", finalX + 15, specY + 10);

  fill(255);
  textSize(11);
  let benefitY = specY + 30;
  for (let benefit of dropdownItem.info.benefits) {
    text("• " + benefit, finalX + 20, benefitY);
    benefitY += 15;
  }

  // Close button
  fill(255, 100, 100);
  noStroke();
  rect(finalX + dropW - 30, finalY + 5, 20, 20, 3);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(12);
  text("×", finalX + dropW - 20, finalY + 15);
}

function drawInventory() {
  let invX = width - 250;
  let invY = 150; // start lower (below title)

  fill(0, 180);
  rect(invX, invY, 220, 300, 10);
  fill(255);
  textSize(16);
  textAlign(LEFT, TOP);
  text("Inventory", invX + 10, invY + 5);

  for (let i = 0; i < inventory.length; i++) {
    let item = inventory[i];
    let y = invY + 20 + i * 50;
    fill(50, 100, 200, 180);
    rect(invX + 10, y, 200, 35, 6);

    // Add info button for Treadmill and Exercise Bike
    if (item.info) {
      fill(0, 150, 255);
      ellipse(invX + 190, y + 10, 16, 16);
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(10);
      text("i", invX + 190, y + 10);
    }

    fill(255);
    textAlign(LEFT, TOP);
    textSize(12);
    text(`${item.name} (E:${item.energy} C:${item.cost})`, invX + 20, y + 20);
  }

  // Draw dropdown if active
  if (showDropdown && dropdownItem) {
    drawDropdown();
  }
}

function handleInventoryClick(mx, my) {
  let invX = width - 250;
  let invY = 150;

  for (let i = 0; i < inventory.length; i++) {
    let item = inventory[i];
    let y = invY + 20 + i * 50;

    // === Info button (works in all modes) ===
    if (item.info && mx > invX + 182 && mx < invX + 198 &&
      my > y + 2 && my < y + 18) {
      showDropdown = true;
      dropdownItem = item;
      dropdownX = mx + 10;
      dropdownY = my + 10;
      return true; // handled
    }

    // === Dragging (only in "place" mode) ===
    if (mode === "place" &&
      mx > invX + 10 && mx < invX + 210 &&
      my > y && my < y + 35) {
      draggedItem = item;
      return true; // handled
    }
  }
  return false; // nothing matched
}

function drawStats() {
  let statsX = width - 250;
  let statsY = 20;

  fill(0, 180);
  rect(statsX, statsY, 220, 120, 10);
  fill(255);
  textAlign(LEFT, TOP);
  textSize(14);
  text(`⚡ Energy: ${energy}`, statsX + 10, statsY + 10);
  text(`💰 Cost: ${cost}`, statsX + 10, statsY + 30);
  text(`🛠 Used: ${used}`, statsX + 10, statsY + 50);
}


function drawTitle() {
  textAlign(LEFT, TOP);
  textSize(28);
  fill(255);
  stroke(0);
  strokeWeight(3);
  text("SPACE HOUSE BUILDER", 40, 30);
}

function drawDraggedItem(item) {
  fill(255, 180, 0, 220);
  stroke(0, 200, 255);
  rect(mouseX - 45, mouseY - 20, 90, 40, 8);
  fill(0);
  noStroke();
  textSize(12);
  text(item.name, mouseX, mouseY);
}

function styleButton(btn) {
  btn.style("background", "linear-gradient(90deg,#0040ff,#00d4ff)");
  btn.style("color", "#fff");
  btn.style("border", "none");
  btn.style("padding", "8px 16px");
  btn.style("border-radius", "8px");
  btn.style("font-family", "Orbitron");
  btn.style("cursor", "pointer");
  btn.style("width", "200px");
}

// === Mouse input ===
function mousePressed() {

  if (handleInventoryClick(mouseX, mouseY)) return;

  // Check if clicking on dropdown close button
  if (showDropdown && dropdownItem) {
    let dropW = 280;
    let finalX = min(dropdownX, width - dropW - 10);
    let finalY = min(dropdownY, height - 200 - 10);

    if (mouseX > finalX + dropW - 30 && mouseX < finalX + dropW - 10 &&
      mouseY > finalY + 5 && mouseY < finalY + 25) {
      showDropdown = false;
      dropdownItem = null;
      return;
    }

    // Click outside dropdown to close
    if (mouseX < finalX || mouseX > finalX + dropW ||
      mouseY < finalY || mouseY > finalY + 200) {
      showDropdown = false;
      dropdownItem = null;
    }
    return;
  }

  if (mode === "room") {
    let c = floor((mouseX - (width / 2 - (gridSize * cellSize) / 2)) / cellSize);
    let r = floor((mouseY - (height / 2 - (gridSize * cellSize) / 2)) / cellSize);
    if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
      let idx = roomTiles.findIndex(t => t.r === r && t.c === c);
      if (idx >= 0) roomTiles.splice(idx, 1);
      else roomTiles.push({ r, c });
    }
  }
  else if (mode === "place") {
    let invX = width - 250;
    let invY = 150;

    // Check for info button clicks
    for (let i = 0; i < inventory.length; i++) {
      let item = inventory[i];
      let y = invY + 20 + i * 50;

      // Check info button (only for items with info)
      if (item.info && mouseX > invX + 182 && mouseX < invX + 198 &&
        mouseY > y + 2 && mouseY < y + 18) {
        showDropdown = true;
        dropdownItem = item;
        dropdownX = mouseX + 10;
        dropdownY = mouseY + 10;
        return;
      }

      // Check inventory item for dragging
      if (mouseX > invX + 10 && mouseX < invX + 210 && mouseY > y && mouseY < y + 35) {
        draggedItem = item;
        return;
      }
    }

    for (let obj of objects) {
      if (mouseX > obj.x - 45 && mouseX < obj.x + 45 &&
        mouseY > obj.y - 20 && mouseY < obj.y + 25) {
        draggingObject = obj;
        return;
      }
    }
  }
  else if (mode === "final") {
    for (let room of rooms) {
      let c = getRoomCenter(room.tiles).add(room.offsetX, room.offsetY);
      if (dist(mouseX, mouseY, c.x, c.y) < 50) {
        selectedRoom = room;
        reformBtn.show();
        draggingRoom = room;
      }
    }
  }
}

function mouseDragged() {
  if (draggingRoom) {
    draggingRoom.offsetX = mouseX;
    draggingRoom.offsetY = mouseY;
  } else if (draggingObject) {
    draggingObject.x = mouseX;
    draggingObject.y = mouseY;
  }
}

function pointInRoom(px, py, tiles) {
  let points = getRoomPoints(tiles);
  if (points.length < 3) return false;

  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    let xi = points[i].x, yi = points[i].y;
    let xj = points[j].x, yj = points[j].y;
    let intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function mouseReleased() {
  if (draggedItem && mode === "place") {
    if (pointInRoom(mouseX, mouseY, roomTiles)) {
      objects.push({ name: draggedItem.name, x: mouseX, y: mouseY });
      energy -= draggedItem.energy;
      cost += draggedItem.cost;
      used++;
    } else {
      console.log(" Can't place object outside the room");
    }
  }
  draggedItem = null;
  draggingObject = null;
  draggingRoom = null;
}
