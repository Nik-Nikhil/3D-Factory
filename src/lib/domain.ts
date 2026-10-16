export type Status = 'ok' | 'warn' | 'alarm';
export interface Reading { temp: number; vib: number }
export interface AssetDef { id: string; name: string; pos: [number, number, number]; base: Reading }
export type Starter = 'dol' | 'soft' | 'vfd';
export interface Project { name: string; kw: number; voltage: 400 | 690; starter: Starter }
export interface BomLine { sku: string; desc: string; qty: number; unit: number }

export const ASSETS: AssetDef[] = [
  { id: 'T-101', name: 'Feed tank',      pos: [-6, 0, 0], base: { temp: 62, vib: 1.2 } },
  { id: 'P-201', name: 'Transfer pump',  pos: [-2, 0, 0], base: { temp: 68, vib: 2.6 } },
  { id: 'H-401', name: 'Heat exchanger', pos: [2, 0, 0],  base: { temp: 74, vib: 1.4 } },
  { id: 'M-301', name: 'Mixer motor',    pos: [6, 0, 0],  base: { temp: 72, vib: 3.0 } },
];

// One rule decides the colour everywhere (3D glow, labels, panels, assistant).
export const statusOf = (r: Reading): Status =>
  r.temp > 90 || r.vib > 7 ? 'alarm' : r.temp > 82 || r.vib > 5 ? 'warn' : 'ok';

/* ---- Sizing: motor kW + voltage + starter type -> bill of materials (generic demo catalog) ---- */
const pick = (list: number[], need: number): number => list.find((x) => x >= need) ?? list[list.length - 1];

export function buildBom(p: Project): BomLine[] {
  const amps = (p.kw * 1000) / (Math.sqrt(3) * p.voltage * 0.88 * 0.9);      // full-load current (approx.)
  const breaker = pick([16, 25, 40, 63, 100, 160, 250, 400], amps * 1.25);
  const cable = pick([4, 6, 10, 16, 25, 50, 95, 150], amps / 5);              // mm2, rough rule
  const rating = pick([7.5, 15, 30, 55, 110, 200], p.kw * 1.15);              // 15% margin
  const starter: BomLine =
    p.starter === 'vfd'  ? { sku: `VFD-${rating}`, desc: `Variable frequency drive ${rating} kW`, qty: 1, unit: 180 * rating + 300 } :
    p.starter === 'soft' ? { sku: `SST-${rating}`, desc: `Soft starter ${rating} kW`,             qty: 1, unit: 90 * rating + 200 } :
                           { sku: `CON-${rating}`, desc: `Contactor + overload ${rating} kW`,     qty: 1, unit: 25 * rating + 60 };
  return [
    starter,
    { sku: `BRK-${breaker}A`, desc: `Motor circuit breaker ${breaker} A`, qty: 1, unit: 4 * breaker + 40 },
    { sku: `CBL-${cable}`, desc: `Motor cable ${cable} mm2, 20 m`, qty: 20, unit: 1.2 * cable + 1 },
    { sku: p.kw <= 55 ? 'PNL-600' : 'PNL-1200', desc: p.kw <= 55 ? 'Panel enclosure 600x800' : 'Panel enclosure 800x1200', qty: 1, unit: p.kw <= 55 ? 420 : 900 },
  ];
}
export const bomTotal = (l: BomLine[]) => l.reduce((s, x) => s + x.qty * x.unit, 0);
