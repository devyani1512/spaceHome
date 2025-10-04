// --- Global variables ---
let gridSize = 8;
let cellSize = 60;
let rooms = [];
let roomTypes = ["Control Room", "Crew Chambers", "Medbay", "Mess Module", "Waste Management", "Stowage"];
let currentRoomIndex = 0;
let roomTiles = [];
let objects = [];
let decorations = [];
let mode = "room";
let selectedRoom = null;
let reformingRoom = null;
let energy = 100, cost = 200, used = 0;
let draggedItem = null;
let draggingObject = null;
let draggingRoom = null;

// --- STATE MANAGEMENT FOR INVENTORY ---
let expandedItem = null;
let expandedSubItem = null;
let animationStates = {}; // Object to hold animation data for each item

let totalEnergy = 100;
let totalCost = 0;
let totalPower = 0;
let totalUsed = 0;

const inventories = {
  "Control Room": [
    {
      name: "Life Support",
      isCategory: true,
      subItems: [
        { name: "Oxygen Recycler", energy: 10, power: 4, cost: 20, imgSrc: 'placeholder1.jpg', info: { description: "Recycles CO2 into breathable oxygen.", specs: ["Efficiency: 95%"], benefits: ["Constant air supply"] } },
        { name: "Water Filtration", energy: 10, power: 3, cost: 15, imgSrc: 'placeholder2.jpg', info: { description: "Purifies wastewater for reuse.", specs: ["Filtration Rate: 50L/hr"], benefits: ["Conserves water"] } },
        { name: "Waste Management", energy: 10, power: 3, cost: 15, imgSrc: 'placeholder3.jpg', info: { description: "Processes solid and organic waste.", specs: ["Compaction Ratio: 10:1"], benefits: ["Reduces waste volume"] } }
      ]
    },
    { name: "Thermal Support", energy: 15, power: 5, cost: 25, imgSrc: 'placeholder2.jpg', info: { description: "Maintains optimal temperature.", specs: ["Active Cooling Systems"], benefits: ["Protects electronics"] } },
    { name: "Power Sources", energy: 20, power: 25, cost: 35, imgSrc: 'placeholder3.jpg', info: { description: "Provides power for all station systems.", specs: ["Solar Arrays"], benefits: ["Reliable energy"] } },
    { name: "Power Storage", energy: 20, power: 25, cost: 35, imgSrc: 'placeholder4.jpg', info: { description: "Stores reserve power.", specs: ["Battery Banks"], benefits: ["Backup power"] } },
    { name: "Comm System", energy: 20, power: 25, cost: 35, imgSrc: 'placeholder5.jpg', info: { description: "Allows communication.", specs: ["High-gain Antenna"], benefits: ["Connects to Earth"] } }
  ],
  "Crew Chambers": [
    { name: "Eclipse private berths", energy: 2, power: 1, cost: 5, imgSrc: "images/eclipse_berth.png", info: { description: "Compact sleeping quarters for two crew members.", specs: ["Integrated lighting", "Personal storage lockers"], benefits: ["Space-saving design", "Rest and privacy"] } },
    { name: "ISS crew chambers", energy: 5, power: 3, cost: 10, imgSrc: "placeholder1.jpg", info: { description: "A workstation for personal tasks and communication.", specs: ["High-speed data link", "Holoscreen display"], benefits: ["Crew connectivity", "Entertainment and work"] } },
    { name: "Small crew chambers", energy: 8, power: 5, cost: 15, imgSrc: "placeholder1.jpg", info: { description: "An area with games and media for crew morale.", specs: ["Virtual reality console", "Audio system"], benefits: ["Boosts morale", "Reduces stress"] } }
  ],
  "Medbay": [
    { name: "ARED", energy: 20, power: 10, cost: 30, imgSrc: "placeholder1.jpg", info: { description: "Advanced full-body diagnostic scanner for crew health monitoring.", specs: ["3D imaging capability", "Real-time vital signs"], benefits: ["Early disease detection", "Non-invasive scanning"] } },
    { name: "CAGE", energy: 5, power: 2, cost: 15, imgSrc: "placeholder1.jpg", info: { description: "Portable automated external defibrillator for cardiac emergencies.", specs: ["Voice-guided operation", "Biphasic waveform"], benefits: ["Life-saving intervention", "Easy to operate"] } },
    { name: "Crew chambers", energy: 25, power: 15, cost: 50, imgSrc: "placeholder1.jpg", info: { description: "A device for accelerated healing of minor injuries.", specs: ["Cellular Stimulators", "Nutrient Delivery System"], benefits: ["Rapid recovery", "Reduces need for surgery"] } },
    { name: "Common Habitat MCF", energy: 25, power: 15, cost: 50, imgSrc: "placeholder1.jpg", info: { description: "A device for accelerated healing of minor injuries.", specs: ["Cellular Stimulators", "Nutrient Delivery System"], benefits: ["Rapid recovery", "Reduces need for surgery"] } }
  ],
  "Food Galley": [
    { name: "Food Stowage", energy: 15, power: 10, cost: 30, imgSrc: "placeholder1.jpg", info: { description: "Creates pre-packaged meals from nutrient paste.", specs: ["Automated dispenser", "Recipe database"], benefits: ["Efficient food preparation", "Wide variety of meals"] } },
    { name: "Food prep", energy: 5, power: 2, cost: 10, imgSrc: "placeholder1.jpg", info: { description: "Provides hot and cold potable water.", specs: ["Integrated filtration", "Temperature control"], benefits: ["Hydration for crew", "Reduces waste"] } }
  ],
  "Waste Management": [
    { name: "AstroYeast", energy: 10, power: 5, cost: 20, imgSrc: "placeholder1.jpg", info: { description: "Crushes and recycles solid waste into compact bricks.", specs: ["Hydraulic press", "Recycling processor"], benefits: ["Reduces volume of waste", "Recycles materials"] } },
    { name: "Solein Food reactor", energy: 15, power: 8, cost: 30, imgSrc: "placeholder1.jpg", info: { description: "Purifies greywater and converts it to potable water.", specs: ["Multi-stage filtration", "UV sterilization"], benefits: ["Conserves water", "Closed-loop system"] } },
    { name: "CANgrow", energy: 20, power: 10, cost: 40, imgSrc: "placeholder1.jpg", info: { description: "Filters and re-oxygenates air within the station.", specs: ["CO2 scrubbers", "Particulate filters"], benefits: ["Maintains air quality", "Essential for life support"] } }
  ],
  "Stowage": [
    { name: "Eclipse EVA SYS", energy: 0, power: 0, cost: 10, imgSrc: "placeholder1.jpg", info: { description: "Standardized lockers for storing equipment and supplies.", specs: ["Numbered slots", "Durable composites"], benefits: ["Organized storage", "Easy access to supplies"] } },
    { name: "Lunar Vehicles", energy: 0, power: 0, cost: 5, imgSrc: "placeholder1.jpg", info: { description: "A wall-mounted rack for organizing tools.", specs: ["Magnetic clamps", "Labeling system"], benefits: ["Keeps tools secure", "Prevents floating hazards"] } },
    { name: "TRI-ATHLETE", energy: 5, power: 3, cost: 15, imgSrc: "placeholder1.jpg", info: { description: "A secure storage unit for critical spare parts.", specs: ["Climate controlled", "Inventory management system"], benefits: ["Ensures quick repairs", "Reduces mission risk"] } }
  ]
};

let bgImg;
let confirmBtn, finalizeBtn, newRoomBtn, reformBtn;
let floorColor = [120, 200, 255, 180];
let wallColor = [30, 50, 120, 220];
let miniMapX, miniMapY, miniMapW = 250, miniMapH = 250;
let miniScale = 0.2;

function preload() {
  bgImg = loadImage("someone.png");
  for (const roomType in inventories) {
    for (const item of inventories[roomType]) {
      if (item.isCategory) {
        for (const subItem of item.subItems) {
          if (subItem.imgSrc) subItem.img = loadImage(subItem.imgSrc);
        }
      } else if (item.imgSrc) {
        item.img = loadImage(item.imgSrc);
      }
    }
  }
}

function findItemDetails(itemName) {
  for (const roomType in inventories) {
    for (const item of inventories[roomType]) {
      if (item.isCategory) {
        const foundSubItem = item.subItems.find(sub => sub.name === itemName);
        if (foundSubItem) return foundSubItem;
      } else if (item.name === itemName) {
        return item;
      }
    }
  }
  return null;
}

// NEW FUNCTION to initialize animation states
function initializeAnimationStates() {
  animationStates = {};
  for (const roomType in inventories) {
    for (const item of inventories[roomType]) {
      if (item.isCategory) {
        for (const subItem of item.subItems) {
          animationStates[subItem.name] = { currentHeight: 0, targetHeight: 0 };
        }
      } else if (item.info) {
        animationStates[item.name] = { currentHeight: 0, targetHeight: 0 };
      }
    }
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);
  initializeAnimationStates(); // Initialize the animation system

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

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(0);
  image(bgImg, 0, 0, windowWidth, windowHeight);
  fill(0, 150);
  rect(0, 0, windowWidth, windowHeight);
  drawTitle();

  if (mode === "room" || mode === "place") {
    textAlign(CENTER, TOP);
    textSize(24);
    fill(255);
    noStroke();
    let roomName = reformingRoom ? reformingRoom.name : (roomTypes[currentRoomIndex] || "Stowage");
    text(`Constructing: ${roomName}`, width / 2, 70);
  }

  if (mode === "room") {
    confirmBtn.show();
    finalizeBtn.hide();
    newRoomBtn.hide();
    confirmBtn.html(reformingRoom ? "Confirm New Layout" : "Confirm Layout → Place Objects");
    drawStats();
    drawGrid();
    highlightSelectedTiles();
    drawRoomOutline(roomTiles);
    drawInventory();
  } else if (mode === "place") {
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
    confirmBtn.hide();
    finalizeBtn.hide();
    newRoomBtn.show();
    reformBtn.style('display', selectedRoom ? 'block' : 'none');
    drawAllRooms();
    drawCorridors();
    drawLifeSupport();
    drawStats();
    drawMiniMap();
  }
}

function calculateDetailHeight(item) {
  if (!item || !item.info) return 0;
  let height = 30; // Top padding with stats line
  height += 40; // Approx height for description
  height += 20; // "Specifications" title
  height += item.info.specs.length * 15;
  height += 20; // "Benefits" title
  height += item.info.benefits.length * 15;
  height += 15; // Bottom padding
  return height;
}

// FULLY REWRITTEN DRAWINVENTORY WITH ANIMATION
function drawInventory() {
  let invX = windowWidth - 250;
  let invY = 150;
  let invW = 220;
  let itemH = 35;
  let subItemH = 30;
  let currentRoomName = reformingRoom ? reformingRoom.name : (roomTypes[currentRoomIndex] || "Stowage");
  const currentInventory = inventories[currentRoomName] || [];

  // --- Update and calculate heights ---
  let totalHeight = 40;
  for (const item of currentInventory) {
    totalHeight += itemH + 5;
    if (expandedItem === item) {
      if (item.isCategory) {
        totalHeight += (subItemH + 5) * item.subItems.length;
        if (expandedSubItem) {
          let animState = animationStates[expandedSubItem.name];
          animState.targetHeight = calculateDetailHeight(expandedSubItem);
          animState.currentHeight = lerp(animState.currentHeight, animState.targetHeight, 0.2);
          totalHeight += animState.currentHeight + 5;
        }
      } else {
        let animState = animationStates[item.name];
        animState.targetHeight = calculateDetailHeight(item);
        animState.currentHeight = lerp(animState.currentHeight, animState.targetHeight, 0.2);
        totalHeight += animState.currentHeight + 5;
      }
    }
  }

  // Reset heights for any items that are no longer expanded
  for (const key in animationStates) {
    if ((!expandedSubItem || key !== expandedSubItem.name) && (!expandedItem || key !== expandedItem.name)) {
      animationStates[key].targetHeight = 0;
      animationStates[key].currentHeight = lerp(animationStates[key].currentHeight, 0, 0.2);
    }
  }


  // --- Draw Panel ---
  fill(20, 30, 50, 220);
  noStroke();
  rect(invX, invY, invW, totalHeight, 10);
  fill(255);
  textSize(16);
  textAlign(LEFT, TOP);
  text("Inventory", invX + 10, invY + 10);

  let yOffset = invY + 40;

  for (const item of currentInventory) {
    let itemX = invX + 10;
    let itemW = invW - 20;

    // Draw main item/category bar
    fill(item.isCategory ? '#5a5a8c' : '#3264c8');
    rect(itemX, yOffset, itemW, itemH, 6);
    fill(255);
    textAlign(LEFT, CENTER);
    textSize(12);
    let textMaxWidth = itemW - (item.isCategory ? 15 : 45);
    text(item.name, itemX + 10, yOffset + itemH / 2, textMaxWidth);

    if (!item.isCategory && item.info) {
      let infoBtnX = itemX + itemW - 18;
      fill(expandedItem === item ? '#00ffff' : '#00aaff');
      ellipse(infoBtnX, yOffset + itemH / 2, 20, 20);
      fill(0);
      text("i", infoBtnX, yOffset + itemH / 2);
    }

    yOffset += itemH + 5;

    if (expandedItem === item) {
      if (item.isCategory) {
        for (const subItem of item.subItems) {
          let subItemX = itemX + 10;
          let subItemW = itemW - 20;

          fill('#4a78d2');
          rect(subItemX, yOffset, subItemW, subItemH, 4);
          fill(255);
          text(subItem.name, subItemX + 10, yOffset + subItemH / 2, subItemW - 40);

          let infoBtnX = subItemX + subItemW - 18;
          fill(expandedSubItem === subItem ? '#00ffff' : '#00aaff');
          ellipse(infoBtnX, yOffset + subItemH / 2, 18, 18);
          fill(0);
          text("i", infoBtnX, yOffset + subItemH / 2);

          yOffset += subItemH + 5;

          if (expandedSubItem === subItem) {
            let animState = animationStates[subItem.name];
            if (animState.currentHeight > 1) {
              drawDetailBox(subItem, subItemX, yOffset, subItemW, animState.currentHeight);
            }
            yOffset += animState.currentHeight + 5;
          }
        }
      } else {
        let animState = animationStates[item.name];
        if (animState.currentHeight > 1) {
          drawDetailBox(item, itemX, yOffset, itemW, animState.currentHeight);
        }
        yOffset += animState.currentHeight + 5;
      }
    }
  }
}

function drawDetailBox(item, x, y, w, h) {
  push();
  drawingContext.save();
  rect(x, y, w, h);
  drawingContext.clip();

  fill(30, 40, 70, 255);
  stroke(0, 150, 255);
  rect(x, y, w, h, 6);
  noStroke();

  let textX = x + 10;
  let textW = w - 20;
  let currentY = y + 10;

  fill(255, 200, 100);
  textAlign(LEFT, TOP);
  textSize(12);
  text(`Energy: ${item.energy} | Power: ${item.power} | Cost: ${item.cost}`, textX, currentY);
  currentY += 25;

  fill(255);
  text(item.info.description, textX, currentY, textW);
  currentY += 40;

  fill(100, 255, 100);
  textSize(14);
  text("Specifications:", textX, currentY);
  currentY += 20;
  fill(255);
  textSize(11);
  for (const spec of item.info.specs) {
    text(`• ${spec}`, textX + 5, currentY);
    currentY += 15;
  }

  fill(255, 200, 100);
  textSize(14);
  text("Benefits:", textX, currentY);
  currentY += 20;
  fill(255);
  textSize(11);
  for (const benefit of item.info.benefits) {
    text(`• ${benefit}`, textX + 5, currentY);
    currentY += 15;
  }

  drawingContext.restore();
  pop();
}

// FULLY REWRITTEN AND CORRECTED CLICK HANDLING
function handleInventoryClick(mx, my) {
  let invX = windowWidth - 250;
  let invY = 150;
  let invW = 220;
  let itemH = 35;
  let subItemH = 30;
  let yOffset = invY + 40;

  const currentInventory = inventories[roomTypes[currentRoomIndex]] || [];

  for (const item of currentInventory) {
    let itemX = invX + 10;
    let itemW = invW - 20;

    if (mx > itemX && mx < itemX + itemW && my > yOffset && my < yOffset + itemH) {
      if (item.isCategory) {
        expandedItem = (expandedItem === item) ? null : item;
        expandedSubItem = null;
        return true;
      } else {
        let infoBtnX = itemX + itemW - 18;
        if (item.info && dist(mx, my, infoBtnX, yOffset + itemH / 2) < 10) {
          expandedItem = (expandedItem === item) ? null : item;
          expandedSubItem = null;
          return true;
        } else if (mode === "place") {
          draggedItem = item;
          return true;
        }
      }
    }

    if (expandedItem === item && item.isCategory) {
      let subYOffset = yOffset + itemH + 5;
      for (const subItem of item.subItems) {
        let subItemX = itemX + 10;
        let subItemW = itemW - 20;

        if (mx > subItemX && mx < subItemX + subItemW && my > subYOffset && my < subYOffset + subItemH) {
          let infoBtnX = subItemX + subItemW - 18;
          if (dist(mx, my, infoBtnX, subYOffset + subItemH / 2) < 10) {
            expandedSubItem = (expandedSubItem === subItem) ? null : subItem;
            return true;
          } else if (mode === "place") {
            draggedItem = subItem;
            return true;
          }
        }
        subYOffset += subItemH + 5;
        if (expandedSubItem === subItem) {
          subYOffset += animationStates[subItem.name].currentHeight + 5;
        }
      }
    }

    yOffset += itemH + 5;
    if (expandedItem === item) {
      if (item.isCategory) {
        yOffset += (subItemH + 5) * item.subItems.length;
        if (expandedSubItem) {
          yOffset += animationStates[expandedSubItem.name].currentHeight + 5;
        }
      } else {
        yOffset += animationStates[item.name].currentHeight + 5;
      }
    }
  }
  return false;
}

function mousePressed() {
  if (handleInventoryClick(mouseX, mouseY)) {
    return;
  }
  expandedItem = null;
  expandedSubItem = null;
  if (mode === "room") {
    let c = floor((mouseX - (width / 2 - (gridSize * cellSize) / 2)) / cellSize);
    let r = floor((mouseY - (height / 2 - (gridSize * cellSize) / 2)) / cellSize);
    if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
      let idx = roomTiles.findIndex(t => t.r === r && t.c === c);
      if (idx >= 0) roomTiles.splice(idx, 1);
      else roomTiles.push({ r, c });
    }
  } else if (mode === "place") {
    for (let i = objects.length - 1; i >= 0; i--) {
      let obj = objects[i];
      if (mouseX > obj.x - 45 && mouseX < obj.x + 45 && mouseY > obj.y - 20 && mouseY < obj.y + 25) {
        let item = findItemDetails(obj.name);
        if (item) {
          energy += item.energy;
          cost -= item.cost;
          used--;
          totalEnergy += item.energy;
          totalCost -= item.cost;
          totalPower -= item.power;
          totalUsed--;
        }
        objects.splice(i, 1);
        return;
      }
    }
  } else if (mode === "final") {
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

// --- ALL OTHER FUNCTIONS (UNCHANGED) ---
function drawObjects(objs) {
  for (let obj of objs) {
    const itemDetails = findItemDetails(obj.name);
    if (itemDetails && itemDetails.img) {
      imageMode(CENTER);
      image(itemDetails.img, obj.x, obj.y, 60, 60);
      imageMode(CORNER);
    } else {
      fill(255, 150, 0, 220);
      stroke(0, 150, 255);
      rect(obj.x - 40, obj.y - 20, 90, 45, 8);
      fill(0);
      noStroke();
      textSize(12);
      text(obj.name, obj.x, obj.y);
    }
  }
}

function drawDraggedItem(item) {
  if (item.img) {
    imageMode(CENTER);
    image(item.img, mouseX, mouseY, 60, 60);
    imageMode(CORNER);
  } else {
    fill(255, 180, 0, 220);
    stroke(0, 200, 255);
    rect(mouseX - 45, mouseY - 20, 90, 40, 8);
    fill(0);
    noStroke();
    textSize(12);
    text(item.name, mouseX, mouseY);
  }
}

function mouseReleased() {
  if (draggedItem && (mode === "place" || reformingRoom)) {
    if (pointInRoom(mouseX, mouseY, roomTiles)) {
      objects.push({ name: draggedItem.name, x: mouseX, y: mouseY });
      energy -= draggedItem.energy;
      cost += draggedItem.cost;
      used++;
      totalEnergy -= draggedItem.energy;
      totalCost += draggedItem.cost;
      totalPower += draggedItem.power;
      totalUsed++;
    } else {
      console.log("Can't place object outside the room");
    }
  }
  draggedItem = null;
  draggingObject = null;
  draggingRoom = null;
}

function finalizeRoom() {
  if (roomTiles.length === 0) return;
  let roomEnergy = 0;
  let roomCost = 0;
  let roomPower = 0;
  for (let obj of objects) {
    let item = findItemDetails(obj.name);
    if (item) {
      roomEnergy += item.energy;
      roomCost += item.cost;
      roomPower += item.power;
    }
  }
  if (reformingRoom) {
    totalEnergy += reformingRoom.energy;
    totalCost -= reformingRoom.cost;
    totalPower -= reformingRoom.power;
    totalUsed -= reformingRoom.used;
    reformingRoom.tiles = [...roomTiles];
    reformingRoom.objects = [...objects];
    reformingRoom.decorations = [...decorations];
    reformingRoom.energy = roomEnergy;
    reformingRoom.cost = roomCost;
    reformingRoom.power = roomPower;
    reformingRoom.used = objects.length;
    reformingRoom = null;
    totalEnergy -= roomEnergy;
    totalCost += roomCost;
    totalPower += roomPower;
    totalUsed += objects.length;
  } else {
    if (isOverlapping(roomTiles)) {
      alert(" Cannot finalize: room overlaps with an existing one.");
      return;
    }
    let roomName = roomTypes[currentRoomIndex] || "Stowage";
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
    totalEnergy -= roomEnergy;
    totalCost += roomCost;
    totalPower += roomPower;
    totalUsed += objects.length;
    if (roomName === "Control Room") {
      controlRoom = newRoom;
    }
    currentRoomIndex++;
  }
  if (currentRoomIndex >= roomTypes.length) {
    window.location.href = 'endgame.html';
    return;
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

let controlRoom = null;
let lifeSupportMachine = null;

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
    energy = selectedRoom.energy;
    cost = selectedRoom.cost;
    used = selectedRoom.used;
    floorColor = [...selectedRoom.floorColor];
    wallColor = [...selectedRoom.wallColor];
    mode = "room";
    selectedRoom = null;
    reformBtn.hide();
  }
}

function drawAllRooms() {
  for (let room of rooms) {
    push();
    translate(room.offsetX, room.offsetY);
    drawRoomWithWalls(room.tiles, room.floorColor, room.wallColor);
    drawObjects(room.objects);
    pop();
  }
}

function drawCorridors() {
  if (!controlRoom) return;
  let c1 = getRoomCenter(controlRoom.tiles);
  let cx1 = c1.x + controlRoom.offsetX;
  let cy1 = c1.y + controlRoom.offsetY;
  stroke(200);
  strokeWeight(2);
  drawingContext.setLineDash([5, 5]);
  for (let room of rooms) {
    if (room === controlRoom) continue;
    let c2 = getRoomCenter(room.tiles);
    let cx2 = c2.x + room.offsetX;
    let cy2 = c2.y + room.offsetY;
    line(cx1, cy1, cx2, cy2);
  }
  drawingContext.setLineDash([]);
}

function drawLifeSupport() {
  if (controlRoom) {
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

function drawMiniMap() {
  miniMapX = windowWidth - miniMapW - 20;
  miniMapY = 20;
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
      for (let i = 0; i < points.length; i++) {
        let p1 = points[i];
        let p2 = points[(i + 1) % points.length];
        let dx = (p2.x - p1.x) / cellSize;
        let dy = (p2.y - p1.y) / cellSize;
        let length = sqrt(dx * dx + dy * dy).toFixed(1);
        let mx = (p1.x + p2.x) / 2;
        let my = (p1.y + p2.y) / 2;
        fill(255, 200, 0);
        noStroke();
        textSize(40);
        textAlign(CENTER, CENTER);
        text(length, mx, my);
      }
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

function getRoomPoints(tiles) {
  let points = tiles.map(t => createVector(t.c * cellSize + cellSize / 2, t.r * cellSize + cellSize / 2));
  if (points.length > 2) {
    let center = createVector(0, 0);
    for (let p of points) center.add(p);
    center.div(points.length);
    points.sort((a, b) => atan2(a.y - center.y, a.x - center.x) - atan2(b.y - center.y, b.x - center.x));
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
      fill(wallColor);
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

function drawGrid() {
  stroke(100, 120);
  let gridW = gridSize * cellSize;
  let gridH = gridSize * cellSize;
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

function drawStats() {
  let statsX = windowWidth - 250;
  let statsY = 20;
  let barWidth = 200;
  let barHeight = 15;
  fill(0, 180);
  rect(statsX, statsY, 220, 120, 10);
  let energyBarX = statsX + 10;
  let energyBarY = statsY + 10;
  let energyPercent = map(totalEnergy, 0, 100, 0, barWidth);
  fill(50, 50, 50, 200);
  rect(energyBarX, energyBarY, barWidth, barHeight, 5);
  fill(0, 255, 0);
  rect(energyBarX, energyBarY, energyPercent, barHeight, 5);
  fill(255);
  textAlign(LEFT, TOP);
  textSize(14);
  text(`Energy: ${totalEnergy} / 100`, energyBarX + 5, energyBarY);
  let costBarY = statsY + 40;
  let costPercent = map(totalCost, 0, 200, 0, barWidth);
  fill(50, 50, 50, 200);
  rect(energyBarX, costBarY, barWidth, barHeight, 5);
  fill(255, 200, 0);
  rect(energyBarX, costBarY, costPercent, barHeight, 5);
  fill(255);
  text(`Cost: ${totalCost} / 200`, energyBarX + 5, costBarY);
  let powerBarY = statsY + 70;
  let maxPower = 50;
  let powerPercent = map(totalPower, 0, maxPower, 0, barWidth);
  fill(50, 50, 50, 200);
  rect(energyBarX, powerBarY, barWidth, barHeight, 5);
  fill(0, 200, 255);
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

function mouseDragged() {
  if (draggingRoom) {
    let newX = mouseX;
    let newY = mouseY;
    let roomBounds = getRoomBounds(draggingRoom.tiles);
    newX = constrain(newX, -roomBounds.minX, windowWidth - roomBounds.maxX);
    newY = constrain(newY, -roomBounds.minY, windowHeight - roomBounds.maxY);
    draggingRoom.offsetX = newX;
    draggingRoom.offsetY = newY;
  } else if (draggingObject) {
    draggingObject.x = mouseX;
    draggingObject.y = mouseY;
  }
}

function getRoomBounds(tiles) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let tile of tiles) {
    let x = tile.c * cellSize;
    let y = tile.r * cellSize;
    minX = min(minX, x);
    maxX = max(maxX, x + cellSize);
    minY = min(minY, y);
    maxY = max(maxY, y + cellSize);
  }
  return { minX, maxX, minY, maxY };
}

function pointInRoom(px, py, tiles) {
  let points = getRoomPoints(tiles);
  if (points.length < 3) return false;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    let xi = points[i].x,
      yi = points[i].y;
    let xj = points[j].x,
      yj = points[j].y;
    let intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}