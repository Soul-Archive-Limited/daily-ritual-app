import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, G, Line, Path } from 'react-native-svg';

import type { Angle } from '@/skin/model';

/**
 * Face outline drawn over the camera (ported from the web guide): an oval, centre line, eye line and chin
 * line for the front; a ¾ profile for left and right (mirrored for right).
 */
export function FaceGuide({ angle }: { angle: Angle }) {
  const eye = <Line x1="36" x2="264" y1="164" y2="164" stroke="rgba(255,255,255,.55)" strokeDasharray="4 5" />;
  const chin = <Line x1="75" x2="225" y1="320" y2="320" stroke="rgba(255,255,255,.35)" strokeDasharray="4 5" />;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg viewBox="0 0 300 400" preserveAspectRatio="none" width="100%" height="100%">
        {angle === 'front' ? (
          <>
            <Ellipse cx={150} cy={190} rx={98} ry={130} fill="none" stroke="#fff" strokeWidth={2.2} opacity={0.85} />
            <Line x1="150" x2="150" y1="50" y2="330" stroke="rgba(255,255,255,.35)" strokeDasharray="4 5" />
          </>
        ) : (
          <G transform={angle === 'right' ? 'translate(300 0) scale(-1 1)' : undefined}>
            <Path
              d="M170 62 C 105 62 78 120 80 190 C 82 262 110 318 165 322 C 190 324 205 300 206 278 L 214 252 L 226 246 L 214 226 L 222 214 L 214 200 C 220 180 226 160 222 138 C 214 92 196 62 170 62 Z"
              fill="none"
              stroke="#fff"
              strokeWidth={2.2}
              opacity={0.85}
            />
          </G>
        )}
        {eye}
        {chin}
      </Svg>
    </View>
  );
}
