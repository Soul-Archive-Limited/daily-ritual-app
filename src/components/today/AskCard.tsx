import { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { askCoach, aiErrorText } from '@/ai/coach';
import { buildContext } from '@/ai/context';
import { IconTile } from '@/components/bits';
import { Button, Card, T } from '@/components/ui';
import { useStore } from '@/data/store';
import { useShelf } from '@/data/useShelf';
import { colors, font, minTouch, radius } from '@/theme/tokens';

const IDEAS = [
  'What am I missing most this week?',
  'Is my night routine in a good order?',
  'How should I adjust for the weather here?',
];

/** Ask Apple's on-device model about your own routine. Free and private; shown only where it works. */
export function AskCard() {
  const s = useStore()!;
  const shelf = useShelf();
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);

  const ask = async (text = q) => {
    if (!text.trim() || busy) return;
    setQ(text);
    setBusy(true);
    setAnswer('');
    try {
      const ctx = buildContext({ ...s, shelf, sun: s.sun });
      setAnswer((await askCoach(ctx, text)).trim());
    } catch (e) {
      setAnswer(aiErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: 12 }}>
      <View style={styles.head}>
        <IconTile name="sparkles" color={colors.sage} />
        <View style={{ flex: 1 }}>
          <T variant="h2">Ask about your routine</T>
          <T variant="label">On-device with Apple Intelligence. Nothing leaves your phone.</T>
        </View>
      </View>
      <View style={styles.row}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="e.g. Why does my skin feel tight?"
          placeholderTextColor={colors.dim}
          returnKeyType="send"
          onSubmitEditing={() => ask()}
          style={styles.input}
          accessibilityLabel="Question about your routine"
          maxLength={500}
        />
        <Button label="Ask" small disabled={!q.trim() || busy} onPress={() => ask()} />
      </View>
      {!answer && !busy ? (
        <View style={styles.ideas}>
          {IDEAS.map((x) => (
            <Button key={x} label={x} kind="line" small onPress={() => ask(x)} style={{ alignSelf: 'flex-start' }} />
          ))}
        </View>
      ) : null}
      {busy ? <ActivityIndicator color={colors.sage} style={{ alignSelf: 'flex-start' }} /> : null}
      {answer ? (
        <T style={styles.answer} selectable>
          {answer}
        </T>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    minHeight: minTouch,
    paddingHorizontal: 14,
    borderRadius: radius.small,
    backgroundColor: colors.fill,
    color: colors.text,
    ...font.regular,
    fontSize: 16,
  },
  ideas: { gap: 6 },
  answer: { ...font.regular, fontSize: 16, lineHeight: 23 },
});
