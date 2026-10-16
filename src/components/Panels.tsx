import { useMemo, useState, type FormEvent } from 'react';
import {
  ASSETS, buildMotorBom, buildTankBom, buildPumpBom, buildHxBom, buildBom,
  bomTotal, statusOf, type Starter, type BomLine,
} from '../lib/domain';
import { store, useAppDispatch, useAppSelector, setMotor, setTank, setPump, setHx } from '../store';
import { selectAsset } from '../lib/bridge';

const money = (n: number) => '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 });

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-widest text-muted mb-1.5">{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-[#e8f6fa] mb-4">{children}</h2>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline py-1.5 border-b border-line/50">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-xs font-semibold tabular-nums">{value}</span>
    </div>
  );
}

// ── Sizing (all four machines as sub-tabs) ───────────────────────────────────

type AssetTab = 'motor' | 'tank' | 'pump' | 'hx';
const ASSET_TABS: [AssetTab, string][] = [
  ['tank',  'T-101'],
  ['pump',  'P-201'],
  ['hx',    'H-401'],
  ['motor', 'M-301'],
];

export function SizingPanel() {
  const [sub, setSub] = useState<AssetTab>('tank');

  return (
    <div className="space-y-4">
      <SectionTitle>Sizing</SectionTitle>

      {/* sub-tabs per machine */}
      <div className="flex gap-1 p-1 rounded-lg bg-bg border border-line">
        {ASSET_TABS.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setSub(k)}
            className={`flex-1 py-1.5 text-xs font-mono font-medium rounded-md transition-all cursor-pointer
              ${sub === k ? 'bg-accent/15 text-accent border border-accent/30' : 'text-muted hover:text-[#e8f6fa]'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {sub === 'motor' && <MotorForm />}
      {sub === 'tank'  && <TankForm />}
      {sub === 'pump'  && <PumpForm />}
      {sub === 'hx'    && <HxForm />}
    </div>
  );
}

// ── Motor ────────────────────────────────────────────────────────────────────

function MotorForm() {
  const p = useAppSelector((s) => s.project.motor);
  const dispatch = useAppDispatch();
  const bom = buildMotorBom(p);

  const starters: [Starter, string][] = [
    ['dol',  'Direct on line'],
    ['soft', 'Soft starter'],
    ['vfd',  'Drive (VFD)'],
  ];

  return (
    <div className="space-y-4">
      <div>
        <Label>Project name</Label>
        <input
          type="text"
          value={p.name}
          onChange={(e) => dispatch(setMotor({ name: e.target.value }))}
          className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-[#e8f6fa]
                     focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      <div>
        <div className="flex justify-between items-baseline mb-1.5">
          <Label>Motor power</Label>
          <span className="text-xs font-bold text-accent tabular-nums">{p.kw} kW</span>
        </div>
        <input type="range" min={5} max={200} value={p.kw}
          onChange={(e) => dispatch(setMotor({ kw: +e.target.value }))}
          className="w-full h-1 accent-accent cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-muted/50 mt-1">
          <span>5 kW</span><span>200 kW</span>
        </div>
      </div>

      <div>
        <Label>Supply voltage</Label>
        <select
          value={p.voltage}
          onChange={(e) => dispatch(setMotor({ voltage: +e.target.value as 400 | 690 }))}
          className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-[#e8f6fa]
                     focus:outline-none focus:border-accent transition-colors cursor-pointer"
        >
          <option value={400}>400 V</option>
          <option value={690}>690 V</option>
        </select>
      </div>

      <div>
        <Label>Starter type</Label>
        <div className="grid grid-cols-1 gap-2">
          {starters.map(([v, l]) => (
            <label key={v}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all text-sm
                ${p.starter === v
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-line bg-bg/50 text-[#e8f6fa]/70 hover:text-[#e8f6fa]'}`}
            >
              <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0
                ${p.starter === v ? 'border-accent' : 'border-muted/50'}`}>
                {p.starter === v && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
              </span>
              <input type="radio" name="starter" checked={p.starter === v}
                onChange={() => dispatch(setMotor({ starter: v }))} className="sr-only" />
              {l}
            </label>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-line space-y-0">
        <div className="text-[10px] uppercase tracking-widest text-muted mb-2">Quick estimate</div>
        <Row label="Starter"        value={bom[0].desc} />
        <Row label="Circuit breaker" value={bom[1].desc} />
        <Row label="Subtotal"   value={money(bomTotal(bom))} />
      </div>
    </div>
  );
}

// ── Tank ─────────────────────────────────────────────────────────────────────

function TankForm() {
  const p = useAppSelector((s) => s.project.tank);
  const dispatch = useAppDispatch();
  const bom = buildTankBom(p);

  const materials: [typeof p.material, string][] = [
    ['carbon', 'Carbon steel'],
    ['ss304',  'Stainless 304'],
    ['ss316',  'Stainless 316L'],
  ];

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between items-baseline mb-1.5">
          <Label>Tank volume</Label>
          <span className="text-xs font-bold text-accent tabular-nums">{p.volume} L</span>
        </div>
        <input type="range" min={200} max={10000} step={200} value={p.volume}
          onChange={(e) => dispatch(setTank({ volume: +e.target.value }))}
          className="w-full h-1 accent-accent cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-muted/50 mt-1">
          <span>200 L</span><span>10 000 L</span>
        </div>
      </div>

      <div>
        <Label>Shell material</Label>
        <div className="grid grid-cols-1 gap-2">
          {materials.map(([v, l]) => (
            <label key={v}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all text-sm
                ${p.material === v
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-line bg-bg/50 text-[#e8f6fa]/70 hover:text-[#e8f6fa]'}`}
            >
              <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0
                ${p.material === v ? 'border-accent' : 'border-muted/50'}`}>
                {p.material === v && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
              </span>
              <input type="radio" name="material" checked={p.material === v}
                onChange={() => dispatch(setTank({ material: v }))} className="sr-only" />
              {l}
            </label>
          ))}
        </div>
      </div>

      <label className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all text-sm
        ${p.insulated ? 'border-accent bg-accent/10 text-accent' : 'border-line text-[#e8f6fa]/70 hover:text-[#e8f6fa]'}`}
      >
        <input type="checkbox" checked={p.insulated}
          onChange={(e) => dispatch(setTank({ insulated: e.target.checked }))}
          className="accent-accent" />
        Insulation jacket
      </label>

      <div className="pt-2 border-t border-line space-y-0">
        <div className="text-[10px] uppercase tracking-widest text-muted mb-2">Quick estimate</div>
        <Row label="Tank"        value={bom[0].desc} />
        <Row label="Level sensor" value="Ultrasonic" />
        <Row label="Subtotal" value={money(bomTotal(bom))} />
      </div>
    </div>
  );
}

// ── Pump ─────────────────────────────────────────────────────────────────────

function PumpForm() {
  const p = useAppSelector((s) => s.project.pump);
  const dispatch = useAppDispatch();
  const bom = buildPumpBom(p);

  const fluids: [typeof p.fluid, string][] = [
    ['water',    'Water / utilities'],
    ['oil',      'Oils / lube'],
    ['chemical', 'Aggressive chemical'],
  ];

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between items-baseline mb-1.5">
          <Label>Flow rate</Label>
          <span className="text-xs font-bold text-accent tabular-nums">{p.flowRate} m³/h</span>
        </div>
        <input type="range" min={1} max={100} value={p.flowRate}
          onChange={(e) => dispatch(setPump({ flowRate: +e.target.value }))}
          className="w-full h-1 accent-accent cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-muted/50 mt-1">
          <span>1 m³/h</span><span>100 m³/h</span>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-baseline mb-1.5">
          <Label>Pump head</Label>
          <span className="text-xs font-bold text-accent tabular-nums">{p.head} m</span>
        </div>
        <input type="range" min={5} max={120} value={p.head}
          onChange={(e) => dispatch(setPump({ head: +e.target.value }))}
          className="w-full h-1 accent-accent cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-muted/50 mt-1">
          <span>5 m</span><span>120 m</span>
        </div>
      </div>

      <div>
        <Label>Fluid type</Label>
        <div className="grid grid-cols-1 gap-2">
          {fluids.map(([v, l]) => (
            <label key={v}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all text-sm
                ${p.fluid === v
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-line bg-bg/50 text-[#e8f6fa]/70 hover:text-[#e8f6fa]'}`}
            >
              <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0
                ${p.fluid === v ? 'border-accent' : 'border-muted/50'}`}>
                {p.fluid === v && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
              </span>
              <input type="radio" name="fluid" checked={p.fluid === v}
                onChange={() => dispatch(setPump({ fluid: v }))} className="sr-only" />
              {l}
            </label>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-line space-y-0">
        <div className="text-[10px] uppercase tracking-widest text-muted mb-2">Quick estimate</div>
        <Row label="Pump"         value={bom[0].desc} />
        <Row label="Subtotal" value={money(bomTotal(bom))} />
      </div>
    </div>
  );
}

// ── Heat Exchanger ────────────────────────────────────────────────────────────

function HxForm() {
  const p = useAppSelector((s) => s.project.hx);
  const dispatch = useAppDispatch();
  const bom = buildHxBom(p);

  const types: [typeof p.type, string][] = [
    ['shell', 'Shell & tube'],
    ['plate', 'Plate heat exchanger'],
    ['air',   'Air cooled'],
  ];

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between items-baseline mb-1.5">
          <Label>Heat duty</Label>
          <span className="text-xs font-bold text-accent tabular-nums">{p.dutyKw} kW</span>
        </div>
        <input type="range" min={10} max={500} step={10} value={p.dutyKw}
          onChange={(e) => dispatch(setHx({ dutyKw: +e.target.value }))}
          className="w-full h-1 accent-accent cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-muted/50 mt-1">
          <span>10 kW</span><span>500 kW</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex justify-between items-baseline mb-1.5">
            <Label>Hot inlet</Label>
            <span className="text-[10px] font-bold text-warn tabular-nums">{p.hotInlet}°C</span>
          </div>
          <input type="range" min={40} max={250} value={p.hotInlet}
            onChange={(e) => dispatch(setHx({ hotInlet: +e.target.value }))}
            className="w-full h-1 accent-accent cursor-pointer"
          />
        </div>
        <div>
          <div className="flex justify-between items-baseline mb-1.5">
            <Label>Cold inlet</Label>
            <span className="text-[10px] font-bold text-accent tabular-nums">{p.coldInlet}°C</span>
          </div>
          <input type="range" min={5} max={80} value={p.coldInlet}
            onChange={(e) => dispatch(setHx({ coldInlet: +e.target.value }))}
            className="w-full h-1 accent-accent cursor-pointer"
          />
        </div>
      </div>

      <div>
        <Label>HX type</Label>
        <div className="grid grid-cols-1 gap-2">
          {types.map(([v, l]) => (
            <label key={v}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all text-sm
                ${p.type === v
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-line bg-bg/50 text-[#e8f6fa]/70 hover:text-[#e8f6fa]'}`}
            >
              <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0
                ${p.type === v ? 'border-accent' : 'border-muted/50'}`}>
                {p.type === v && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
              </span>
              <input type="radio" name="hxtype" checked={p.type === v}
                onChange={() => dispatch(setHx({ type: v }))} className="sr-only" />
              {l}
            </label>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-line space-y-0">
        <div className="text-[10px] uppercase tracking-widest text-muted mb-2">Quick estimate</div>
        <Row label="HX unit"      value={bom[0].desc} />
        <Row label="Subtotal" value={money(bomTotal(bom))} />
      </div>
    </div>
  );
}

// ── BOM row component ─────────────────────────────────────────────────────────

function BomRow({ line, idx, updateQty, removeItem }: {
  line: BomLine;
  idx: number;
  updateQty: (sku: string, delta: number) => void;
  removeItem: (sku: string) => void;
}) {
  return (
    <tr
      className={`group border-b border-line/30 hover:bg-accent/8 transition-all duration-150 ${
        idx % 2 === 0 ? 'bg-white/[0.015]' : 'bg-transparent'
      }`}
    >
      {/* SKU */}
      <td className="px-4 py-3 w-[105px]">
        <span className="font-mono text-[10px] font-bold text-accent/90 truncate block">{line.sku}</span>
      </td>

      {/* Description */}
      <td className="px-4 py-3">
        <span className="text-[#e8f6fa] leading-snug text-[11px]">{line.desc}</span>
      </td>

      {/* Quantity with +/- controls */}
      <td className="px-3 py-3 w-[140px]">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => updateQty(line.sku, -1)}
            className="w-6 h-6 flex items-center justify-center rounded border border-line/60 hover:border-accent hover:bg-accent/15 text-muted hover:text-accent transition-all hover:scale-110 active:scale-95 font-bold text-sm"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-10 text-center font-bold tabular-nums text-[12px]">{line.qty}</span>
          <button
            onClick={() => updateQty(line.sku, 1)}
            className="w-6 h-6 flex items-center justify-center rounded border border-line/60 hover:border-accent hover:bg-accent/15 text-muted hover:text-accent transition-all hover:scale-110 active:scale-95 font-bold text-sm"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </td>

      {/* Line total */}
      <td className="px-4 py-3 text-right w-[95px]">
        <span className="font-bold tabular-nums text-accent text-[12px]">{money(line.qty * line.unit)}</span>
      </td>

      {/* Remove button */}
      <td className="px-2 py-3 w-[50px]">
        <button
          onClick={() => removeItem(line.sku)}
          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded hover:bg-bad/15 hover:text-bad transition-all hover:scale-110 active:scale-95 text-base font-bold leading-none"
          aria-label="Remove item"
          title="Remove"
        >
          ×
        </button>
      </td>
    </tr>
  );
}

// ── BOM (all machines combined) ───────────────────────────────────────────────

type MachineSection = 'motor' | 'tank' | 'pump' | 'hx';
const MACHINE_SECTIONS: [MachineSection, string][] = [
  ['motor', 'M-301 Motor'],
  ['tank',  'T-101 Tank'],
  ['pump',  'P-201 Pump'],
  ['hx',    'H-401 Heat Exchanger'],
];

export function BomPanel() {
  const p = useAppSelector((s) => s.project);
  
  // local state for quantity overrides and enabled sections
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [enabledSections, setEnabledSections] = useState<Set<MachineSection>>(
    new Set(['motor', 'tank', 'pump', 'hx']) // all enabled by default
  );
  const [showAddMenu, setShowAddMenu] = useState(false);

  // build individual machine BOMs
  const motorBom = useMemo(() => buildMotorBom(p.motor), [p.motor]);
  const tankBom  = useMemo(() => buildTankBom(p.tank), [p.tank]);
  const pumpBom  = useMemo(() => buildPumpBom(p.pump), [p.pump]);
  const hxBom    = useMemo(() => buildHxBom(p.hx), [p.hx]);

  // calculate interconnect cables based on machine positions and enabled sections
  const cableBom = useMemo(() => {
    const cables: BomLine[] = [];
    const enabled = Array.from(enabledSections);
    
    // only add cables if we have at least 2 machines
    if (enabled.length >= 2) {
      // Main power cable (from panel to first machine)
      const mainCableSize = Math.max(16, Math.ceil(p.motor.kw / 5));
      cables.push({
        sku: `CBL-MAIN-${mainCableSize}`,
        desc: `Main supply cable ${mainCableSize} mm², 15 m`,
        qty: 15,
        unit: 1.5 * mainCableSize + 2,
      });

      // Interconnect cables between machines (based on scene positions)
      const positions = { tank: -6, pump: -2, hx: 2, motor: 6 };
      for (let i = 0; i < enabled.length - 1; i++) {
        const from = enabled[i];
        const to = enabled[i + 1];
        const distance = Math.abs(positions[to] - positions[from]);
        const cableLen = Math.ceil(distance * 1.5 + 5); // 50% extra + 5m for routing
        const cableSize = Math.max(6, Math.ceil(p.motor.kw / 8));
        
        cables.push({
          sku: `CBL-${from.toUpperCase()}-${to.toUpperCase()}`,
          desc: `Interconnect ${from} → ${to}, ${cableSize} mm², ${cableLen} m`,
          qty: cableLen,
          unit: 1.2 * cableSize + 1.5,
        });
      }

      // Control cables for all machines
      if (enabled.length > 0) {
        const totalControlLength = enabled.length * 25;
        cables.push({
          sku: 'CBL-CTRL',
          desc: `Control cable 4×1.5 mm², multicore`,
          qty: totalControlLength,
          unit: 2.8,
        });
      }
    }
    
    return cables;
  }, [enabledSections, p.motor.kw]);

  // merge all BOMs with quantity overrides
  const bom = useMemo(() => {
    const sections: typeof motorBom = [
      ...(enabledSections.has('motor') ? motorBom : []),
      ...(enabledSections.has('tank')  ? tankBom  : []),
      ...(enabledSections.has('pump')  ? pumpBom  : []),
      ...(enabledSections.has('hx')    ? hxBom    : []),
      ...cableBom,
    ];
    
    return sections.map((item) => ({
      ...item,
      qty: quantities[item.sku] ?? item.qty,
    })).filter((item) => item.qty > 0); // hide items with qty 0
  }, [motorBom, tankBom, pumpBom, hxBom, cableBom, enabledSections, quantities]);

  const total = bomTotal(bom);

  const updateQty = (sku: string, delta: number) => {
    const currentItem = bom.find((l) => l.sku === sku);
    if (!currentItem) return;
    const newQty = Math.max(0, (quantities[sku] ?? currentItem.qty) + delta);
    setQuantities((prev) => ({ ...prev, [sku]: newQty }));
  };

  const removeItem = (sku: string) => {
    setQuantities((prev) => ({ ...prev, [sku]: 0 }));
  };

  const toggleSection = (section: MachineSection) => {
    setEnabledSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
    setShowAddMenu(false);
  };

  const clearBill = () => {
    setQuantities({});
    setEnabledSections(new Set(['motor', 'tank', 'pump', 'hx']));
  };

  const exportCsv = () => {
    const rows = [
      ['sku', 'description', 'qty', 'unit_price', 'line_total'],
      ...bom.map((l) => [l.sku, l.desc, l.qty, l.unit.toFixed(2), (l.qty * l.unit).toFixed(2)]),
      ['', '', '', 'TOTAL', total.toFixed(2)],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `BOM_${new Date().toISOString().split('T')[0]}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  // get disabled sections (can be re-added)
  const disabledSections = MACHINE_SECTIONS.filter(([s]) => !enabledSections.has(s));

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <SectionTitle>Bill</SectionTitle>
          <p className="text-[10px] text-muted/80 -mt-3 flex items-center gap-2">
            <span className="font-semibold text-accent">{bom.length}</span> items
            <span className="text-muted/50">·</span>
            <span>{enabledSections.size} of 4 machines</span>
          </p>
        </div>
        
        {/* Add item dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            disabled={disabledSections.length === 0}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all
              ${disabledSections.length > 0
                ? 'bg-accent/10 border border-accent/40 text-accent hover:bg-accent/20 hover:scale-105 cursor-pointer'
                : 'bg-bg border border-line text-muted/50 cursor-not-allowed opacity-50'}`}
          >
            + Add machine
          </button>
          
          {showAddMenu && disabledSections.length > 0 && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-panel border border-accent/30 rounded-lg shadow-2xl z-20 overflow-hidden animate-in">
              {disabledSections.map(([section, label]) => (
                <button
                  key={section}
                  onClick={() => toggleSection(section)}
                  className="w-full text-left px-4 py-2.5 text-xs text-[#e8f6fa] hover:bg-accent/15 hover:text-accent transition-all border-b border-line/20 last:border-0 font-medium"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* table */}
      <div className="flex-1 min-h-0 border border-line/60 rounded-xl bg-gradient-to-br from-bg/30 via-bg/50 to-bg/70 shadow-inner overflow-hidden flex flex-col">
        <table className="w-full text-xs">
          <thead className="bg-panel/98 backdrop-blur-md border-b-2 border-line/80 shadow-sm">
            <tr className="text-[10px] uppercase tracking-widest text-muted/90">
              <th className="text-left px-4 py-3 font-semibold w-[105px]">Part number</th>
              <th className="text-left px-4 py-3 font-semibold">Description</th>
              <th className="text-center px-3 py-3 font-semibold w-[140px]">Qty</th>
              <th className="text-right px-4 py-3 font-semibold w-[95px]">Total</th>
              <th className="w-[50px]"></th>
            </tr>
          </thead>
        </table>
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <table className="w-full text-xs">
          <tbody>
            {/* Motor section */}
            {enabledSections.has('motor') && motorBom.length > 0 && (
              <>
                <tr className="bg-gradient-to-r from-accent/8 to-accent/5 border-y border-accent/20">
                  <td colSpan={5} className="px-4 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-accent uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1 h-3 bg-accent rounded-full"></span>
                        M-301 Motor
                      </span>
                      <button
                        onClick={() => toggleSection('motor')}
                        className="text-[9px] text-bad/70 hover:text-bad px-2 py-0.5 rounded hover:bg-bad/10 transition-all font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
                {bom.filter(l => motorBom.some(m => m.sku === l.sku)).map((l, idx) => (
                  <BomRow key={l.sku} line={l} idx={idx} updateQty={updateQty} removeItem={removeItem} />
                ))}
              </>
            )}

            {/* Tank section */}
            {enabledSections.has('tank') && tankBom.length > 0 && (
              <>
                <tr className="bg-gradient-to-r from-accent/8 to-accent/5 border-y border-accent/20">
                  <td colSpan={5} className="px-4 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-accent uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1 h-3 bg-accent rounded-full"></span>
                        T-101 Tank
                      </span>
                      <button
                        onClick={() => toggleSection('tank')}
                        className="text-[9px] text-bad/70 hover:text-bad px-2 py-0.5 rounded hover:bg-bad/10 transition-all font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
                {bom.filter(l => tankBom.some(m => m.sku === l.sku)).map((l, idx) => (
                  <BomRow key={l.sku} line={l} idx={idx} updateQty={updateQty} removeItem={removeItem} />
                ))}
              </>
            )}

            {/* Pump section */}
            {enabledSections.has('pump') && pumpBom.length > 0 && (
              <>
                <tr className="bg-gradient-to-r from-accent/8 to-accent/5 border-y border-accent/20">
                  <td colSpan={5} className="px-4 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-accent uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1 h-3 bg-accent rounded-full"></span>
                        P-201 Pump
                      </span>
                      <button
                        onClick={() => toggleSection('pump')}
                        className="text-[9px] text-bad/70 hover:text-bad px-2 py-0.5 rounded hover:bg-bad/10 transition-all font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
                {bom.filter(l => pumpBom.some(m => m.sku === l.sku)).map((l, idx) => (
                  <BomRow key={l.sku} line={l} idx={idx} updateQty={updateQty} removeItem={removeItem} />
                ))}
              </>
            )}

            {/* HX section */}
            {enabledSections.has('hx') && hxBom.length > 0 && (
              <>
                <tr className="bg-gradient-to-r from-accent/8 to-accent/5 border-y border-accent/20">
                  <td colSpan={5} className="px-4 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-accent uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1 h-3 bg-accent rounded-full"></span>
                        H-401 Heat Exchanger
                      </span>
                      <button
                        onClick={() => toggleSection('hx')}
                        className="text-[9px] text-bad/70 hover:text-bad px-2 py-0.5 rounded hover:bg-bad/10 transition-all font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
                {bom.filter(l => hxBom.some(m => m.sku === l.sku)).map((l, idx) => (
                  <BomRow key={l.sku} line={l} idx={idx} updateQty={updateQty} removeItem={removeItem} />
                ))}
              </>
            )}

            {/* Cable section */}
            {cableBom.length > 0 && (
              <>
                <tr className="bg-gradient-to-r from-warn/10 to-warn/5 border-y border-warn/30">
                  <td colSpan={5} className="px-4 py-2">
                    <span className="text-[10px] font-bold text-warn uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1 h-3 bg-warn rounded-full"></span>
                      ⚡ Cables & Interconnects
                    </span>
                  </td>
                </tr>
                {cableBom.map((l, idx) => (
                  <BomRow key={l.sku} line={l} idx={idx} updateQty={updateQty} removeItem={removeItem} />
                ))}
              </>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* footer: total + actions */}
      <div className="pt-4 border-t-2 border-accent/20 space-y-3 bg-gradient-to-br from-panel/50 to-bg/50 rounded-lg p-3 -m-3 mt-0">
        {/* project total */}
        <div className="flex items-baseline justify-between px-2">
          <div>
            <span className="text-base font-bold text-[#e8f6fa]">Project total</span>
            <span className="text-[10px] text-muted/70 ml-2">(excl. tax & shipping)</span>
          </div>
          <span className="text-2xl font-black text-accent tabular-nums tracking-tight">{money(total)}</span>
        </div>

        {/* action buttons */}
        <div className="flex gap-2.5">
          <button
            onClick={exportCsv}
            className="flex-1 py-2.5 text-xs font-bold rounded-lg bg-accent/15 border-2 border-accent/40 text-accent hover:bg-accent/25 hover:border-accent/60 hover:scale-[1.02] active:scale-95 transition-all shadow-sm"
          >
            ↓ Export CSV
          </button>
          <button
            onClick={clearBill}
            className="px-5 py-2.5 text-xs font-bold rounded-lg border-2 border-line text-muted hover:border-warn hover:text-warn hover:bg-warn/10 hover:scale-[1.02] active:scale-95 transition-all"
          >
            Clear bill
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Assistant ─────────────────────────────────────────────────────────────────

function answer(q: string): string {
  const { twin, project } = store.getState();
  const l = q.toLowerCase();
  const id = l.match(/[tphm]-\d{3}/)?.[0];
  const hot = ASSETS.reduce((m, a) => (twin.data[a.id].temp > twin.data[m.id].temp ? a : m));
  const asset = id && ASSETS.find((a) => a.id.toLowerCase() === id);

  if (asset) {
    selectAsset(asset.id);
    const d = twin.data[asset.id];
    return `${asset.id} (${asset.name}) — ${d.temp.toFixed(1)} °C, ${d.vib.toFixed(1)} mm/s. Selected in 3D.`;
  }
  if (/alarm|fault|problem|warning/.test(l)) {
    const bad = ASSETS.filter((a) => statusOf(twin.data[a.id]) !== 'ok');
    if (!bad.length) return 'All assets look normal right now.';
    selectAsset(bad[0].id);
    return 'Needs attention: ' + bad.map((a) => `${a.id} (${statusOf(twin.data[a.id])})`).join(', ') + '.';
  }
  if (/hot|temp/.test(l)) return `${hot.id} is hottest at ${twin.data[hot.id].temp.toFixed(1)} °C.`;
  if (/bom|total|price|cost|bill/.test(l)) {
    const bom = buildBom(project);
    return `Total bill across all machines is ${money(bomTotal(bom))}.`;
  }
  if (/tank|t-101/.test(l)) return `T-101 is a ${project.tank.volume} L ${project.tank.material.toUpperCase()} tank${project.tank.insulated ? ' with insulation' : ''}.`;
  if (/pump|p-201/.test(l)) return `P-201 is sized for ${project.pump.flowRate} m³/h at ${project.pump.head} m head, ${project.pump.fluid} service.`;
  if (/exchanger|hx|h-401/.test(l)) return `H-401 is a ${project.hx.type} HX handling ${project.hx.dutyKw} kW duty.`;
  if (/motor|m-301/.test(l)) return `M-301 is a ${project.motor.kw} kW motor at ${project.motor.voltage} V with a ${project.motor.starter} starter.`;
  return 'Try: "which assets are in alarm?", "status of M-301", "what is the bill total?", or "tell me about the pump".';
}

export function AssistantPanel() {
  const [msgs, setMsgs] = useState([{ role: 'ai', text: 'Ask about any machine or the bill.' }]);
  const [q, setQ] = useState('');

  const ask = (e: FormEvent) => {
    e.preventDefault();
    const text = q.trim();
    if (!text) return;
    setQ('');
    setMsgs((m) => [...m, { role: 'me', text }]);
    setTimeout(() => setMsgs((m) => [...m, { role: 'ai', text: answer(text) }]), 300);
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <SectionTitle>Assistant</SectionTitle>
      <div role="log" aria-live="polite" className="flex flex-col gap-2 overflow-y-auto flex-1 min-h-0 max-h-64">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'me' ? 'justify-end' : 'justify-start'}`}>
            <p className={`text-xs px-3 py-2 rounded-xl max-w-[85%] leading-relaxed m-0
              ${m.role === 'me'
                ? 'bg-accent/15 border border-accent/30 text-[#e8f6fa] rounded-br-sm'
                : 'bg-white/5 border border-line text-[#e8f6fa]/80 rounded-bl-sm'}`}
            >
              {m.text}
            </p>
          </div>
        ))}
      </div>
      <form onSubmit={ask} className="flex gap-2 mt-auto">
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)}
          aria-label="Ask the assistant"
          placeholder='e.g. "which assets are in alarm?"'
          className="flex-1 px-3 py-2 text-xs bg-bg border border-line rounded-lg text-[#e8f6fa]
                     placeholder-muted/50 focus:outline-none focus:border-accent transition-colors"
        />
        <button type="submit"
          className="px-3 py-2 text-xs font-medium rounded-lg bg-accent/10 border border-accent/40
                     text-accent hover:bg-accent/20 transition-all cursor-pointer"
        >
          Ask
        </button>
      </form>
    </div>
  );
}

// ── Help ──────────────────────────────────────────────────────────────────────

const NOTES = [
  ['1.3', 'Sizing now covers all four machines: motor, tank, pump, heat exchanger.'],
  ['1.2', 'Motor sizing drives the 3D model size. CSV export added.'],
  ['1.1', 'Host app theming and eco mode.'],
  ['1.0', 'First release.'],
];

const FAQ: [string, string][] = [
  ['Select equipment',   'Click a machine in 3D or use the buttons below the view.'],
  ['Sizing all machines','Use the sub-tabs in Sizing to configure each machine independently. BOM covers all four.'],
  ['Eco mode',          'Toggle in the header. Redraws only when data changes — good for slow or remote machines.'],
  ['Status colours',    'Green = ok, amber = watch it, red = alarm (pulsing in 3D).'],
];

export function HelpPanel() {
  return (
    <div className="space-y-4">
      <SectionTitle>Help</SectionTitle>
      <div className="space-y-2">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group rounded-lg border border-line overflow-hidden">
            <summary className="flex items-center justify-between px-3 py-2.5 cursor-pointer text-xs font-medium
                                text-[#e8f6fa] hover:bg-white/5 transition-colors list-none">
              {q}
              <span className="text-muted text-[10px] group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="px-3 pb-3 pt-1 text-xs text-muted leading-relaxed border-t border-line m-0">{a}</p>
          </details>
        ))}
      </div>
      <div className="pt-2 border-t border-line">
        <div className="text-[10px] uppercase tracking-widest text-muted mb-3">Release notes</div>
        <div className="space-y-2">
          {NOTES.map(([v, t]) => (
            <div key={v} className="flex gap-3 items-start text-xs">
              <span className="font-mono px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent shrink-0">v{v}</span>
              <span className="text-muted leading-relaxed">{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
