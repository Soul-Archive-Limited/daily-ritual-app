import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { aiErrorText, askCoach, unavailableText, useAIStatus } from '@/ai/coach';
import { buildContext } from '@/ai/context';
import { Icon } from '@/components/bits';
import { Lune } from '@/components/Lune';
import { SheetDone } from '@/components/SheetDone';
import { useStore } from '@/data/store';
import { useShelf } from '@/data/useShelf';
import { colors, font, radius } from '@/theme/tokens';

const IDEAS = [
  'Why does my skin feel tight?',
  'What am I missing most this week?',
  'Is my night routine in a good order?',
  'How should I adjust for the weather here?',
  'Can I use my exfoliant and retinol together?',
];

type Msg = { who: 'me' | 'lune'; text: string };

/** Chat with Lune about your skin and routine. Runs on Apple Intelligence on the phone; free and private. */
export default function Ask() {
  const s = useStore()!;
  const shelf = useShelf();
  const ai = useAIStatus();
  const [q, setQ] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const scroller = useRef<ScrollViewInstance>(null);

  const ask = async (text = q) => {
    const t = text.trim();
    if (!t || busy) return;
    setQ('');
    setMsgs((m) => [...m, { who: 'me', text: t }]);
    setBusy(true);
    try {
      // Earlier turns go along so follow-up questions make sense.
      const history = msgs
        .slice(-6)
        .map((m) => `${m.who === 'me' ? 'Them' : 'You'}: ${m.text}`)
        .join('\n');
      const ctx = buildContext({ ...s, shelf, sun: s.sun });
      const a = (await askCoach(history ? `${ctx}\n\nConversation so far:\n${history}` : ctx, t)).trim();
      setMsgs((m) => [...m, { who: 'lune', text: a || 'I’m not sure. Try asking another way.' }]);
    } catch (e) {
      const msg = aiErrorText(e);
      if (msg) setMsgs((m) => [...m, { who: 'lune', text: msg }]);
    } finally {
      setBusy(false);
      setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 80);
    }
  };

  return (
    // One wrapping view: form sheets lay out a single child (a ScrollView beside other views breaks their sizing).
    <View style={styles.screen} collapsable={false}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={60}>
        <ScrollView
          ref={scroller}
          style={{ flex: 1 }}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          <SheetDone />
          <View style={styles.hello}>
            <Lune mood={ai.checked && !ai.ok ? 'worried' : busy ? 'cheer' : 'happy'} size={110} label="Lune" />
            <Text style={styles.title}>
              Ask <Text style={{ ...font.bold }}>Lune.</Text>
            </Text>
            <Text style={styles.sub}>
              About your skin, hair, sun and your own routine. Answers come from Apple Intelligence on this iPhone:
              free, and nothing leaves your phone. Not medical advice.
            </Text>
          </View>

          {ai.checked && !ai.ok ? (
            <View style={styles.notice}>
              <Icon name="info.circle" size={16} color={colors.gold} />
              <Text style={styles.noticeText}>{unavailableText(ai.reason)}</Text>
            </View>
          ) : null}

          {msgs.map((m, i) => (
            <Animated.View
              key={i}
              entering={FadeInUp.duration(260)}
              style={[styles.bubble, m.who === 'me' ? styles.me : styles.lune]}>
              <Text style={[styles.bubbleText, m.who === 'me' && { color: colors.onInk }]} selectable>
                {m.text}
              </Text>
            </Animated.View>
          ))}
          {busy ? (
            <View style={[styles.bubble, styles.lune, { flexDirection: 'row', gap: 8 }]}>
              <ActivityIndicator color={colors.rose} />
              <Text style={styles.bubbleText}>Thinking…</Text>
            </View>
          ) : null}

          {!msgs.length && ai.ok ? (
            <View style={styles.ideas}>
              {IDEAS.map((x) => (
                <Pressable key={x} onPress={() => ask(x)} style={styles.idea} accessibilityRole="button">
                  <Text style={styles.ideaText}>{x}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.bar}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={ai.ok ? 'Ask about your skin or routine…' : 'Not available on this iPhone'}
            placeholderTextColor={colors.dim}
            editable={ai.ok && !busy}
            returnKeyType="send"
            onSubmitEditing={() => ask()}
            style={styles.input}
            accessibilityLabel="Your question"
            maxLength={500}
          />
          <Pressable
            onPress={() => ask()}
            disabled={!q.trim() || busy || !ai.ok}
            accessibilityRole="button"
            accessibilityLabel="Send"
            style={[styles.send, (!q.trim() || busy || !ai.ok) && { opacity: 0.4 }]}>
            <Icon name="arrow.up" size={18} color={colors.onInk} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 18, gap: 10, paddingBottom: 30 },
  hello: { alignItems: 'center', gap: 6, marginBottom: 8 },
  title: { ...font.thin, fontSize: 38, letterSpacing: -1.2, color: colors.text },
  sub: { ...font.regular, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center', maxWidth: 360 },
  notice: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 20, backgroundColor: colors.goldSoft },
  noticeText: { ...font.medium, fontSize: 14.5, lineHeight: 20, color: colors.text, flex: 1 },
  bubble: { maxWidth: '86%', paddingVertical: 11, paddingHorizontal: 15, borderRadius: 22 },
  me: { alignSelf: 'flex-end', backgroundColor: colors.ink, borderBottomRightRadius: 8 },
  lune: { alignSelf: 'flex-start', backgroundColor: colors.card, borderBottomLeftRadius: 8 },
  bubbleText: { ...font.regular, fontSize: 16, lineHeight: 22, color: colors.text },
  ideas: { gap: 8, marginTop: 4 },
  idea: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
  },
  ideaText: { ...font.medium, fontSize: 14.5, color: colors.text },
  bar: { flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 24, alignItems: 'center' },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: colors.card,
    color: colors.text,
    ...font.regular,
    fontSize: 16,
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
