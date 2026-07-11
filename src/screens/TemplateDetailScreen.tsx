import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { CatalogTemplate, formatUses } from '../data/templates';
import { clipsFromCatalog, saveVideoLocally } from '../utils/videoParser';
import { saveProject } from '../utils/storage';
import { Project, VideoTemplate } from '../types';

const { width } = Dimensions.get('window');

type RouteParams = { template: CatalogTemplate };

export default function TemplateDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ TemplateDetail: RouteParams }, 'TemplateDetail'>>();
  const { template } = route.params;
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  // The signature RollToReel move: pick a bunch of clips at once,
  // auto-distribute them into the template's slots → instant preview.
  const handleUseTemplate = async () => {
    const { status: perm } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to auto-fill this template.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: true,
      selectionLimit: template.clipCount,
      quality: 1,
    });
    if (result.canceled || result.assets.length === 0) return;

    setBusy(true);
    setStatus('Analyzing your footage…');
    try {
      const clips = clipsFromCatalog(template.clipCount, template.duration);
      // Auto-assign picked videos to slots in order (AI "best moment" pick = stub)
      setStatus('Auto-filling scenes…');
      const picked = result.assets;
      for (let i = 0; i < clips.length; i++) {
        const asset = picked[i % picked.length]; // loop if fewer than slots
        const local = await saveVideoLocally(asset.uri);
        clips[i].replacementUri = local;
      }

      setStatus('Adding viral audio & captions…');
      const vTemplate: VideoTemplate = {
        id: `template_${Date.now()}`,
        sourceUrl: '',
        localUri: clips[0].replacementUri!,
        platform: 'catalog',
        totalDuration: template.duration,
        clips,
        audio: { uri: '', isOriginal: false, title: template.audioName },
        aspectRatio: '9:16',
        createdAt: Date.now(),
        templateTitle: template.title,
        niche: template.niche,
        audioName: template.audioName,
        gradient: template.gradient,
        captionsOn: true,
      };
      const project: Project = {
        id: `proj_${Date.now()}`,
        template: vTemplate,
        name: template.title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveProject(project);
      setBusy(false);
      navigation.navigate('Template', { project });
    } catch (e) {
      setBusy(false);
      Alert.alert('Error', 'Could not build the preview. Try again.');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={template.gradient} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroPlay}>
            <Ionicons name="play" size={32} color="#fff" />
          </View>
          {template.trending && (
            <View style={styles.heroTrend}>
              <Ionicons name="flame" size={13} color="#fff" />
              <Text style={styles.heroTrendText}>Trending now</Text>
            </View>
          )}
        </LinearGradient>

        <View style={styles.body}>
          <Text style={styles.title}>{template.title}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="film-outline" size={15} color="#888" />
              <Text style={styles.statText}>{template.clipCount} clips</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="time-outline" size={15} color="#888" />
              <Text style={styles.statText}>{template.duration}s</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="people-outline" size={15} color="#888" />
              <Text style={styles.statText}>{formatUses(template.uses)} uses</Text>
            </View>
          </View>

          <View style={styles.audioCard}>
            <View style={styles.audioIcon}>
              <Ionicons name="musical-note" size={16} color="#FF3B5C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.audioLabel}>Viral audio</Text>
              <Text style={styles.audioName} numberOfLines={1}>{template.audioName}</Text>
            </View>
          </View>

          <Text style={styles.howTitle}>How it works</Text>
          {[
            { icon: 'images-outline', text: `Pick ${template.clipCount} clips from your camera roll` },
            { icon: 'sparkles-outline', text: 'We auto-fill every scene, add the audio & captions' },
            { icon: 'create-outline', text: 'Swap any scene or tweak — then export' },
          ].map((s, i) => (
            <View key={i} style={styles.howStep}>
              <View style={styles.howNum}>
                <Ionicons name={s.icon as any} size={16} color="#FF3B5C" />
              </View>
              <Text style={styles.howText}>{s.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.useBtn} onPress={handleUseTemplate} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text style={styles.useBtnText}>Use template</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {busy && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#FF3B5C" />
          <Text style={styles.overlayText}>{status}</Text>
          <Text style={styles.overlaySub}>Building your instant preview</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  scroll: { paddingBottom: 120 },
  hero: { width, height: width * 1.1, padding: 16, paddingTop: 56, justifyContent: 'center', alignItems: 'center' },
  back: { position: 'absolute', top: 56, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: '#00000044', alignItems: 'center', justifyContent: 'center' },
  heroPlay: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#ffffff33', alignItems: 'center', justifyContent: 'center' },
  heroTrend: { position: 'absolute', bottom: 16, left: 16, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#00000055', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  heroTrendText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  body: { padding: 16 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 18, marginTop: 12 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { color: '#888', fontSize: 13 },
  audioCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14, marginTop: 20 },
  audioIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FF3B5C22', alignItems: 'center', justifyContent: 'center' },
  audioLabel: { color: '#666', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  audioName: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 2 },
  howTitle: { color: '#666', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 28, marginBottom: 14 },
  howStep: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  howNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FF3B5C22', alignItems: 'center', justifyContent: 'center' },
  howText: { color: '#ccc', fontSize: 14, flex: 1 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, backgroundColor: '#0D0D0D', borderTopWidth: 1, borderTopColor: '#1A1A1A' },
  useBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FF3B5C', borderRadius: 16, paddingVertical: 18 },
  useBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0D0D0Dee', alignItems: 'center', justifyContent: 'center', gap: 12 },
  overlayText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  overlaySub: { color: '#666', fontSize: 13 },
});
