/**
 * Voice screen wrapper.
 *
 * On a dev/standalone build (`supportsVoice`) it lazy-loads the native
 * VoiceCapture UI. In Expo Go / on web — where the native speech module
 * isn't available — it renders a graceful fallback instead of crashing,
 * pointing the user at manual entry. React.lazy ensures VoiceCapture's
 * `import 'expo-speech-recognition'` is only ever evaluated when supported.
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Suspense, lazy } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { isExpoGo, supportsVoice } from '../lib/runtime';

const VoiceCapture = lazy(() => import('../components/VoiceCapture'));

export default function VoiceScreen() {
  if (!supportsVoice) return <VoiceUnavailable />;
  return (
    <Suspense
      fallback={
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      }
    >
      <VoiceCapture />
    </Suspense>
  );
}

function VoiceUnavailable() {
  return (
    <View style={styles.container}>
      <Ionicons name="mic-off-outline" size={64} color="#c5c9d0" />
      <Text style={styles.title}>Voice needs the full app</Text>
      <Text style={styles.body}>
        {isExpoGo
          ? 'Speech recognition is a native feature that isn’t available in Expo Go. ' +
            'It works once the app is installed as a real build on your phone.'
          : 'Speech recognition isn’t available in the web preview. Try it on the phone build.'}
        {'\n\n'}For now, add your task by typing it — the same date parsing still applies
        (try “pay rent next Friday” in the title).
      </Text>
      <Pressable style={styles.button} onPress={() => router.replace('/task/new')}>
        <Ionicons name="create-outline" size={20} color="#fff" />
        <Text style={styles.buttonText}>Type a task instead</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7f8fa' },
  container: {
    flex: 1,
    backgroundColor: '#f7f8fa',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#3a3f47' },
  body: { fontSize: 15, color: '#8e8e93', textAlign: 'center', lineHeight: 22 },
  button: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#0a7ea4',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 22,
    marginTop: 16,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
