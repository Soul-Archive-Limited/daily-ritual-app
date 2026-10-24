import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/bits';
import { Button, T } from '@/components/ui';
import { ANGLES, type Angle } from '@/skin/model';
import { normalisePhoto } from '@/skin/photos';
import { colors, font, radius } from '@/theme/tokens';

import { FaceGuide } from './FaceGuide';

const TIPS: Record<Angle, string> = {
  front: 'Face inside the oval, eyes on the dashed line, chin near the bottom line.',
  left: 'Turn about 45° so your left cheek faces the camera. Match the outline, eyes on the dashed line.',
  right: 'Turn about 45° so your right cheek faces the camera. Match the outline, eyes on the dashed line.',
};

/**
 * Live camera with the face guide and last time's photo as a faint ghost, so every check-in lines up.
 * Returns a 900×1200 photo (temporary file) through onDone.
 */
export function GuidedCamera({
  angle,
  ghostUri,
  visible,
  onDone,
  onClose,
}: {
  angle: Angle;
  ghostUri: string | null;
  visible: boolean;
  onDone: (uri: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  // The 3:4 frame fits the window both ways, so it works on iPad and in landscape.
  const win = useWindowDimensions();
  const frameW = Math.min(win.width - 32, (win.height - insets.top - insets.bottom - 230) * 0.75);
  const [perm, requestPerm] = useCameraPermissions();
  const cam = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('front');
  const [ready, setReady] = useState(false);
  const [ghost, setGhost] = useState(true);
  const [shot, setShot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const label = ANGLES.find((a) => a[0] === angle)?.[1];

  const close = () => {
    setShot(null);
    onClose();
  };

  const take = async () => {
    if (!cam.current || !ready || busy) return;
    setBusy(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const p = await cam.current.takePictureAsync({ quality: 0.9 });
      if (p) setShot(await normalisePhoto(p.uri, p.width, p.height));
    } finally {
      setBusy(false);
    }
  };

  const fromLibrary = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (res.canceled) return;
    const a = res.assets[0];
    setBusy(true);
    try {
      setShot(await normalisePhoto(a.uri, a.width, a.height));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
      <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.top}>
          <Pressable
            onPress={close}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={styles.round}>
            <Icon name="xmark" size={15} color={colors.text} />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <T variant="label">{label} photo</T>
            <Text style={styles.title}>{shot ? 'Does it line up?' : 'Line up your face'}</Text>
          </View>
          <Pressable
            onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Switch camera"
            style={[styles.round, !!shot && { opacity: 0 }]}
            disabled={!!shot}>
            <Icon name="arrow.triangle.2.circlepath.camera" size={16} color={colors.text} />
          </Pressable>
        </View>

        <T variant="sub" style={styles.tip}>
          {shot ? 'Same light and angle as last time makes the comparison honest.' : TIPS[angle]}
        </T>

        <View style={[styles.frame, { width: frameW }]}>
          {shot ? (
            <Image source={{ uri: shot }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : perm?.granted ? (
            <CameraView
              ref={cam}
              style={StyleSheet.absoluteFill}
              facing={facing}
              mirror={facing === 'front'}
              animateShutter
              onCameraReady={() => setReady(true)}
            />
          ) : (
            <View style={styles.noPerm}>
              <T variant="sub" style={{ textAlign: 'center' }}>
                {perm?.canAskAgain === false
                  ? 'Camera is off for Daily Ritual. Turn it on in iPhone Settings, or choose a photo instead.'
                  : 'The camera shows a face guide so every check-in lines up. Photos stay on this phone.'}
              </T>
              {perm?.canAskAgain === false ? (
                <Button label="Open Settings" kind="line" small onPress={() => Linking.openSettings()} />
              ) : (
                <Button label="Allow camera" small onPress={requestPerm} />
              )}
            </View>
          )}
          {ghost && ghostUri ? (
            <Image source={{ uri: ghostUri }} style={[StyleSheet.absoluteFill, { opacity: 0.28 }]} contentFit="cover" />
          ) : null}
          {shot || perm?.granted ? <FaceGuide angle={angle} /> : null}
          {busy ? (
            <View style={[StyleSheet.absoluteFill, styles.center]}>
              <ActivityIndicator color={colors.text} />
            </View>
          ) : null}
        </View>

        {shot ? (
          <View style={styles.actions}>
            <Button label="Retake" kind="line" onPress={() => setShot(null)} style={{ flex: 1 }} />
            <Button
              label="Use this photo"
              onPress={() => {
                const u = shot;
                setShot(null);
                onDone(u);
              }}
              style={{ flex: 1 }}
            />
          </View>
        ) : (
          <View style={styles.bottom}>
            <Pressable onPress={fromLibrary} hitSlop={8} accessibilityRole="button" style={styles.side}>
              <Icon name="photo.on.rectangle" size={18} color={colors.muted} />
              <Text style={styles.sideText}>Photos</Text>
            </Pressable>
            <Pressable
              onPress={take}
              disabled={!ready || busy}
              accessibilityRole="button"
              accessibilityLabel={`Take ${label} photo`}
              style={({ pressed }) => [
                styles.shutter,
                (!ready || busy) && { opacity: 0.4 },
                pressed && { transform: [{ scale: 0.94 }] },
              ]}>
              <View style={styles.shutterIn} />
            </Pressable>
            {ghostUri ? (
              <Pressable
                onPress={() => setGhost((g) => !g)}
                hitSlop={8}
                accessibilityRole="switch"
                accessibilityState={{ checked: ghost }}
                style={styles.side}>
                <Icon name={ghost ? 'eye' : 'eye.slash'} size={18} color={ghost ? colors.skin : colors.muted} />
                <Text style={styles.sideText}>Last photo</Text>
              </Pressable>
            ) : (
              <View style={styles.side} />
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000', paddingHorizontal: 16, gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,.12)',
  },
  title: { ...font.semibold, fontSize: 18, color: colors.text, marginTop: 2 },
  tip: { textAlign: 'center', paddingHorizontal: 12 },
  frame: {
    aspectRatio: 3 / 4,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.bg2,
    alignSelf: 'center',
  },
  noPerm: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  center: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,.35)' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 'auto' },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingHorizontal: 12,
  },
  side: { width: 72, alignItems: 'center', gap: 4 },
  sideText: { ...font.medium, fontSize: 11.5, color: colors.muted },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterIn: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.text },
});
