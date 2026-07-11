import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoClip } from '../types';

const TILE_SIZE = 80;

interface Props {
  clip: VideoClip;
  index: number;
  isActive: boolean;
  onPress: () => void;
}

export default function ClipTile({ clip, index, isActive, onPress }: Props) {
  const replaced = !!clip.replacementUri;

  return (
    <TouchableOpacity
      style={[styles.tile, isActive && styles.tileActive, replaced && styles.tileReplaced]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {clip.replacementUri ? (
        <Image source={{ uri: clip.replacementUri }} style={styles.thumb} />
      ) : (
        <View style={styles.empty}>
          <Ionicons name="add" size={20} color={isActive ? '#FF3B5C' : '#555'} />
        </View>
      )}
      <View style={styles.footer}>
        <Text style={styles.num}>{index + 1}</Text>
        <Text style={styles.dur}>{clip.duration.toFixed(1)}s</Text>
      </View>
      {replaced && (
        <View style={styles.checkBadge}>
          <Ionicons name="checkmark" size={10} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: TILE_SIZE, height: TILE_SIZE,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tileActive: { borderColor: '#FF3B5C' },
  tileReplaced: { borderColor: '#2ECC71' },
  thumb: { width: '100%', height: '70%' },
  empty: { width: '100%', height: '70%', alignItems: 'center', justifyContent: 'center' },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 5, paddingVertical: 3,
  },
  num: { color: '#888', fontSize: 9, fontWeight: '700' },
  dur: { color: '#555', fontSize: 9 },
  checkBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#2ECC71', width: 14, height: 14,
    borderRadius: 7, alignItems: 'center', justifyContent: 'center',
  },
});
