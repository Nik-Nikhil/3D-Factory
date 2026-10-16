export type Status = 'ok' | 'warn' | 'alarm';
export interface Reading { temp: number; vib: number }
export interface AssetDef { id: string; name: string; pos: [number, number, number]; base: Reading }
export type Starter = 'dol' | 'soft' | 'vfd';

// motor sizing config
export interface MotorProject {
  name: string;
  kw: number;
  voltage: 400 | 690;
  starter: Starter;
}

// tank config
export interface TankProject {
  volume: number;        // litres
  material: 'carbon' | 'ss304' | 'ss316';
  insulated: boolean;
}

// pump config
export interface PumpProject {
  flowRate: number;      // m³/h
  head: number;          // metres
  fluid: 'water' | 'oil' | 'chemical';
}

// heat exchanger config
export interface HxProject {
  dutyKw: number;        // heat duty kW
  hotInlet: number;      // °C
  coldInlet: number;     // °C
  type: 'shell' | 'plate' | 'air';
}

// the overall project holds all four
export interface Project {
  motor: MotorProject;
  tank: TankProject;
  pump: PumpProject;
  hx: HxProject;
}

export interface BomLine { sku: string; desc: string; qty: number; unit: number }

export const ASSETS: AssetDef[] = [
  { id: 'T-101', name: 'Feed tank',      pos: [-6, 0, 0], base: { temp: 62, vib: 1.2 } },
  { id: 'P-201', name: 'Transfer pump',  pos: [-2, 0, 0], base: { temp: 68, vib: 2.6 } },
  { id: 'H-401', name: 'Heat exchanger', pos: [2, 0, 0],  base: { temp: 74, vib: 1.4 } },
  { id: 'M-301', name: 'Mixer motor',    pos: [6, 0, 0],  base: { temp: 72, vib: 3.0 } },
];

// one rule, used everywhere: 3D glow, sidebar dot, assistant answers
export const statusOf = (r: Reading): Status =>
  r.temp > 90 || r.vib > 7 ? 'alarm' : r.temp > 82 || r.vib > 5 ? 'warn' : 'ok';

// ---- BOM builders (each returns a flat list of line items) ----

const pick = (list: number[], need: number) =>
  list.find((x) => x >= need) ?? list[list.length - 1];

export function buildMotorBom(p: MotorProject): BomLine[] {
  const amps   = (p.kw * 1000) / (Math.sqrt(3) * p.voltage * 0.88 * 0.9);
  const breaker = pick([16, 25, 40, 63, 100, 160, 250, 400], amps * 1.25);
  const cable   = pick([4, 6, 10, 16, 25, 50, 95, 150], amps / 5);
  const rating  = pick([7.5, 15, 30, 55, 110, 200], p.kw * 1.15);
  const starter: BomLine =
    p.starter === 'vfd'  ? { sku: `VFD-${rating}`,  desc: `Variable frequency drive ${rating} kW`, qty: 1, unit: 180 * rating + 300 } :
    p.starter === 'soft' ? { sku: `SST-${rating}`,  desc: `Soft starter ${rating} kW`,             qty: 1, unit: 90 * rating + 200  } :
                           { sku: `CON-${rating}`,  desc: `Contactor + overload ${rating} kW`,     qty: 1, unit: 25 * rating + 60   };
  return [
    starter,
    { sku: `BRK-${breaker}A`, desc: `Motor circuit breaker ${breaker} A`,   qty: 1,  unit: 4 * breaker + 40  },
    { sku: `CBL-${cable}`,    desc: `Motor cable ${cable} mm², 20 m`,        qty: 20, unit: 1.2 * cable + 1   },
    { sku: p.kw <= 55 ? 'PNL-600' : 'PNL-1200',
      desc: p.kw <= 55 ? 'Panel enclosure 600×800' : 'Panel enclosure 800×1200',
      qty: 1, unit: p.kw <= 55 ? 420 : 900 },
  ];
}

export function buildTankBom(p: TankProject): BomLine[] {
  const matMultiplier = p.material === 'ss316' ? 2.8 : p.material === 'ss304' ? 2.0 : 1.0;
  const basePrice = 120 + p.volume * 0.9;
  return [
    { sku: `TNK-${p.volume}L`, desc: `Tank ${p.volume} L, ${p.material.toUpperCase()}`,   qty: 1, unit: basePrice * matMultiplier },
    { sku: 'VLV-BSP1',         desc: 'Ball valve BSP 1"',                                  qty: 2, unit: 48  },
    { sku: 'LVL-ULT',          desc: 'Ultrasonic level sensor',                            qty: 1, unit: 210 },
    ...(p.insulated ? [{ sku: 'INS-ROCK', desc: 'Rockwool insulation jacket', qty: 1, unit: 180 + p.volume * 0.3 }] : []),
  ];
}

export function buildPumpBom(p: PumpProject): BomLine[] {
  const powerKw = (p.flowRate * p.head * 1000 * 9.81) / (3600 * 1000 * 0.72); // hydraulic power
  const pumpSize = pick([0.37, 0.75, 1.5, 3, 5.5, 11, 22], powerKw * 1.2);
  const fluidMult = p.fluid === 'chemical' ? 1.6 : p.fluid === 'oil' ? 1.2 : 1.0;
  return [
    { sku: `PMP-${pumpSize}KW`, desc: `Centrifugal pump ${pumpSize} kW, ${p.fluid}`, qty: 1, unit: (800 + pumpSize * 120) * fluidMult },
    { sku: 'CSG-316',           desc: 'Mechanical seal, SS316',                        qty: 1, unit: 95  },
    { sku: 'FLG-PN16',          desc: 'Flanged connection set PN16',                   qty: 2, unit: 65  },
    { sku: 'PRS-04B',           desc: 'Pressure gauge 0–4 bar',                        qty: 1, unit: 38  },
  ];
}

export function buildHxBom(p: HxProject): BomLine[] {
  const area = p.dutyKw / 0.5; // rough: 500 W per m²
  const typeMultiplier = p.type === 'plate' ? 1.0 : p.type === 'shell' ? 1.4 : 0.8;
  return [
    { sku: `HX-${p.type.toUpperCase()}-${Math.ceil(area)}M2`,
      desc: `${p.type === 'shell' ? 'Shell & tube' : p.type === 'plate' ? 'Plate' : 'Air cooled'} HX, ${Math.ceil(area)} m²`,
      qty: 1, unit: (1200 + area * 180) * typeMultiplier },
    { sku: 'TMP-PT100', desc: 'PT100 temperature sensor',                qty: 4, unit: 55  },
    { sku: 'VLV-CTRL',  desc: 'Control valve with actuator',             qty: 1, unit: 480 },
    { sku: 'INS-PIPE',  desc: 'Pipe insulation set (hot side)',          qty: 1, unit: 140 },
  ];
}

export function buildBom(p: Project): BomLine[] {
  return [
    ...buildMotorBom(p.motor),
    ...buildTankBom(p.tank),
    ...buildPumpBom(p.pump),
    ...buildHxBom(p.hx),
  ];
}

export const bomTotal = (lines: BomLine[]) =>
  lines.reduce((s, l) => s + l.qty * l.unit, 0);
