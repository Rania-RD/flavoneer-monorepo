export const factoryMachineAssetKeys = [
  "tomato-paste-pasteurizer",
  "jacketed-mixing-tank",
  "process-tank",
  "mixer-homogenizer",
  "sauce-filling-machine",
  "container-sanitizer",
  "continuous-spray-sterilizer",
] as const;

export type FactoryMachineAssetKey = (typeof factoryMachineAssetKeys)[number];
export type FactoryConnectionKind = "pipe" | "conveyor" | "materialFlow";

export interface FactoryLayoutMachine {
  machineKey: string;
  assetKey: FactoryMachineAssetKey;
  label: string;
  color: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationY: number;
  scale: number;
  sortOrder: number;
  visible: boolean;
}

export interface FactoryLayoutConnection {
  connectionKey: string;
  kind: FactoryConnectionKind;
  fromMachineKey: string;
  toMachineKey: string;
  color: string;
  height: number;
  sortOrder: number;
  visible: boolean;
}

export interface FactoryLayoutZone {
  zoneKey: string;
  label: string;
  color: string;
  positionX: number;
  positionZ: number;
  width: number;
  depth: number;
  sortOrder: number;
  visible: boolean;
}

export interface FactoryLayoutDefinition {
  name: string;
  machines: FactoryLayoutMachine[];
  connections: FactoryLayoutConnection[];
  zones: FactoryLayoutZone[];
}

export const factoryAssetLabels: Record<FactoryMachineAssetKey, string> = {
  "tomato-paste-pasteurizer": "Horizontal pasteurizer",
  "jacketed-mixing-tank": "Jacketed mixing tank",
  "process-tank": "Agitated process tank",
  "mixer-homogenizer": "Mixer / homogenizer",
  "sauce-filling-machine": "Sauce filling machine",
  "container-sanitizer": "Container sanitizer",
  "continuous-spray-sterilizer": "Continuous spray sterilizer",
};

export const referenceFactoryLayout: FactoryLayoutDefinition = {
  name: "Flavoneer reference production line",
  zones: [
    {
      zoneKey: "thermal-processing",
      label: "Thermal processing",
      color: "#ead9f8",
      positionX: 1.5,
      positionZ: -8,
      width: 12,
      depth: 7,
      sortOrder: 0,
      visible: true,
    },
    {
      zoneKey: "mixing-transfer",
      label: "Mixing & transfer",
      color: "#d9edf7",
      positionX: 2,
      positionZ: -0.5,
      width: 10,
      depth: 6,
      sortOrder: 1,
      visible: true,
    },
    {
      zoneKey: "packaging-line",
      label: "Packaging & sanitation",
      color: "#ffe3bc",
      positionX: 0,
      positionZ: 8,
      width: 21,
      depth: 10,
      sortOrder: 2,
      visible: true,
    },
    {
      zoneKey: "spice-prep",
      label: "Spice & prep room",
      color: "#d2f2d4",
      positionX: 8.5,
      positionZ: -9.5,
      width: 4,
      depth: 4,
      sortOrder: 3,
      visible: true,
    },
  ],
  machines: [
    {
      machineKey: "pasteurizer",
      assetKey: "tomato-paste-pasteurizer",
      label: "Horizontal pasteurizer",
      color: "#a56cc1",
      positionX: -2.8,
      positionY: 0,
      positionZ: -8.2,
      rotationY: 1.57,
      scale: 0.9,
      sortOrder: 0,
      visible: true,
    },
    {
      machineKey: "jacketed-tank",
      assetKey: "jacketed-mixing-tank",
      label: "Jacketed mixing tank",
      color: "#bd8bcc",
      positionX: 0.5,
      positionY: 0,
      positionZ: -6.3,
      rotationY: 0.2,
      scale: 0.88,
      sortOrder: 1,
      visible: true,
    },
    {
      machineKey: "buffer-tank",
      assetKey: "process-tank",
      label: "Buffer tank",
      color: "#cf9ed8",
      positionX: 4.2,
      positionY: 0,
      positionZ: -6.2,
      rotationY: -0.3,
      scale: 0.82,
      sortOrder: 2,
      visible: true,
    },
    {
      machineKey: "homogenizer",
      assetKey: "mixer-homogenizer",
      label: "Homogenizer",
      color: "#f5a623",
      positionX: 5,
      positionY: 0,
      positionZ: -9.2,
      rotationY: -0.5,
      scale: 0.78,
      sortOrder: 3,
      visible: true,
    },
    {
      machineKey: "agitated-tank",
      assetKey: "process-tank",
      label: "Mixing tank with agitators",
      color: "#73a9c2",
      positionX: 1.7,
      positionY: 0,
      positionZ: -0.8,
      rotationY: 0.35,
      scale: 0.9,
      sortOrder: 4,
      visible: true,
    },
    {
      machineKey: "sauce-filler",
      assetKey: "sauce-filling-machine",
      label: "Sauce filling machine",
      color: "#ffb965",
      positionX: -5.7,
      positionY: 0,
      positionZ: 6.5,
      rotationY: 0,
      scale: 0.92,
      sortOrder: 5,
      visible: true,
    },
    {
      machineKey: "container-sanitizer",
      assetKey: "container-sanitizer",
      label: "Container sanitizing tunnel",
      color: "#ff8f5e",
      positionX: 0,
      positionY: 0,
      positionZ: 8.8,
      rotationY: 0,
      scale: 0.88,
      sortOrder: 6,
      visible: true,
    },
    {
      machineKey: "continuous-sterilizer",
      assetKey: "continuous-spray-sterilizer",
      label: "Continuous spray sterilizer",
      color: "#f5a623",
      positionX: 5.8,
      positionY: 0,
      positionZ: 8.7,
      rotationY: 0,
      scale: 0.92,
      sortOrder: 7,
      visible: true,
    },
  ],
  connections: [
    {
      connectionKey: "pasteurizer-to-jacketed",
      kind: "pipe",
      fromMachineKey: "pasteurizer",
      toMachineKey: "jacketed-tank",
      color: "#6f8e82",
      height: 1.3,
      sortOrder: 0,
      visible: true,
    },
    {
      connectionKey: "jacketed-to-buffer",
      kind: "pipe",
      fromMachineKey: "jacketed-tank",
      toMachineKey: "buffer-tank",
      color: "#6f8e82",
      height: 1.5,
      sortOrder: 1,
      visible: true,
    },
    {
      connectionKey: "buffer-to-homogenizer",
      kind: "materialFlow",
      fromMachineKey: "buffer-tank",
      toMachineKey: "homogenizer",
      color: "#f5a623",
      height: 1.1,
      sortOrder: 2,
      visible: true,
    },
    {
      connectionKey: "homogenizer-to-agitated",
      kind: "pipe",
      fromMachineKey: "homogenizer",
      toMachineKey: "agitated-tank",
      color: "#4f8877",
      height: 1.6,
      sortOrder: 3,
      visible: true,
    },
    {
      connectionKey: "agitated-to-filler",
      kind: "materialFlow",
      fromMachineKey: "agitated-tank",
      toMachineKey: "sauce-filler",
      color: "#ff7738",
      height: 1.0,
      sortOrder: 4,
      visible: true,
    },
    {
      connectionKey: "filler-to-sanitizer",
      kind: "conveyor",
      fromMachineKey: "sauce-filler",
      toMachineKey: "container-sanitizer",
      color: "#168aad",
      height: 0.35,
      sortOrder: 5,
      visible: true,
    },
    {
      connectionKey: "sanitizer-to-continuous",
      kind: "conveyor",
      fromMachineKey: "container-sanitizer",
      toMachineKey: "continuous-sterilizer",
      color: "#168aad",
      height: 0.35,
      sortOrder: 6,
      visible: true,
    },
  ],
};

export function cloneFactoryLayout(
  layout: FactoryLayoutDefinition
): FactoryLayoutDefinition {
  return {
    name: layout.name,
    machines: layout.machines.map((machine) => ({ ...machine })),
    connections: layout.connections.map((connection) => ({ ...connection })),
    zones: layout.zones.map((zone) => ({ ...zone })),
  };
}
