import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { aiErrorText, placeProduct, useOnDeviceAI, type ProductGuess } from '@/ai/coach';
import { SheetDone } from '@/components/SheetDone';
import { Button, Card, T } from '@/components/ui';
import { useStore } from '@/data/store';
import { colors, font, minTouch, radius, SLOTS } from '@/theme/tokens';

const WHEN: Record<ProductGuess['when'], string> = {
  every: 'every day',
  shampoo: 'on wash days',
  optional: 'only when needed',
};

/** Add a product: to the bag only, or (with an on-device suggestion) as a new step. */
export default function NewProduct() {
  const s = useStore();
  const ai = useOnDeviceAI();
  const [name, setName] = useState('');
  const [guess, setGuess] = useState<ProductGuess | null>(null);
  const [busy, setBusy] = useState(false);
  if (!s) return null;

  const addToBag = () => {
    const id = s.addBagProduct(name);
    if (!id) return;
    router.replace({ pathname: '/product/[id]', params: { id } });
  };

  const suggest = async () => {
    setBusy(true);
    setGuess(null);
    try {
      const g = await placeProduct(name, s.steps.map((x) => `${x.name} (${x.slot})`).join(', '));
      if (g) setGuess(g);
      else s.showToast('No suggestion for that one. Add it to your bag instead.');
    } catch (e) {
      const msg = aiErrorText(e);
      if (msg) s.showToast(msg);
    } finally {
      setBusy(false);
    }
  };

  const addAsStep = () => {
    if (!guess) return;
    const id = s.addStep(guess.slot);
    s.updateStep(id, { name: guess.step, product: name.trim(), note: guess.tip, on: guess.when });
    router.replace({ pathname: '/step/[id]', params: { id } });
  };

  const slotName = guess ? SLOTS.find((z) => z.id === guess.slot)?.name : '';

  return (
    <View style={styles.screen}>
      <SheetDone label="Cancel" />
      <TextInput
        value={name}
        onChangeText={(v) => {
          setName(v);
          setGuess(null);
        }}
        placeholder="Brand and name"
        placeholderTextColor={colors.dim}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={ai ? suggest : addToBag}
        style={styles.input}
        accessibilityLabel="Product name"
      />
      {guess ? (
        <Card style={{ gap: 8 }}>
          <T variant="label">Suggested by Apple Intelligence · check it before adding</T>
          <T variant="h2">
            {guess.step} · {slotName}, {WHEN[guess.when]}
          </T>
          {guess.tip ? <T variant="sub">{guess.tip}</T> : null}
          <Button label="Add as a step" onPress={addAsStep} />
        </Card>
      ) : null}
      {busy ? <ActivityIndicator color={colors.sage} /> : null}
      {ai && !guess ? (
        <Button label="Suggest where it fits" icon="sparkles" disabled={!name.trim() || busy} onPress={suggest} />
      ) : null}
      <Button label="Just add to my bag" kind="line" disabled={!name.trim()} onPress={addToBag} />
      <T variant="label">
        In your bag, it shows on the Shelf with a battery that you set by hand. As a step, it empties a little every
        time you tick it.
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 20, paddingTop: 8, gap: 12 },
  input: {
    minHeight: minTouch + 4,
    paddingHorizontal: 14,
    borderRadius: radius.small,
    backgroundColor: colors.fill,
    color: colors.text,
    ...font.regular,
    fontSize: 17,
  },
});
