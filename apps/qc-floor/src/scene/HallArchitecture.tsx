import { Text } from "@react-three/drei";
import { useState } from "react";
import type { EquipmentPlacement, HallLayout } from "../floor/types";

const STATUS_COLOR = {
  attention: "#ff7738",
  normal: "#6a9b88",
  pending: "#f5a623",
};

function HallBeam({
  position,
  size,
}: {
  position: [number, number, number];
  size: [number, number, number];
}) {
  return (
    <mesh castShadow position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#d9ddd5" metalness={0.45} roughness={0.46} />
    </mesh>
  );
}

export function HallArchitecture({ layout }: { layout: HallLayout }) {
  const centerX = layout.center?.[0] ?? 0;
  const centerZ = layout.center?.[1] ?? 0;
  const halfX = layout.dimensions.length / 2;
  const halfZ = layout.dimensions.width / 2;
  const backZ = centerZ - halfZ;
  const frontZ = centerZ + halfZ;
  const entranceWidth = 4.6;
  const entranceX = centerX + halfX - entranceWidth / 2;
  const frontWallWidth = layout.dimensions.length - entranceWidth;
  const frontWallX = centerX - halfX + frontWallWidth / 2;

  return (
    <group>
      <mesh receiveShadow position={[centerX, -0.12, centerZ]}>
        <boxGeometry args={[layout.dimensions.length, 0.24, layout.dimensions.width]} />
        <meshStandardMaterial color="#dfe8df" roughness={0.92} />
      </mesh>

      {layout.lineZones.map((zone) => (
        <group key={zone.id}>
          <mesh position={[zone.center[0], 0.012, zone.center[1]]} receiveShadow>
            <boxGeometry args={[zone.size[0], 0.024, zone.size[1]]} />
            <meshStandardMaterial
              color={STATUS_COLOR[zone.status]}
              transparent
              opacity={zone.status === "normal" ? 0.055 : 0.1}
            />
          </mesh>
          <Text
            anchorX="left"
            anchorY="middle"
            color={STATUS_COLOR[zone.status]}
            fontSize={0.72}
            letterSpacing={0.12}
            position={[
              zone.center[0] - zone.size[0] / 2 + 0.8,
              0.035,
              zone.center[1] - zone.size[1] / 2 + 0.7,
            ]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            {zone.label.toUpperCase()}
          </Text>
        </group>
      ))}

      <HallBeam position={[centerX, 0.35, backZ]} size={[layout.dimensions.length, 0.7, 0.28]} />
      <HallBeam position={[frontWallX, 0.35, frontZ]} size={[frontWallWidth, 0.7, 0.28]} />
      <HallBeam
        position={[centerX - halfX, 0.35, centerZ]}
        size={[0.28, 0.7, layout.dimensions.width]}
      />
      <HallBeam
        position={[centerX + halfX, 0.35, centerZ]}
        size={[0.28, 0.7, layout.dimensions.width]}
      />

      <mesh position={[entranceX, 3.25, frontZ + 0.03]}>
        <boxGeometry args={[entranceWidth, 6.5, 0.18]} />
        <meshStandardMaterial color="#1f6592" metalness={0.15} roughness={0.54} />
      </mesh>
      <mesh position={[entranceX, 3.15, frontZ - 0.08]}>
        <boxGeometry args={[3.85, 5.75, 0.11]} />
        <meshStandardMaterial color="#b8def2" metalness={0.1} roughness={0.5} />
      </mesh>
      <group position={[entranceX, 2.8, frontZ + 0.19]}>
        <mesh>
          <boxGeometry args={[3.15, 0.17, 0.16]} />
          <meshStandardMaterial color="#2f8f64" metalness={0.28} roughness={0.42} />
        </mesh>
        <mesh position={[-1.42, 0, 0.09]}>
          <boxGeometry args={[0.16, 0.42, 0.12]} />
          <meshStandardMaterial color="#246f50" metalness={0.3} roughness={0.4} />
        </mesh>
        <mesh position={[1.42, 0, 0.09]}>
          <boxGeometry args={[0.16, 0.42, 0.12]} />
          <meshStandardMaterial color="#246f50" metalness={0.3} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

interface FacilityProps {
  equipment: EquipmentPlacement;
  onSelect: (line: string) => void;
  selected: boolean;
}

export function FacilityObject({ equipment, onSelect, selected }: FacilityProps) {
  const [hovered, setHovered] = useState(false);
  const selectable = equipment.selectable !== false;
  const { length, width, height } = equipment.dimensions;
  const isLane = equipment.id === "exit-lane";
  const active = selectable && (hovered || selected);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: The WebGL group has a keyboard-accessible DOM list fallback.
    <group
      onClick={(event) => {
        if (!selectable) {
          return;
        }
        event.stopPropagation();
        onSelect(equipment.line);
      }}
      onPointerEnter={(event) => {
        if (!selectable) {
          return;
        }
        event.stopPropagation();
        document.body.style.cursor = "pointer";
        setHovered(true);
      }}
      onPointerLeave={() => {
        document.body.style.cursor = "default";
        setHovered(false);
      }}
      position={equipment.position}
    >
      <mesh position={[0, height / 2, 0]} castShadow={!isLane} receiveShadow>
        <boxGeometry args={[length, height, width]} />
        <meshStandardMaterial
          color={isLane ? "#f5a623" : "#d2f2d4"}
          emissive={active ? "#f5a623" : "#000000"}
          emissiveIntensity={active ? 0.18 : 0}
          metalness={isLane ? 0 : 0.2}
          roughness={0.68}
          transparent={isLane}
          opacity={isLane ? 0.7 : 1}
        />
      </mesh>
      <Text
        anchorX="center"
        anchorY="middle"
        color="#173e33"
        fontSize={0.65}
        maxWidth={width - 0.4}
        position={[0, isLane ? 0.1 : height + 0.35, 0]}
        rotation={isLane ? [-Math.PI / 2, 0, 0] : [0, -Math.PI / 2, 0]}
      >
        {equipment.label}
      </Text>
    </group>
  );
}
