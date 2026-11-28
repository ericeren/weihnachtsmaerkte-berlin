import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SORT_LABEL } from '../lib/labels';
import { useStore } from '../state/Store';
import { colors } from '../theme';
import type { Market, SortMode } from '../types';
import Chip from './Chip';
import MarketRow from './MarketRow';

const SORTS: SortMode[] = ['status', 'start', 'name', 'distanz'];

export default function MarketList() {
  const { result, now, filters, setFilters, resetFilters, pos, requestLocation } = useStore();
  const insets = useSafeAreaInsets();
  const day = filters.when.kind === 'tag' ? filters.when.date : null;

  const renderItem = useCallback(
    ({ item }: { item: Market }) => (
      <MarketRow m={item} now={now} day={day} distanceKm={pos ? result.distances[item.id] : undefined} />
    ),
    [now, day, pos, result.distances],
  );

  const setSort = async (s: SortMode) => {
    if (s === 'distanz' && !pos) {
      const p = await requestLocation();
      if (!p) return;
    }
    setFilters({ sort: s });
  };

  return (
    <FlatList
      data={result.list}
      keyExtractor={(m) => m.id}
      renderItem={renderItem}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      ListHeaderComponent={
        <View style={styles.head}>
          <View style={styles.search}>
            <Ionicons name="search" size={18} color={colors.grau} />
            <TextInput
              value={filters.query}
              onChangeText={(t) => setFilters({ query: t })}
              placeholder="Name, Straße oder Bezirk"
              placeholderTextColor={colors.grauHell}
              style={styles.input}
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCorrect={false}
              accessibilityLabel="Märkte durchsuchen"
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sorts}>
            <Text style={styles.sortLabel}>Sortieren:</Text>
            {SORTS.map((s) => (
              <Chip key={s} compact label={SORT_LABEL[s]} selected={filters.sort === s} onPress={() => setSort(s)} />
            ))}
          </ScrollView>
        </View>
      }
      ListFooterComponent={
        <Pressable onPress={() => router.push('/info')} style={styles.fuss} accessibilityRole="link" hitSlop={8}>
          <Text style={styles.fussText}>Impressum und Datenschutz</Text>
        </Pressable>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Keine Märkte für diese Auswahl</Text>
          <Text style={styles.emptyText}>Lockere die Filter oder wähle einen anderen Tag.</Text>
          <Pressable style={styles.emptyBtn} onPress={resetFilters} accessibilityRole="button">
            <Text style={styles.emptyBtnText}>Alle Filter zurücksetzen</Text>
          </Pressable>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  fuss: { alignSelf: 'center', paddingVertical: 18, paddingHorizontal: 12 },
  fussText: { fontSize: 13, color: colors.grau, textDecorationLine: 'underline' },
  head: { paddingTop: 10, paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.linie },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.linie,
    backgroundColor: colors.weiss,
    gap: 8,
  },
  input: { flex: 1, fontSize: 16, color: colors.tinte, height: 44 },
  sorts: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  sortLabel: { fontSize: 14, color: colors.grau, marginRight: 2 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.linie, marginLeft: 24 },
  empty: { padding: 32, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.tinte, textAlign: 'center' },
  emptyText: { fontSize: 15, color: colors.grau, marginTop: 6, textAlign: 'center' },
  emptyBtn: {
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: colors.rot,
    justifyContent: 'center',
  },
  emptyBtnText: { color: colors.weiss, fontSize: 16, fontWeight: '600' },
});
