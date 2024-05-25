"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, type RootState } from "@react-three/fiber";
import { Sphere, Cylinder, Cone, Plane } from "@react-three/drei";
import { Vector3, type Mesh, type Group } from "three";

const colors = {
  tan: (opacity = 1) => `rgba(210, 180, 140, ${opacity})`,
} as const;

const bgImgColor = (color: string) => `linear-gradient(${color}, ${color})`;

interface PearlProps {
  position: Vector3;
  radius: number;
  velocity: Vector3;
  strawRef: React.RefObject<Group>;
}

const Pearl: React.FC<PearlProps> = ({
  position,
  radius,
  velocity,
  strawRef,
}) => {
  const meshRef = useRef<Mesh>(null);

  useFrame((state: RootState, _delta: number) => {
    if (meshRef.current) {
      // Calculate weight based on position (closer to the bottom) and lower velocity
      const distanceToBottom = meshRef.current.position.y + 5 - radius;
      const weight =
        1 +
        Math.max(
          0,
          (1 - distanceToBottom / 10) * (1 - velocity.length() / 0.1),
        );

      // Apply gravity
      velocity.y -= 0.002;

      // Apply friction and damping
      velocity.x *= 0.99;

      if (velocity.length() < 0.01) {
        // Stronger damping when nearly settled
        velocity.multiplyScalar(0.98);
      }

      // Check collision with straw
      if (strawRef.current) {
        const strawPosition = new Vector3();
        strawRef.current.getWorldPosition(strawPosition);
        const strawTopRadius = 0.7;
        const distanceToStraw = meshRef.current.position.distanceTo(strawPosition);

        if (distanceToStraw < radius + strawTopRadius) {
          const repulsion = new Vector3()
            .subVectors(meshRef.current.position, strawPosition)
            .normalize()
            .multiplyScalar(2); // Adjust this value as needed
          velocity.add(repulsion);
        }
      }

      // Update position
      meshRef.current.position.add(velocity);

      // Restrict to the x-y plane
      meshRef.current.position.z = 0;

      // Floor collision
      if (meshRef.current.position.y < -5 + radius) {
        meshRef.current.position.y = -5 + radius;
        velocity.y = -velocity.y * 0.9;
        if (Math.abs(velocity.y) < 0.01) {
          velocity.y = 0; // Stop endless bouncing
        }
      }

      // Wall collision
      if (
        meshRef.current.position.x < -10 + radius ||
        meshRef.current.position.x > 10 - radius
      ) {
        velocity.x = -velocity.x;
        meshRef.current.position.x = Math.max(
          -10 + radius,
          Math.min(10 - radius, meshRef.current.position.x),
        );
      }

      // Pearl collisions
      state.scene.children.forEach((obj) => {
        if (obj.type === "Mesh" && obj !== meshRef.current && obj !== strawRef.current) {
          const objMesh = obj as Mesh;
          const distance = objMesh.position.distanceTo(meshRef.current.position);
          if (distance < 2 * radius + 0.2) {
            const overlap = 2 * radius + 0.2 - distance;
            const direction = new Vector3().subVectors(meshRef.current.position, objMesh.position).normalize();
            const repulsion = direction.multiplyScalar(overlap * 0.5);

            // Apply weight to the velocity change due to collision
            meshRef.current.position.add(repulsion.multiplyScalar(1 / weight));
            objMesh.position.sub(repulsion.multiplyScalar(1 / weight));

            // Avoid jittering by modifying velocity only for significant movements
            if (velocity.length() > 0.01 || objMesh.userData.velocity?.length() > 0.01) {
              velocity.add(repulsion.multiplyScalar(1 / weight));
              if (objMesh.userData.velocity) {
                objMesh.userData.velocity.sub(repulsion.multiplyScalar(1 / weight));
              } else {
                objMesh.userData.velocity = repulsion.negate().clone().multiplyScalar(1 / weight);
              }
            } else {
              // Apply stronger damping when both velocities are low
              velocity.multiplyScalar(0.98);
              if (objMesh.userData.velocity) {
                objMesh.userData.velocity.multiplyScalar(0.98);
              }
            }
          }
        }
      });
    }
  });

  return (
    <Sphere ref={meshRef} args={[radius, 32, 32]} position={position.toArray()}>
      <meshStandardMaterial color="brown" />
    </Sphere>
  );
};

const Straw: React.FC<{ mousePosition: React.MutableRefObject<Vector3> }> = ({
  mousePosition,
}) => {
  const strawRef = useRef<Group>(null);
  const strawProps = {
    color: "hsl(185,90%,80%)",
    transparent: true,
    opacity: 0.85,
  };

  useFrame(({ viewport }) => {
    if (strawRef.current) {
      const strawHeight = 10; // Height of the straw
      const coneHeight = 1.4; // Height of the cone
      const strawOffset = 0.7; // Half the straw's width for positioning the cursor
      // Position the straw so the cursor is near the bottom, accounting for straw height and straw offset
      strawRef.current.position.copy(mousePosition.current).sub(new Vector3(0, coneHeight - strawHeight / 2 + strawOffset, 0));

      // Calculate the tilt based on the position relative to the center
      const tilt = ((mousePosition.current.x / viewport.width) * Math.PI) / 4; // Tilt up to 45 degrees
      strawRef.current.rotation.set(0, 0, -tilt);
      strawRef.current.position.z = 0;
    }
  });

  return (
    <group ref={strawRef}>
      <Cylinder args={[0.7, 0.7, 10, 32]} position={[0, 5, 0.5]}>
        <meshStandardMaterial {...strawProps} />
      </Cylinder>
      <Cone
        args={[0.7, 1.4, 32]}
        position={[0, -0.7, 0.5]}
        rotation={[Math.PI, 0, 0]}
      >
        <meshStandardMaterial {...strawProps} />
      </Cone>
    </group>
  );
};

const BobaContainer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const numPearls = 100;
  const baseRadius = 0.6;
  const [pearls, setPearls] = useState<{ position: Vector3; velocity: Vector3; radius: number }[]>([]);
  const mousePosition = useRef(new Vector3(0, 0, 0));

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (event.clientX / innerWidth) * 2 - 1;
      const y = -(event.clientY / innerHeight) * 2 + 1;
      mousePosition.current.set(x * 10, y * 10, 1); // Adjust multiplier according to your scene scale, keep straw in front by setting z to 1
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useEffect(() => {
    if (pearls.length < numPearls) {
      const interval = setInterval(() => {
        setPearls((old) => {
          if (old.length < numPearls) {
            const radius = baseRadius + (Math.random() - 0.2) * 0.1; // Randomize the radius slightly
            const position = new Vector3(Math.random() * 20 - 10, Math.random() * 10 + 30, 0);
            const velocity = new Vector3((Math.random() - 0.5) * 0.05, -(Math.random() * 0.05 + 0.025), 0);
            return [...old, { position, velocity, radius }];
          } else {
            clearInterval(interval);
            return old;
          }
        });
      }, 100);
    }
  }, [pearls.length, numPearls]);

  const strawRef = useRef<Group>(null);

  return (
    <>
      <Canvas style={{ position: "absolute", inset: 0, background: bgImgColor(colors.tan()) }} orthographic camera={{ zoom: 70, position: [0, 0, 10] }}>
        <ambientLight intensity={0.8} color="white" />
        {pearls.map((pearl, index) => (
          <Pearl key={index} position={pearl.position} radius={pearl.radius} velocity={pearl.velocity} strawRef={strawRef} />
        ))}
        <Straw mousePosition={mousePosition} />
        <Plane args={[20, 14]} position={[0, -2, 2]}>
        <meshStandardMaterial color="tan" transparent opacity={0.25} />
        </Plane>
      </Canvas>
      {children}
    </>
  );
};

export default BobaContainer;
