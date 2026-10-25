import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import type { SFSymbol } from 'expo-symbols';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/bits';
import { SlideToConfirm } from '@/components/glow/SlideToConfirm';
import { useDraft } from '@/components/welcome/draft';
import { minutesFor, starterSteps } from '@/data/starters';
import { deviceTz, useSetup } from '@/data/store';
import { setKv } from '@/db/repo';
import type { Config } from '@/db/types';
import { todayKey } from '@/logic/dates';
import { askForNotifications } from '@/notifications/schedule';
import { colors, DEW, font, NIGHT, radius } from '@/theme/tokens';

const REMINDERS = { am: '08:30', pm: '22:30' };
const SKIN_WORD = { dry: 'dry', combination: 'combination', oily: 'oily', sensitive: 'sensitive' } as const;
const GOAL_WORD = { glow: 'glow', clear: 'clear skin', hydration: 'hydration', hair: 'hair', habit: 'habit' } as const;

/** One permission with its reason; tapping asks, a glossy green tick shows it's on. */
function Ask({
  icon,
  title,
  text,
  on,
  onPress,
}: {
  icon: SFSymbol;
  title: string;
  text: string;
  on: boolean | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={on != null}
      accessibilityRole="button"
      accessibilityState={{ checked: !!on }}
      accessibilityLabel={`${title}. ${text}`}
      style={styles.ask}>
      <View style={styles.chk}>
        {on ? <LinearGradient colors={DEW} style={StyleSheet.absoluteFill} /> : null}
        <Icon name={on ? 'checkmark' : icon} size={15} color={on ? '#FFFFFF' : colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.askTitle}>{title}</Text>
        <Text style={styles.askText}>{on === false ? 'Not now. You can turn it on later in Profile.' : text}</Text>
      </View>
      {on == null ? <Text style={styles.allow}>Allow</Text> : null}
    </Pressable>
  );
}

/** The reveal: their plan as two cards, permissions with a reason each, then a slide into the first day. */
export default function Ready() {
  const { draft } = useDraft();
  const { finishSetup } = useSetup();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [notify, setNotify] = useState<boolean | null>(null);
  const [where, setWhere] = useState<boolean | null>(null);
  const steps = starterSteps(draft.starter, draft.skin ?? undefined);
  const am = steps.filter((s) => s.slot === 'am');
  const pm = steps.filter((s) => s.slot === 'pm' && s.on === 'every');
  const eyebrow = [
    draft.skin ? `Built for ${SKIN_WORD[draft.skin]} skin` : 'Built for you',
    draft.goals[0] ? `${GOAL_WORD[draft.goals[0]]} goal` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  // The slide springs back while saving; ignore a second slide.
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const start = async () => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    const config: Config = {
      name: draft.name.trim(),
      startedAt: todayKey(),
      shampooDays: [...draft.washDays].sort(),
      exfoliateDays: [...draft.washDays].sort(),
      exfoliateMode: false,
      checkinEvery: 7,
      reminders: REMINDERS,
      lastTz: deviceTz(),
      ...(draft.skin ? { skinType: draft.skin } : {}),
      ...(draft.goals.length ? { goals: draft.goals } : {}),
      ...(notify != null ? { notify: { on: notify } } : {}),
    };
    await setKv(db, 'tutorial', 'pending');
    await finishSetup(config, steps);
  };

  const card = (night: boolean, name: string, n: number) => (
    <View style={[styles.card, !night && { backgroundColor: colors.card }]}>
      {night ? (
        <LinearGradient colors={NIGHT} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={styles.head}>
        <View style={[styles.ic, { backgroundColor: night ? 'rgba(255,255,255,0.2)' : colors.fill }]}>
          <Icon name={night ? 'moon' : 'sun.max'} size={18} color={night ? '#FFFFFF' : colors.morning} />
        </View>
        <Text style={[styles.cname, night && { color: '#FFFFFF' }]}>
          {name}
          {'\n'}ritual
        </Text>
      </View>
      <Text style={[styles.meta, night && { color: 'rgba(255,255,255,0.75)' }]}>
        Every day · about {minutesFor(n)} min
      </Text>
      <Text style={[styles.num, night && { color: '#FFFFFF' }]}>
        {n}
        <Text style={[styles.numSmall, night && { color: 'rgba(255,255,255,0.75)' }]}> steps</Text>
      </Text>
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <View style={styles.bar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.back}
          hitSlop={6}>
          <Icon name="chevron.left" size={16} color={colors.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Animated.View entering={FadeInDown.duration(420)}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.thin} accessibilityRole="header">
            Your ritual
          </Text>
          <Text style={styles.bold}>is ready.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(420).delay(120)} style={styles.cards}>
          {card(false, 'Morning', am.length)}
          {card(true, 'Night', pm.length)}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(420).delay(220)} style={styles.asks}>
          <Ask
            icon="bell"
            title="Daily reminders"
            text={`${REMINDERS.am} and ${REMINDERS.pm}, your local time, only if that ritual isn’t done.`}
            on={notify}
            onPress={async () => {
              Haptics.selectionAsync();
              setNotify(await askForNotifications());
            }}
          />
          <View style={styles.sep} />
          <Ask
            icon="location"
            title="Sun and UV where you are"
            text="Sunrise, sunset and when to reapply sunscreen."
            on={where}
            onPress={async () => {
              Haptics.selectionAsync();
              setWhere((await Location.requestForegroundPermissionsAsync()).granted);
            }}
          />
        </Animated.View>

        <Text style={styles.note}>
          Everything stays on this device. Sign in later if you want it on your iPad or the website too.
        </Text>
      </ScrollView>
      <View style={[styles.foot, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <SlideToConfirm label={saving ? 'Setting up…' : 'Start my first day'} icon="arrow.right" onConfirm={start} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  bar: { paddingHorizontal: 20, width: '100%', maxWidth: 600, alignSelf: 'center' },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 18px -8px rgba(0,0,0,0.18)',
  },
  body: { padding: 22, gap: 20, width: '100%', maxWidth: 600, alignSelf: 'center' },
  eyebrow: { ...font.light, fontSize: 14, color: colors.muted },
  thin: { ...font.thin, fontSize: 46, lineHeight: 48, letterSpacing: -1.6, color: colors.text, marginTop: 6 },
  bold: { ...font.bold, fontSize: 46, lineHeight: 50, letterSpacing: -1.6, color: colors.text },
  cards: { flexDirection: 'row', gap: 12 },
  card: {
    flex: 1,
    padding: 18,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    boxShadow: '0 18px 40px -26px rgba(20,20,40,0.35)',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ic: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cname: { ...font.medium, fontSize: 15, lineHeight: 18, color: colors.text },
  meta: { ...font.light, fontSize: 13, color: colors.muted, marginTop: 26 },
  num: { ...font.thin, fontSize: 50, lineHeight: 54, letterSpacing: -2, color: colors.text },
  numSmall: { ...font.regular, fontSize: 18, color: colors.muted, letterSpacing: 0 },
  asks: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingVertical: 4,
    boxShadow: '0 18px 40px -26px rgba(20,20,40,0.35)',
  },
  ask: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line2 },
  chk: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: colors.line2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  askTitle: { ...font.semibold, fontSize: 16, color: colors.text },
  askText: { ...font.regular, fontSize: 13, lineHeight: 17, color: colors.muted, marginTop: 1 },
  allow: { ...font.semibold, fontSize: 14, color: colors.rose },
  note: {
    ...font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.dim,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  foot: { paddingHorizontal: 22, paddingTop: 12, width: '100%', maxWidth: 600, alignSelf: 'center' },
});
