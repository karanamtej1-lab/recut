/**
 * The real voice-capture UI. Imports the native expo-speech-recognition
 * module, so it is ONLY ever loaded (via React.lazy in app/voice.tsx) when
 * `supportsVoice` is true — never in Expo Go or on web.
 *
 * Flow: mic → on-device transcription → chrono-node date extraction →
 * navigate to the New Task form pre-filled for confirmation (never saves on
 * raw NLP output).
 */
import { Ionicons } from '@expo/vector-icons';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { parseTaskPhrase } from '../lib/parse';

export default function VoiceCapture() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    setTranscript(text);
    if (event.isFinal && text.trim()) {
      confirmTranscript(text);
    }
  });
  useSpeechRecognitionEvent('error', (event) => {
    setListening(false);
    // "no-speech" is a normal outcome, not an error worth alarming over.
    setError(
      event.error === 'no-speech'
        ? 'Didn’t catch anything — try again.'
        : `Speech recognition error: ${event.message || event.error}`
    );
  });

  const confirmTranscript = (text: string) => {
    const { title, dueAt } = parseTaskPhrase(text);
    // Hand off to the New Task form for review/editing before saving.
    router.replace({
      pathname: '/task/new',
      params: {
        title: title || text.trim(),
        ...(dueAt !== null ? { dueAt: String(dueAt) } : {}),
        fromVoice: '1',
      },
    });
  };

  const start = async () => {
    setError(null);
    setTranscript('');
    const perms = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perms.granted) {
      setError('Microphone / speech permission denied. Enable it in iOS Settings.');
      return;
    }
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true, // live transcript while speaking
      continuous: false, // stop automatically at end of utterance
    });
  };

  const stop = () => ExpoSpeechRecognitionModule.stop();

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>
        {listening ? 'Listening…' : 'Tap the mic and say your task'}
      </Text>
      <Text style={styles.example}>e.g. “pay rent next Friday” or “finish report by Oct 3rd”</Text>

      <Pressable
        style={[styles.micButton, listening && styles.micActive]}
        onPress={listening ? stop : start}
        accessibilityLabel={listening ? 'Stop listening' : 'Start listening'}
      >
        <Ionicons name={listening ? 'stop' : 'mic'} size={44} color="#fff" />
      </Pressable>

      <View style={styles.transcriptBox}>
        <Text style={styles.transcript}>
          {transcript || (listening ? '…' : ' ')}
        </Text>
      </View>

      {/* Manual fallback: accept the interim transcript as-is. */}
      {!listening && transcript.trim() !== '' && (
        <Pressable style={styles.useButton} onPress={() => confirmTranscript(transcript)}>
          <Text style={styles.useText}>Use “{transcript.trim()}”</Text>
        </Pressable>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa', alignItems: 'center', padding: 24, paddingTop: 48 },
  prompt: { fontSize: 22, fontWeight: '700', color: '#1c1e22' },
  example: { fontSize: 14, color: '#8e8e93', marginTop: 6, textAlign: 'center' },
  micButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#0a7ea4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  micActive: { backgroundColor: '#ff3b30' },
  transcriptBox: {
    minHeight: 72,
    alignSelf: 'stretch',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 32,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d8dbe0',
  },
  transcript: { fontSize: 18, color: '#1c1e22', lineHeight: 25 },
  useButton: { marginTop: 16, padding: 12 },
  useText: { color: '#0a7ea4', fontSize: 16, fontWeight: '600' },
  error: { color: '#ff3b30', marginTop: 16, textAlign: 'center', fontSize: 14 },
});
