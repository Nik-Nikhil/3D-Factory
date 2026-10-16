import { useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import type { Mesh, MeshStandardMaterial } from 'three';
import { ASSETS, statusOf, type Status } from '../lib/domain';
import { useAppSelector } from '../store';
import { selectAsset } from '../lib/bridge';

const GLOW: Record<Status, string> = { ok: '#19c37d', warn: '#ffb020', alarm: '#ff4d4d' };

function Body({ id, children }: { id: string; children: ReactNode }) {
  const mat = useRef<MeshStandardMaterial>(null!);
  const status = useAppSelector((s) => statusOf(s.twin.data[id]));
  const selected = useAppSelector((s) => s.twin.selected === id);
  useFrame(({ clock }) => {   // per-frame animation lives here, NOT in React state
    mat.current.emissiveIntensity = selected ? 1.2 : status === 'alarm' ? 0.6 + 0.4 * Math.sin(clock.elapsedTime * 6) : 0.5;
  });
  return (
    <mesh>
      {children}
      <meshStandardMaterial ref={mat} color="#8fa3ab" metalness={0.5} roughness={0.35} emissive={GLOW[status]} />
    </mesh>
  );
}

function Equipment({ id, scale = 1, children }: { id: string; scale?: number; children: ReactNode }) {
  const a = ASSETS.find((x) => x.id === id)!;
  const temp = useAppSelector((s) => s.twin.data[id].temp);
  const status = useAppSelector((s) => statusOf(s.twin.data[id]));
  return (
    <group position={a.pos} onClick={(e) => { if (e.delta > 4) return; e.stopPropagation(); selectAsset(id); }}>
      <group scale={scale}>{children}</group>
      <Html position={[0, 4.4, 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            fontFamily: 'ui-monospace, Consolas, monospace',
            fontSize: 12,
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 6,
            border: '1px solid',
            whiteSpace: 'nowrap',
            background: '#122028',
            color: status === 'ok' ? '#19c37d' : status === 'warn' ? '#ffb020' : '#ff4d4d',
            borderColor: status === 'ok' ? '#19c37d' : status === 'warn' ? '#ffb020' : '#ff4d4d',
          }}
        >
          {id} · {temp.toFixed(0)}°C
        </div>
      </Html>
    </group>
  );
}

function Flow() {
  const dots = useRef<Mesh[]>([]);
  useFrame(({ clock }) => dots.current.forEach((m, i) => { if (m) m.position.x = -9 + ((clock.elapsedTime * 2 + i * 2.4) % 18); }));
  return <>{Array.from({ length: 8 }, (_, i) => (
    <mesh key={i} ref={(m) => { if (m) dots.current[i] = m; }} position={[0, 0.8, 0]}>
      <sphereGeometry args={[0.13, 12, 12]} /><meshBasicMaterial color="#4de1ff" />
    </mesh>))}</>;
}

function Ring() {
  const sel = useAppSelector((s) => s.twin.selected);
  const ring = useRef<Mesh>(null!);
  useFrame((_, dt) => { if (ring.current) ring.current.rotation.z += dt; });
  const a = ASSETS.find((x) => x.id === sel);
  if (!a) return null;
  return (
    <mesh ref={ring} position={[a.pos[0], 0.03, a.pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.8, 2, 6]} /><meshBasicMaterial color="#4de1ff" />
    </mesh>
  );
}

/** Profiling aid: live draw calls + triangles, written straight to the DOM (no React re-render). */
function Perf() {
  const gl = useThree((s) => s.gl);
  const n = useRef(0);
  useFrame(() => {
    if (++n.current % 30) return;
    const el = document.getElementById('perf');
    if (el) el.textContent = `${gl.info.render.calls} draw calls · ${gl.info.render.triangles} triangles`;
  });
  return null;
}

export default function Scene() {
  const eco = useAppSelector((s) => s.ui.eco);
  const kw = useAppSelector((s) => s.project.kw);
  const motorScale = 0.8 + kw / 250;   // sizing drives the 3D model: bigger kW, bigger motor
  return (
    <Canvas frameloop={eco ? 'demand' : 'always'} dpr={[1, 1.5]} camera={{ position: [0, 7, 13], fov: 50 }}
      aria-label="3D view of the plant. Use the asset buttons to select equipment with the keyboard.">
      <color attach="background" args={['#070d11']} />
      <fog attach="fog" args={['#070d11', 18, 40]} />
      <hemisphereLight args={['#bfe9ff', '#0b1a22', 0.8]} />
      <directionalLight position={[5, 10, 6]} intensity={0.9} />
      <gridHelper args={[40, 40, '#1f6f7a', '#12303a']} />

      <Equipment id="T-101"><group position={[0, 2, 0]}><Body id="T-101"><cylinderGeometry args={[1.5, 1.5, 4, 32]} /></Body></group></Equipment>
      <Equipment id="P-201">
        <group position={[0, 0.5, 0]}><Body id="P-201"><boxGeometry args={[1.6, 1, 1.2]} /></Body></group>
        <group position={[0, 1.5, 0]}><Body id="P-201"><cylinderGeometry args={[0.55, 0.55, 1.2, 32]} /></Body></group>
      </Equipment>
      <Equipment id="H-401"><group position={[0, 1.3, 0]} rotation={[0, 0, Math.PI / 2]}><Body id="H-401"><cylinderGeometry args={[1, 1, 3.2, 32]} /></Body></group></Equipment>
      <Equipment id="M-301" scale={motorScale}><group position={[0, 1, 0]}><Body id="M-301"><cylinderGeometry args={[0.8, 0.8, 2, 32]} /></Body></group></Equipment>

      <mesh position={[0, 0.8, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 18, 12]} /><meshStandardMaterial color="#30505b" metalness={0.6} roughness={0.4} />
      </mesh>
      <Flow /><Ring /><Perf />
      <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.1} minDistance={6} maxDistance={26} />
    </Canvas>
  );
}
