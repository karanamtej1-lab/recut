/**
 * Runtime-capability detection.
 *
 * expo-speech-recognition is a native module that is NOT bundled into Expo Go
 * (and has no web implementation here). Importing it in those environments
 * throws "Cannot find native module 'ExpoSpeechRecognition'". We gate the
 * voice screen on `supportsVoice` and lazy-load the native code only when it's
 * actually available, so the rest of the app runs fine in Expo Go and on web.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/** True when running inside the Expo Go client (StoreClient execution env). */
export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Voice dictation needs the native module → dev/standalone build only. */
export const supportsVoice = Platform.OS !== 'web' && !isExpoGo;
