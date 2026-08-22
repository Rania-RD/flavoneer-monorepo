import { ContactShadows, Html, OrbitControls, useProgress } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import { MOUSE, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { PRODUCTION_HALL_1 } from "../floor/factory-layout";
import { getMachineVisualScale } from "../floor/machine-catalog";
import type { EquipmentPlacement, EquipmentStatus } from "../floor/types";
import { EquipmentModel } from "./EquipmentModel";
import { FacilityObject, HallArchitecture } from "./HallArchitecture";

export type CameraMode = "overview" | "top" | "selected";

export interface CameraRequest {
  mode: CameraMode;
  nonce: number;
  selectedLine: string | null;
}

interface SceneProps {
  cameraRequest: CameraRequest;
  onSelect: (line: string) => void;
  selectedLine: string | null;
}

const STATUS_PRIORITY: EquipmentStatus[] = ["attention", "pending", "normal"];

function equipmentScale(equipment: EquipmentPlacement) {
  return equipment.kind === "machine"
    ? (equipment.visualScale ?? getMachineVisualScale(equipment.assetKey))
    : 1;
}

function lineBounds(line: string) {
  const equipment = PRODUCTION_HALL_1.equipment.filter(
    (item) => item.line === line && item.selectable !== false,
  );
  if (equipment.length === 0) {
    return null;
  }
  const bounds = equipment.reduce(
    (current, item) => {
      const scale = equipmentScale(item);
      const rotation = item.rotationY ?? 0;
      const length = item.dimensions.length * scale;
      const width = item.dimensions.width * scale;
      const halfX =
        (Math.abs(Math.cos(rotation)) * length + Math.abs(Math.sin(rotation)) * width) / 2;
      const halfZ =
        (Math.abs(Math.sin(rotation)) * length + Math.abs(Math.cos(rotation)) * width) / 2;
      return {
        maxHeight: Math.max(current.maxHeight, item.dimensions.height * scale),
        maxX: Math.max(current.maxX, item.position[0] + halfX),
        maxZ: Math.max(current.maxZ, item.position[2] + halfZ),
        minX: Math.min(current.minX, item.position[0] - halfX),
        minZ: Math.min(current.minZ, item.position[2] - halfZ),
      };
    },
    {
      maxHeight: 0,
      maxX: Number.NEGATIVE_INFINITY,
      maxZ: Number.NEGATIVE_INFINITY,
      minX: Number.POSITIVE_INFINITY,
      minZ: Number.POSITIVE_INFINITY,
    },
  );

  return {
    centerX: (bounds.minX + bounds.maxX) / 2,
    centerZ: (bounds.minZ + bounds.maxZ) / 2,
    equipment,
    height: bounds.maxHeight,
    spanX: bounds.maxX - bounds.minX,
    spanZ: bounds.maxZ - bounds.minZ,
    status:
      equipment
        .map((item) => item.status)
        .sort((a, b) => STATUS_PRIORITY.indexOf(a) - STATUS_PRIORITY.indexOf(b))[0] ?? "normal",
  };
}

function CameraDirector({ request }: { request: CameraRequest }) {
  const { camera, invalidate } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const animation = useRef({
    active: false,
    elapsed: 0,
    fromPosition: new Vector3(),
    fromTarget: new Vector3(),
    toPosition: new Vector3(),
    toTarget: new Vector3(),
  });

  useEffect(() => {
    const hallCenter = PRODUCTION_HALL_1.center ?? [0, 0];
    const selected = request.selectedLine ? lineBounds(request.selectedLine) : null;
    const target = selected
      ? new Vector3(selected.centerX, Math.min(selected.height * 0.45, 3.5), selected.centerZ)
      : new Vector3(hallCenter[0], 0.5, hallCenter[1]);
    let position = new Vector3(hallCenter[0] + 43, 49, hallCenter[1] + 66);

    if (request.mode === "top") {
      position = new Vector3(hallCenter[0], 115, hallCenter[1] + 0.01);
    } else if (request.mode === "selected" && selected) {
      const cameraDistance = Math.max(selected.spanX, selected.spanZ) + 10;
      position = new Vector3(
        selected.centerX + cameraDistance * 0.72,
        Math.max(8, selected.height + 5),
        selected.centerZ + cameraDistance,
      );
    }

    animation.current = {
      active: true,
      elapsed: 0,
      fromPosition: camera.position.clone(),
      fromTarget: controls.current?.target.clone() ?? new Vector3(),
      toPosition: position,
      toTarget: target,
    };
    invalidate();
  }, [camera, invalidate, request]);

  useFrame((_, delta) => {
    const state = animation.current;
    if (!(state.active && controls.current)) {
      return;
    }
    state.elapsed = Math.min(1, state.elapsed + delta / 0.72);
    const eased = 1 - (1 - state.elapsed) ** 3;
    camera.position.lerpVectors(state.fromPosition, state.toPosition, eased);
    controls.current.target.lerpVectors(state.fromTarget, state.toTarget, eased);
    controls.current.update();
    if (state.elapsed >= 1) {
      state.active = false;
    } else {
      invalidate();
    }
  });

  return (
    <OrbitControls
      enableDamping={false}
      enablePan
      maxDistance={180}
      maxPolarAngle={Math.PI / 2.05}
      minDistance={8}
      minPolarAngle={0.12}
      mouseButtons={{ LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }}
      onChange={() => invalidate()}
      ref={controls}
      screenSpacePanning={false}
    />
  );
}

function SceneLoader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="scene-loader" role="status">
        <span>{Math.round(progress)}%</span>
      </div>
    </Html>
  );
}

function ProductionLineLabel({ line }: { line: string }) {
  const group = lineBounds(line);
  if (!group) {
    return null;
  }
  return (
    <Html
      center
      className="scene-label"
      position={[group.centerX, group.height + 0.85, group.centerZ]}
      zIndexRange={[20, 0]}
    >
      <span className="scene-label__dot" data-status={group.status} />
      <span>{line}</span>
    </Html>
  );
}

function HallContents({ onSelect, selectedLine }: Omit<SceneProps, "cameraRequest">) {
  return (
    <>
      <HallArchitecture layout={PRODUCTION_HALL_1} />
      {PRODUCTION_HALL_1.equipment.map((equipment) => {
        if (equipment.kind === "facility") {
          return (
            <FacilityObject
              equipment={equipment}
              key={equipment.id}
              onSelect={onSelect}
              selected={equipment.selectable !== false && selectedLine === equipment.line}
            />
          );
        }
        return (
          <EquipmentModel
            equipment={equipment}
            key={equipment.id}
            onSelect={onSelect}
            selected={equipment.selectable !== false && selectedLine === equipment.line}
          />
        );
      })}
      {selectedLine ? <ProductionLineLabel line={selectedLine} /> : null}
      <ContactShadows
        blur={2.2}
        far={13}
        opacity={0.32}
        position={[0, 0.02, 0]}
        resolution={1024}
        scale={100}
      />
    </>
  );
}

export function ProductionHallScene(props: SceneProps) {
  return (
    <Canvas
      camera={{ far: 240, fov: 37, near: 0.1, position: [43, 49, 66] }}
      dpr={[1, 1.6]}
      frameloop="demand"
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onPointerMissed={() => props.onSelect("")}
      shadows
    >
      <color args={["#dce9df"]} attach="background" />
      <fog args={["#dce9df", 120, 220]} attach="fog" />
      <ambientLight intensity={1.35} />
      <hemisphereLight color="#fffbed" groundColor="#6b7e71" intensity={1.5} />
      <directionalLight
        castShadow
        color="#fff9e9"
        intensity={2.4}
        position={[24, 42, 18]}
        shadow-camera-bottom={-55}
        shadow-camera-far={120}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-mapSize-height={2048}
        shadow-mapSize-width={2048}
      />
      <Suspense fallback={<SceneLoader />}>
        <HallContents onSelect={props.onSelect} selectedLine={props.selectedLine} />
      </Suspense>
      <CameraDirector request={props.cameraRequest} />
    </Canvas>
  );
}
