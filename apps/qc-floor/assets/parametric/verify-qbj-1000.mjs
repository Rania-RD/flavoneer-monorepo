#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appDirectory = path.resolve(scriptDirectory, "../..");
const modelPath = path.join(appDirectory, "public/models/qbj-1000-chocolate-holding-tank.glb");
const reportPath = path.join(appDirectory, "assets/previews/qbj-1000/asset-report.json");

const requiredNodes = [
  "machine.qbj-1000",
  "structure.jacketed_tank",
  "inspection.split_dust_cover",
  "inspection.agitator_drive",
  "inspection.control_cabinet",
  "inspection.sanitary_outlet",
  "utilities.heating_and_water",
];

const errors = [];
function check(condition, message) {
  if (!condition) errors.push(message);
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
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
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
check(file.readUInt32LE(0) === 0x46546c67, "Model is not a GLB container.");
check(file.readUInt32LE(4) === 2, "Model is not glTF 2.0.");
check(file.readUInt32LE(8) === file.length, "GLB header length does not match the file size.");
check(file.readUInt32LE(16) === 0x4e4f534a, "First GLB chunk is not JSON.");

const jsonLength = file.readUInt32LE(12);
const gltf = JSON.parse(file.subarray(20, 20 + jsonLength).toString("utf8").trim());
const names = new Set(gltf.nodes.map((node) => node.name));
for (const name of requiredNodes) check(names.has(name), `Missing required node ${name}.`);

const rootNode = gltf.nodes.find((node) => node.name === "machine.qbj-1000");
check(rootNode?.extras?.origin === "tank footprint center at floor level", "Root origin metadata is incorrect.");
check(rootNode?.extras?.operatorSideAxis === "+X", "Root operator-side axis must be +X.");
check(rootNode?.extras?.engineeringUse === false, "Root must state engineeringUse=false.");
check(rootNode?.extras?.capacityLiters === 1000, "Root capacity must be 1000 L.");
check(rootNode?.extras?.nominalTankDiameterMeters === 1.25, "Nominal tank diameter must be 1.25 m.");
check(rootNode?.extras?.nominalHeightMeters === 1.7, "Nominal published height must be 1.70 m.");

const bounds = {
  min: [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
  max: [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
};
let triangleCount = 0;
let vertexCount = 0;
for (const mesh of gltf.meshes) {
  for (const primitive of mesh.primitives) {
    const positions = gltf.accessors[primitive.attributes.POSITION];
    const indices = gltf.accessors[primitive.indices];
    vertexCount += positions.count;
    triangleCount += indices.count / 3;
  }
}

const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function visitNode(nodeIndex, parentMatrix) {
  const node = gltf.nodes[nodeIndex];
  const worldMatrix = multiplyMatrices(parentMatrix, nodeMatrix(node));
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

check(bounds.min[1] >= -0.001 && bounds.min[1] <= 0.001, `Floor origin is ${bounds.min[1]} m instead of 0 m.`);
check(bounds.size[0] >= 1.42 && bounds.size[0] <= 1.55, `Overall X size ${bounds.size[0]} m is outside the expected cabinet-and-valve envelope.`);
check(bounds.size[1] >= 1.69 && bounds.size[1] <= 1.78, `Overall height ${bounds.size[1]} m is outside the expected range.`);
check(bounds.size[2] >= 1.24 && bounds.size[2] <= 1.40, `Overall Z size ${bounds.size[2]} m is outside the expected utility envelope.`);

const limits = { maxFileBytes: 2_000_000, maxTriangles: 40_000, maxMaterials: 16, maxTextures: 0 };
check(file.length <= limits.maxFileBytes, `GLB is ${file.length} bytes, over the ${limits.maxFileBytes} byte limit.`);
check(triangleCount <= limits.maxTriangles, `Model has ${triangleCount} triangles, over the ${limits.maxTriangles} limit.`);
check(gltf.materials.length <= limits.maxMaterials, `Model has ${gltf.materials.length} materials, over the ${limits.maxMaterials} limit.`);
check((gltf.textures?.length ?? 0) <= limits.maxTextures, "Runtime model must not embed reference textures.");

const report = {
  schemaVersion: 1,
  status: errors.length ? "fail" : "pass",
  asset: "qbj-1000-chocolate-holding-tank.glb",
  sourceBlend: "assets/blender/qbj-1000.blend",
  referenceManifest: "assets/references/qbj-1000/manifest.json",
  format: "glTF 2.0 binary",
  nominalDimensionsMeters: { tankDiameter: 1.25, height: 1.7 },
  coordinateSystem: {
    units: "meters",
    upAxis: "+Y",
    operatorSideAxis: rootNode?.extras?.operatorSideAxis,
    origin: rootNode?.extras?.origin,
  },
  boundsMeters: bounds,
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
  limits,
  errors,
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (errors.length) {
  for (const error of errors) console.error(`FAIL: ${error}`);
  process.exit(1);
}

console.log(`PASS: ${path.relative(process.cwd(), modelPath)}`);
console.log(`Bounds: ${bounds.size.map((value) => value.toFixed(3)).join(" x ")} m`);
console.log(`Budget: ${triangleCount} triangles, ${gltf.materials.length} materials, ${file.length} bytes`);
