import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

/* ──────────────────── Coordinate Helpers ──────────────────── */
function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
        -(radius * Math.sin(phi) * Math.cos(theta)),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
}

/* ──────────────────── Earth Sphere ──────────────────── */
function Earth() {
    const meshRef = useRef();
    const dayTexture = useLoader(THREE.TextureLoader, '/textures/earth_day.png');
    const nightTexture = useLoader(THREE.TextureLoader, '/textures/earth_night.png');

    useFrame(() => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.0003;
        }
    });

    return (
        <mesh ref={meshRef}>
            <sphereGeometry args={[2, 64, 64]} />
            <meshStandardMaterial
                map={dayTexture}
                emissiveMap={nightTexture}
                emissive={new THREE.Color(0.3, 0.3, 0.4)}
                emissiveIntensity={0.6}
                roughness={1}
                metalness={0}
            />
        </mesh>
    );
}

/* ──────────────────── Cloud Layer ──────────────────── */
function CloudLayer() {
    const cloudRef = useRef();
    const cloudTexture = useLoader(THREE.TextureLoader, '/textures/earth_clouds.png');

    useFrame(() => {
        if (cloudRef.current) {
            cloudRef.current.rotation.y += 0.0004;
        }
    });

    return (
        <mesh ref={cloudRef}>
            <sphereGeometry args={[2.03, 64, 64]} />
            <meshStandardMaterial
                map={cloudTexture}
                transparent={true}
                opacity={0.35}
                depthWrite={false}
            />
        </mesh>
    );
}

/* ──────────────────── Storm Vortex Marker ──────────────────── */
function StormVortex({ lat, lon, riskIndex }) {
    const vortexRef = useRef();
    const ringRef = useRef();
    const pos = useMemo(() => latLonToVector3(lat, lon, 2.08), [lat, lon]);

    const isActive = riskIndex > 70;
    const color = isActive ? '#FF3B3B' : riskIndex > 50 ? '#FFA500' : '#00E5FF';

    useFrame((state) => {
        if (vortexRef.current) {
            vortexRef.current.rotation.y += 0.04;
            const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
            vortexRef.current.scale.setScalar(pulse);
        }
        if (ringRef.current) {
            ringRef.current.rotation.z += 0.02;
            const ringPulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
            ringRef.current.scale.setScalar(ringPulse);
        }
    });

    if (riskIndex < 30) return null;

    return (
        <group position={pos}>
            {/* Vortex cone */}
            <mesh ref={vortexRef} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.12, 0.25, 16]} />
                <meshStandardMaterial
                    color={color}
                    transparent
                    opacity={0.7}
                    emissive={color}
                    emissiveIntensity={0.8}
                />
            </mesh>
            {/* Glow ring */}
            <mesh ref={ringRef}>
                <torusGeometry args={[0.15, 0.02, 8, 32]} />
                <meshStandardMaterial
                    color={color}
                    transparent
                    opacity={0.5}
                    emissive={color}
                    emissiveIntensity={1}
                />
            </mesh>
            {/* Eye glow */}
            <pointLight color={color} intensity={isActive ? 2 : 0.8} distance={1} />
        </group>
    );
}

/* ──────────────────── Trajectory Cone ──────────────────── */
function TrajectoryCone({ lat, lon, riskIndex, windSpeed }) {
    const coneRef = useRef();
    const pos = useMemo(() => latLonToVector3(lat, lon, 2.1), [lat, lon]);

    useFrame((state) => {
        if (coneRef.current) {
            coneRef.current.rotation.y += 0.005;
            const pulse = 0.5 + Math.sin(state.clock.elapsedTime) * 0.1;
            coneRef.current.material.opacity = pulse;
        }
    });

    if (riskIndex < 50) return null;

    // Cone size scales with wind speed
    const coneSize = Math.min(0.8, windSpeed / 150);

    return (
        <mesh ref={coneRef} position={pos} rotation={[0, 0, Math.PI / 4]}>
            <coneGeometry args={[coneSize, coneSize * 1.5, 16, 1, true]} />
            <meshStandardMaterial
                color="#FF3B3B"
                transparent
                opacity={0.3}
                side={THREE.DoubleSide}
                emissive="#FF3B3B"
                emissiveIntensity={0.3}
            />
        </mesh>
    );
}

/* ──────────────────── Storm Track Arcs ──────────────────── */
function StormTrackArc({ points, color, weight }) {
    const curve = useMemo(() => {
        if (!points || points.length < 2) return null;
        const vectors = points.map(p => {
            const pos = latLonToVector3(
                parseFloat(p.LAT),
                parseFloat(p.LON),
                2.04
            );
            return pos;
        });
        return new THREE.CatmullRomCurve3(vectors);
    }, [points]);

    if (!curve) return null;

    const tubeArgs = useMemo(() => {
        return [curve, 64, weight * 0.003, 6, false];
    }, [curve, weight]);

    return (
        <mesh>
            <tubeGeometry args={tubeArgs} />
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.5}
                transparent
                opacity={0.8}
            />
        </mesh>
    );
}

function getTrackColor(windKnots) {
    if (windKnots < 34) return { color: '#5DADE2', weight: 2 };
    if (windKnots < 64) return { color: '#00E5FF', weight: 3 };
    if (windKnots < 96) return { color: '#FFA500', weight: 4 };
    return { color: '#FF3B3B', weight: 5 };
}

function StormTracks({ tracksData, selectedYear }) {
    const tracks = useMemo(() => {
        if (!tracksData) return [];
        const result = [];
        Object.entries(tracksData).forEach(([sid, points]) => {
            if (!points || points.length < 2) return;
            const inYear = points.some(p => p.ISO_TIME?.startsWith(String(selectedYear)));
            if (!inYear) return;

            const maxWind = Math.max(...points.map(p => (parseFloat(p.WIND_KMH) || 0) / 1.852));
            const style = getTrackColor(maxWind);
            result.push({ sid, points, ...style });
        });
        return result;
    }, [tracksData, selectedYear]);

    return (
        <>
            {tracks.map(t => (
                <StormTrackArc key={t.sid} points={t.points} color={t.color} weight={t.weight} />
            ))}
        </>
    );
}

/* ──────────────────── Ocean Heat Overlay ──────────────────── */
function OceanHeatOverlay({ sst }) {
    const overlayRef = useRef();

    useFrame((state) => {
        if (overlayRef.current) {
            const pulse = 0.05 + Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
            overlayRef.current.material.opacity = sst > 26.5 ? pulse : 0;
        }
    });

    const heatColor = useMemo(() => {
        if (sst < 26.5) return '#0066ff';
        if (sst < 28) return '#ffaa00';
        if (sst < 30) return '#ff6600';
        return '#ff0000';
    }, [sst]);

    return (
        <mesh ref={overlayRef}>
            <sphereGeometry args={[2.01, 64, 64]} />
            <meshStandardMaterial
                color={heatColor}
                transparent
                opacity={0}
                emissive={heatColor}
                emissiveIntensity={0.4}
                side={THREE.BackSide}
            />
        </mesh>
    );
}

/* ──────────────────── Main Globe Export ──────────────────── */
export default function CycloneGlobe({
    riskIndex = 0,
    sst = 27,
    windSpeed = 20,
    stormLat = 15,
    stormLon = 85,
    tracksData = null,
    selectedYear = 2020
}) {
    return (
        <div style={{
            width: '100%',
            height: '500px',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid rgba(36,144,204,0.3)',
            background: 'radial-gradient(ellipse at center, #0a1628 0%, #020d18 100%)',
            position: 'relative'
        }}>
            <Canvas
                camera={{ position: [0, 1, 5], fov: 45 }}
                gl={{ antialias: true, alpha: true }}
                dpr={[1, 1.5]}
            >
                {/* Lighting */}
                <ambientLight intensity={0.15} color="#4488cc" />
                <directionalLight position={[5, 3, 5]} intensity={1.8} color="#ffffff" />
                <directionalLight position={[-5, -2, -5]} intensity={0.1} color="#223366" />

                {/* Space background */}
                <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />

                {/* Earth */}
                <Earth />
                <CloudLayer />
                <OceanHeatOverlay sst={sst} />

                {/* Storm visualization */}
                <StormVortex lat={stormLat} lon={stormLon} riskIndex={riskIndex} />
                <TrajectoryCone lat={stormLat} lon={stormLon} riskIndex={riskIndex} windSpeed={windSpeed} />
                <StormTracks tracksData={tracksData} selectedYear={selectedYear} />

                {/* Controls */}
                <OrbitControls
                    enablePan={false}
                    minDistance={3.5}
                    maxDistance={10}
                    enableDamping
                    dampingFactor={0.05}
                    rotateSpeed={0.5}
                />
            </Canvas>
        </div>
    );
}
