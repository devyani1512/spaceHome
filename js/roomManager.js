import { rooms, roomTiles, objects, decorations, reformingRoom, controlRoom, lifeSupportMachine, floorColor, wallColor } from "./state.js";
import { getRoomCenter, randomInt } from "./utils.js";

export function isOverlapping(newTiles) {
  for (let room of rooms) {
    for (let t of room.tiles) {
      if (newTiles.some(nt => nt.r === t.r && nt.c === t.c)) {
        return true;
      }
    }
  }
  return false;
}

export function finalizeRoom() {
  if (roomTiles.length > 0) {
    if (reformingRoom) {
      reformingRoom.tiles = [...roomTiles];
      reformingRoom.objects = [...objects];
      reformingRoom.decorations = [...decorations];
      reformingRoom.floorColor = [...floorColor];
      reformingRoom.wallColor = [...wallColor];
    } else {
      if (isOverlapping(roomTiles)) {
        alert("⚠️ Cannot finalize: room overlaps with an existing one.");
        return;
      }
      let room = {
        tiles: [...roomTiles],
        objects: [...objects],
        decorations: [...decorations],
        floorColor: [...floorColor],
        wallColor: [...wallColor],
        offsetX: randomInt(100, 300),
        offsetY: randomInt(100, 300)
      };
      rooms.push(room);

      // first room = Control Room
      if (!controlRoom) {
        let c = getRoomCenter(room.tiles);
        lifeSupportMachine.x = c.x + room.offsetX;
        lifeSupportMachine.y = c.y + room.offsetY;
      }
    }

    // reset
    roomTiles.length = 0;
    objects.length = 0;
    decorations.length = 0;
  }
}
