import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Dimensions, Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { loadProjects, deleteProject } from '../utils/storage';
import { Project } from '../types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [projects, setProjects] = useState<Project[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadProjects().then(setProjects);
    }, []),
  );

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete project', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteProject(id);
          setProjects(prev => prev.filter(p => p.id !== id));
        },
      },
    ]);
  };

  const renderCard = ({ item }: { item: Project }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Template', { project: item })}
      onLongPress={() => handleDelete(item.id, item.name)}
      activeOpacity={0.85}
    >
      {item.template.thumbnailUri ? (
        <Image source={{ uri: item.template.thumbnailUri }} style={styles.thumbnail} />
      ) : (
        <View style={styles.thumbnailPlaceholder}>
          <Ionicons name="film-outline" size={32} color="#444" />
        </View>
      )}
      <View style={styles.cardFooter}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <View style={styles.platformBadge}>
          <Ionicons
            name={item.template.platform === 'tiktok' ? 'musical-notes' : 'logo-instagram'}
            size={10}
            color="#fff"
          />
        </View>
      </View>
      <Text style={styles.clipCount}>{item.template.clips.length} clips</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.navigate('Discover')}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Projects</Text>
        </View>
        <TouchableOpacity
          style={styles.importBtn}
          onPress={() => navigation.navigate('Import')}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {projects.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="videocam-outline" size={64} color="#333" />
          <Text style={styles.emptyTitle}>No projects yet</Text>
          <Text style={styles.emptyText}>Pick a viral template to remix,{'\n'}or import your own video</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => navigation.navigate('Discover')}
          >
            <Text style={styles.emptyBtnText}>Browse templates</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.emptyBtnGhost}
            onPress={() => navigation.navigate('Import')}
          >
            <Text style={styles.emptyBtnGhostText}>Import a video</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={p => p.id}
          renderItem={renderCard}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  importBtn: {
    backgroundColor: '#FF3B5C',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { padding: 16 },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    overflow: 'hidden',
  },
  thumbnail: { width: '100%', height: CARD_WIDTH * 1.4 },
  thumbnailPlaceholder: {
    width: '100%',
    height: CARD_WIDTH * 1.4,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingBottom: 2,
    justifyContent: 'space-between',
  },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#fff', flex: 1 },
  platformBadge: {
    backgroundColor: '#FF3B5C',
    borderRadius: 8,
    padding: 3,
    marginLeft: 6,
  },
  clipCount: { fontSize: 11, color: '#666', paddingHorizontal: 10, paddingBottom: 10 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  emptyBtn: {
    marginTop: 24,
    backgroundColor: '#FF3B5C',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emptyBtnGhost: { marginTop: 12, paddingHorizontal: 28, paddingVertical: 12 },
  emptyBtnGhostText: { color: '#888', fontWeight: '600', fontSize: 14 },
});
