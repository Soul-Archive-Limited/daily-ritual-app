import { useWindowDimensions } from 'react-native';

/**
 * Size class of the current window (not the device): an iPad in Slide Over or a narrow
 * Split View is "compact" like a phone, a full iPad is "regular".
 */
export function useLayout() {
  const { width } = useWindowDimensions();
  const regular = width >= 700;
  return { width, regular, columns: width >= 1000 ? 3 : regular ? 2 : 1 };
}
