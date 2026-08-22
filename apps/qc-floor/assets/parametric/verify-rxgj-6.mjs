#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appDirectory = path.resolve(scriptDirectory, "../..");
const modelPath = path.join(appDirectory, "public/models/danxiao-rxgj-6.glb");
const reportPath = path.join(appDirectory, "assets/previews/rxgj-6/asset-report.json");
const expectedBounds = {
  min: [-2.25, 0, -1.30],
  max: [2.25, 1.82, 1.30],
  size: [4.50, 1.82, 2.60],
};
const requiredNodes = [
  "machine.rxgj-6",
  "structure.double_annular_tank",
  "inspection.rotary_mould_deck",
  "inspection.filling_station",
  "inspection.stick_insertion_station",
  "inspection.demould_pickup_station",
  "structure.transfer_guard",
  "inspection.control_panel",
  "utilities.brine_and_air",
];

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function nearlyEqual(a, b, tolerance = 0.00002) {
  return Math.abs(a - b) <= tolerance;
}

function multiplyMatrices(a, b) {
  const result = new Array(16).fill(0);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      for (let inner = 0; inner < 4; inner += 1) {
        result[column * 4 + row] += a[inner * 4 + row] * b[column * 4 + inner];
      }
    }
  }
  return result;
}

function nodeMatrix(node) {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const x2 = x + x;
  const y2 = y + y;
  const z2 = z + z;
  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;
  const yy = y * y2;
  const yz = y * z2;
  const zz = z * z2;
  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;
  return [
    (1 - (yy + zz)) * sx,
    (xy + wz) * sx,
    (xz - wy) * sx,
    0,
    (xy - wz) * sy,
    (1 - (xx + zz)) * sy,
    (yz + wx) * sy,
    0,
    (xz + wy) * sz,
    (yz - wx) * sz,
    (1 - (xx + yy)) * sz,
    0,
    tx,
    ty,
    tz,
    1,
  ];
}

function transformPoint(matrix, [x, y, z]) {
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
  ];
}

const file = fs.readFileSync(modelPath);
if (file.readUInt32LE(0) !== 0x46546c67 || file.readUInt32LE(4) !== 2) {
  fail("The model is not a valid glTF 2.0 binary container.");
  process.exit();
}
if (file.readUInt32LE(8) !== file.length) {
  fail("The GLB header length does not match the file size.");
}

const jsonLength = file.readUInt32LE(12);
if (file.readUInt32LE(16) !== 0x4e4f534a) {
  fail("The first GLB chunk is not JSON.");
  process.exit();
}
const gltf = JSON.parse(file.subarray(20, 20 + jsonLength).toString("utf8").trim());
const names = new Set(gltf.nodes.map((node) => node.name));
for (const nodeName of requiredNodes) {
  if (!names.has(nodeName)) fail(`Missing required node ${nodeName}.`);
}

const rootNode = gltf.nodes.find((node) => node.name === "machine.rxgj-6");
if (rootNode?.extras?.productFlowAxis !== "+X") {
  fail("The root node does not document +X product flow.");
}
if (rootNode?.extras?.origin !== "footprint center at floor level") {
  fail("The root node origin metadata is missing or incorrect.");
}
if (rootNode?.extras?.engineeringUse !== false) {
  fail("The root node must state engineeringUse=false.");
}

const bounds = {
  min: [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
  max: [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
};
const worldOrigins = new Map();
let triangleCount = 0;
let vertexCount = 0;
for (const mesh of gltf.meshes) {
  for (const primitive of mesh.primitives) {
    const positionAccessor = gltf.accessors[primitive.attributes.POSITION];
    const indexAccessor = gltf.accessors[primitive.indices];
    vertexCount += positionAccessor.count;
    triangleCount += indexAccessor.count / 3;
  }
}

const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function visitNode(nodeIndex, parentMatrix) {
  const node = gltf.nodes[nodeIndex];
  const worldMatrix = multiplyMatrices(parentMatrix, nodeMatrix(node));
  if (node.name) worldOrigins.set(node.name, [worldMatrix[12], worldMatrix[13], worldMatrix[14]]);
  if (node.mesh !== undefined) {
    for (const primitive of gltf.meshes[node.mesh].primitives) {
      const accessor = gltf.accessors[primitive.attributes.POSITION];
      for (const x of [accessor.min[0], accessor.max[0]]) {
        for (const y of [accessor.min[1], accessor.max[1]]) {
          for (const z of [accessor.min[2], accessor.max[2]]) {
            const point = transformPoint(worldMatrix, [x, y, z]);
            for (let axis = 0; axis < 3; axis += 1) {
              bounds.min[axis] = Math.min(bounds.min[axis], point[axis]);
              bounds.max[axis] = Math.max(bounds.max[axis], point[axis]);
            }
          }
        }
      }
    }
  }
  for (const child of node.children ?? []) visitNode(child, worldMatrix);
}

for (const nodeIndex of gltf.scenes[gltf.scene ?? 0].nodes) visitNode(nodeIndex, identity);
bounds.size = bounds.max.map((value, axis) => value - bounds.min[axis]);

const dispenserAlignment = {};
function checkDispenserBank(label, nodePrefix, expectedAngleDegrees) {
  const rowRadii = [0.61, 0.83, 1.055];
  dispenserAlignment[label] = [];
  for (let index = 0; index < rowRadii.length; index += 1) {
    const nodeName = `${nodePrefix}.${String(index + 1).padStart(2, "0")}`;
    const origin = worldOrigins.get(nodeName);
    if (!origin) {
      fail(`Missing dispenser alignment node ${nodeName}.`);
      continue;
    }
    const deltaX = origin[0] - -0.95;
    const deltaZ = -origin[2];
    const radius = Math.hypot(deltaX, deltaZ);
    const angleDegrees = (Math.atan2(deltaZ, deltaX) * 180 / Math.PI + 360) % 360;
    const radiusPass = nearlyEqual(radius, rowRadii[index], 0.005);
    const angleDifference = Math.abs(((angleDegrees - expectedAngleDegrees + 540) % 360) - 180);
    const anglePass = angleDifference <= 0.25;
    if (!radiusPass || !anglePass) {
      fail(`${nodeName} is not centered on mould row ${index + 1} at ${expectedAngleDegrees} degrees.`);
    }
    dispenserAlignment[label].push({
      node: nodeName,
      row: index + 1,
      radiusMeters: radius,
      expectedRadiusMeters: rowRadii[index],
      angleDegrees,
      expectedAngleDegrees,
      pass: radiusPass && anglePass,
    });
  }
}

checkDispenserBank("fillingNozzles", "filling.nozzle", 216);
checkDispenserBank("stickMagazines", "stick.magazine", 144);

for (const key of ["min", "max", "size"]) {
  for (let axis = 0; axis < 3; axis += 1) {
    if (!nearlyEqual(bounds[key][axis], expectedBounds[key][axis])) {
      fail(`${key}[${axis}] is ${bounds[key][axis]}, expected ${expectedBounds[key][axis]}.`);
    }
  }
}

const report = {
  schemaVersion: 1,
  status: process.exitCode ? "fail" : "pass",
  asset: "danxiao-rxgj-6.glb",
  sourceBlend: "assets/blender/rxgj-6.blend",
  referenceManifest: "assets/references/rxgj-6/manifest.json",
  format: "glTF 2.0 binary",
  coordinateSystem: {
    units: "meters",
    upAxis: "+Y",
    productFlowAxis: rootNode?.extras?.productFlowAxis,
    origin: rootNode?.extras?.origin,
  },
  boundsMeters: bounds,
  expectedBoundsMeters: expectedBounds,
  dispenserAlignment,
  budget: {
    fileBytes: file.length,
    triangles: triangleCount,
    vertices: vertexCount,
    meshes: gltf.meshes.length,
    materials: gltf.materials.length,
    textures: gltf.textures?.length ?? 0,
  },
  selectableNodes: gltf.nodes.filter((node) => node.extras?.selectable).map((node) => node.name),
  requiredNodeChecks: Object.fromEntries(requiredNodes.map((name) => [name, names.has(name)])),
  limits: {
    maxFileBytes: 4_000_000,
    maxTriangles: 90_000,
    maxMaterials: 12,
    maxTextures: 0,
  },
};

if (report.budget.fileBytes > report.limits.maxFileBytes) {
  fail(`File size ${report.budget.fileBytes} exceeds ${report.limits.maxFileBytes} bytes.`);
}
if (report.budget.triangles > report.limits.maxTriangles) {
  fail(`Triangle count ${report.budget.triangles} exceeds ${report.limits.maxTriangles}.`);
}
if (report.budget.materials > report.limits.maxMaterials) {
  fail(`Material count ${report.budget.materials} exceeds ${report.limits.maxMaterials}.`);
}
if (report.budget.textures > report.limits.maxTextures) {
  fail(`Texture count ${report.budget.textures} exceeds ${report.limits.maxTextures}.`);
}

report.status = process.exitCode ? "fail" : "pass";
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`${report.status.toUpperCase()}: ${path.relative(process.cwd(), modelPath)}`);
console.log(`Bounds X/Y/Z: ${bounds.size.map((value) => value.toFixed(3)).join(" x ")} m`);
console.log(`Budget: ${triangleCount} triangles, ${gltf.materials.length} materials, ${file.length} bytes`);
console.log(`Report: ${path.relative(process.cwd(), reportPath)}`);
