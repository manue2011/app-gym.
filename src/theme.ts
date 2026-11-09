import { useColorScheme } from 'react-native';

const light = {
  background: '#F4F5F7',
  card: '#FFFFFF',
  text: '#15171A',
  muted: '#6B7280',
  border: '#E2E5EA',
  primary: '#E4572E',
  primaryText: '#FFFFFF',
  danger: '#C62828',
  chip: '#ECEEF2',
};

const dark: typeof light = {
  background: '#0F1113',
  card: '#1A1D21',
  text: '#F2F3F5',
  muted: '#9CA3AF',
  border: '#2C3036',
  primary: '#FF6B3D',
  primaryText: '#FFFFFF',
  danger: '#EF5350',
  chip: '#262A30',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}
