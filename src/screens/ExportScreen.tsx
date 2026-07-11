import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import * as Sharing from 'expo-sharing';
import { Project } from '../types';
import { renderReel, checkServer } from '../utils/renderApi';

const { width } = Dimensions.get('window');
const PREVIEW_W = width * 0.6;

type RouteParams = { project: Project };

export default function ExportScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ Export: RouteParams }, 'Export'>>();
  const { project } = route.params;

  const [serverUp, setServerUp] = useState<boolean | null>(null);
  const [rendering, setRendering] = useState(false);
  const [stage, setStage] = useState('');
  const [reelUri, setReelUri] = useState<string | null>(null);

  useEffect(() => { checkServer().then(setServerUp); }, []);

  const filledClips = project.template.clips.filter(c => c.replacementUri);

  const handleRender = async () => {
    if (!serverUp) {
      Alert.alert('Render server offline', 'Start the server (cd server && npm start) and try again.');
      return;
    }
    setRendering(true);
    try {
      setStage('Uploading your clips…');
      // The actual render happens server-side; show staged copy while it works.
      const staged = ['Trimming scenes…', 'Stitching reel…', 'Adding audio & captions…'];
      let s = 0;
      const tick = setInterval(() => { setStage(staged[s % staged.length]); s++; }, 1500);
      const result = await renderReel(project);
      clearInterval(tick);
      setReelUri(result.localUri);
    } catch (e: any) {
      Alert.alert('Render failed', e.message ?? 'Something went wrong.');
    }
    setRendering(false);
  };

  const handleSave = async () => {
    if (!reelUri) return;
    // Lazy-load: expo-media-library has no web build; importing it at module
    // top-level would crash the web bundle.
    const MediaLibrary = await import('expo-media-library');
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to save your reel.');
      return;
    }
    await MediaLibrary.saveToLibraryAsync(reelUri);
    Alert.alert('Saved', 'Your reel is in your camera roll.');
  };

  const handleShare = async () => {
    if (!reelUri) return;
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(reelUri, { mimeType: 'video/mp4', UTI: 'public.movie' });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>{reelUri ? 'Your reel is ready' : 'Export'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {reelUri ? (
          // FINISHED STATE — play the real rendered reel
          <>
            <View style={styles.previewWrap}>
              <Video
                source={{ uri: reelUri }}
                style={styles.preview}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
                useNativeControls
              />
            </View>
            <View style={styles.doneRow}>
              <Ionicons name="checkmark-circle" size={18} color="#2ECC71" />
              <Text style={styles.doneText}>Rendered • {filledClips.length} clips stitched</Text>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Save to camera roll</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={20} color="#FF3B5C" />
              <Text style={styles.secondaryBtnText}>Share to Reels / TikTok</Text>
            </TouchableOpacity>
          </>
        ) : (
          // PRE-RENDER STATE
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{project.name}</Text>
              <View style={styles.summaryRow}>
                <Ionicons name="film-outline" size={16} color="#666" />
                <Text style={styles.summaryText}>{filledClips.length} clips</Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="musical-note" size={16} color="#666" />
                <Text style={styles.summaryText}>
                  {project.template.audioName ?? (project.template.audio ? 'Original audio' : 'No audio')}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="text" size={16} color="#666" />
                <Text style={styles.summaryText}>
                  Captions {project.template.captionsOn !== false ? 'on' : 'off'}
                </Text>
              </View>
            </View>

            <View style={[styles.serverPill, serverUp ? styles.serverUp : styles.serverDown]}>
              <View style={[styles.dot, { backgroundColor: serverUp ? '#2ECC71' : '#FF3B5C' }]} />
              <Text style={styles.serverText}>
                {serverUp === null ? 'Checking render server…'
                  : serverUp ? 'Render server connected' : 'Render server offline'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, rendering && styles.btnDim]}
              onPress={handleRender}
              disabled={rendering}
            >
              {rendering ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="sparkles" size={20} color="#fff" />
                  <Text style={styles.primaryBtnText}>Render reel</Text>
                </>
              )}
            </TouchableOpacity>
            {rendering && <Text style={styles.stage}>{stage}</Text>}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
  },
  title: { color: '#fff', fontSize: 16, fontWeight: '600' },
  content: { padding: 16, gap: 16, alignItems: 'stretch' },
  summaryCard: { backgroundColor: '#1A1A1A', borderRadius: 14, padding: 16, gap: 10 },
  summaryTitle: { color: '#fff', fontWeight: '700', fontSize: 17, marginBottom: 4 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryText: { color: '#aaa', fontSize: 14 },
  serverPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  serverUp: { backgroundColor: '#2ECC7115' },
  serverDown: { backgroundColor: '#FF3B5C15' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  serverText: { color: '#aaa', fontSize: 13 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#FF3B5C', borderRadius: 14, paddingVertical: 18,
  },
  btnDim: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#1A1A1A', borderRadius: 14, paddingVertical: 16,
    borderWidth: 1, borderColor: '#FF3B5C33',
  },
  secondaryBtnText: { color: '#FF3B5C', fontWeight: '600', fontSize: 15 },
  stage: { color: '#888', fontSize: 13, textAlign: 'center' },
  previewWrap: { alignSelf: 'center', borderRadius: 16, overflow: 'hidden', backgroundColor: '#000' },
  preview: { width: PREVIEW_W, height: PREVIEW_W * (16 / 9) },
  doneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  doneText: { color: '#aaa', fontSize: 13 },
});
