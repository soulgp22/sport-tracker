import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useActiveSessionStore } from '../../store/activeSessionStore';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

interface HomeTile {
  label: string;
  icon: IoniconsName;
  href: '/(tabs)/programs' | '/(tabs)/session' | '/(tabs)/exercises' | '/(tabs)/history' | '/(tabs)/progress' | '/(tabs)/settings';
  key: string;
}

const HOME_TILES: HomeTile[] = [
  { key: 'programs', label: 'Programmes', icon: 'barbell-outline', href: '/(tabs)/programs' },
  { key: 'session', label: 'Séance', icon: 'play-circle-outline', href: '/(tabs)/session' },
  { key: 'exercises', label: 'Exercices', icon: 'body-outline', href: '/(tabs)/exercises' },
  { key: 'history', label: 'Historique', icon: 'time-outline', href: '/(tabs)/history' },
  { key: 'progress', label: 'Progression', icon: 'trending-up-outline', href: '/(tabs)/progress' },
  { key: 'settings', label: 'Paramètres', icon: 'settings-outline', href: '/(tabs)/settings' },
];

export default function HomeScreen() {
  const router = useRouter();
  const active = useActiveSessionStore((s) => s.active);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>Sport Tracker</Text>

        <View style={styles.grid}>
          {HOME_TILES.map((tile) => (
            <TouchableOpacity
              key={tile.key}
              style={styles.tile}
              onPress={() => router.push(tile.href as never)}
              activeOpacity={0.75}
              accessibilityRole="button">
              {tile.key === 'session' && active ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>En cours</Text>
                </View>
              ) : null}
              <View style={styles.iconBox}>
                <Ionicons name={tile.icon} size={30} color="#2563eb" />
              </View>
              <View style={styles.tileFooter}>
                <Text style={styles.tileLabel}>{tile.label}</Text>
                <Ionicons name="chevron-forward" size={18} color="#6b7280" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  tile: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  tileLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#2563eb',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
});
