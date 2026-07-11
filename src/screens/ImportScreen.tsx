import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { buildTemplate, saveVideoLocally, detectPlatform } from '../utils/videoParser';
import { saveProject } from '../utils/storage';
import { importFromUrl } from '../utils/renderApi';
import { Project, VideoTemplate } from '../types';

export default function ImportScreen() {
  const navigation = useNavigation<any>();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleUrlImport = async () => {
    if (!url.trim()) return;
    const platform = detectPlatform(url.trim());
    if (platform === 'unknown') {
      Alert.alert('Unsupported link', 'Please paste an Instagram or TikTok video link.');
      return;
    }
    setLoading(true);
    setStatus('Downloading video…');
    try {
      setStatus('Downloading & analyzing the edit…');
      const result = await importFromUrl(url.trim());

      const template: VideoTemplate = {
        id: `template_${Date.now()}`,
        sourceUrl: url.trim(),
        localUri: result.videoUrl,        // streamed from the render server
        platform: result.platform,
        totalDuration: result.duration,
        clips: result.clips,
        audio: { uri: result.audioUrl, isOriginal: true, title: result.title },
        aspectRatio: '9:16',
        createdAt: Date.now(),
        templateTitle: result.title,
        audioName: `original audio • @${result.uploader}`,
        captionsOn: false,
      };
      const project: Project = {
        id: `proj_${Date.now()}`,
        template,
        name: result.title?.slice(0, 40) || `${platform === 'tiktok' ? 'TikTok' : 'Reel'} import`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveProject(project);
      setLoading(false);
      navigation.navigate('Template', { project });
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Could not import', e.message ?? 'Try a public TikTok/Reel link, or pick from your camera roll.');
    }
  };

  const handlePickFromLibrary = async () => {
    const { status: perm } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library to pick a video.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;

    setLoading(true);
    setStatus('Saving video…');
    try {
      const asset = result.assets[0];
      const localUri = await saveVideoLocally(asset.uri);
      setStatus('Parsing edit structure…');
      const duration = asset.duration ? asset.duration / 1000 : 15;
      const template = buildTemplate(localUri, localUri, duration);
      const project: Project = {
        id: `proj_${Date.now()}`,
        template,
        name: `My Video ${new Date().toLocaleDateString()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveProject(project);
      setLoading(false);
      navigation.navigate('Template', { project });
    } catch (e) {
      setLoading(false);
      Alert.alert('Error', 'Could not process the video.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.heading}>Import video</Text>
        <Text style={styles.sub}>Paste a link or pick from your library</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Paste Instagram or TikTok link</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="https://www.tiktok.com/..."
              placeholderTextColor="#555"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TouchableOpacity
              style={[styles.goBtn, !url.trim() && styles.goBtnDisabled]}
              onPress={handleUrlImport}
              disabled={!url.trim() || loading}
            >
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.tipsRow}>
            <View style={styles.tip}>
              <Ionicons name="logo-instagram" size={16} color="#E1306C" />
              <Text style={styles.tipText}>Instagram Reels</Text>
            </View>
            <View style={styles.tip}>
              <Ionicons name="musical-notes" size={16} color="#69C9D0" />
              <Text style={styles.tipText}>TikTok</Text>
            </View>
          </View>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity style={styles.libraryBtn} onPress={handlePickFromLibrary} disabled={loading}>
          <Ionicons name="folder-open-outline" size={22} color="#FF3B5C" />
          <Text style={styles.libraryBtnText}>Pick from camera roll</Text>
        </TouchableOpacity>

        <View style={styles.howTo}>
          <Text style={styles.howToTitle}>How to share from Instagram / TikTok</Text>
          {[
            'Find a video you like',
            'Tap Share → Copy link',
            'Come back here and paste the link',
          ].map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FF3B5C" />
            <Text style={styles.loadingText}>{status}</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  content: { padding: 20, paddingTop: 60 },
  back: { marginBottom: 24 },
  heading: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 6 },
  sub: { fontSize: 15, color: '#666', marginBottom: 32 },
  section: { marginBottom: 24 },
  label: { fontSize: 13, color: '#888', fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 14,
  },
  goBtn: {
    backgroundColor: '#FF3B5C',
    borderRadius: 12,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goBtnDisabled: { opacity: 0.4 },
  tipsRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tipText: { color: '#666', fontSize: 13 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
  divider: { flex: 1, height: 1, backgroundColor: '#222' },
  orText: { color: '#555', fontSize: 13 },
  libraryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#FF3B5C33',
    marginBottom: 36,
  },
  libraryBtnText: { color: '#FF3B5C', fontWeight: '600', fontSize: 15 },
  howTo: { backgroundColor: '#111', borderRadius: 14, padding: 16 },
  howToTitle: { color: '#888', fontWeight: '600', fontSize: 13, marginBottom: 14 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  stepNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#FF3B5C22', alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { color: '#FF3B5C', fontWeight: '700', fontSize: 12 },
  stepText: { color: '#aaa', fontSize: 14 },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#0D0D0Dcc', alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  loadingText: { color: '#fff', fontSize: 15 },
});
