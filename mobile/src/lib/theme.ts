// Colours for light and dark mode. Change the look of the whole app here.
import { useColorScheme } from 'react-native';
import { useStore } from './store';

const light = {
  bg: '#FFFFFF',
  surface: '#F6F3F0',
  line: '#E6E0DA',
  fg: '#1C1714',
  muted: '#6B625B',
  accent: '#C2361B',
  accentInk: '#FFFFFF',
  accentSoft: '#FCE9E3',
  accentSoftFg: '#8A2511',
  good: '#2F6B3A',
  goodSoft: '#E4F1E6',
  warnBg: '#FFF4D6',
  warnFg: '#6B4A00',
  meBg: '#1C1714',
  meFg: '#FFFFFF',
};

const dark: typeof light = {
  bg: '#151210',
  surface: '#201B18',
  line: '#352E29',
  fg: '#F3EEE9',
  muted: '#ADA39A',
  accent: '#F26B4F',
  accentInk: '#1C0F0B',
  accentSoft: '#3A1F17',
  accentSoftFg: '#FFB7A6',
  good: '#7CC48A',
  goodSoft: '#1D2E20',
  warnBg: '#3A2F12',
  warnFg: '#F5D98A',
  meBg: '#F3EEE9',
  meFg: '#151210',
};

export type Colors = typeof light & { isDark: boolean };

/** Current colours, following the user's Light / Dark / System choice. */
export function useColors(): Colors {
  const system = useColorScheme();
  const { themeMode } = useStore();
  const isDark = themeMode === 'system' ? system === 'dark' : themeMode === 'dark';
  return { ...(isDark ? dark : light), isDark };
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 10, md: 14, lg: 18, pill: 999 };
