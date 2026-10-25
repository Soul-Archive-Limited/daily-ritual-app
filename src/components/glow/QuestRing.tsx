import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { Icon } from '@/components/bits';
import { colors } from '@/theme/tokens';

/** Small ring for a quest; turns into a glossy green tick when done. */
export function QuestRing({ p, size = 34 }: { p: number; size?: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const done = p >= 1;
  return (
    <View style={{ width: size, height: size }}>
      <Svg viewBox="0 0 34 34" width={size} height={size}>
        <Defs>
          <LinearGradient id="qr" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFB27A" />
            <Stop offset="0.55" stopColor="#F06FA5" />
            <Stop offset="1" stopColor="#9B7BF2" />
          </LinearGradient>
          <LinearGradient id="qd" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#8BE3AE" />
            <Stop offset="1" stopColor="#46B37A" />
          </LinearGradient>
        </Defs>
        {done ? (
          <Circle cx={17} cy={17} r={17} fill="url(#qd)" />
        ) : (
          <>
            <Circle cx={17} cy={17} r={r} fill="none" stroke={colors.line2} strokeWidth={3} />
            {p > 0 ? (
              <Circle
                cx={17}
                cy={17}
                r={r}
                fill="none"
                stroke="url(#qr)"
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={`${(c * p).toFixed(1)} ${c.toFixed(1)}`}
                transform="rotate(-90 17 17)"
              />
            ) : null}
          </>
        )}
      </Svg>
      {done ? (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Icon name="checkmark" size={14} color="#FFFFFF" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
