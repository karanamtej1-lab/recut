import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  Dimensions, ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { VideoClip, Project } from '../types';

const { width } = Dimensions.get('window');
const PREVIEW_HEIGHT = (width / 2 - 24) * (16 / 9);

type RouteParams = {
  clip: VideoClip;
  project: Project;
  onSave: (uri: string) => void;
};

export default function ClipEditorScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ ClipEditor: RouteParams }, 'ClipEditor'>>();
  const { clip, project, onSave } = route.params;

  const [replacementUri, setReplacementUri] = useState<string | null>(clip.replacementUri ?? null);
  const refVideoRef = useRef<Video>(null);
  const repVideoRef = useRef<Video>(null);

  const pickReplacement = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      videoMaxDuration: Math.ceil(clip.duration) + 2,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setReplacementUri(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    if (!replacementUri) {
      Alert.alert('No clip selected', 'Pick a clip from your library first.');
      return;
    }
    onSave(replacementUri);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Clip {clip.id.replace('clip_', '')}</Text>
        <TouchableOpacity
          style={[styles.saveBtn, !replacementUri && styles.saveBtnDim]}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>Use clip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.meta}>
          {clip.startTime.toFixed(1)}s – {clip.endTime.toFixed(1)}s · {clip.duration.toFixed(1)}s long
        </Text>

        {/* Side-by-side previews */}
        <View style={styles.previews}>
          <View style={styles.previewCol}>
            <Text style={styles.previewLabel}>Original</Text>
            <Video
              ref={refVideoRef}
              source={{ uri: project.template.localUri }}
              style={styles.previewVideo}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping
              isMuted
              positionMillis={clip.startTime * 1000}
            />
          </View>

          <View style={styles.previewCol}>
            <Text style={styles.previewLabel}>Your clip</Text>
            {replacementUri ? (
              <Video
                ref={repVideoRef}
                source={{ uri: replacementUri }}
                style={styles.previewVideo}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
                isMuted
              />
            ) : (
              <TouchableOpacity style={styles.emptyPreview} onPress={pickReplacement}>
                <Ionicons name="add-circle" size={32} color="#FF3B5C" />
                <Text style={styles.emptyPreviewText}>Pick clip</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.pickBtn} onPress={pickReplacement}>
          <Ionicons name="folder-open-outline" size={20} color="#fff" />
          <Text style={styles.pickBtnText}>
            {replacementUri ? 'Change clip' : 'Pick from camera roll'}
          </Text>
        </TouchableOpacity>

        <View style={styles.tip}>
          <Ionicons name="information-circle-outline" size={16} color="#555" />
          <Text style={styles.tipText}>
            Pick a clip that's at least {clip.duration.toFixed(1)}s long. It'll be trimmed to match.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, gap: 12,
  },
  title: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600' },
  saveBtn: { backgroundColor: '#FF3B5C', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveBtnDim: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scroll: { padding: 16, paddingBottom: 40 },
  meta: { color: '#666', fontSize: 13, marginBottom: 16 },
  previews: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  previewCol: { flex: 1 },
  previewLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  previewVideo: { width: '100%', height: PREVIEW_HEIGHT, borderRadius: 10, backgroundColor: '#111' },
  emptyPreview: {
    width: '100%', height: PREVIEW_HEIGHT, borderRadius: 10,
    backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#FF3B5C44', borderStyle: 'dashed', gap: 8,
  },
  emptyPreviewText: { color: '#FF3B5C', fontSize: 13 },
  pickBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FF3B5C', borderRadius: 14, paddingVertical: 16, gap: 10, marginBottom: 16,
  },
  pickBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  tip: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#111', borderRadius: 10, padding: 12 },
  tipText: { color: '#666', fontSize: 13, flex: 1, lineHeight: 18 },
});
