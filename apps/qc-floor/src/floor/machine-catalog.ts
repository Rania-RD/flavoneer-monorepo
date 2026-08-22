import type { EquipmentDimensions } from "./types";

export interface MachineAsset {
  dimensions: EquipmentDimensions;
  modelUrl: string;
  source: "manufacturer" | "manual" | "reference estimate";
  visualScale?: number;
}

export const MACHINE_VISUAL_SCALE = 1.35;

export const MACHINE_CATALOG: Record<string, MachineAsset> = {
  "elpress-dzw-hdt-1000": {
    dimensions: { length: 2.125, width: 0.918, height: 1.513 },
    modelUrl: "/models/elpress-dzw-hdt-1000-hygiene-station.glb",
    source: "reference estimate",
  },
  "gif-600": {
    dimensions: { length: 1.47, width: 0.6, height: 1.6 },
    modelUrl: "/models/gram-gif-600.glb",
    source: "manual",
  },
  "gif-1200": {
    dimensions: { length: 1.95, width: 0.69, height: 1.7 },
    modelUrl: "/models/gram-gif-1200.glb",
    source: "manufacturer",
  },
  "gmf-c": {
    dimensions: { length: 6.2, width: 1.6, height: 3.3 },
    modelUrl: "/models/gram-gmf-c.glb",
    source: "reference estimate",
  },
  "hsw-c": {
    dimensions: { length: 5.8, width: 3.168, height: 3.1 },
    modelUrl: "/models/gram-hsw-c-10-lane.glb",
    source: "reference estimate",
  },
  "straightline-800-c": {
    dimensions: { length: 13.78, width: 4.4, height: 2.5 },
    modelUrl: "/models/tetra-pak-hoyer-straightline-800-c.glb",
    source: "manual",
    visualScale: 1.75,
  },
  "gta450-120": {
    dimensions: { length: 5.05, width: 0.96, height: 1.55 },
    modelUrl: "/models/danxiao-gta450-120.glb",
    source: "manufacturer",
  },
  "rxgj-6": {
    dimensions: { length: 4.5, width: 2.6, height: 1.82 },
    modelUrl: "/models/danxiao-rxgj-6.glb",
    source: "manufacturer",
  },
};

export function getMachineVisualScale(assetKey?: string) {
  return (assetKey && MACHINE_CATALOG[assetKey]?.visualScale) || MACHINE_VISUAL_SCALE;
}
