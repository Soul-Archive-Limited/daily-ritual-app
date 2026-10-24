import { Gauge, HStack, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  gaugeStyle,
  lineLimit,
  monospacedDigit,
  padding,
  tint,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

/** What the app shares with the widget after every change (see useWidgetSync). */
export type TodayProps = {
  /** 0..1 */
  p: number;
  next: string;
  nextSlot: string;
  am: number;
  pm: number;
  health: number;
  waterMl: number;
  waterGoal: number;
  /** Shown instead of "next" when everything is done */
  done: boolean;
};

const SAGE = '#3DB887';
const SLOT: Record<string, string> = { Morning: '#E0A552', Night: '#837EE6', Health: '#4FA3DC' };

const TodayWidget = (props: TodayProps, env: WidgetEnvironment) => {
  'widget';
  const pct = Math.round(props.p * 100);
  const bg = containerBackground('background', 'widget');
  const open = widgetURL('dailyritual://');

  if (env.widgetFamily === 'accessoryCircular')
    return (
      <Gauge value={props.p} modifiers={[gaugeStyle('circularCapacity'), open]} currentValueLabel={<Text>{pct}</Text>}>
        <Text>Today</Text>
      </Gauge>
    );

  if (env.widgetFamily === 'accessoryRectangular' || env.widgetFamily === 'accessoryInline')
    return (
      <VStack alignment="leading" modifiers={[open]}>
        <Text modifiers={[font({ weight: 'semibold', size: 13 })]}>Daily Ritual · {pct}%</Text>
        <Text modifiers={[lineLimit(2), font({ size: 13 })]}>{props.done ? 'Every step done' : props.next}</Text>
      </VStack>
    );

  const ring = (
    <Gauge value={props.p} modifiers={[gaugeStyle('circularCapacity'), tint(SAGE)]} currentValueLabel={<Text>{pct}%</Text>}>
      <Text>Today</Text>
    </Gauge>
  );

  if (env.widgetFamily === 'systemMedium' || env.widgetFamily === 'systemLarge')
    return (
      <HStack spacing={16} modifiers={[bg, open]}>
        <VStack alignment="leading" spacing={6}>
          {ring}
          <Spacer />
          <Text modifiers={[font({ size: 12 }), foregroundStyle('secondary'), lineLimit(2)]}>
            {props.done ? 'Every step done' : `Next: ${props.next}`}
          </Text>
        </VStack>
        <VStack alignment="leading" spacing={8}>
          {(
            [
              ['Morning', props.am],
              ['Night', props.pm],
              ['Health', props.health],
            ] as const
          ).map(([name, v]) => (
            <VStack key={name} alignment="leading" spacing={3}>
              <HStack>
                <Text modifiers={[font({ size: 12, weight: 'semibold' })]}>{name}</Text>
                <Spacer />
                <Text modifiers={[font({ size: 12 }), monospacedDigit(), foregroundStyle('secondary')]}>
                  {Math.round(v * 100)}%
                </Text>
              </HStack>
              <ProgressView value={v} modifiers={[tint(SLOT[name])]} />
            </VStack>
          ))}
          <Text modifiers={[font({ size: 12 }), monospacedDigit(), foregroundStyle('secondary')]}>
            Water {(props.waterMl / 1000).toFixed(1)} of {(props.waterGoal / 1000).toFixed(1)} L
          </Text>
        </VStack>
      </HStack>
    );

  return (
    <VStack alignment="leading" spacing={6} modifiers={[bg, open]}>
      {ring}
      <Spacer />
      <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(SLOT[props.nextSlot] ?? SAGE)]}>
        {props.done ? 'All done' : `Next · ${props.nextSlot}`}
      </Text>
      <Text modifiers={[font({ size: 14, weight: 'semibold' }), lineLimit(2), padding({ bottom: 2 })]}>
        {props.done ? 'Perfect day' : props.next}
      </Text>
    </VStack>
  );
};

export default createWidget<TodayProps>('TodayWidget', TodayWidget, {
  p: 0,
  next: 'Open Daily Ritual',
  nextSlot: 'Morning',
  am: 0,
  pm: 0,
  health: 0,
  waterMl: 0,
  waterGoal: 3000,
  done: false,
});
