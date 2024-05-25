"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, Cylinder, Cone, Plane, OrbitControls } from "@react-three/drei";
import { Vector3, Mesh, Group } from "three";
import { Physics, RigidBody } from "@react-three/rapier";

const colors = {
  tan: (opacity = 1) => `rgba(210, 180, 140, ${opacity})`,
};

const bgImgColor = (color: string) => `${color}`;

interface PearlProps {
  position: Vector3;
  radius: number;
}

const Pearl: React.FC<PearlProps> = ({ position, radius }) => {
  const ref = useRef<Mesh>(null);

  useFrame(() => {
    if (ref.current) {
      // Reset the pearl position if it falls too low
      const translation = ref.current?.position;
      if (translation && translation.y < -10) {
        ref.current.position.set(Math.random() * 20 - 10, Math.random() * 10 + 20, 0);
        ref.current.rotation.set(0, 0, 0);
      }
    }
  });

  return (
    <RigidBody colliders="ball" position={position.toArray()} restitution={0.8}>
      <Sphere args={[radius, 32, 32]} ref={ref}>
        <meshStandardMaterial color="brown" />
      </Sphere>
    </RigidBody>
  );
};

const Straw: React.FC<{ mousePosition: React.MutableRefObject<Vector3> }> = ({
  mousePosition,
}) => {
  const strawRef = useRef<Group>(null);

  useFrame(() => {
    if (strawRef.current) {
      const strawHeight = 10;
      const coneHeight = 1.4;
      const strawOffset = 0.7;
      // Position the straw so the cursor is near the bottom, accounting for straw height and straw offset
      strawRef.current.position.copy(mousePosition.current).sub(new Vector3(0, coneHeight - strawHeight / 2 + strawOffset, 0));
      const tilt = (mousePosition.current.x / window.innerWidth) * Math.PI / 4; // Tilt up to 45 degrees
      strawRef.current.rotation.set(0, 0, -tilt);
    }
  });

  return (
    <group ref={strawRef}>
      <RigidBody type="fixed" colliders="hull">
        <Cylinder args={[0.7, 0.7, 10, 32]} position={[0, 5, 0.5]}>
          <meshStandardMaterial color="hsl(185,90%,80%)" transparent opacity={0.85} />
        </Cylinder>
        <Cone args={[0.7, 1.4, 32]} position={[0, -0.7, 0.5]} rotation={[Math.PI, 0, 0]}>
          <meshStandardMaterial color="hsl(185,90%,80%)" transparent opacity={0.85} />
        </Cone>
      </RigidBody>
    </group>
  );
};

const BobaContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const numPearls = 100;
  const baseRadius = 0.6;
  const [pearls, setPearls] = useState<{ position: Vector3; radius: number }[]>([]);
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
            const position = new Vector3(Math.random() * 20 - 10, Math.random() * 10 + 20, 0);
            return [...old, { position, radius }];
          } else {
            clearInterval(interval);
            return old;
          }
        });
      }, 100);
    }
  }, [pearls.length, numPearls]);

  return (
    <>
      <Canvas style={{ position: "absolute", inset: 0, background: bgImgColor(colors.tan(1)) }} orthographic camera={{ zoom: 75, position: [0, 0, 10] }}>
        <ambientLight intensity={0.8} color="white" />
        <Physics>
          {pearls.map((pearl, index) => (
            <Pearl key={index} position={pearl.position} radius={pearl.radius} />
          ))}
          <Straw mousePosition={mousePosition} />
          <RigidBody type="fixed">
            <Plane args={[20, 18]} position={[0, -9, 1]} rotation={[-Math.PI / 2, 0, 0]}>
              <meshStandardMaterial color={colors.tan(0.85)} transparent />
            </Plane>
          </RigidBody>
        </Physics>
        <OrbitControls />
      </Canvas>
      {children}
    </>
  );
};

export default BobaContainer;
