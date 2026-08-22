import { useGLTF } from "@react-three/drei";
import { useMemo, useState } from "react";
import { type Material, Mesh, type Object3D } from "three";
import { getMachineVisualScale, MACHINE_CATALOG } from "../floor/machine-catalog";
import type { EquipmentPlacement } from "../floor/types";

const STATUS_COLOR = {
  attention: "#ff7738",
  normal: "#3f8069",
  pending: "#f5a623",
};

interface EquipmentModelProps {
  equipment: EquipmentPlacement;
  onSelect: (line: string) => void;
  selected: boolean;
}

function cloneMaterial(material: Material | Material[]) {
  return Array.isArray(material) ? material.map((item) => item.clone()) : material.clone();
}

export function EquipmentModel({ equipment, onSelect, selected }: EquipmentModelProps) {
  const [hovered, setHovered] = useState(false);
  const assetKey = equipment.assetKey;
  if (!assetKey) {
    throw new Error(`Machine ${equipment.id} does not define an asset key`);
  }
  const asset = MACHINE_CATALOG[assetKey];
  const selectable = equipment.selectable !== false;
  const visualScale = equipment.visualScale ?? getMachineVisualScale(assetKey);
  const gltf = useGLTF(asset.modelUrl);
  const model = useMemo(() => {
    const next = gltf.scene.clone(true);
    next.traverse((child: Object3D) => {
      if (child instanceof Mesh) {
        child.material = cloneMaterial(child.material);
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return next;
  }, [gltf.scene]);

  const active = selectable && (selected || hovered);

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
      rotation={[0, equipment.rotationY ?? 0, 0]}
    >
      {active ? (
        <mesh position={[0, 0.045, 0]} receiveShadow>
          <boxGeometry
            args={[
              equipment.dimensions.length * visualScale + 0.55,
              0.08,
              equipment.dimensions.width * visualScale + 0.55,
            ]}
          />
          <meshStandardMaterial
            color={STATUS_COLOR[equipment.status]}
            emissive={STATUS_COLOR[equipment.status]}
            emissiveIntensity={0.35}
            transparent
            opacity={0.78}
          />
        </mesh>
      ) : null}
      <primitive object={model} scale={[visualScale, visualScale, visualScale]} />
    </group>
  );
}

for (const asset of Object.values(MACHINE_CATALOG)) {
  useGLTF.preload(asset.modelUrl);
}
