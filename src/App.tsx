import { lazy, Suspense, useEffect, useMemo } from 'react';
import { ASSETS, buildBom, bomTotal, statusOf } from './lib/domain';
import { useAppDispatch, useAppSelector, setTab, setEco, type Tab } from './store';
import { initBridge, selectAsset, send } from './lib/bridge';
import { connectFeed } from './lib/socket';
import { SizingPanel, BomPanel, AssistantPanel, HelpPanel } from './components/Panels';

const Scene = lazy(() => import('./components/Scene'));

const TABS: [Tab, string][] = [
  ['size', 'Sizing'],
  ['bom', 'BOM'],
  ['ai', 'Assistant'],
  ['help', 'Help'],
];

const connLabels: Record<string, string> = {
  waiting:    'Waiting…',
  connecting: 'Connecting',
  live:       'Live',
  error:      'Retrying',
};

function Bar({ label, value, max, unit }: { label: string; value: number; max: number; unit: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const hot = pct > 90;
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted">{label}</span>
        <span className={`font-semibold tabular-nums ${hot ? 'text-bad' : 'text-accent'}`}>
          {value.toFixed(1)}&nbsp;{unit}
        </span>
      </div>
      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${hot ? 'bg-bad' : 'bg-accent'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: 'ok' | 'warn' | 'alarm' }) {
  const color = status === 'ok' ? 'bg-ok' : status === 'warn' ? 'bg-warn' : 'bg-bad';
  return <span className={`inline-block w-2 h-2 rounded-full ${color} shrink-0`} />;
}

export default function App() {
  const dispatch   = useAppDispatch();
  const { data, selected, conn, token } = useAppSelector((s) => s.twin);
  const { tab, eco, theme, log }        = useAppSelector((s) => s.ui);
  const project = useAppSelector((s) => s.project);

  useEffect(() => initBridge(), []);
  useEffect(() => (token ? connectFeed(token) : undefined), [token]);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  const bom   = useMemo(() => buildBom(project), [project]);
  const total = bomTotal(bom);
  useEffect(() => { send('twin/bomChanged', { total: Math.round(total), lines: bom.length }); }, [total, bom.length]);

  const asset  = ASSETS.find((a) => a.id === selected);
  const alarms = ASSETS.filter((a) => statusOf(data[a.id]) === 'alarm').length;
  const isLive = conn === 'live';

  return (
    <div className="h-screen flex flex-col bg-bg text-[#e8f6fa] font-sans overflow-hidden">

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-4 py-2.5 bg-panel border-b border-line shrink-0">
        {/* Logo mark */}
        <div className="flex items-center gap-2 mr-2">
          <div className="w-6 h-6 rounded bg-accent/20 border border-accent/40 grid place-items-center">
            <span className="text-accent text-[10px] font-bold leading-none">3D</span>
          </div>
          <span className="text-sm font-semibold tracking-wide">3D‑Factory</span>
        </div>

        <div className="h-4 w-px bg-line" />

        {/* Connection badge */}
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-ok' : 'bg-warn'} ${isLive ? 'animate-pulse' : ''}`} />
          <span className={`text-xs font-medium ${isLive ? 'text-ok' : 'text-warn'}`}>
            {connLabels[conn]}
          </span>
        </div>

        {/* Alarm count */}
        {alarms > 0 ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-bad/10 border border-bad/30">
            <span className="w-1.5 h-1.5 rounded-full bg-bad animate-pulse" />
            <span className="text-xs font-medium text-bad">{alarms} alarm{alarms > 1 ? 's' : ''}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-ok/10 border border-ok/30">
            <span className="w-1.5 h-1.5 rounded-full bg-ok" />
            <span className="text-xs font-medium text-ok">All normal</span>
          </div>
        )}

        <div className="flex-1" />

        {/* Eco toggle */}
        <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none group">
          <div
            onClick={() => dispatch(setEco(!eco))}
            className={`relative w-8 h-4 rounded-full border transition-colors cursor-pointer
              ${eco ? 'bg-accent/20 border-accent/60' : 'bg-white/5 border-line'}`}
          >
            <span className={`absolute top-0.5 w-3 h-3 rounded-full transition-all
              ${eco ? 'left-4 bg-accent' : 'left-0.5 bg-muted'}`}
            />
          </div>
          <span className={eco ? 'text-accent' : ''}>Eco</span>
        </label>
      </header>

      {/* ── Main layout ────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* 3D viewport */}
        <div className="relative flex-1 min-w-0">
          <Suspense fallback={
            <div className="absolute inset-0 grid place-items-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-muted">Loading 3D view…</span>
              </div>
            </div>
          }>
            <Scene />
          </Suspense>

          {/* Perf overlay */}
          <div
            id="perf"
            aria-hidden="true"
            className="absolute top-2 left-3 text-[10px] font-mono text-muted/60 pointer-events-none select-none"
          />

          {/* Asset picker strip */}
          <nav
            aria-label="Assets"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 px-3 py-2 rounded-xl border border-line/80 bg-panel/90 backdrop-blur-md shadow-xl"
          >
            {ASSETS.map((a) => {
              const status = statusOf(data[a.id]);
              const isSelected = selected === a.id;
              return (
                <button
                  key={a.id}
                  aria-pressed={isSelected}
                  onClick={() => selectAsset(a.id)}
                  className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer
                    ${isSelected
                      ? 'bg-accent/10 border-accent text-accent font-semibold'
                      : 'bg-transparent border-line text-[#e8f6fa]/70 hover:border-accent/50 hover:text-[#e8f6fa]'
                    }`}
                >
                  <StatusDot status={status} />
                  {a.id}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <aside className="w-80 flex flex-col bg-panel border-l border-line shrink-0">

          {/* Live readings */}
          <div className="px-4 pt-4 pb-3 border-b border-line">
            {asset ? (
              <>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold tracking-widest uppercase text-muted">Live</span>
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={statusOf(data[asset.id])} />
                    <span className="text-xs font-semibold">{asset.id}</span>
                    <span className="text-xs text-muted">· {asset.name}</span>
                  </div>
                </div>
                <Bar label="Temperature" value={data[asset.id].temp} max={100} unit="°C" />
                <Bar label="Vibration"   value={data[asset.id].vib}  max={8}   unit="mm/s" />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-3 gap-1.5">
                <svg className="w-6 h-6 text-muted/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                </svg>
                <p className="text-xs text-muted text-center">Select a machine to see live readings</p>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div role="tablist" aria-label="Panels" className="flex border-b border-line shrink-0">
            {TABS.map(([k, l]) => (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                onClick={() => dispatch(setTab(k))}
                className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer
                  ${tab === k
                    ? 'border-accent text-accent'
                    : 'border-transparent text-muted hover:text-[#e8f6fa] hover:border-line'
                  }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div role="tabpanel" className="flex-1 overflow-y-auto px-4 py-4">
            {tab === 'size' && <SizingPanel />}
            {tab === 'bom'  && <BomPanel />}
            {tab === 'ai'   && <AssistantPanel />}
            {tab === 'help' && <HelpPanel />}
          </div>

          {/* Log footer */}
          <div
            aria-label="Host message log"
            className="px-4 py-2.5 border-t border-line font-mono text-[10px] text-muted/60 min-h-[52px] bg-bg/40"
          >
            <div className="text-[9px] uppercase tracking-widest text-muted/40 mb-1">Host log</div>
            {log.length
              ? log.map((l, i) => <div key={i} className="truncate">{l}</div>)
              : <span className="italic">No messages yet.</span>}
          </div>
        </aside>
      </div>
    </div>
  );
}
