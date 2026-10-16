import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import { ASSETS, type Project, type Reading, type MotorProject, type TankProject, type PumpProject, type HxProject } from '../lib/domain';

type Conn = 'waiting' | 'connecting' | 'live' | 'error';

const twin = createSlice({
  name: 'twin',
  initialState: {
    data:     Object.fromEntries(ASSETS.map((a) => [a.id, { ...a.base }])) as Record<string, Reading>,
    selected: null as string | null,
    conn:     'waiting' as Conn,
    token:    null as string | null,
  },
  reducers: {
    setData:  (s, a: PayloadAction<Record<string, Reading>>) => { s.data = a.payload; },
    select:   (s, a: PayloadAction<string | null>)           => { s.selected = a.payload; },
    setConn:  (s, a: PayloadAction<Conn>)                    => { s.conn = a.payload; },
    setToken: (s, a: PayloadAction<string>)                  => { s.token = a.payload; },
  },
});

const defaultProject: Project = {
  motor: { name: 'Mixer line 3', kw: 37, voltage: 400, starter: 'vfd' },
  tank:  { volume: 2000, material: 'ss304', insulated: false },
  pump:  { flowRate: 12, head: 25, fluid: 'water' },
  hx:    { dutyKw: 80, hotInlet: 120, coldInlet: 20, type: 'shell' },
};

const project = createSlice({
  name: 'project',
  initialState: defaultProject,
  reducers: {
    setMotor: (s, a: PayloadAction<Partial<MotorProject>>) => { s.motor = { ...s.motor, ...a.payload }; },
    setTank:  (s, a: PayloadAction<Partial<TankProject>>)  => { s.tank  = { ...s.tank,  ...a.payload }; },
    setPump:  (s, a: PayloadAction<Partial<PumpProject>>)  => { s.pump  = { ...s.pump,  ...a.payload }; },
    setHx:    (s, a: PayloadAction<Partial<HxProject>>)    => { s.hx    = { ...s.hx,    ...a.payload }; },
    // keep a general setProject for bridge.ts host/project messages
    setProject: (s, a: PayloadAction<Partial<MotorProject>>) => { s.motor = { ...s.motor, ...a.payload }; },
  },
});

export type Tab = 'size' | 'bom' | 'ai' | 'help';
const ui = createSlice({
  name: 'ui',
  initialState: {
    tab:   'size' as Tab,
    eco:   false,
    theme: 'dark' as 'dark' | 'light',
    log:   [] as string[],
  },
  reducers: {
    setTab:   (s, a: PayloadAction<Tab>)              => { s.tab   = a.payload; },
    setEco:   (s, a: PayloadAction<boolean>)          => { s.eco   = a.payload; },
    setTheme: (s, a: PayloadAction<'dark' | 'light'>) => { s.theme = a.payload; },
    addLog:   (s, a: PayloadAction<string>)           => {
      s.log = [`${new Date().toLocaleTimeString()}  ${a.payload}`, ...s.log].slice(0, 4);
    },
  },
});

export const { setData, select, setConn, setToken }  = twin.actions;
export const { setMotor, setTank, setPump, setHx, setProject } = project.actions;
export const { setTab, setEco, setTheme, addLog }    = ui.actions;

export const store = configureStore({
  reducer: { twin: twin.reducer, project: project.reducer, ui: ui.reducer },
});

export type RootState = ReturnType<typeof store.getState>;
export const useAppDispatch: () => typeof store.dispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
