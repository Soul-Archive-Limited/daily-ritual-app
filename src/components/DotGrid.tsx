import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Pattern, Rect } from 'react-native-svg';

import { usePalette } from '@/theme/tokens';

/** The fine dot grid behind every page, like dotted paper. It scrolls with the content. */
export function DotGrid() {
  const p = usePalette();
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Svg width="100%" height="100%">
        <Pattern id="dots" width={18} height={18} patternUnits="userSpaceOnUse">
          <Circle cx={9} cy={9} r={1} fill={p.grid} />
        </Pattern>
        <Rect width="100%" height="100%" fill="url(#dots)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: -1200, bottom: -1200, left: -400, right: -400 },
});
