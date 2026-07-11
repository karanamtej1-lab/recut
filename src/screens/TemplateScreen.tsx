import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { Project, VideoClip } from '../types';
import ClipTile from '../components/ClipTile';
import { saveProject } from '../utils/storage';

const { width } = Dimensions.get('window');
const VIDEO_HEIGHT = (width * 16) / 9 / 2; // half-height preview

type RouteParams = { project: Project };

export default function TemplateScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ Template: RouteParams }, 'Template'>>();
  const [project, setProject] = useState(route.params.project);
  const [activeClip, setActiveClip] = useState<string | null>(null);
  const videoRef = useRef<Video>(null);

  const handleClipUpdate = async (clipId: string, replacementUri: string) => {
    const updatedClips = project.template.clips.map(c =>
      c.id === clipId ? { ...c, replacementUri } : c,
    );
    const updated: Project = {
      ...project,
      updatedAt: Date.now(),
      template: { ...project.template, clips: updatedClips },
    };
    setProject(updated);
    await saveProject(updated);
  };

  const filledCount = project.template.clips.filter(c => c.replacementUri).length;
  const totalCount = project.template.clips.length;
  const progress = totalCount > 0 ? filledCount / totalCount : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{project.name}</Text>
        <TouchableOpacity
          style={[styles.exportBtn, progress < 1 && styles.exportBtnDim]}
          onPress={() => {
            if (progress < 1) {
              Alert.alert('Not ready', `Replace all ${totalCount} clips before exporting.`);
              return;
            }
            navigation.navigate('Export', { project });
          }}
        >
          <Text style={styles.exportBtnText}>Export</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Reference video */}
        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            source={{ uri: project.template.localUri }}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            isLooping
            useNativeControls
          />
          <View style={styles.refBadge}>
            <Text style={styles.refBadgeText}>REFERENCE</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{filledCount}/{totalCount} clips replaced</Text>
        </View>

        {/* Clip timeline */}
        <Text style={styles.sectionLabel}>Clips — tap to replace</Text>
        <View style={styles.timeline}>
          {project.template.clips.map((clip, i) => (
            <ClipTile
              key={clip.id}
              clip={clip}
              index={i}
              isActive={activeClip === clip.id}
              onPress={() => {
                setActiveClip(clip.id);
                navigation.navigate('ClipEditor', {
                  clip,
                  project,
                  onSave: (uri: string) => handleClipUpdate(clip.id, uri),
                });
              }}
            />
          ))}
        </View>

        {/* Audio row */}
        <TouchableOpacity
          style={styles.audioRow}
          onPress={() => navigation.navigate('Audio', { project, onUpdate: (p: Project) => setProject(p) })}
        >
          <View style={styles.audioIcon}>
            <Ionicons name="musical-note" size={18} color="#FF3B5C" />
          </View>
          <View style={styles.audioInfo}>
            <Text style={styles.audioTitle} numberOfLines={1}>
              {project.template.audioName
                ?? (project.template.audio?.isOriginal ? 'Original audio' : 'Custom audio')}
            </Text>
            <Text style={styles.audioSub}>Tap to change</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#555" />
        </TouchableOpacity>

        {/* Captions toggle */}
        <TouchableOpacity
          style={styles.audioRow}
          onPress={async () => {
            const updated: Project = {
              ...project,
              updatedAt: Date.now(),
              template: { ...project.template, captionsOn: !project.template.captionsOn },
            };
            setProject(updated);
            await saveProject(updated);
          }}
        >
          <View style={styles.audioIcon}>
            <Ionicons name="text" size={18} color="#FF3B5C" />
          </View>
          <View style={styles.audioInfo}>
            <Text style={styles.audioTitle}>Auto-captions</Text>
            <Text style={styles.audioSub}>{project.template.captionsOn ? 'On' : 'Off'}</Text>
          </View>
          <View style={[styles.toggle, project.template.captionsOn && styles.toggleOn]}>
            <View style={[styles.toggleKnob, project.template.captionsOn && styles.toggleKnobOn]} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    gap: 12,
  },
  title: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600' },
  exportBtn: {
    backgroundColor: '#FF3B5C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  exportBtnDim: { opacity: 0.4 },
  exportBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scroll: { paddingBottom: 40 },
  videoContainer: {
    width, height: VIDEO_HEIGHT, backgroundColor: '#111', position: 'relative',
  },
  video: { width: '100%', height: '100%' },
  refBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: '#0009', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  refBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  progressSection: { paddingHorizontal: 16, paddingVertical: 14 },
  progressBar: { height: 4, backgroundColor: '#222', borderRadius: 2, marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: '#FF3B5C', borderRadius: 2 },
  progressText: { color: '#666', fontSize: 12 },
  sectionLabel: { color: '#666', fontSize: 12, fontWeight: '600', paddingHorizontal: 16, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  timeline: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  audioIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FF3B5C22', alignItems: 'center', justifyContent: 'center',
  },
  audioInfo: { flex: 1 },
  audioTitle: { color: '#fff', fontWeight: '600', fontSize: 14 },
  audioSub: { color: '#666', fontSize: 12, marginTop: 2 },
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: '#333', padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: '#FF3B5C' },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  toggleKnobOn: { alignSelf: 'flex-end' },
});
