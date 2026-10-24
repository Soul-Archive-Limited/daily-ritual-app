import * as Haptics from 'expo-haptics';
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { PanResponder, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const GAP = 8;

/** Where the dragged row would land, given how far it has moved. */
function targetIndex(from: number, dy: number, hs: number[]) {
  'worklet';
  let idx = from;
  let acc = 0;
  if (dy > 0) {
    for (let j = from + 1; j < hs.length; j++) {
      const h = (hs[j] ?? 0) + GAP;
      if (dy > acc + h / 2) idx = j;
      else break;
      acc += h;
    }
  } else {
    for (let j = from - 1; j >= 0; j--) {
      const h = (hs[j] ?? 0) + GAP;
      if (-dy > acc + h / 2) idx = j;
      else break;
      acc += h;
    }
  }
  return idx;
}

/** Distance from row `from` to where it sits at index `to`. */
function offsetTo(from: number, to: number, hs: number[]) {
  'worklet';
  let y = 0;
  if (to > from) for (let j = from + 1; j <= to; j++) y += (hs[j] ?? 0) + GAP;
  else for (let j = to; j < from; j++) y -= (hs[j] ?? 0) + GAP;
  return y;
}

type Shared = {
  /** Row heights on the JS side (source of truth); mirrored into `heights` for the UI thread. */
  heightList: RefObject<number[]>;
  setHeight: (index: number, h: number) => void;
  heights: SharedValue<number[]>;
  drag: SharedValue<number>;
  dy: SharedValue<number>;
};

/**
 * Vertical list where each row can be picked up by its handle (hold briefly, then drag).
 * Rows may have different heights. Calls onReorder(from, to) on drop.
 */
export function ReorderList({
  ids,
  renderRow,
  onReorder,
  onDragging,
}: {
  ids: string[];
  /** `handle` wraps whatever should start the drag (the step number). */
  renderRow: (id: string, index: number, handle: (child: ReactNode) => ReactNode) => ReactNode;
  onReorder: (from: number, to: number) => void;
  onDragging?: (on: boolean) => void;
}) {
  const heights = useSharedValue<number[]>([]);
  const heightList = useRef<number[]>([]);
  const drag = useSharedValue(-1);
  const dy = useSharedValue(0);
  const pendingReset = useRef(false);

  // Once the new order has rendered, drop the drag offsets in the same frame.
  useLayoutEffect(() => {
    if (pendingReset.current) {
      pendingReset.current = false;
      drag.set(-1);
      dy.set(0);
    }
  }, [ids, drag, dy]);

  const commit = (from: number, to: number) => {
    onDragging?.(false);
    if (from === to) {
      drag.set(-1);
      dy.set(0);
      return;
    }
    pendingReset.current = true;
    onReorder(from, to);
  };

  const setHeight = (i: number, h: number) => {
    heightList.current[i] = h;
    heights.set([...heightList.current]);
  };
  const shared: Shared = { heightList, setHeight, heights, drag, dy };
  return (
    <View style={{ gap: GAP }}>
      {ids.map((id, i) => (
        <Row key={id} index={i} shared={shared} onStart={() => onDragging?.(true)} onDrop={commit}>
          {(handle) => renderRow(id, i, handle)}
        </Row>
      ))}
    </View>
  );
}

function Row({
  index,
  shared,
  onStart,
  onDrop,
  children,
}: {
  index: number;
  shared: Shared;
  onStart: () => void;
  onDrop: (from: number, to: number) => void;
  children: (handle: (child: ReactNode) => ReactNode) => ReactNode;
}) {
  const { heights, drag, dy, setHeight } = shared;
  const reduce = useReducedMotion();

  const onLayout = (e: LayoutChangeEvent) => {
    setHeight(index, e.nativeEvent.layout.height);
  };

  const tickHaptic = () => Haptics.selectionAsync();

  // Hold the handle ~0.2 s to pick the row up, then drag. A quick swipe on it does nothing.
  const latest = useRef<Latest>({ index, onStart, onDrop, reduce });
  useLayoutEffect(() => {
    latest.current = { index, onStart, onDrop, reduce };
  });
  // makeResponder only reads `latest` inside touch handlers, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() => makeResponder(latest, shared));

  // A light tick each time the landing spot changes.
  useAnimatedReaction(
    () => (drag.get() === index ? targetIndex(index, dy.get(), heights.get()) : -1),
    (t, prev) => {
      if (t >= 0 && prev !== null && prev >= 0 && t !== prev) scheduleOnRN(tickHaptic);
    },
  );

  const style = useAnimatedStyle(() => {
    const d = drag.get();
    if (d < 0) return { transform: [{ translateY: 0 }, { scale: 1 }], zIndex: 0, opacity: 1 };
    if (d === index) return { transform: [{ translateY: dy.get() }, { scale: 1.03 }], zIndex: 10, opacity: 0.92 };
    const hs = heights.get();
    const t = targetIndex(d, dy.get(), hs);
    const h = (hs[d] ?? 0) + GAP;
    const y = d < index && index <= t ? -h : t <= index && index < d ? h : 0;
    return {
      transform: [{ translateY: withTiming(y, { duration: reduce ? 0 : 160 }) }, { scale: 1 }],
      zIndex: 0,
      opacity: 1,
    };
  });

  return (
    <Animated.View onLayout={onLayout} style={style}>
      {children((child) => (
        <View {...responder.panHandlers} hitSlop={8}>
          {child}
        </View>
      ))}
    </Animated.View>
  );
}

type Latest = { index: number; onStart: () => void; onDrop: (from: number, to: number) => void; reduce: boolean };

/** Touch handling for one row's handle. Lives outside render; reads the latest props from `latest`. */
function makeResponder(latest: RefObject<Latest>, { heightList, drag, dy }: Shared) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let active = false;
  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const drop = () => {
    clear();
    if (!active) return;
    active = false;
    const { index: from, onDrop, reduce } = latest.current;
    const hs = heightList.current;
    const to = targetIndex(from, dy.get(), hs);
    dy.set(
      withTiming(offsetTo(from, to, hs), { duration: reduce ? 0 : 150 }, (finished) => {
        if (finished) scheduleOnRN(onDrop, from, to);
      }),
    );
  };
  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => active,
    onPanResponderTerminationRequest: () => !active,
    onPanResponderGrant: () => {
      clear();
      timer = setTimeout(() => {
        active = true;
        drag.set(latest.current.index);
        dy.set(0);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        latest.current.onStart();
      }, 200);
    },
    onPanResponderMove: (_, g) => {
      if (active) dy.set(g.dy);
      else if (Math.abs(g.dy) > 8) clear();
    },
    onPanResponderRelease: drop,
    onPanResponderTerminate: drop,
  });
}
