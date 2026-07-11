import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Project } from '../types';
import { saveProject } from '../utils/storage';

type AudioMode = 'original' | 'muted' | 'custom';
type RouteParams = { project: Project; onUpdate: (p: Project) => void };

export default function AudioScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ Audio: RouteParams }, 'Audio'>>();
  const { project, onUpdate } = route.params;

  const [mode, setMode] = useState<AudioMode>(
    project.template.audio?.isOriginal ? 'original' : 'custom',
  );
  const [customUri, setCustomUri] = useState<string | null>(
    !project.template.audio?.isOriginal ? project.template.audio?.uri ?? null : null,
  );

  const pickAudio = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your library.');
      return;
    }
    // ImagePicker doesn't natively filter audio-only; pick a video and strip audio
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setCustomUri(result.assets[0].uri);
      setMode('custom');
    }
  };

  const handleSave = async () => {
    const updated: Project = {
      ...project,
      updatedAt: Date.now(),
      template: {
        ...project.template,
        audio: mode === 'muted'
          ? null
          : { uri: mode === 'custom' && customUri ? customUri : project.template.localUri, isOriginal: mode === 'original' },
      },
    };
    await saveProject(updated);
    onUpdate(updated);
    navigation.goBack();
  };

  const options: { mode: AudioMode; icon: keyof typeof Ionicons.glyphMap; label: string; desc: string }[] = [
    { mode: 'original', icon: 'musical-notes', label: 'Original audio', desc: 'Keep the sound from the source video' },
    { mode: 'muted', icon: 'volume-mute', label: 'No audio', desc: 'Export with no sound' },
    { mode: 'custom', icon: 'swap-horizontal', label: 'Use my audio', desc: 'Pick a video/audio from your library' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Audio</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.mode}
            style={[styles.option, mode === opt.mode && styles.optionActive]}
            onPress={() => {
              if (opt.mode === 'custom') pickAudio();
              else setMode(opt.mode);
            }}
          >
            <View style={[styles.optionIcon, mode === opt.mode && styles.optionIconActive]}>
              <Ionicons name={opt.icon} size={20} color={mode === opt.mode ? '#fff' : '#666'} />
            </View>
            <View style={styles.optionText}>
              <Text style={[styles.optionLabel, mode === opt.mode && styles.optionLabelActive]}>
                {opt.label}
              </Text>
              <Text style={styles.optionDesc}>
                {opt.mode === 'custom' && customUri ? 'Custom track selected ✓' : opt.desc}
              </Text>
            </View>
            {mode === opt.mode && (
              <Ionicons name="checkmark-circle" size={20} color="#FF3B5C" />
            )}
          </TouchableOpacity>
        ))}
      </View>
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
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  content: { padding: 16, gap: 12 },
  option: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1A1A', borderRadius: 14, padding: 16, gap: 14,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  optionActive: { borderColor: '#FF3B5C' },
  optionIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#333', alignItems: 'center', justifyContent: 'center',
  },
  optionIconActive: { backgroundColor: '#FF3B5C' },
  optionText: { flex: 1 },
  optionLabel: { color: '#aaa', fontWeight: '600', fontSize: 15 },
  optionLabelActive: { color: '#fff' },
  optionDesc: { color: '#555', fontSize: 13, marginTop: 3 },
});
