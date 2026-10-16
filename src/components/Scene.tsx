import { useRef, useMemo, type ReactNode } from 'react';
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

  useFrame(({ clock }) => {
    mat.current.emissiveIntensity =
      selected           ? 1.2 :
      status === 'alarm' ? 0.6 + 0.4 * Math.sin(clock.elapsedTime * 6) :
                           0.5;
  });

  return (
    <mesh>
      {children}
      <meshStandardMaterial ref={mat} color="#8fa3ab" metalness={0.5} roughness={0.35} emissive={GLOW[status]} />
    </mesh>
  );
}

function Equipment({
  id, pos, scale = 1, labelY = 4.4, children
}: {
  id: string; pos: [number, number, number]; scale?: number; labelY?: number; children: ReactNode;
}) {
  const temp = useAppSelector((s) => s.twin.data[id].temp);
  const status = useAppSelector((s) => statusOf(s.twin.data[id]));

  return (
    <group position={pos} onClick={(e) => { if (e.delta > 4) return; e.stopPropagation(); selectAsset(id); }}>
      <group scale={scale}>{children}</group>
      <Html position={[0, labelY, 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
        <div style={{
          fontFamily: 'ui-monospace, Consolas, monospace',
          fontSize: 12, fontWeight: 600,
          padding: '3px 8px', borderRadius: 6, border: '1px solid',
          whiteSpace: 'nowrap', background: '#122028',
          color:       status === 'ok' ? '#19c37d' : status === 'warn' ? '#ffb020' : '#ff4d4d',
          borderColor: status === 'ok' ? '#19c37d' : status === 'warn' ? '#ffb020' : '#ff4d4d',
        }}>
          {id} · {temp.toFixed(0)}°C
        </div>
      </Html>
    </group>
  );
}

// flowing dots along the pipe
function Flow({ start, end }: { start: number; end: number }) {
  const dots = useRef<Mesh[]>([]);
  const length = end - start;
  useFrame(({ clock }) =>
    dots.current.forEach((m, i) => {
      if (m) m.position.x = start + ((clock.elapsedTime * 2 + i * (length / 6)) % length);
    })
  );
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} ref={(m) => { if (m) dots.current[i] = m; }} position={[0, 0.8, 0]}>
          <sphereGeometry args={[0.13, 12, 12]} />
          <meshBasicMaterial color="#4de1ff" />
        </mesh>
      ))}
    </>
  );
}

// spinning selection ring under the active machine
function Ring({ positions }: { positions: { [K in 'T-101' | 'P-201' | 'H-401' | 'M-301']: [number, number, number] } & { pipeStart: number; pipeEnd: number } }) {
  const sel  = useAppSelector((s) => s.twin.selected);
  const ring = useRef<Mesh>(null!);
  useFrame((_, dt) => { if (ring.current) ring.current.rotation.z += dt; });
  const pos = sel && sel in positions && Array.isArray(positions[sel as keyof typeof positions]) ? positions[sel as 'T-101' | 'P-201' | 'H-401' | 'M-301'] : null;
  if (!pos) return null;
  return (
    <mesh ref={ring} position={[pos[0], 0.03, pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.8, 2, 6]} />
      <meshBasicMaterial color="#4de1ff" />
    </mesh>
  );
}

// draw-call counter
function Perf() {
  const gl = useThree((s) => s.gl);
  const n  = useRef(0);
  useFrame(() => {
    if (++n.current % 30) return;
    const el = document.getElementById('perf');
    if (el) el.textContent = `${gl.info.render.calls} draw calls · ${gl.info.render.triangles} triangles`;
  });
  return null;
}

export default function Scene() {
  const eco = useAppSelector((s) => s.ui.eco);

  // pull sizing values
  const tankVolume  = useAppSelector((s) => s.project.tank.volume);   // 200–10 000 L
  const pumpFlow    = useAppSelector((s) => s.project.pump.flowRate); // 1–100 m³/h
  const hxDuty      = useAppSelector((s) => s.project.hx.dutyKw);     // 10–500 kW
  const motorKw     = useAppSelector((s) => s.project.motor.kw);      // 5–200 kW

  // scale formulas
  const tankScale   = 0.6 + (tankVolume / 10000) * 1.4;
  const pumpScale   = 0.7 + (pumpFlow   / 100)   * 0.8;
  const hxScale     = 0.7 + (hxDuty     / 500)   * 1.0;
  const motorScale  = 0.8 + (motorKw    / 200)   * 0.8;

  // label heights
  const tankLabelY  = tankScale  * 4.5;
  const pumpLabelY  = pumpScale  * 3.2;
  const hxLabelY    = hxScale    * 3.0;
  const motorLabelY = motorScale * 3.5;

  // dynamic positions — each machine placed left edge → center → right edge, then gap
  const positions = useMemo(() => {
    const tankRadius  = tankScale  * 2.0;
    const pumpRadius  = pumpScale  * 1.2;
    const hxRadius    = hxScale    * 2.0;
    const motorRadius = motorScale * 1.2;

    const gap = 1.5;

    // start cursor at 0, place each machine the same way:
    // center = cursor + radius, then advance cursor past right edge + gap
    let cursor = 0;

    const tankX = cursor + tankRadius;
    cursor = tankX + tankRadius + gap;

    const pumpX = cursor + pumpRadius;
    cursor = pumpX + pumpRadius + gap;

    const hxX = cursor + hxRadius;
    cursor = hxX + hxRadius + gap;

    const motorX = cursor + motorRadius;

    // center the whole line on the scene origin
    const totalWidth = motorX + motorRadius;
    const offset = -totalWidth / 2;

    return {
      'T-101': [tankX  + offset, 0, 0] as [number, number, number],
      'P-201': [pumpX  + offset, 0, 0] as [number, number, number],
      'H-401': [hxX    + offset, 0, 0] as [number, number, number],
      'M-301': [motorX + offset, 0, 0] as [number, number, number],
      pipeStart: offset,
      pipeEnd:   motorX + motorRadius + offset,
    };
  }, [tankScale, pumpScale, hxScale, motorScale]);

  const pipeStart  = positions.pipeStart;
  const pipeEnd    = positions.pipeEnd;
  const pipeLength = pipeEnd - pipeStart;
  const pipeMidX   = (pipeStart + pipeEnd) / 2;

  return (
    <Canvas
      frameloop={eco ? 'demand' : 'always'}
      dpr={[1, 1.5]}
      camera={{ position: [0, 7, 13], fov: 50 }}
      aria-label="3D factory floor. Use the asset buttons to select equipment."
    >
      <color attach="background" args={['#070d11']} />
      <fog   attach="fog"        args={['#070d11', 18, 40]} />
      <hemisphereLight args={['#bfe9ff', '#0b1a22', 0.8]} />
      <directionalLight position={[5, 10, 6]} intensity={0.9} />
      <gridHelper args={[40, 40, '#1f6f7a', '#12303a']} />

      {/* T-101 — storage tank */}
      <Equipment id="T-101" pos={positions['T-101']} scale={tankScale} labelY={tankLabelY}>
        <group position={[0, 2, 0]}>
          <Body id="T-101">
            <cylinderGeometry args={[1.5, 1.5, 4, 32]} />
          </Body>
        </group>
      </Equipment>

      {/* P-201 — centrifugal pump */}
      <Equipment id="P-201" pos={positions['P-201']} scale={pumpScale} labelY={pumpLabelY}>
        <group position={[0, 0.5, 0]}>
          <Body id="P-201"><boxGeometry args={[1.6, 1, 1.2]} /></Body>
        </group>
        <group position={[0, 1.5, 0]}>
          <Body id="P-201"><cylinderGeometry args={[0.55, 0.55, 1.2, 32]} /></Body>
        </group>
      </Equipment>

      {/* H-401 — heat exchanger */}
      <Equipment id="H-401" pos={positions['H-401']} scale={hxScale} labelY={hxLabelY}>
        <group position={[0, 1.3, 0]} rotation={[0, 0, Math.PI / 2]}>
          <Body id="H-401">
            <cylinderGeometry args={[1, 1, 3.2, 32]} />
          </Body>
        </group>
      </Equipment>

      {/* M-301 — electric motor */}
      <Equipment id="M-301" pos={positions['M-301']} scale={motorScale} labelY={motorLabelY}>
        <group position={[0, 1, 0]}>
          <Body id="M-301">
            <cylinderGeometry args={[0.8, 0.8, 2, 32]} />
          </Body>
        </group>
      </Equipment>

      {/* connecting pipe — stretches to fit all machines */}
      <mesh position={[pipeMidX, 0.8, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, pipeLength, 12]} />
        <meshStandardMaterial color="#30505b" metalness={0.6} roughness={0.4} />
      </mesh>

      <Flow start={pipeStart} end={pipeEnd} />
      <Ring positions={positions} />
      <Perf />
      <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.1} minDistance={6} maxDistance={26} />
    </Canvas>
  );
}
