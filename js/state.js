// Core state
export let gridSize = 8;
export let cellSize = 80;

export let rooms = [];          
export let roomTiles = [];       
export let objects = [];
export let decorations = [];

export let mode = "room";        
export let selectedRoom = null;  
export let reformingRoom = null;

export let energy = 100, cost = 200, used = 0;
export let draggedItem = null;
export let draggingObject = null;
export let draggingRoom = null;

export const inventory = [
  { name: "Treadmill", energy: 10, cost: 20 },
  { name: "Exercise Bike", energy: 15, cost: 25 },
  { name: "Medical Scanner", energy: 20, cost: 30 },
  { name: "Defibrillator", energy: 5, cost: 15 }
];

// control room
export let controlRoom = null;
export let lifeSupportMachine = null;

// Colors
export let floorColor = [120, 200, 255, 180];
export let wallColor = [30, 50, 120, 220];

// minimap
export let miniMapX = 0;   // changes dynamically
export let miniMapY = 0;   // changes dynamically
export const miniMapW = 200; // stays constant
export const miniMapH = 200;
export let miniScale = 0.2;
