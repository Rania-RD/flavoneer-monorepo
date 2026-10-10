import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type {
  FactoryLayoutConnection,
  FactoryLayoutMachine,
  FactoryLayoutZone,
  FactoryMachineAssetKey,
} from "../../lib/factory-layout";

const assetUrls: Record<FactoryMachineAssetKey, string> = {
  "tomato-paste-pasteurizer":
    "/models/factory/tomato-paste-pasteurizer.glb",
  "jacketed-mixing-tank": "/models/factory/jacketed-mixing-tank.glb",
  "process-tank": "/models/factory/process-tank.glb",
  "mixer-homogenizer": "/models/factory/mixer-homogenizer.glb",
  "sauce-filling-machine": "/models/factory/sauce-filling-machine.glb",
  "container-sanitizer": "/models/factory/container-sanitizer.glb",
  "continuous-spray-sterilizer":
    "/models/factory/continuous-spray-sterilizer.glb",
};

interface FactoryDigitalTwinProps {
  connections: FactoryLayoutConnection[];
  machines: FactoryLayoutMachine[];
  onSelectMachine: (machineKey: string | null) => void;
  selectedMachineKey: string | null;
  zones: FactoryLayoutZone[];
}

interface AnimatedFlowDot {
  curve: THREE.CatmullRomCurve3;
  mesh: THREE.Mesh;
  offset: number;
}

function createLabelSprite(text: string, background: string, scale = 2.8) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 160;
  const context = canvas.getContext("2d");
  if (!context) {
    return new THREE.Sprite();
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = background;
  context.beginPath();
  context.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 34);
  context.fill();
  context.strokeStyle = "rgba(23, 62, 51, 0.22)";
  context.lineWidth = 5;
  context.stroke();
  context.fillStyle = "#173e33";
  context.font = "700 48px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2, 700);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale, scale * 0.208, 1);
  return sprite;
}

function makeConnectionCurve(
  from: FactoryLayoutMachine,
  to: FactoryLayoutMachine,
  height: number
) {
  const start = new THREE.Vector3(
    from.positionX,
    Math.max(0.3, from.positionY + height),
    from.positionZ
  );
  const end = new THREE.Vector3(
    to.positionX,
    Math.max(0.3, to.positionY + height),
    to.positionZ
  );
  const midpointX = (start.x + end.x) / 2;
  return new THREE.CatmullRomCurve3(
    [
      start,
      new THREE.Vector3(midpointX, start.y + 0.25, start.z),
      new THREE.Vector3(midpointX, end.y + 0.25, end.z),
      end,
    ],
    false,
    "catmullrom",
    0.16
  );
}

export function FactoryDigitalTwin({
  connections,
  machines,
  onSelectMachine,
  selectedMachineKey,
  zones,
}: FactoryDigitalTwinProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#102f27");
    scene.fog = new THREE.Fog("#102f27", 28, 58);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    camera.position.set(22, 24, 26);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-label", "Interactive 3D factory layout");
    renderer.domElement.style.display = "block";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.width = "100%";
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.minDistance = 12;
    controls.maxDistance = 52;
    controls.target.set(0, 0.8, 0);

    scene.add(new THREE.HemisphereLight("#f7f4df", "#173e33", 2.5));
    const keyLight = new THREE.DirectionalLight("#fff7db", 3.2);
    keyLight.position.set(-10, 20, 12);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -25;
    keyLight.shadow.camera.right = 25;
    keyLight.shadow.camera.top = 25;
    keyLight.shadow.camera.bottom = -25;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight("#9ad5c2", 1.8);
    fillLight.position.set(16, 10, -14);
    scene.add(fillLight);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 36),
      new THREE.MeshStandardMaterial({
        color: "#e8f1e7",
        roughness: 0.92,
        metalness: 0.02,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(30, 30, "#4f8877", "#a9cbbb");
    grid.position.y = 0.012;
    const gridMaterials = Array.isArray(grid.material)
      ? grid.material
      : [grid.material];
    for (const material of gridMaterials) {
      material.transparent = true;
      material.opacity = 0.18;
    }
    scene.add(grid);

    for (const zone of zones.filter((item) => item.visible)) {
      const zoneGroup = new THREE.Group();
      const color = new THREE.Color(zone.color);
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(zone.width, 0.08, zone.depth),
        new THREE.MeshStandardMaterial({
          color,
          transparent: true,
          opacity: 0.34,
          roughness: 0.78,
        })
      );
      pad.position.y = 0.05;
      pad.receiveShadow = true;
      zoneGroup.add(pad);
      const zoneLabel = createLabelSprite(zone.label, zone.color, 3.6);
      zoneLabel.position.set(0, 0.42, -zone.depth / 2 + 0.55);
      zoneGroup.add(zoneLabel);
      zoneGroup.position.set(zone.positionX, 0, zone.positionZ);
      scene.add(zoneGroup);
    }

    const visibleMachines = machines.filter((machine) => machine.visible);
    const machineByKey = new Map(
      visibleMachines.map((machine) => [machine.machineKey, machine])
    );
    const selectableGroups: THREE.Group[] = [];
    const loader = new GLTFLoader();
    let disposed = false;

    for (const machine of visibleMachines) {
      const machineGroup = new THREE.Group();
      machineGroup.name = machine.label;
      machineGroup.userData.machineKey = machine.machineKey;
      machineGroup.position.set(
        machine.positionX,
        machine.positionY,
        machine.positionZ
      );
      machineGroup.rotation.y = machine.rotationY;

      const marker = new THREE.Mesh(
        new THREE.RingGeometry(1.25, 1.55, 56),
        new THREE.MeshBasicMaterial({
          color: machine.color,
          transparent: true,
          opacity: machine.machineKey === selectedMachineKey ? 0.96 : 0.62,
          side: THREE.DoubleSide,
        })
      );
      marker.rotation.x = -Math.PI / 2;
      marker.position.y = 0.12;
      machineGroup.add(marker);

      const label = createLabelSprite(machine.label, machine.color);
      label.position.set(0, 3.55, 0);
      machineGroup.add(label);
      selectableGroups.push(machineGroup);
      scene.add(machineGroup);

      loader.load(
        assetUrls[machine.assetKey],
        (gltf) => {
          if (disposed) {
            return;
          }
          const model = gltf.scene;
          const initialBox = new THREE.Box3().setFromObject(model);
          const initialSize = initialBox.getSize(new THREE.Vector3());
          const largestDimension = Math.max(
            initialSize.x,
            initialSize.y,
            initialSize.z,
            0.001
          );
          const normalizedScale = (3.3 / largestDimension) * machine.scale;
          model.scale.setScalar(normalizedScale);
          model.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          model.position.x -= center.x;
          model.position.z -= center.z;
          model.position.y -= box.min.y;
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          machineGroup.add(model);
        },
        undefined,
        () => {
          if (disposed) {
            return;
          }
          const fallback = new THREE.Mesh(
            new THREE.BoxGeometry(2.4, 1.8, 1.8),
            new THREE.MeshStandardMaterial({
              color: machine.color,
              roughness: 0.45,
              metalness: 0.55,
            })
          );
          fallback.position.y = 0.95;
          fallback.castShadow = true;
          machineGroup.add(fallback);
        }
      );
    }

    const animatedDots: AnimatedFlowDot[] = [];
    for (const connection of connections.filter((item) => item.visible)) {
      const from = machineByKey.get(connection.fromMachineKey);
      const to = machineByKey.get(connection.toMachineKey);
      if (!(from && to)) {
        continue;
      }
      const color = new THREE.Color(connection.color);
      if (connection.kind === "conveyor") {
        const start = new THREE.Vector3(from.positionX, 0, from.positionZ);
        const end = new THREE.Vector3(to.positionX, 0, to.positionZ);
        const delta = end.clone().sub(start);
        const length = Math.max(0.8, delta.length() - 2.3);
        const conveyor = new THREE.Group();
        const belt = new THREE.Mesh(
          new THREE.BoxGeometry(length, 0.16, 0.7),
          new THREE.MeshStandardMaterial({
            color,
            roughness: 0.44,
            metalness: 0.18,
          })
        );
        belt.castShadow = true;
        belt.receiveShadow = true;
        conveyor.add(belt);
        for (const side of [-1, 1]) {
          const rail = new THREE.Mesh(
            new THREE.BoxGeometry(length, 0.19, 0.07),
            new THREE.MeshStandardMaterial({
              color: "#a6b2b0",
              roughness: 0.24,
              metalness: 0.9,
            })
          );
          rail.position.z = side * 0.39;
          conveyor.add(rail);
        }
        conveyor.position.copy(start.clone().add(end).multiplyScalar(0.5));
        conveyor.position.y = connection.height;
        conveyor.rotation.y = -Math.atan2(delta.z, delta.x);
        scene.add(conveyor);
        continue;
      }

      const curve = makeConnectionCurve(from, to, connection.height);
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(
          curve,
          48,
          connection.kind === "pipe" ? 0.11 : 0.065,
          12,
          false
        ),
        new THREE.MeshStandardMaterial({
          color,
          emissive:
            connection.kind === "materialFlow" ? color.clone() : undefined,
          emissiveIntensity:
            connection.kind === "materialFlow" ? 0.35 : 0,
          metalness: connection.kind === "pipe" ? 0.78 : 0.16,
          roughness: connection.kind === "pipe" ? 0.25 : 0.4,
        })
      );
      tube.castShadow = true;
      scene.add(tube);

      if (connection.kind === "materialFlow") {
        for (let index = 0; index < 5; index += 1) {
          const dot = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 18, 18),
            new THREE.MeshBasicMaterial({ color })
          );
          scene.add(dot);
          animatedDots.push({ curve, mesh: dot, offset: index / 5 });
        }
      }
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const handlePointerUp = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(selectableGroups, true);
      let current: THREE.Object3D | null = hits[0]?.object ?? null;
      while (current && typeof current.userData.machineKey !== "string") {
        current = current.parent;
      }
      onSelectMachine(current?.userData.machineKey ?? null);
    };
    renderer.domElement.addEventListener("pointerup", handlePointerUp);

    const resize = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const clock = new THREE.Clock();
    let animationFrame = 0;
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      for (const dot of animatedDots) {
        dot.mesh.position.copy(dot.curve.getPoint((elapsed * 0.11 + dot.offset) % 1));
      }
      controls.update();
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          for (const material of materials) material.dispose();
        }
        if (object instanceof THREE.Sprite) {
          object.material.map?.dispose();
          object.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [connections, machines, onSelectMachine, selectedMachineKey, zones]);

  return <div className="h-full min-h-[30rem] w-full" ref={containerRef} />;
}
