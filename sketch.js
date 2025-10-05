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
        { name: "Star-Node Model", volume: 112.9, power: 4, mass: 14620 , imgSrc:'images/star_node.png', info: { description: "This model contains a CORE (Main ECLSS system) and  STARs (Plug-in ECLSSs). CORE contains all the life-supporting mechanisms and is the main life-support system. STARs do not have all mechanisms for long-term life support but can be plugged into the NODE to be recharged when needed.", Source: ["Howe, A. Scott. "A modular habitation system for human planetary and space exploration." 45th International Conference on Environmental Systems, 2015."]} },
        { name: "ISRU Model", volume: 11.7, power: 4500, mass: 2134 , imgSrc: 'images/isru_system.png', info: { description: "For a lunar habitat, ISRU offers a way to reduce reliance on Earth resupply by using local resources. Lunar ice deposits can be extracted and turned into water for drinking, oxygen generation, or integration with regenerative systems. Oxygen can also be produced from regolith. These methods could operate either alongside regenerative life support or as consumables in an open-loop system.", Source: ["Kessler, Paul, et al. "Artemis deep space habitation: Enabling a sustained human presence on the moon and beyond." 2022 IEEE Aerospace Conference (AERO). IEEE, 2022."] } },
        { name: "Regen Model", volume: 9.3, power: 3700, mass: 2423 , imgSrc: 'images/regen_system.png', info: { description: "Regen systems aim to form an almost closed-loop ECLSS. These systems rely on bio waste generated and wastewater offloaded to minimise their dependence on resupply of materials. Traditional forms of regen systems have been used on the ISS for years and have proven their mettle.", Source: ["Bryant, Zach, Andrew Choate, and David Howard. "Environmental Control and Life Support (ECLS) System Options for Mars Transit and Mars Surface Missions." 2023 International Conference on Environmental Systems, 2023."] } }
      ]
    },
    { 
      name: "Thermal Support",
      isCategory: true,
      subItems: [
        { name: "Thermal Control System", volume: 4, power: 3840, mass: 12000 , imgSrc:'images/tcs.png', info: { description: "Thermal Control System collects heat inside the habitat, transfers it through two fluid loops, and releases it into space using large radiator panels. During long cold nights without sunlight, the radiators can fold up, heaters and fuel cells help keep things warm, and special insulation reduces heat loss. It ensures astronauts stay safe and equipment works properly.", Source: ["Schunk, R. Gregory, Stephanie D. Babiak, and Brian W. Evans. "Thermal control system architecture and technology challenges for a lunar surface habitat." 2022 IEEE Aerospace Conference (AERO). IEEE, 2022."]} }
        ]
    },
    { 
      name: "Power Sources",
      isCategory: true,
      subItems: [
        { name: "KiloPower Reactors", volume: 2.35, power_gen: 40000, mass: 6000 , imgSrc:'images/kilopower_reactors.png', info: { description: "The Kilopower reactor concept is one of the simplest space power reactor concepts ever proposed. The basic Kilopower reactor components are fuel, heat pipes, control, reflector, and shield. Kilopower reactors should also be very reliable with respect to launch and landing loads. A solid block of fuel eliminates potential fuel-pin and grid plate movements.", Source: ["Poston, David I., Marc Gibson, and Patrick McClure. "Kilopower reactors for potential space exploration missions." Nuclear and Emerging Technologies for Space 2019, NETS-2019 (2019)."]} },
        { name: "Solar Farm", volume: 3, power_gen:7795, 4500, mass: 60 , power:40800 ,imgSrc: 'images/solar_array.png', info: { description: "For a lunar habitat, ISRU offers a way to reduce reliance on Earth resupply by using local resources. Lunar ice deposits can be extracted and turned into water for drinking, oxygen generation, or integration with regenerative systems. Oxygen can also be produced from regolith. These methods could operate either alongside regenerative life support or as consumables in an open-loop system.", Source: ["Kotedadi, Abhirama Rai, and Neelesh Ranjan Saxena. "Power Generation System For Lunar Habitat." Human Space Flight: Technology (2019).
"] } },
        { name: "Thermo-Electric Generator", volume: 2.63, power_gen: 7795, mass: 18080, power:274900 , imgSrc: 'images/teg_array.png', info: { description: "Regen systems aim to form an almost closed-loop ECLSS. These systems rely on bio waste generated and wastewater offloaded to minimise their dependence on resupply of materials. Traditional forms of regen systems have been used on the ISS for years and have proven their mettle.", Source: ["Kotedadi, Abhirama Rai, and Neelesh Ranjan Saxena. "Power Generation System For Lunar Habitat." Human Space Flight: Technology (2019).
"] } }
      ]
    },
    { 
      name: "Power Storage",
      isCategory: true,
      SubItems: [
        { name: "Li-Ion Batteries", volume: 10.24, mass: 4000, power_store:10000, imgSrc:'images/li-ion_batteries.png', info: { description: "Batteries provide a reliable way of storing energy, and recent developments have improved safety concerning batteries. Li-Ion batteries have very high energy density, reliability, and long shelf life. However, for applications such as manned lunar outposts that demand several thousand kilowatts of energy storage, batteries can be bulky as primary storage systems", Source: ["Kotedadi, Abhirama Rai, and Neelesh Ranjan Saxena. "Power Generation System For Lunar Habitat." Human Space Flight: Technology (2019)."]} },
        { name: "Fuel Cells", volume: 3.25, mass: 16000 , power_store:10000 ,imgSrc: 'images/he-ion batteries.png', info: { description: "Fuel cells can store a large amount of energy(high energy density) in contrast to batteries. Closed-loop regenerative fuel cells can use energy from solar panels or thermo-electric generators to split water into hydrogen and oxygen and store it in tanks. When there is a need for electricity, they can fuse hydrogen and oxygen again to get water in a closed-loop [6]. This system does not demand a continuous supply of water and can utilise the frozen water available around the crater.
", Source: ["Kotedadi, Abhirama Rai, and Neelesh Ranjan Saxena. "Power Generation System For Lunar Habitat." Human Space Flight: Technology (2019).
"] } }
        ]
    }, 
    {
      name: "Comm System",
      isCategory: true,
      subItems: [
        { name: "Gateway System", volume: 0.15, power: 450, mass: 40 , imgSrc:'images/gateway_system_module.png', info: { description: "The Gateway acts like a cell tower in lunar orbit, keeping astronauts, rovers, and surface habitats connected to Earth. Even in rugged terrain at the south pole, crews can send video, science data, and voice back home by bouncing it through the Gateway’s relay links.", Source: ["Farkasvölgyi, Andrea, László Csurgai‐Horváth, and Petr Boháček. "The evolution of lunar communication—From the beginning to the present." International Journal of Satellite Communications and Networking 42.3 (2024): 200-216."]} },
        { name: "LCBN System", volume: 50, power: 710, mass: 180 , imgSrc: 'images/malpert_mountain_thingy.png', info: { description: "Lunar Base Communication and Navigation System using a relay station at Malapert Mountain for near-constant Earth visibility. High-data Ka-band links, S-band backups, and optical links ensure robust communications between the lunar base, rovers, and Earth.", Source: ["Qaise, Omar, Juergen Schlutz, and Aline Zimmer. "Operational design considerations of a polar lunar base communications and Navigation System." SpaceOps 2010 Conference Delivering on the Dream Hosted by NASA Marshall Space Flight Center and Organized by AIAA. 2010.
"] } },
  ]
    }]
    
  "Crew Chambers": [
    { name: "Eclipse private berths", volume: 5.43, power: 225, mass: 284.75 , imgSrc: "images/eclipse_berth.png", info: { description: "Designed for four crew, the chamber includes compact private berths with stowage and water-bag radiation shielding. A central fold-out table serves as a social hub for meals, work, and downtime, fostering cohesion in the isolated environment.", Source: ["Akin, David, et al. "ECLIPSE: Design of a Minimum Functional Habitat for Initial Lunar Exploration." AIAA SPACE 2009 Conference & Exposition. 2009.
"] } },
    { name: "ISS crew chambers", volume: 2.1 , power: 225, mass: 379, imgSrc: "images/iss_crew_quarters.png", info: { description: "  International Space Station (ISS) crew quarters are the largest US crew quarters flown to date, with a volume of 2.1m3 (74.2ft³). Unlike earlier versions on Skylab or the Space Shuttle, they are designed for private use beyond just sleep, allowing crew to set up computers and add personal items. Despite their size, they are still smaller than the minimum standards for US jail cells.
", Source: ["Litaker, Harry L., and Robert L. Howard. "Viability of Small Dimension Crew Quarters for Surface Habitation." 2022 IEEE Aerospace Conference (AERO). IEEE, 2022."]} },
    { name: "Small crew chambers", volume: 5.43, power: 140, mass: 190, imgSrc: "images/small_crew_quarters.png", info: { description: "The small crew quarters are experimental, compact living spaces designed for future space missions with significant mass and volume constraints. Prototypes were developed to test the viability of including capabilities like sleeping, working, and storage in a minimal footprint. Simplified versions were later installed in a vacuum chamber for a multi-day test to collect data on their acceptability for future surface habitats", Source: ["Litaker, Harry L., and Robert L. Howard. "Viability of Small Dimension Crew Quarters for Surface Habitation." 2022 IEEE Aerospace Conference (AERO). IEEE, 2022."] } }
  ],
    
  "Medbay": [
    {
      name: "Excercise & Rejuvenation",
      isCategory: true,
      subItems: [
        { name: "ARED", volume: 3.31, power: 6 , mass: 300 , imgSrc:'images/excercise_thingy.png', info: { description: "The Advanced Resistive Exercise Device (ARED) is a robust exercise machine on the ISS that simulates free-weight lifting in microgravity using vacuum cylinders and flywheels. It provides adjustable resistance of up to 600+ pounds through a lift bar or cable assembly, and a touch screen helps astronauts follow personalised exercise plans", Source: [""]} },
        { name: "Cage", volume: 2.2, power: 300, mass: 250 , imgSrc: 'images/isru_system.png', info: { description: "CAGE (Combined Artificial Gravity and Exercise) is a spacecraft-compatible centrifuge + squat module system designed to mitigate physiological decline during long-duration missions. It applies artificial gravity via rotation, inducing a downward fluid shift, while a built-in squat exercise setup at the rim enables simultaneous resistance training. The squatting motion partially drives the centrifuge, reducing power demands. It aims to halve current exercise time by combining multiple countermeasures in one device, improving efficiency and freeing time for science/operations.", Source: ["Divsalar, D. N., Sadeghian, F., Burville, K., Tremblay, M. F., Thomas, J., Richter, S., & Blaber, A. P. (2022). “A spacecraft-compatible combined artificial gravity and exercise (CAGE) system to sustain astronaut health in the next generation of long-term spaceflight.” Journal of Space Safety Engineering."] } },
         ]
    },
    { 
      name: "Medical support System",
      isCategory: true,
      subItems: [
        { name: "Use Crew Chambers", volume: 1.6, mass: 104 , imgSrc:'images/medi_bag.png', info: { description: "First option for medical care in habitat is to use the crew quarters as a medical facility when needed. Extra stowage can be provided for medical supplies. However, this approach can only be viable for a small crew and might cause hygiene problems", Source: ["Howard Jr, Robert L., and Brady T. Campbell. "Configuration and Projected Capabilities of the Common Habitat Medical Care Facility." 2024 HRP Investigators' Workshop. 2024."
                                                                                                                                                                                                                                                                                                                                                                                ]} },
        { name: "Common Habitat MCF", volume: 18, power: 2545, mass: 455 , imgSrc:'images/tcs.png', info: { description: " MCF is an enlarged and upgraded medical bay for long-duration space missions, designed with input from a combat medic to provide a higher level of care when evacuation is impossible. It features advanced portable equipment, such as an X-ray machine, and a mobile surgical stretcher-chair for improved patient transport and treatment.", Source: ["Howard Jr, Robert L., and Brady T. Campbell. "Configuration and Projected Capabilities of the Common Habitat Medical Care Facility." 2024 HRP Investigators' Workshop. 2024."
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    ]} }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                   
                                                                                                                                                                                                                                                                                                                                                                                
        ]
    },   

  "Food Galley": [
    {
      name: "Food Stowage",
      isCategory: true,
      subItems: [
        {name: "ISS Bags", Volume: 15, mass: 30, imgSrc: "images/iss_food_bags.png", info: { description: "First option for medical care in habitat is to use the crew quarters as a medical facility when needed. Extra stowage can be provided for medical supplies. However, this approach can only be viable for a small crew and might cause hygiene problems"} },
        {name: "Orion stowage sys", Volume: 6 , mass: 30, imgSrc: "images/iss_food_bags.png", info: { description: "First option for medical care in habitat is to use the crew quarters as a medical facility when needed. Extra stowage can be provided for medical supplies. However, this approach can only be viable for a small crew and might cause hygiene problems"} }
    { name: "Food prep", energy: 5, power: 2, cost: 10, imgSrc: "images/.jpg", info: { description: "Provides hot and cold potable water.", specs: ["Integrated filtration", "Temperature control"], benefits: ["Hydration for crew", "Reduces waste"] } }
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

let bgImg
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
