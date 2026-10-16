import { useMemo, useState, type FormEvent } from 'react';
import { ASSETS, buildBom, bomTotal, statusOf, type Starter } from '../lib/domain';
import { store, useAppDispatch, useAppSelector, setProject } from '../store';
import { selectAsset } from '../lib/bridge';

const money = (n: number) => '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 });

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-widest text-muted mb-1.5">{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-[#e8f6fa] mb-4">{children}</h2>;
}

// ── Sizing ──────────────────────────────────────────────────────────────────

export function SizingPanel() {
  const p = useAppSelector((s) => s.project);
  const dispatch = useAppDispatch();

  const starters: [Starter, string][] = [
    ['dol',  'Direct on line'],
    ['soft', 'Soft starter'],
    ['vfd',  'Drive (VFD)'],
  ];

  return (
    <div className="space-y-5">
      <SectionTitle>Sizing</SectionTitle>

      {/* Project name */}
      <div>
        <Label>Project name</Label>
        <input
          type="text"
          value={p.name}
          onChange={(e) => dispatch(setProject({ name: e.target.value }))}
          className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-[#e8f6fa]
                     placeholder-muted focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Motor power slider */}
      <div>
        <div className="flex justify-between items-baseline mb-1.5">
          <Label>Motor power</Label>
          <span className="text-xs font-bold text-accent tabular-nums">{p.kw} kW</span>
        </div>
        <input
          type="range"
          min={5}
          max={200}
          value={p.kw}
          onChange={(e) => dispatch(setProject({ kw: +e.target.value }))}
          className="w-full h-1 accent-accent cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-muted/50 mt-1">
          <span>5 kW</span><span>200 kW</span>
        </div>
      </div>

      {/* Voltage */}
      <div>
        <Label>Supply voltage</Label>
        <select
          value={p.voltage}
          onChange={(e) => dispatch(setProject({ voltage: +e.target.value as 400 | 690 }))}
          className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-[#e8f6fa]
                     focus:outline-none focus:border-accent transition-colors cursor-pointer"
        >
          <option value={400}>400 V</option>
          <option value={690}>690 V</option>
        </select>
      </div>

      {/* Starter type */}
      <div>
        <Label>Starter type</Label>
        <div className="grid grid-cols-1 gap-2">
          {starters.map(([v, l]) => (
            <label
              key={v}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all text-sm
                ${p.starter === v
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-line bg-bg/50 text-[#e8f6fa]/70 hover:border-line/80 hover:text-[#e8f6fa]'
                }`}
            >
              <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0
                ${p.starter === v ? 'border-accent' : 'border-muted/50'}`}
              >
                {p.starter === v && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
              </span>
              <input
                type="radio"
                name="starter"
                checked={p.starter === v}
                onChange={() => dispatch(setProject({ starter: v }))}
                className="sr-only"
              />
              {l}
            </label>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted leading-relaxed pt-1 border-t border-line">
        The 3D motor scales with kW. BOM updates instantly.
      </p>
    </div>
  );
}

// ── BOM ─────────────────────────────────────────────────────────────────────

export function BomPanel() {
  const p   = useAppSelector((s) => s.project);
  const bom = useMemo(() => buildBom(p), [p]);
  const total = bomTotal(bom);

  const exportCsv = () => {
    const rows = [
      ['sku', 'description', 'qty', 'unit', 'line_total'],
      ...bom.map((l) => [l.sku, l.desc, l.qty, l.unit.toFixed(2), (l.qty * l.unit).toFixed(2)]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `${p.name.replace(/\W+/g, '_')}_bom.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <SectionTitle>Bill of materials</SectionTitle>

      <div className="rounded-lg border border-line overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-bg/60">
              <th className="text-left px-3 py-2 text-muted font-medium">SKU</th>
              <th className="text-left px-3 py-2 text-muted font-medium">Item</th>
              <th className="text-right px-3 py-2 text-muted font-medium">Qty</th>
              <th className="text-right px-3 py-2 text-muted font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {bom.map((l, idx) => (
              <tr
                key={l.sku}
                className={`border-t border-line ${idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'}`}
              >
                <td className="px-3 py-2 font-mono text-accent whitespace-nowrap">{l.sku}</td>
                <td className="px-3 py-2 text-[#e8f6fa]/80 leading-tight">{l.desc}</td>
                <td className="px-3 py-2 text-right tabular-nums">{l.qty}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">{money(l.qty * l.unit)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line bg-bg/60">
              <td colSpan={3} className="px-3 py-2.5 text-muted font-medium">Total</td>
              <td className="px-3 py-2.5 text-right font-bold text-accent tabular-nums text-sm">{money(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <button
        onClick={exportCsv}
        className="w-full py-2 text-xs font-medium rounded-lg border border-line text-muted
                   hover:border-accent hover:text-accent transition-all cursor-pointer"
      >
        ↓ Download CSV report
      </button>
    </div>
  );
}

// ── Assistant ────────────────────────────────────────────────────────────────

function answer(q: string): string {
  const { twin, project } = store.getState();
  const l = q.toLowerCase();
  const id = l.match(/[tphm]-\d{3}/)?.[0];
  const hot = ASSETS.reduce((m, a) => (twin.data[a.id].temp > twin.data[m.id].temp ? a : m));
  const asset = id && ASSETS.find((a) => a.id.toLowerCase() === id);

  if (asset) {
    selectAsset(asset.id);
    const d = twin.data[asset.id];
    return `${asset.id} (${asset.name}) is ${statusOf(d)}: ${d.temp.toFixed(1)} °C, ${d.vib.toFixed(1)} mm/s. Selected in 3D.`;
  }
  if (/alarm|fault|problem|warning/.test(l)) {
    const bad = ASSETS.filter((a) => statusOf(twin.data[a.id]) !== 'ok');
    if (!bad.length) return 'All assets are normal right now.';
    selectAsset(bad[0].id);
    return 'Needs attention: ' + bad.map((a) => `${a.id} (${statusOf(twin.data[a.id])})`).join(', ') + '.';
  }
  if (/hot|temp/.test(l)) return `${hot.id} is the hottest at ${twin.data[hot.id].temp.toFixed(1)} °C.`;
  if (/bom|total|price|cost|drive|starter/.test(l)) {
    const bom = buildBom(project);
    return `For ${project.kw} kW at ${project.voltage} V (${project.starter}), the starter is ${bom[0].sku} and total is ${money(bomTotal(bom))}.`;
  }
  return 'Try: "which assets are in alarm?", "what is hottest?", "status of M-301" or "what is the BOM total?".';
}

export function AssistantPanel() {
  const [msgs, setMsgs] = useState([{ role: 'ai', text: 'Ask about the plant or the configuration.' }]);
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

      <div
        role="log"
        aria-live="polite"
        className="flex flex-col gap-2 overflow-y-auto flex-1 min-h-0 max-h-64"
      >
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <p
              className={`text-xs px-3 py-2 rounded-xl max-w-[85%] leading-relaxed m-0
                ${m.role === 'me'
                  ? 'bg-accent/15 border border-accent/30 text-[#e8f6fa] rounded-br-sm'
                  : 'bg-white/5 border border-line text-[#e8f6fa]/80 rounded-bl-sm'
                }`}
            >
              {m.text}
            </p>
          </div>
        ))}
      </div>

      <form onSubmit={ask} className="flex gap-2 mt-auto">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Ask the assistant"
          placeholder="Which assets are in alarm?"
          className="flex-1 px-3 py-2 text-xs bg-bg border border-line rounded-lg text-[#e8f6fa]
                     placeholder-muted/50 focus:outline-none focus:border-accent transition-colors"
        />
        <button
          type="submit"
          className="px-3 py-2 text-xs font-medium rounded-lg bg-accent/10 border border-accent/40
                     text-accent hover:bg-accent/20 transition-all cursor-pointer"
        >
          Ask
        </button>
      </form>
    </div>
  );
}

// ── Help ─────────────────────────────────────────────────────────────────────

const NOTES = [
  ['1.2', 'Sizing now drives the 3D motor size. CSV report export added.'],
  ['1.1', 'Host app can set project values and the theme. Eco mode for slow machines.'],
  ['1.0', 'First pilot release: live twin, selection, assistant.'],
];

const FAQ: [string, string][] = [
  ['Select equipment', 'Click a machine in 3D or use the asset buttons below the view. Dragging rotates the camera and never selects.'],
  ['Size a motor',     'Open Sizing, set kW, voltage and starter type. The BOM tab shows parts and total cost instantly.'],
  ['Slow machine?',    'Turn on Eco mode in the header. The 3D view redraws only when something changes.'],
  ['Status colours',   'Green = normal, amber = warning, red = alarm (pulsing in the 3D view).'],
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
            <p className="px-3 pb-3 pt-1 text-xs text-muted leading-relaxed border-t border-line m-0">
              {a}
            </p>
          </details>
        ))}
      </div>

      <div className="pt-2 border-t border-line">
        <div className="text-[10px] uppercase tracking-widest text-muted mb-3">Release notes</div>
        <div className="space-y-2">
          {NOTES.map(([v, t]) => (
            <div key={v} className="flex gap-3 items-start text-xs">
              <span className="font-mono px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent shrink-0">
                v{v}
              </span>
              <span className="text-muted leading-relaxed">{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
