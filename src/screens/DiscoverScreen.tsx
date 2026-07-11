import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NICHES, Niche, templatesForNiche, CatalogTemplate, formatUses } from '../data/templates';

const { width } = Dimensions.get('window');
const COL_GAP = 12;
const CARD_WIDTH = (width - 32 - COL_GAP) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

export default function DiscoverScreen() {
  const navigation = useNavigation<any>();
  const [niche, setNiche] = useState<Niche>('Trending');
  const templates = templatesForNiche(niche);

  const renderCard = ({ item }: { item: CatalogTemplate }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('TemplateDetail', { template: item })}
    >
      <LinearGradient colors={item.gradient} style={styles.cardBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {item.trending && (
          <View style={styles.trendBadge}>
            <Ionicons name="flame" size={11} color="#fff" />
            <Text style={styles.trendText}>Trending</Text>
          </View>
        )}
        <View style={styles.playCircle}>
          <Ionicons name="play" size={20} color="#fff" />
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.metaPill}>
            <Ionicons name="film-outline" size={11} color="#fff" />
            <Text style={styles.metaPillText}>{item.clipCount}</Text>
          </View>
          <View style={styles.metaPill}>
            <Ionicons name="people-outline" size={11} color="#fff" />
            <Text style={styles.metaPillText}>{formatUses(item.uses)}</Text>
          </View>
        </View>
      </LinearGradient>
      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
      <View style={styles.audioRow}>
        <Ionicons name="musical-note" size={11} color="#888" />
        <Text style={styles.cardAudio} numberOfLines={1}>{item.audioName}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Discover</Text>
          <Text style={styles.subtitle}>Viral templates, updated daily</Text>
        </View>
        <TouchableOpacity style={styles.projectsBtn} onPress={() => navigation.navigate('Projects')}>
          <Ionicons name="folder-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Niche chips */}
      <View style={styles.chipsWrap}>
        <FlatList
          horizontal
          data={NICHES}
          keyExtractor={n => n}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, niche === item && styles.chipActive]}
              onPress={() => setNiche(item)}
            >
              {item === 'Trending' && (
                <Ionicons name="flame" size={13} color={niche === item ? '#fff' : '#888'} />
              )}
              <Text style={[styles.chipText, niche === item && styles.chipTextActive]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={templates}
        keyExtractor={t => t.id}
        renderItem={renderCard}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  projectsBtn: {
    backgroundColor: '#1A1A1A', width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  chipsWrap: { height: 44 },
  chips: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, height: 34, borderRadius: 17,
    backgroundColor: '#1A1A1A',
  },
  chipActive: { backgroundColor: '#FF3B5C' },
  chipText: { color: '#888', fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  grid: { padding: 16 },
  row: { gap: COL_GAP, marginBottom: 16 },
  card: { width: CARD_WIDTH },
  cardBg: {
    width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 16,
    padding: 10, justifyContent: 'space-between', overflow: 'hidden',
  },
  trendBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start',
    backgroundColor: '#00000055', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  trendText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  playCircle: {
    position: 'absolute', top: '50%', left: '50%',
    marginTop: -22, marginLeft: -22,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#ffffff33', alignItems: 'center', justifyContent: 'center',
  },
  cardMeta: { flexDirection: 'row', gap: 6 },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#00000055', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  metaPillText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  cardTitle: { color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 8 },
  audioRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  cardAudio: { color: '#888', fontSize: 11, flex: 1 },
});
