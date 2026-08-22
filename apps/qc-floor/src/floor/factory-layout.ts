import { getMachineVisualScale, MACHINE_CATALOG } from "./machine-catalog";
import type { EquipmentPlacement, EquipmentStatus, HallLayout } from "./types";

const PLAN_SCALE_X = 2 / 3;
const PLAN_SCALE_Z = 0.65;
const HALL_LENGTH = 32;
const HALL_WIDTH = 72;
const HALL_CENTER_Z = -6;
const HALL_FRONT_Z = HALL_CENTER_Z + HALL_WIDTH / 2;
const STRAIGHTLINE_VISUAL_SCALE = getMachineVisualScale("straightline-800-c");
const HSW_VISUAL_SCALE = getMachineVisualScale("hsw-c");
const GMF_C_VISUAL_SCALE = 1.65;
const ROLLO_VISUAL_SCALE = 1.65;
const HYGIENE_STATION_VISUAL_SCALE = 2.1;
const ROLLO_B_SHIFT_Z = -2;
const STRAIGHTLINE_LENGTH = MACHINE_CATALOG["straightline-800-c"].dimensions.length;
const STRAIGHTLINE_HALF_WIDTH =
  (MACHINE_CATALOG["straightline-800-c"].dimensions.width * STRAIGHTLINE_VISUAL_SCALE) / 2;
const HSW_HALF_LENGTH = (MACHINE_CATALOG["hsw-c"].dimensions.length * HSW_VISUAL_SCALE) / 2;
const GMF_C_HALF_LENGTH = (MACHINE_CATALOG["gmf-c"].dimensions.length * GMF_C_VISUAL_SCALE) / 2;
const GIF_600_HALF_LENGTH =
  (MACHINE_CATALOG["gif-600"].dimensions.length * getMachineVisualScale("gif-600")) / 2;
const STRAIGHTLINE_OUTFEED_CENTER_X = 5.86;
const STRAIGHTLINE_OUTFEED_CENTER_Z = 0.35;
const STRAIGHTLINE_CONVEYOR_Z_OFFSET = -STRAIGHTLINE_OUTFEED_CENTER_Z * STRAIGHTLINE_VISUAL_SCALE;
const STRAIGHTLINE_WEST_WALL_X =
  (-HALL_LENGTH / 2 + (STRAIGHTLINE_LENGTH * STRAIGHTLINE_VISUAL_SCALE) / 2) / PLAN_SCALE_X;
const HSW_CONVEYOR_X =
  (-HALL_LENGTH / 2 +
    (STRAIGHTLINE_LENGTH / 2 + STRAIGHTLINE_OUTFEED_CENTER_X) * STRAIGHTLINE_VISUAL_SCALE) /
  PLAN_SCALE_X;
const GMF_STRAIGHTLINE_Z = -29.5;
const GMF_C_X = HSW_CONVEYOR_X - 1.5;
const GMF_C_Z =
  (GMF_STRAIGHTLINE_Z * PLAN_SCALE_Z - STRAIGHTLINE_HALF_WIDTH - 0.25 - GMF_C_HALF_LENGTH) /
  PLAN_SCALE_Z;
const GMF_FREEZER_Z =
  (GMF_C_Z * PLAN_SCALE_Z - GMF_C_HALF_LENGTH - 0.45 - GIF_600_HALF_LENGTH) / PLAN_SCALE_Z;
const GMF_FREEZER_START_X = GMF_C_X - (3 * 2.15) / 2;
const BTC1_STRAIGHTLINE_Z = -5.5;
const BTC2_STRAIGHTLINE_Z =
  (HALL_FRONT_Z - HSW_HALF_LENGTH * 2 - STRAIGHTLINE_CONVEYOR_Z_OFFSET) / PLAN_SCALE_Z;

function alignedHswZ(straightlineZ: number) {
  return (
    (straightlineZ * PLAN_SCALE_Z + STRAIGHTLINE_CONVEYOR_Z_OFFSET + HSW_HALF_LENGTH) / PLAN_SCALE_Z
  );
}

function planPosition(position: [number, number, number]): [number, number, number] {
  return [position[0] * PLAN_SCALE_X, position[1], position[2] * PLAN_SCALE_Z];
}

function planSize(size: [number, number]): [number, number] {
  return [size[0] * PLAN_SCALE_X, size[1] * PLAN_SCALE_Z];
}

function rolloBPosition(position: [number, number, number]): [number, number, number] {
  return [position[0], position[1], position[2] + ROLLO_B_SHIFT_Z];
}

function machine(
  id: string,
  label: string,
  line: string,
  assetKey: keyof typeof MACHINE_CATALOG,
  position: [number, number, number],
  rotationY = 0,
  status: EquipmentStatus = "normal",
  visualScale?: number,
): EquipmentPlacement {
  return {
    assetKey,
    dimensions: MACHINE_CATALOG[assetKey].dimensions,
    id,
    kind: "machine",
    label,
    line,
    position: planPosition(position),
    rotationY,
    status,
    visualScale,
  };
}

function freezerBank(
  prefix: string,
  line: string,
  z: number,
  startX: number,
  count: number,
  status: EquipmentStatus = "normal",
): EquipmentPlacement[] {
  return Array.from({ length: count }, (_, index) =>
    machine(
      `${prefix}-${index + 1}`,
      `GIF 600 · ${index + 1}`,
      line,
      "gif-600",
      [startX + index * 2.15, 0, z],
      -Math.PI / 2,
      status,
    ),
  );
}

export const PRODUCTION_HALL_1: HallLayout = {
  center: [0, HALL_CENTER_Z],
  dimensions: { length: HALL_LENGTH, width: HALL_WIDTH, height: 9.5 },
  lineZones: [
    {
      id: "gmf",
      label: "GMF",
      center: planSize([-4.5, -38]),
      size: planSize([39, 32]),
      status: "normal",
    },
    {
      id: "btc-1",
      label: "BTC-1",
      center: planSize([-4, -5]),
      size: planSize([40, 18]),
      status: "pending",
    },
    {
      id: "rollo-b",
      label: "Rollo B",
      center: planSize([-13, 10 + ROLLO_B_SHIFT_Z]),
      size: planSize([20, 12]),
      status: "pending",
    },
    {
      id: "rollo-a",
      label: "Rollo A",
      center: planSize([-13, 23]),
      size: planSize([20, 12]),
      status: "normal",
    },
    {
      id: "btc-2",
      label: "BTC-2",
      center: planSize([-3, 36]),
      size: planSize([41, 19]),
      status: "attention",
    },
  ],
  equipment: [
    machine(
      "gmf-straightline",
      "Hoyer Straightline 800 C",
      "GMF",
      "straightline-800-c",
      [STRAIGHTLINE_WEST_WALL_X, 0, GMF_STRAIGHTLINE_Z],
      Math.PI,
    ),
    machine(
      "gmf-c",
      "GMF-C",
      "GMF",
      "gmf-c",
      [GMF_C_X, 0, GMF_C_Z],
      Math.PI / 2,
      "normal",
      GMF_C_VISUAL_SCALE,
    ),
    ...freezerBank("gmf-freezer", "GMF", GMF_FREEZER_Z, GMF_FREEZER_START_X, 4),

    ...freezerBank("btc1-freezer", "BTC-1", -16.5, -4, 4, "pending"),
    machine(
      "btc1-straightline",
      "Hoyer Straightline 800 C",
      "BTC-1",
      "straightline-800-c",
      [STRAIGHTLINE_WEST_WALL_X, 0, BTC1_STRAIGHTLINE_Z],
      Math.PI,
      "pending",
    ),
    machine(
      "btc1-hsw",
      "HSW-C · 10 lane",
      "BTC-1",
      "hsw-c",
      [HSW_CONVEYOR_X, 0, alignedHswZ(BTC1_STRAIGHTLINE_Z)],
      Math.PI / 2,
      "pending",
    ),

    machine(
      "rollo-b-rxgj",
      "RXGJ-6",
      "Rollo B",
      "rxgj-6",
      rolloBPosition([-15.7, 0, 10]),
      0,
      "pending",
      ROLLO_VISUAL_SCALE,
    ),
    machine(
      "rollo-b-gta-1",
      "GTA450-120 · 1",
      "Rollo B",
      "gta450-120",
      rolloBPosition([-8.2, 0, 7.8]),
      0,
      "pending",
      ROLLO_VISUAL_SCALE,
    ),
    machine(
      "rollo-b-gta-2",
      "GTA450-120 · 2",
      "Rollo B",
      "gta450-120",
      rolloBPosition([-7.6, 0, 11]),
      Math.PI / 2,
      "pending",
      ROLLO_VISUAL_SCALE,
    ),
    machine(
      "rollo-b-gta-3",
      "GTA450-120 · 3",
      "Rollo B",
      "gta450-120",
      rolloBPosition([-2.7, 0, 11]),
      Math.PI / 2,
      "pending",
      ROLLO_VISUAL_SCALE,
    ),
    machine(
      "rollo-b-gif1200-1",
      "GIF 1200",
      "Rollo B",
      "gif-1200",
      rolloBPosition([-22, 0, 14.5]),
      0,
      "normal",
      ROLLO_VISUAL_SCALE,
    ),
    machine(
      "rollo-b-gif1200-2",
      "GIF 1200",
      "Rollo A",
      "gif-1200",
      [-22, 0, 16.7],
      0,
      "normal",
      ROLLO_VISUAL_SCALE,
    ),

    machine(
      "rollo-a-rxgj",
      "RXGJ-6",
      "Rollo A",
      "rxgj-6",
      [-15.7, 0, 23.2],
      Math.PI / 2,
      "normal",
      ROLLO_VISUAL_SCALE,
    ),
    ...freezerBank("btc2-freezer", "BTC-2", 22.7, -2.6, 4, "attention").map((equipment) => ({
      ...equipment,
      visualScale: ROLLO_VISUAL_SCALE,
    })),

    machine(
      "btc2-straightline",
      "Hoyer Straightline 800 C",
      "BTC-2",
      "straightline-800-c",
      [STRAIGHTLINE_WEST_WALL_X, 0, BTC2_STRAIGHTLINE_Z],
      Math.PI,
      "attention",
    ),
    machine(
      "btc2-hsw",
      "HSW-C · 10 lane",
      "BTC-2",
      "hsw-c",
      [HSW_CONVEYOR_X, 0, alignedHswZ(BTC2_STRAIGHTLINE_Z)],
      Math.PI / 2,
      "attention",
    ),

    {
      ...machine(
        "washing-station",
        "DZW-HDT Hygiene Station",
        "Hall services",
        "elpress-dzw-hdt-1000",
        [21.3, 0, 35.5],
        -Math.PI / 2,
        "normal",
        HYGIENE_STATION_VISUAL_SCALE,
      ),
      selectable: false,
    },
  ],
};
