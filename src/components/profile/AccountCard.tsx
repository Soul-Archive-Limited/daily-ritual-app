import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { IconTile } from '@/components/bits';
import { Button, Card, T } from '@/components/ui';
import { useStore } from '@/data/store';
import { deleteAccount, signIn, signOut, syncUrl } from '@/sync/client';
import { useSync } from '@/sync/SyncProvider';
import { colors, radius } from '@/theme/tokens';

const extra = (Constants.expoConfig?.extra ?? {}) as { googleIosClientId?: string; googleWebClientId?: string };

async function googleToken() {
  const { GoogleSignin, isSuccessResponse } = await import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ iosClientId: extra.googleIosClientId, webClientId: extra.googleWebClientId });
  const r = await GoogleSignin.signIn();
  return isSuccessResponse(r) ? r.data.idToken : null;
}

/** Optional account: back up and sync between devices. Hidden until the sync server is live. */
export function AccountCard() {
  const db = useSQLiteContext();
  const s = useStore()!;
  const sync = useSync();
  const [busy, setBusy] = useState(false);
  if (!syncUrl || !sync) return null;
  const { session } = sync;

  const go = async (provider: 'apple' | 'google') => {
    setBusy(true);
    try {
      let token: string | null = null;
      if (provider === 'apple') {
        const cred = await AppleAuthentication.signInAsync({
          requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
        });
        token = cred.identityToken;
      } else token = await googleToken();
      if (!token) return;
      sync.setSession(await signIn(db, provider, token));
      s.showToast('Signed in. Your data is backing up.');
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== 'ERR_REQUEST_CANCELED' && code !== 'SIGN_IN_CANCELLED')
        s.showToast('Couldn’t sign in. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const out = () =>
    Alert.alert('Sign out?', 'Everything stays on this device. Sign in again any time to keep syncing.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        onPress: async () => {
          await signOut(db);
          sync.setSession(null);
        },
      },
    ]);

  const remove = () =>
    Alert.alert(
      'Delete your account?',
      'Your synced copy is deleted from the server for good. Everything on this device stays.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount(db);
              sync.setSession(null);
              s.showToast('Account deleted');
            } catch {
              s.showToast('Couldn’t delete right now. Try again.');
            }
          },
        },
      ],
    );

  return (
    <Card style={{ gap: 12 }}>
      <View style={styles.head}>
        <IconTile name="icloud" color={colors.health} />
        <View style={{ flex: 1 }}>
          <T variant="h2">Account and sync</T>
          <T variant="sub">
            {session
              ? `Signed in with ${session.provider === 'apple' ? 'Apple' : 'Google'}${session.email ? ` · ${session.email}` : ''}`
              : 'Optional. Back up your routine and log, and keep iPhone, iPad and the website in step.'}
          </T>
        </View>
      </View>
      {session ? (
        <>
          <T variant="label">
            {sync.busy
              ? 'Syncing…'
              : sync.error
                ? sync.error
                : sync.lastAt
                  ? `Up to date · ${new Date(sync.lastAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Waiting to sync'}
          </T>
          <View style={styles.row}>
            <Button label="Sync now" kind="line" small onPress={sync.run} disabled={sync.busy} />
            <Button label="Sign out" kind="line" small onPress={out} />
          </View>
          <Button label="Delete account" kind="line" small onPress={remove} style={{ alignSelf: 'flex-start' }} />
        </>
      ) : (
        <>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={radius.pill}
            style={styles.apple}
            onPress={() => !busy && go('apple')}
          />
          {extra.googleIosClientId ? (
            <Button label="Sign in with Google" kind="line" disabled={busy} onPress={() => go('google')} />
          ) : null}
          <T variant="label">Skin photos never leave this device, even when you sign in.</T>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', gap: 8 },
  apple: { height: 48 },
});
