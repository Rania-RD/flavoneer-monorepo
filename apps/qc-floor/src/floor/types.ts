export type EquipmentStatus = "normal" | "pending" | "attention";

export type EquipmentKind = "machine" | "facility";

export interface EquipmentDimensions {
  length: number;
  width: number;
  height: number;
}

export interface EquipmentPlacement {
  assetKey?: string;
  dimensions: EquipmentDimensions;
  id: string;
  kind: EquipmentKind;
  label: string;
  line: string;
  position: [number, number, number];
  rotationY?: number;
  selectable?: boolean;
  status: EquipmentStatus;
  visualScale?: number;
}

export interface LineZone {
  id: string;
  label: string;
  center: [number, number];
  size: [number, number];
  status: EquipmentStatus;
}

export interface HallLayout {
  center?: [number, number];
  dimensions: EquipmentDimensions;
  equipment: EquipmentPlacement[];
  lineZones: LineZone[];
}
