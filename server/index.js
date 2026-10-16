import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 3001;

// baseline readings for each machine
const BASE = {
  'T-101': { temp: 62, vib: 1.2 },
  'P-201': { temp: 68, vib: 2.6 },
  'H-401': { temp: 74, vib: 1.4 },
  'M-301': { temp: 72, vib: 3.0 },
};

// live state starts at baseline
const state = structuredClone(BASE);

// tracks how many more ticks a machine stays in fault
const faultCounters = {};

const server = createServer();
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  let authenticated = false;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return ws.close(1008, 'bad json');
    }

    // first message must be an auth handshake
    if (!authenticated) {
      if (msg.type === 'auth' && msg.token === 'demo-token') {
        authenticated = true;
        // send current state right away so the UI isn't empty
        ws.send(JSON.stringify({ type: 'readings', payload: state }));
      } else {
        ws.close(1008, 'unauthorized');
      }
    }
  });

  // don't let unhandled socket errors crash the process
  ws.on('error', () => {});
});

// slowly drift a value back toward its baseline, with a bit of noise
function drift(current, base) {
  return current + (base - current) * 0.2 + (Math.random() - 0.5) * 0.8;
}

function broadcast(data) {
  const msg = JSON.stringify({ type: 'readings', payload: data });
  for (const ws of wss.clients) {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  }
}

// update readings every second and push to all connected clients
setInterval(() => {
  const ids = Object.keys(BASE);

  // randomly trigger a fault on one machine every now and then
  if (Math.random() < 0.15) {
    const id = ids[Math.floor(Math.random() * ids.length)];
    faultCounters[id] = 8;
  }

  for (const id of ids) {
    const base = BASE[id];
    const inFault = (faultCounters[id] ?? 0) > 0;

    if (inFault) faultCounters[id]--;

    state[id] = {
      temp: inFault ? state[id].temp + 2.5          : drift(state[id].temp, base.temp),
      vib:  inFault ? 7.2 + Math.random()           : drift(state[id].vib,  base.vib),
    };
  }

  broadcast(state);
}, 1000);

server.listen(PORT, () => console.log(`WebSocket server running on :${PORT}`));
