import { v } from "convex/values";

export const factoryMachineAssetKeyValidator = v.union(
  v.literal("tomato-paste-pasteurizer"),
  v.literal("jacketed-mixing-tank"),
  v.literal("process-tank"),
  v.literal("mixer-homogenizer"),
  v.literal("sauce-filling-machine"),
  v.literal("container-sanitizer"),
  v.literal("continuous-spray-sterilizer"),
);

export const factoryConnectionKindValidator = v.union(
  v.literal("pipe"),
  v.literal("conveyor"),
  v.literal("materialFlow"),
);

export const factoryLayoutMachineInputValidator = v.object({
  machineKey: v.string(),
  assetKey: factoryMachineAssetKeyValidator,
  label: v.string(),
  color: v.string(),
  positionX: v.number(),
  positionY: v.number(),
  positionZ: v.number(),
  rotationY: v.number(),
  scale: v.number(),
  sortOrder: v.number(),
  visible: v.boolean(),
});

export const factoryLayoutConnectionInputValidator = v.object({
  connectionKey: v.string(),
  kind: factoryConnectionKindValidator,
  fromMachineKey: v.string(),
  toMachineKey: v.string(),
  color: v.string(),
  height: v.number(),
  sortOrder: v.number(),
  visible: v.boolean(),
});

export const factoryLayoutZoneInputValidator = v.object({
  zoneKey: v.string(),
  label: v.string(),
  color: v.string(),
  positionX: v.number(),
  positionZ: v.number(),
  width: v.number(),
  depth: v.number(),
  sortOrder: v.number(),
  visible: v.boolean(),
});
