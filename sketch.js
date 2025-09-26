let gridSize = 8;
let cellSize = 80;

let rooms = []; 
let roomTypes = ["Control Room", "Kitchen", "Rejuvenation", "Last Room"];
let currentRoomIndex = 0;          // finalized rooms
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
let totalEnergy = 100; // Initialize total energy
let totalCost = 0; // Initialize total cost
let totalPower = 0; // Initialize total power
let totalUsed = 0; 
const inventories = {
  "Control Room": [
    { name: "Life Support", energy: 30, power: 10, cost: 50, info: { description: "Regulates air, water, and waste. Essential for crew survival.", specs: ["Oxygen Recycler", "Water Filtration", "Waste Management"], benefits: ["Sustainable habitat", "Reduces resupply needs"] } },
    { name: "Thermal Control", energy: 15, power: 5, cost: 25, info: { description: "Maintains optimal temperature. Protects crew and electronics from extreme heat.", specs: ["Active Cooling Systems", "Passive Heat Radiators"], benefits: ["Protects electronics", "Ensures crew comfort"] } },
    { name: "Power System", energy: 20, power: 25, cost: 35, info: { description: "Provides power for all station systems.", specs: ["Solar Arrays", "Battery Banks", "Fusion Core"], benefits: ["Reliable energy source", "Powers all life support and equipment"] } }
  ],
  "Kitchen": [
    { name: "Astro Yeast Cultivator", energy: 5, power: 3, cost: 10, info: { description: "Grows nutrient-rich yeast culture for protein.", specs: ["Automated Dispenser", "Nutrient Feeder"], benefits: ["High protein source", "Self-sustaining food supply"] } },
    { name: "CanGrow Hydroponics", energy: 10, power: 8, cost: 15, info: { description: "A compact plant growth chamber for fresh produce.", specs: ["LED Grow Lights", "Hydroponic System"], benefits: ["Fresh produce", "Psychological well-being"] } },
    { name: "Solein Food Reactor", energy: 20, power: 15, cost: 40, info: { description: "Converts carbon dioxide and water into edible protein.", specs: ["Atmospheric Conversion", "Protein Synthesizer"], benefits: ["Reduces need for food resupply", "Efficient resource use"] } }
  ],
  "Rejuvenation": [
    { name: "Treadmill", energy: 10, power: 5, cost: 20, info: { description: "Advanced zero-gravity treadmill for cardiovascular fitness.", specs: ["Speed: 0-20 km/h", "Weight capacity: 150kg"], benefits: ["Maintains bone density", "Cardiovascular health"] } },
    { name: "Exercise Bike", energy: 15, power: 7, cost: 25, info: { description: "Stationary bike designed for space station use.", specs: ["Resistance levels: 20", "Digital display"], benefits: ["Lower body strength", "Endurance training"] } },
    { name: "Zen Garden", energy: 5, power: 2, cost: 10, info: { description: "A small, low-maintenance garden for relaxation.", specs: ["Automated Watering", "Moss & Rock elements"], benefits: ["Stress reduction", "Therapeutic environment"] } }
  ],
  "Medbay": [ // This would be your "Last Room"
    { name: "Medical Scanner", energy: 20, power: 10, cost: 30, info: { description: "Advanced full-body diagnostic scanner for crew health monitoring.", specs: ["3D imaging capability", "Real-time vital signs"], benefits: ["Early disease detection", "Non-invasive scanning"] } },
    { name: "Defibrillator", energy: 5, power: 2, cost: 15, info: { description: "Portable automated external defibrillator for cardiac emergencies.", specs: ["Voice-guided operation", "Biphasic waveform"], benefits: ["Life-saving intervention", "Easy to operate"] } },
    { name: "Bio-Regenerator", energy: 25, power: 15, cost: 50, info: { description: "A device for accelerated healing of minor injuries.", specs: ["Cellular Stimulators", "Nutrient Delivery System"], benefits: ["Rapid recovery", "Reduces need for surgery"] } }
  ]
};

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

  if (mode === "room" || mode === "place") {
    textAlign(CENTER, TOP);
    textSize(24);
    fill(255);
    noStroke();
    
    let roomName;
    if (reformingRoom) {
      roomName = reformingRoom.name; 
    } else {
      roomName = roomTypes[currentRoomIndex] || "Last Room";
    }

    text(`Constructing: ${roomName}`, width / 2, 70);
  }

  if (mode === "room") {
    // Buttons for "room" mode
    confirmBtn.show();
    finalizeBtn.hide();
    newRoomBtn.hide();
    
    // Change button text based on whether a room is being reformed
    if (reformingRoom) {
      confirmBtn.html("Confirm New Layout");
    } else {
      confirmBtn.html("Confirm Layout → Place Objects");
    }

    drawStats();
    drawGrid();
    highlightSelectedTiles();
    drawRoomOutline(roomTiles);
    drawInventory();
  } else if (mode === "place") {
    // Buttons for "place" mode
    confirmBtn.hide();
    finalizeBtn.show();
    newRoomBtn.hide();
    reformBtn.hide();

    drawStats();
    drawAllRooms();
    drawRoomWithWalls(roomTiles, floorColor, wallColor);
    drawObjects(objects);
    drawInventory();
    if (draggedItem) drawDraggedItem(draggedItem);
  } else if (mode === "final") {
    // Buttons for "final" mode
    confirmBtn.hide();
    finalizeBtn.hide();
    newRoomBtn.show();
    if (selectedRoom) {
      reformBtn.show();
    } else {
      reformBtn.hide();
    }

    drawAllRooms();
    drawCorridors();
    drawLifeSupport();
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
  if (roomTiles.length === 0) return;

  // Calculate the resources for the current room
  let roomEnergy = 0;
  let roomCost = 0;
  let roomPower = 0;
  for (let obj of objects) {
    let item = null;
    const currentRoomName = reformingRoom ? reformingRoom.name : roomTypes[currentRoomIndex];
    const currentInventory = inventories[currentRoomName] || [];
    for (let invItem of currentInventory) {
      if (invItem.name === obj.name) {
        item = invItem;
        break;
      }
    }
    if (item) {
      roomEnergy += item.energy;
      roomCost += item.cost;
      roomPower += item.power;
    }
  }

  if (reformingRoom) {
    // Deduct old room's stats from global totals before updating
    totalEnergy += reformingRoom.energy;
    totalCost -= reformingRoom.cost;
    totalPower -= reformingRoom.power;
    totalUsed -= reformingRoom.used;

    // Update the room with new stats
    reformingRoom.tiles = [...roomTiles];
    reformingRoom.objects = [...objects];
    reformingRoom.decorations = [...decorations];
    reformingRoom.energy = roomEnergy;
    reformingRoom.cost = roomCost;
    reformingRoom.power = roomPower;
    reformingRoom.used = objects.length;
    reformingRoom = null;

    // Add new room's stats to global totals
    totalEnergy -= roomEnergy;
    totalCost += roomCost;
    totalPower += roomPower;
    totalUsed += objects.length;
  } else {
    if (isOverlapping(roomTiles)) {
      alert(" Cannot finalize: room overlaps with an existing one.");
      return;
    }

    let roomName = roomTypes[currentRoomIndex] || "Medbay";
    let newRoom = {
      name: roomName,
      tiles: [...roomTiles],
      objects: [...objects],
      decorations: [...decorations],
      energy: roomEnergy,
      cost: roomCost,
      power: roomPower,
      used: objects.length,
      floorColor: [random(80, 200), random(120, 200), random(200, 255), 180],
      wallColor: [random(20, 80), random(40, 100), random(150, 220), 220],
      offsetX: random(100, 300),
      offsetY: random(100, 300)
    };
    rooms.push(newRoom);

    // Update global totals with new room's stats
    totalEnergy -= roomEnergy;
    totalCost += roomCost;
    totalPower += roomPower;
    totalUsed += objects.length;

    if (roomName === "Control Room") {
      controlRoom = newRoom;
    }
    currentRoomIndex++;
  }
  
  mode = "final";
  roomTiles = [];
  objects = [];
  decorations = [];
  energy = 100;
  cost = 200;
  used = 0;
  reformBtn.hide();
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
    
    // Set temporary stats to the selected room's stats for editing
    energy = selectedRoom.energy;
    cost = selectedRoom.cost;
    used = selectedRoom.used;
    
    floorColor = [...selectedRoom.floorColor];
    wallColor = [...selectedRoom.wallColor];
    
    // Change mode to "room" to allow the user to modify the shape
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
  let invY = 150;

  fill(0, 180);
  rect(invX, invY, 220, 300, 10);
  fill(255);
  textSize(16);
  textAlign(LEFT, TOP);
  text("Inventory", invX + 10, invY + 5);

  // Get the current room's name
  let currentRoomName = reformingRoom ? reformingRoom.name : roomTypes[currentRoomIndex];
  const currentInventory = inventories[currentRoomName] || [];

  for (let i = 0; i < currentInventory.length; i++) {
    let item = currentInventory[i];
    let y = invY + 20 + i * 50;
    fill(50, 100, 200, 180);
    rect(invX + 10, y, 200, 35, 6);

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
text(`${item.name} (E:${item.energy} P:${item.power} C:${item.cost})`, invX + 20, y + 20);  }

  if (showDropdown && dropdownItem) {
    drawDropdown();
  }
}

function handleInventoryClick(mx, my) {
  let invX = width - 250;
  let invY = 150;

  let currentRoomName = reformingRoom ? reformingRoom.name : roomTypes[currentRoomIndex];
  const currentInventory = inventories[currentRoomName] || [];

  for (let i = 0; i < currentInventory.length; i++) {
    let item = currentInventory[i];
    let y = invY + 20 + i * 50;

    // ... (rest of the logic for info button and dragging)

    if (item.info && mx > invX + 182 && mx < invX + 198 && my > y + 2 && my < y + 18) {
      showDropdown = true;
      dropdownItem = item;
      dropdownX = mx + 10;
      dropdownY = my + 10;
      return true;
    }

    if (mode === "place" && mx > invX + 10 && mx < invX + 210 && my > y && my < y + 35) {
      draggedItem = item;
      return true;
    }
  }
  return false;
}

function drawStats() {
  let statsX = width - 250;
  let statsY = 20;
  let barWidth = 200;
  let barHeight = 15;

  fill(0, 180);
  rect(statsX, statsY, 220, 120, 10);
  
  // Total Energy Bar
  let energyBarX = statsX + 10;
  let energyBarY = statsY + 10;
  let energyPercent = map(totalEnergy, 0, 100, 0, barWidth);
  
  fill(50, 50, 50, 200); // Background bar
  rect(energyBarX, energyBarY, barWidth, barHeight, 5);
  fill(0, 255, 0); // Green bar
  rect(energyBarX, energyBarY, energyPercent, barHeight, 5);
  fill(255);
  textAlign(LEFT, TOP);
  textSize(14);
  text(`Energy: ${totalEnergy} / 100`, energyBarX + 5, energyBarY);

  // Total Cost Bar
  let costBarY = statsY + 40;
  let costPercent = map(totalCost, 0, 200, 0, barWidth);
  
  fill(50, 50, 50, 200);
  rect(energyBarX, costBarY, barWidth, barHeight, 5);
  fill(255, 200, 0); // Yellow bar
  rect(energyBarX, costBarY, costPercent, barHeight, 5);
  fill(255);
  text(`Cost: ${totalCost} / 200`, energyBarX + 5, costBarY);
  
  // Total Power Bar
  let powerBarY = statsY + 70;
  let maxPower = 50; // You can set a max power limit
  let powerPercent = map(totalPower, 0, maxPower, 0, barWidth);
  
  fill(50, 50, 50, 200);
  rect(energyBarX, powerBarY, barWidth, barHeight, 5);
  fill(0, 200, 255); // Blue bar
  rect(energyBarX, powerBarY, powerPercent, barHeight, 5);
  fill(255);
  text(`Power: ${totalPower} / ${maxPower}`, energyBarX + 5, powerBarY);
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

  if (showDropdown) {
    let dropW = 280;
    let finalX = min(dropdownX, width - dropW - 10);
    let finalY = min(dropdownY, height - 200 - 10);

    if (mouseX > finalX + dropW - 30 && mouseX < finalX + dropW - 10 &&
        mouseY > finalY + 5 && mouseY < finalY + 25) {
      showDropdown = false;
      dropdownItem = null;
      return;
    }
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

    // Check for info button clicks and dragging from inventory
    if (handleInventoryClick(mouseX, mouseY)) {
      return;
    }

    // Check if an existing object is being clicked for removal or dragging
    for (let i = objects.length - 1; i >= 0; i--) {
      let obj = objects[i];
      // Check if mouse is over the object
      if (mouseX > obj.x - 45 && mouseX < obj.x + 45 &&
          mouseY > obj.y - 20 && mouseY < obj.y + 25) {
        
        // Find the item details from the inventory to get its stats
        let item = null;
        const currentRoomName = reformingRoom ? reformingRoom.name : roomTypes[currentRoomIndex];
        const currentInventory = inventories[currentRoomName] || [];
        for (let invItem of currentInventory) {
          if (invItem.name === obj.name) {
            item = invItem;
            break;
          }
        }

        if (item) {
          // Deduct the stats from the temporary variables
          energy += item.energy;
          cost -= item.cost;
          used--;

          // Deduct from the global variables as well
          totalEnergy += item.energy;
          totalCost -= item.cost;
          totalPower -= item.power;
          totalUsed--;
        }

        // Remove the object from the array
        objects.splice(i, 1);
        return; // Exit after removing one object
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
  // Check if an item is being dropped in the current room
  if (draggedItem && (mode === "place" || reformingRoom)) {
    // Check if the drop location is within the bounds of the current room
    if (pointInRoom(mouseX, mouseY, roomTiles)) {
      
      // Add the new object
      objects.push({ name: draggedItem.name, x: mouseX, y: mouseY });
      
      // Update the temporary stats
      energy -= draggedItem.energy;
      cost += draggedItem.cost;
      used++;
      
      // Update the global stats
      totalEnergy -= draggedItem.energy;
      totalCost += draggedItem.cost;
      totalPower += draggedItem.power;
      totalUsed++;
      
    } else {
      console.log("Can't place object outside the room");
    }
  }
  
  // Reset dragging variables
  draggedItem = null;
  draggingObject = null;
  draggingRoom = null;
}