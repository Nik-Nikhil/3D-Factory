import { store, setData, setConn } from '../store';

const WS_URL = `ws://${location.host.replace(/:\d+$/, '')}:3001`;
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_DELAY_MS = 30_000;

/**
 * Connect to the live feed over a plain WebSocket.
 * Sends an auth token as the first message, then listens for batched readings.
 * Reconnects automatically with a simple backoff.
 *
 * Returns a cleanup function that stops reconnecting and closes the socket.
 */
export function connectFeed(token: string): () => void {
  let ws: WebSocket | null = null;
  let stopped = false;
  let delay = RECONNECT_DELAY_MS;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  function connect() {
    if (stopped) return;
    store.dispatch(setConn('connecting'));

    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      delay = RECONNECT_DELAY_MS; // reset backoff on success
      // First thing: authenticate
      ws!.send(JSON.stringify({ type: 'auth', token }));
    };

    ws.onmessage = (event) => {
      let msg: { type: string; payload: unknown };
      try { msg = JSON.parse(event.data); } catch { return; }

      if (msg.type === 'readings') {
        store.dispatch(setConn('live'));
        store.dispatch(setData(msg.payload as Parameters<typeof setData>[0]));
      }
    };

    ws.onclose = () => {
      if (stopped) return;
      store.dispatch(setConn('connecting'));
      // Exponential backoff, capped at 30s
      retryTimer = setTimeout(() => {
        delay = Math.min(delay * 1.5, MAX_RECONNECT_DELAY_MS);
        connect();
      }, delay);
    };

    ws.onerror = () => {
      store.dispatch(setConn('error'));
      ws?.close(); // triggers onclose -> retry
    };
  }

  connect();

  return () => {
    stopped = true;
    if (retryTimer) clearTimeout(retryTimer);
    ws?.close();
  };
}
