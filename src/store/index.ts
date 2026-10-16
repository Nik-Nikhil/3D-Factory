import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import { ASSETS, type Project, type Reading } from '../lib/domain';

type Conn = 'waiting' | 'connecting' | 'live' | 'error';

const twin = createSlice({
  name: 'twin',
  initialState: {
    data: Object.fromEntries(ASSETS.map((a) => [a.id, { ...a.base }])) as Record<string, Reading>,
    selected: null as string | null,
    conn: 'waiting' as Conn,
    token: null as string | null,
  },
  reducers: {
    setData: (s, a: PayloadAction<Record<string, Reading>>) => { s.data = a.payload; },
    select: (s, a: PayloadAction<string | null>) => { s.selected = a.payload; },
    setConn: (s, a: PayloadAction<Conn>) => { s.conn = a.payload; },
    setToken: (s, a: PayloadAction<string>) => { s.token = a.payload; },
  },
});

const project = createSlice({
  name: 'project',
  initialState: { name: 'Mixer line 3', kw: 37, voltage: 400, starter: 'vfd' } as Project,
  reducers: { setProject: (s, a: PayloadAction<Partial<Project>>) => ({ ...s, ...a.payload }) },
});

export type Tab = 'size' | 'bom' | 'ai' | 'help';
const ui = createSlice({
  name: 'ui',
  initialState: { tab: 'size' as Tab, eco: false, theme: 'dark' as 'dark' | 'light', log: [] as string[] },
  reducers: {
    setTab: (s, a: PayloadAction<Tab>) => { s.tab = a.payload; },
    setEco: (s, a: PayloadAction<boolean>) => { s.eco = a.payload; },
    setTheme: (s, a: PayloadAction<'dark' | 'light'>) => { s.theme = a.payload; },
    addLog: (s, a: PayloadAction<string>) => { s.log = [`${new Date().toLocaleTimeString()}  ${a.payload}`, ...s.log].slice(0, 4); },
  },
});

export const { setData, select, setConn, setToken } = twin.actions;
export const { setProject } = project.actions;
export const { setTab, setEco, setTheme, addLog } = ui.actions;

export const store = configureStore({ reducer: { twin: twin.reducer, project: project.reducer, ui: ui.reducer } });
export type RootState = ReturnType<typeof store.getState>;
export const useAppDispatch: () => typeof store.dispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
