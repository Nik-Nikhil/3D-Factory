import { store, select, setToken, setProject, setTheme, addLog } from '../store';
import { connectFeed } from './socket';
import { ASSETS } from './domain';

const allowed = ((import.meta.env.VITE_HOST_ORIGINS as string | undefined) ?? '')
  .split(',').map((s) => s.trim()).filter(Boolean);

export const embedded = window.parent !== window;
const target = allowed[0] ?? window.location.origin;

export function send(type: string, payload: unknown) {
  if (embedded) window.parent.postMessage({ source: 'process-twin', v: 1, type, payload }, target);
  store.dispatch(addLog(`out ${type}`));
}

export function selectAsset(id: string, fromHost = false) {
  store.dispatch(select(id));
  if (!fromHost) send('twin/assetSelected', { id });
}

export function initBridge(): () => void {
  const onMessage = (e: MessageEvent) => {
    const trusted = allowed.length
      ? allowed.includes(e.origin)
      : e.origin === window.location.origin;
    const m = e.data;
    if (!trusted || !m || m.source !== 'host' || m.v !== 1) return;

    store.dispatch(addLog(`in  ${m.type}`));
    const p = m.payload;

    if (m.type === 'host/auth' && typeof p?.token === 'string') {
      store.dispatch(setToken(p.token));
    }
    if (m.type === 'host/selectAsset' && ASSETS.some((a) => a.id === p?.id)) {
      selectAsset(p.id, true);
    }
    if (m.type === 'host/theme' && (p === 'dark' || p === 'light')) {
      store.dispatch(setTheme(p));
    }
    if (m.type === 'host/project') {
      const next: Record<string, unknown> = {};
      if (typeof p?.kw === 'number' && p.kw >= 1 && p.kw <= 250) next.kw = p.kw;
      if (p?.voltage === 400 || p?.voltage === 690)               next.voltage = p.voltage;
      if (['dol', 'soft', 'vfd'].includes(p?.starter))            next.starter = p.starter;
      store.dispatch(setProject(next));
    }
  };

  window.addEventListener('message', onMessage);

  if (embedded) {
    // in an iframe: tell the host we're ready, it will reply with host/auth
    send('twin/ready', { version: 1 });
  } else {
    // standalone dev mode: no host to send a token, connect directly
    store.dispatch(setToken('demo-token'));
    connectFeed('demo-token');
  }

  return () => window.removeEventListener('message', onMessage);
}
