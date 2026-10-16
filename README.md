# 3D Factory 

A factory floor you can actually interact with. Pick a machine, watch its temperature and vibration update live, size a motor, get a parts list, and ask the assistant what's broken — all in one page.

---

## Run it

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. If you want to see it embedded inside a fake client app (like it would be in production), go to `http://localhost:5173/host.html` instead.

---

## How it's put together

### The 3D stuff lives in `src/components/Scene.tsx`

This is the factory floor. Each machine — the tank, the pump, the heat exchanger, the mixer — is a 3D mesh that glows based on how it's doing. Green means fine, amber means keep an eye on it, red means something's wrong.

It uses React Three Fiber, which lets you write Three.js the same way you'd write a normal React component. Click a machine and the sidebar updates. Drag to orbit the camera.

One thing worth knowing: there's an **Eco mode** toggle in the header. By default the scene renders 60fps continuously, but Eco mode switches it to only redraw when something actually changes. Handy if you're on a slow machine or remoting in.

---

### The sidebar panels are in `src/components/Panels.tsx`

Four separate panels, all exported from the same file and swapped in by the tab bar:

**Sizing** — configure a motor. Move the kW slider, pick a voltage, choose how it starts (direct, soft starter, or VFD). The 3D motor resizes as you drag the slider.

**BOM** — the bill of materials. Every time you change a value in Sizing, this table recalculates instantly. There's also a button to download it as a CSV.

**Assistant** — type a question. "Which assets are in alarm?" "What's the hottest machine?" "What's the BOM total?" It reads from live state so the answers are always current.

**Help** — an accordion FAQ and release notes. Nothing fancy, just useful to have in the app itself.

There are two tiny shared components at the top of the file (`Label` and `SectionTitle`) so the panels all look consistent without repeating the same className strings everywhere.

---

### Redux handles all the state — `src/store/index.ts`

Three slices:

- **twin** — the live sensor readings, which asset is currently selected, and whether the socket is connected
- **project** — the motor config (kW, voltage, starter type, project name)
- **ui** — active tab, eco mode on/off, theme, and the log of messages from the host app

The store exports `useAppSelector` and `useAppDispatch` so you don't have to think about types in every component that needs state.

---

### Live data — `src/lib/socket.ts` and `server/index.js`

The server runs on port 3001 and pretends to be a real plant. It sends fake-but-plausible sensor readings every second over a plain WebSocket. The client receives them and drops them straight into the Redux `twin` slice.

Auth works like this: the host app sends a token to the twin via `postMessage`, the twin opens a WebSocket and sends that token as its very first message, and the server closes the connection immediately if it doesn't match. After that, readings flow in every second.

The client also handles reconnecting automatically — if the connection drops it waits a few seconds and tries again, backing off gradually up to 30 seconds between attempts.

---

### The rules are in `src/lib/domain.ts`

This file has no side effects — just data and functions.

`ASSETS` is the list of four machines with their names, positions in 3D space, and baseline sensor values.

`statusOf(reading)` is one small function that decides ok / warn / alarm from a temperature and vibration reading. It's used everywhere — the 3D glow, the dot next to the asset button, the assistant, the sidebar. One rule, applied consistently.

`buildBom(project)` takes a motor config and returns a parts list with SKUs and prices. The math is rough (real version would call an actual catalog API) but the structure is there.

---

### Talking to the host app — `src/lib/bridge.ts`

When the twin is embedded in an iframe it needs to talk to the parent. This file handles that. The twin fires `twin/ready` when it loads, the host replies with a token, and after that they can exchange messages — selecting assets, changing the theme, updating the project config.

All messages are checked against a trusted origin so you can't just open any page and start sending commands.

---

## File layout

```
src/
  components/
    Scene.tsx       the 3D factory floor
    Panels.tsx      all four sidebar panels
  lib/
    domain.ts       the assets, the status rule, the BOM math
    bridge.ts       postMessage with the host app
    socket.ts       the Socket.IO client
  store/
    index.ts        Redux store and typed hooks
  App.tsx           layout, header, sidebar, tabs
  styles.css        Tailwind base + a couple of overrides
server/
  index.js          fake plant data, token check
host.html           the fake client app that embeds the twin
```

---

## A few things it doesn't do yet

The 3D shapes are basic geometry, not real CAD models. The assistant answers from simple rules, not an LLM. The prices in the BOM are made up. No tests yet.

All fixable — the structure is there for each one.
