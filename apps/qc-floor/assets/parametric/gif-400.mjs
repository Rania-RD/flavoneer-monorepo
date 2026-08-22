#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appDirectory = path.resolve(scriptDirectory, "../..");
const outputDirectory = path.join(appDirectory, "public/models");
const previewDirectory = path.join(appDirectory, "assets/previews/gif-400");

// Keep the established rebuild command, but make the Blender source the
// default now that Blender is available. Pass --legacy-parametric only when
// comparing against the earlier schematic generator below.
if (!process.argv.includes("--legacy-parametric")) {
  const blenderScript = path.join(appDirectory, "assets/blender/gif-400.py");
  const macBlender = "/Applications/Blender.app/Contents/MacOS/Blender";
  const blenderBinary = process.env.GIF400_BLENDER_BINARY ??
    (fs.existsSync(macBlender) ? macBlender : "blender");
  const result = spawnSync(
    blenderBinary,
    ["--background", "--factory-startup", "--python", blenderScript],
    { cwd: path.resolve(appDirectory, "../.."), stdio: "inherit" },
  );
  if (result.error) {
    console.error(`Unable to start Blender at ${blenderBinary}: ${result.error.message}`);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

const envelope = { lengthX: 1.49, widthZ: 0.6, heightY: 1.6 };
const materials = {
  stainless: { color: "#aeb8bb", metallic: 0.78, roughness: 0.28 },
  stainlessDark: { color: "#657277", metallic: 0.72, roughness: 0.34 },
  stainlessLight: { color: "#d8dede", metallic: 0.72, roughness: 0.24 },
  seam: { color: "#263338", metallic: 0.25, roughness: 0.55 },
  controlBlue: { color: "#327fa3", metallic: 0.08, roughness: 0.4 },
  screen: { color: "#183844", metallic: 0.05, roughness: 0.28 },
  safetyRed: { color: "#c9342d", metallic: 0.04, roughness: 0.36 },
};

const features = [];

function feature(name, group, material) {
  const result = { name, group, material, positions: [], normals: [], indices: [] };
  features.push(result);
  return result;
}

function pushFace(target, vertices, normal) {
  const offset = target.positions.length / 3;
  for (const vertex of vertices) {
    target.positions.push(...vertex);
    target.normals.push(...normal);
  }
  target.indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
}

function addBox(target, center, size) {
  const [cx, cy, cz] = center;
  const [sx, sy, sz] = size.map((value) => value / 2);
  const x0 = cx - sx;
  const x1 = cx + sx;
  const y0 = cy - sy;
  const y1 = cy + sy;
  const z0 = cz - sz;
  const z1 = cz + sz;
  pushFace(
    target,
    [
      [x1, y0, z0],
      [x1, y1, z0],
      [x1, y1, z1],
      [x1, y0, z1],
    ],
    [1, 0, 0],
  );
  pushFace(
    target,
    [
      [x0, y0, z1],
      [x0, y1, z1],
      [x0, y1, z0],
      [x0, y0, z0],
    ],
    [-1, 0, 0],
  );
  pushFace(
    target,
    [
      [x0, y1, z0],
      [x0, y1, z1],
      [x1, y1, z1],
      [x1, y1, z0],
    ],
    [0, 1, 0],
  );
  pushFace(
    target,
    [
      [x0, y0, z1],
      [x0, y0, z0],
      [x1, y0, z0],
      [x1, y0, z1],
    ],
    [0, -1, 0],
  );
  pushFace(
    target,
    [
      [x1, y0, z1],
      [x1, y1, z1],
      [x0, y1, z1],
      [x0, y0, z1],
    ],
    [0, 0, 1],
  );
  pushFace(
    target,
    [
      [x0, y0, z0],
      [x0, y1, z0],
      [x1, y1, z0],
      [x1, y0, z0],
    ],
    [0, 0, -1],
  );
}

function addCylinder(target, center, radius, length, axis = "Y", segments = 20) {
  const [cx, cy, cz] = center;
  const half = length / 2;
  const point = (angle, offset) => {
    const a = Math.cos(angle) * radius;
    const b = Math.sin(angle) * radius;
    if (axis === "X") return [cx + offset, cy + a, cz + b];
    if (axis === "Z") return [cx + a, cy + b, cz + offset];
    return [cx + a, cy + offset, cz + b];
  };
  const normal = (angle) => {
    const a = Math.cos(angle);
    const b = Math.sin(angle);
    if (axis === "X") return [0, a, b];
    if (axis === "Z") return [a, b, 0];
    return [a, 0, b];
  };
  const capNormal = axis === "X" ? [1, 0, 0] : axis === "Z" ? [0, 0, 1] : [0, 1, 0];
  const centerPoint = (offset) =>
    axis === "X"
      ? [cx + offset, cy, cz]
      : axis === "Z"
        ? [cx, cy, cz + offset]
        : [cx, cy + offset, cz];

  for (let segment = 0; segment < segments; segment += 1) {
    const a0 = (segment / segments) * Math.PI * 2;
    const a1 = ((segment + 1) / segments) * Math.PI * 2;
    const p00 = point(a0, -half);
    const p01 = point(a0, half);
    const p10 = point(a1, -half);
    const p11 = point(a1, half);
    const offset = target.positions.length / 3;
    target.positions.push(...p00, ...p01, ...p11, ...p10);
    target.normals.push(...normal(a0), ...normal(a0), ...normal(a1), ...normal(a1));
    target.indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);

    const frontOffset = target.positions.length / 3;
    target.positions.push(...centerPoint(half), ...p11, ...p01);
    target.normals.push(...capNormal, ...capNormal, ...capNormal);
    target.indices.push(frontOffset, frontOffset + 1, frontOffset + 2);

    const backNormal = capNormal.map((value) => -value);
    const backOffset = target.positions.length / 3;
    target.positions.push(...centerPoint(-half), ...p00, ...p10);
    target.normals.push(...backNormal, ...backNormal, ...backNormal);
    target.indices.push(backOffset, backOffset + 1, backOffset + 2);
  }
}

const cabinet = feature("cabinet.refrigeration_chassis", "structure.cabinet", "stainless");
addBox(cabinet, [-0.21, 0.87, 0], [1.07, 1.46, 0.6]);
addBox(cabinet, [-0.21, 1.575, 0], [1.07, 0.05, 0.6]);

const feet = feature("cabinet.adjustable_feet", "structure.cabinet", "stainlessDark");
for (const x of [-0.63, 0.18]) {
  for (const z of [-0.22, 0.22]) {
    addCylinder(feet, [x, 0.07, z], 0.025, 0.14, "Y", 14);
    addCylinder(feet, [x, 0.012, z], 0.055, 0.024, "Y", 18);
  }
}

const panelSeams = feature("cabinet.service_panel_seams", "structure.cabinet", "seam");
addBox(panelSeams, [0.326, 0.87, 0], [0.004, 1.31, 0.006]);
addBox(panelSeams, [0.326, 0.84, 0], [0.004, 0.006, 0.55]);
addBox(panelSeams, [-0.3, 0.87, 0.297], [0.005, 1.2, 0.006]);
addBox(panelSeams, [-0.3, 0.85, -0.297], [0.005, 1.2, 0.006]);

const sideHandles = feature("cabinet.service_handles", "structure.cabinet", "stainlessDark");
addBox(sideHandles, [-0.25, 0.77, 0.294], [0.18, 0.025, 0.012]);
addBox(sideHandles, [-0.25, 0.77, -0.294], [0.18, 0.025, 0.012]);

const controlPanel = feature("controls.hmi_panel", "inspection.control_panel", "controlBlue");
addBox(controlPanel, [0.332, 1.3, 0.095], [0.014, 0.48, 0.31]);
const screen = feature("controls.hmi_screen", "inspection.control_panel", "screen");
addBox(screen, [0.341, 1.405, 0.095], [0.012, 0.17, 0.2]);
const controlButtons = feature("controls.buttons", "inspection.control_panel", "stainlessLight");
for (let index = 0; index < 4; index += 1) {
  addCylinder(controlButtons, [0.352, 1.25 - index * 0.07, 0.04], 0.018, 0.025, "X", 14);
}
const emergencyStop = feature("controls.emergency_stop", "inspection.control_panel", "safetyRed");
addCylinder(emergencyStop, [0.365, 1.06, 0.17], 0.04, 0.05, "X", 18);

const upperHousing = feature(
  "process.upper_discharge_housing",
  "inspection.product_outlet",
  "stainlessLight",
);
addCylinder(upperHousing, [0.48, 1.12, -0.11], 0.115, 0.3, "X", 24);
addCylinder(upperHousing, [0.65, 1.12, -0.11], 0.125, 0.05, "X", 24);
addCylinder(upperHousing, [0.68, 1.12, -0.11], 0.055, 0.05, "X", 18);

const centerFlange = feature(
  "process.freezing_cylinder_flange",
  "inspection.product_outlet",
  "stainlessLight",
);
addCylinder(centerFlange, [0.39, 0.77, 0.1], 0.135, 0.12, "X", 28);
addCylinder(centerFlange, [0.47, 0.77, 0.1], 0.072, 0.08, "X", 20);

const lowerHousing = feature("process.lower_mix_pump", "inspection.mix_inlet", "stainlessLight");
addCylinder(lowerHousing, [0.49, 0.44, -0.12], 0.1, 0.32, "X", 24);
addCylinder(lowerHousing, [0.66, 0.44, -0.12], 0.11, 0.05, "X", 24);
addCylinder(lowerHousing, [0.7, 0.44, -0.12], 0.045, 0.09, "X", 18);

const pipework = feature(
  "process.exposed_sanitary_pipework",
  "utilities.sanitary_piping",
  "stainlessLight",
);
addCylinder(pipework, [0.53, 0.96, -0.11], 0.028, 0.22, "Y", 14);
addCylinder(pipework, [0.53, 0.86, -0.005], 0.028, 0.21, "Z", 14);
addCylinder(pipework, [0.53, 0.815, 0.1], 0.028, 0.09, "Y", 14);
addCylinder(pipework, [0.53, 0.57, -0.12], 0.024, 0.14, "Y", 14);
addCylinder(pipework, [0.53, 0.63, -0.01], 0.024, 0.22, "Z", 14);

const valves = feature("process.valves_and_clamps", "utilities.sanitary_piping", "stainlessDark");
addBox(valves, [0.57, 1.255, -0.11], [0.08, 0.035, 0.16]);
addBox(valves, [0.58, 0.575, -0.12], [0.07, 0.16, 0.035]);
addCylinder(valves, [0.55, 0.68, 0.1], 0.045, 0.035, "X", 16);

const labels = feature("controls.identity_strip", "inspection.control_panel", "stainlessDark");
addBox(labels, [0.341, 1.08, 0.095], [0.012, 0.07, 0.31]);
const modelBadge = feature("controls.model_badge", "inspection.control_panel", "controlBlue");
addBox(modelBadge, [0.349, 1.08, 0.015], [0.01, 0.035, 0.1]);

function colorToLinearRgb(hex) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  return channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
}

function align4(value) {
  return (value + 3) & ~3;
}

function minMax(positions) {
  const min = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const max = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  for (let index = 0; index < positions.length; index += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], positions[index + axis]);
      max[axis] = Math.max(max[axis], positions[index + axis]);
    }
  }
  return { min, max };
}

function buildGlb() {
  const materialNames = Object.keys(materials);
  const gltf = {
    asset: { version: "2.0", generator: "Flavoneer Gram GIF 400 parametric blockout 1.0" },
    scene: 0,
    scenes: [{ name: "Gram GIF 400", nodes: [0] }],
    nodes: [
      {
        name: "machine.gif-400",
        children: [],
        extras: {
          units: "meters",
          origin: "footprint center at floor level",
          productFlowAxis: "+X",
          externalEnvelope: [envelope.lengthX, envelope.heightY, envelope.widthZ],
          engineeringUse: false,
        },
      },
    ],
    meshes: [],
    accessors: [],
    bufferViews: [],
    buffers: [{ byteLength: 0 }],
    materials: materialNames.map((name) => {
      const material = materials[name];
      return {
        name: `material.${name}`,
        pbrMetallicRoughness: {
          baseColorFactor: [...colorToLinearRgb(material.color), 1],
          metallicFactor: material.metallic,
          roughnessFactor: material.roughness,
        },
      };
    }),
  };

  const groupNames = [...new Set(features.map((item) => item.group))];
  const groupNodes = new Map();
  for (const groupName of groupNames) {
    const nodeIndex = gltf.nodes.length;
    groupNodes.set(groupName, nodeIndex);
    gltf.nodes.push({
      name: groupName,
      children: [],
      extras: { selectable: groupName.startsWith("inspection.") },
    });
    gltf.nodes[0].children.push(nodeIndex);
  }

  const binaryParts = [];
  let byteOffset = 0;
  const appendTypedArray = (typedArray, target) => {
    const paddingBefore = align4(byteOffset) - byteOffset;
    if (paddingBefore > 0) {
      binaryParts.push(Buffer.alloc(paddingBefore));
      byteOffset += paddingBefore;
    }
    const buffer = Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
    const bufferViewIndex = gltf.bufferViews.length;
    gltf.bufferViews.push({ buffer: 0, byteOffset, byteLength: buffer.length, target });
    binaryParts.push(buffer);
    byteOffset += buffer.length;
    return bufferViewIndex;
  };

  for (const item of features) {
    const positions = new Float32Array(item.positions);
    const normals = new Float32Array(item.normals);
    const indices = new Uint32Array(item.indices);
    const positionView = appendTypedArray(positions, 34962);
    const normalView = appendTypedArray(normals, 34962);
    const indexView = appendTypedArray(indices, 34963);
    const bounds = minMax(item.positions);
    const positionAccessor = gltf.accessors.length;
    gltf.accessors.push({
      bufferView: positionView,
      componentType: 5126,
      count: positions.length / 3,
      type: "VEC3",
      min: bounds.min,
      max: bounds.max,
    });
    const normalAccessor = gltf.accessors.length;
    gltf.accessors.push({
      bufferView: normalView,
      componentType: 5126,
      count: normals.length / 3,
      type: "VEC3",
    });
    const indexAccessor = gltf.accessors.length;
    gltf.accessors.push({
      bufferView: indexView,
      componentType: 5125,
      count: indices.length,
      type: "SCALAR",
    });
    const meshIndex = gltf.meshes.length;
    gltf.meshes.push({
      name: `mesh.${item.name}`,
      primitives: [
        {
          attributes: { POSITION: positionAccessor, NORMAL: normalAccessor },
          indices: indexAccessor,
          material: materialNames.indexOf(item.material),
          mode: 4,
        },
      ],
    });
    const nodeIndex = gltf.nodes.length;
    gltf.nodes.push({ name: item.name, mesh: meshIndex });
    gltf.nodes[groupNodes.get(item.group)].children.push(nodeIndex);
  }

  const binaryBuffer = Buffer.concat(binaryParts);
  gltf.buffers[0].byteLength = binaryBuffer.length;
  const jsonBuffer = Buffer.from(JSON.stringify(gltf), "utf8");
  const paddedJsonLength = align4(jsonBuffer.length);
  const paddedBinaryLength = align4(binaryBuffer.length);
  const totalLength = 12 + 8 + paddedJsonLength + 8 + paddedBinaryLength;
  const output = Buffer.alloc(totalLength, 0);
  output.writeUInt32LE(0x46546c67, 0);
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(totalLength, 8);
  output.writeUInt32LE(paddedJsonLength, 12);
  output.writeUInt32LE(0x4e4f534a, 16);
  jsonBuffer.copy(output, 20);
  output.fill(0x20, 20 + jsonBuffer.length, 20 + paddedJsonLength);
  const binaryHeader = 20 + paddedJsonLength;
  output.writeUInt32LE(paddedBinaryLength, binaryHeader);
  output.writeUInt32LE(0x004e4942, binaryHeader + 4);
  binaryBuffer.copy(output, binaryHeader + 8);
  return output;
}

function triangleNormal(a, b, c) {
  const ab = b.map((value, axis) => value - a[axis]);
  const ac = c.map((value, axis) => value - a[axis]);
  const cross = [
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0],
  ];
  const length = Math.hypot(...cross) || 1;
  return cross.map((value) => value / length);
}

function shadeColor(hex, factor) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  const adjusted = channels.map((channel) =>
    Math.round(Math.max(0, Math.min(255, channel * factor))),
  );
  return `#${adjusted.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function subtract(a, b) {
  return a.map((value, axis) => value - b[axis]);
}

function dot(a, b) {
  return a.reduce((sum, value, axis) => sum + value * b[axis], 0);
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(vector) {
  const length = Math.hypot(...vector) || 1;
  return vector.map((value) => value / length);
}

function renderSvg(name, camera) {
  const target = [0, 0.82, 0];
  const forward = normalize(subtract(target, camera));
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const light = normalize([0.35, 0.82, 0.44]);
  const triangles = [];
  const points = [];
  const project = (vertex) => {
    const relative = subtract(vertex, camera);
    const projected = [dot(relative, right), dot(relative, up), dot(relative, forward)];
    points.push(projected);
    return projected;
  };
  for (const item of features) {
    for (let index = 0; index < item.indices.length; index += 3) {
      const vertices = [0, 1, 2].map((offset) => {
        const positionIndex = item.indices[index + offset] * 3;
        return item.positions.slice(positionIndex, positionIndex + 3);
      });
      const projected = vertices.map(project);
      const normal = triangleNormal(...vertices);
      const brightness = 0.68 + Math.abs(dot(normal, light)) * 0.42;
      triangles.push({
        projected,
        depth: projected.reduce((sum, point) => sum + point[2], 0) / 3,
        color: shadeColor(materials[item.material].color, brightness),
      });
    }
  }
  const minX = Math.min(...points.map((point) => point[0]));
  const maxX = Math.max(...points.map((point) => point[0]));
  const minY = Math.min(...points.map((point) => point[1]));
  const maxY = Math.max(...points.map((point) => point[1]));
  const scale = Math.min(820 / (maxX - minX), 520 / (maxY - minY));
  const offsetX = 500 - ((minX + maxX) / 2) * scale;
  const offsetY = 365 + ((minY + maxY) / 2) * scale;
  triangles.sort((a, b) => b.depth - a.depth);
  const polygons = triangles
    .map((triangle) => {
      const polygonPoints = triangle.projected
        .map(
          (point) =>
            `${(offsetX + point[0] * scale).toFixed(2)},${(offsetY - point[1] * scale).toFixed(2)}`,
        )
        .join(" ");
      return `<polygon points="${polygonPoints}" fill="${triangle.color}" stroke="#5b686b" stroke-width="0.2"/>`;
    })
    .join("\n");
  const title = name.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="720" viewBox="0 0 1000 720">
  <rect width="1000" height="720" fill="#f4f5f2"/>
  <ellipse cx="500" cy="610" rx="300" ry="30" fill="#dfe3df"/>
  <g>${polygons}</g>
  <g font-family="Arial, Helvetica, sans-serif" fill="#173e33">
    <text x="42" y="50" font-size="24" font-weight="700">Gram GIF 400 · ${title}</text>
    <text x="42" y="77" font-size="14" fill="#527568">Approximate QC-floor blockout · not for engineering use</text>
    <text x="42" y="687" font-size="14">Envelope: 1.49 m L × 0.60 m W × 1.60 m H · +X product flow</text>
  </g>
</svg>`;
}

function buildStl() {
  const triangleCount = features.reduce((sum, item) => sum + item.indices.length / 3, 0);
  const output = Buffer.alloc(84 + triangleCount * 50);
  output.write("Flavoneer Gram GIF 400 schematic blockout", 0, "ascii");
  output.writeUInt32LE(triangleCount, 80);
  let offset = 84;
  for (const item of features) {
    for (let index = 0; index < item.indices.length; index += 3) {
      const vertices = [0, 1, 2].map((vertexOffset) => {
        const positionIndex = item.indices[index + vertexOffset] * 3;
        return item.positions.slice(positionIndex, positionIndex + 3);
      });
      const normal = triangleNormal(...vertices);
      for (const value of normal) {
        output.writeFloatLE(value, offset);
        offset += 4;
      }
      for (const vertex of vertices) {
        for (const value of vertex) {
          output.writeFloatLE(value, offset);
          offset += 4;
        }
      }
      output.writeUInt16LE(0, offset);
      offset += 2;
    }
  }
  return output;
}

fs.mkdirSync(outputDirectory, { recursive: true });
fs.mkdirSync(previewDirectory, { recursive: true });
fs.writeFileSync(path.join(outputDirectory, "gram-gif-400.glb"), buildGlb());
fs.writeFileSync(path.join(outputDirectory, "gram-gif-400.stl"), buildStl());
fs.writeFileSync(path.join(previewDirectory, "front.svg"), renderSvg("front", [4, 2.3, 0]));
fs.writeFileSync(path.join(previewDirectory, "side.svg"), renderSvg("side", [0, 2.3, 4]));
fs.writeFileSync(
  path.join(previewDirectory, "three-quarter.svg"),
  renderSvg("three-quarter", [4, 2.9, 3.2]),
);

console.log(
  `Generated ${path.relative(process.cwd(), path.join(outputDirectory, "gram-gif-400.glb"))}`,
);
console.log(
  `Generated ${path.relative(process.cwd(), path.join(outputDirectory, "gram-gif-400.stl"))}`,
);
console.log(`Generated ${path.relative(process.cwd(), previewDirectory)}/*.svg`);
