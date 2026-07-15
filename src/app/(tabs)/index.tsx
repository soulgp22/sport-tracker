import { useMemo } from 'react';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';
import { fonts } from '../../theme/fonts';
import { useActiveSessionStore } from '../../store/activeSessionStore';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

interface HomeTile {
  label: string;
  icon: IoniconsName;
  href:
    | '/(tabs)/programs'
    | '/(tabs)/session'
    | '/(tabs)/exercises'
    | '/(tabs)/foods'
    | '/(tabs)/nutrition'
    | '/(tabs)/history'
    | '/(tabs)/progress'
    | '/(tabs)/settings';
  key: string;
}

const HOME_TILES: HomeTile[] = [
  { key: 'programs', label: 'Programmes', icon: 'barbell-outline', href: '/(tabs)/programs' },
  { key: 'session', label: 'Séance', icon: 'play-circle-outline', href: '/(tabs)/session' },
  { key: 'exercises', label: 'Exercices', icon: 'body-outline', href: '/(tabs)/exercises' },
  { key: 'foods', label: 'Aliments', icon: 'restaurant-outline', href: '/(tabs)/foods' },
  { key: 'nutrition', label: 'Nutrition', icon: 'pie-chart-outline', href: '/(tabs)/nutrition' },
  { key: 'history', label: 'Historique', icon: 'time-outline', href: '/(tabs)/history' },
  { key: 'progress', label: 'Progression', icon: 'trending-up-outline', href: '/(tabs)/progress' },
  { key: 'settings', label: 'Paramètres', icon: 'settings-outline', href: '/(tabs)/settings' },
];

export default function HomeScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const active = useActiveSessionStore((s) => s.active);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
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
                <Ionicons name={tile.icon} size={24} color={c.primary} />
              </View>
              <Text style={styles.tileLabel} numberOfLines={1}>
                {tile.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.serifBold,
    color: c.textPrimary,
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: c.overlay,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 12,
    fontFamily: fonts.sansBold,
    color: c.textPrimary,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: c.primary,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: fonts.sansBold,
    color: c.primaryText,
  },
});
