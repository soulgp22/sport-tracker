import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useSessionStore } from '../../../store/sessionStore';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useColors } from '../../../theme/useColors';
import { fonts } from '../../../theme/fonts';
import { cardShadow, radius, spacing } from '../../../theme/tokens';

import type { ThemeColors } from '../../../theme/palettes';
import { useTranslation } from '../../../i18n/useTranslation';
import type { Session } from '../../../types';

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}min ${s}s` : `${s}s`;
}

function SessionCard({ session, onPress }: { session: Session; onPress: () => void }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { t, locale } = useTranslation();
  const date = new Date(session.date);
  const dateStr = date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.completed).length, 0);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardDate}>{dateStr}</Text>
        <Text style={styles.cardTitle}>{session.programName ?? t('history.freeSession')}</Text>
        {session.dayName ? <Text style={styles.cardSub}>{session.dayName}</Text> : null}
        <Text style={styles.cardMeta}>
          {t('history.cardMeta', { exercises: session.exercises.length, sets: totalSets, duration: fmt(session.durationSeconds) })}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { t } = useTranslation();
  const router = useRouter();
  const sessions = useSessionStore((s) => s.sessions);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={sessions}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => (
          <SessionCard session={item} onPress={() => router.push(`/(tabs)/history/${item.id}`)} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="time-outline"
            title={t('history.emptyTitle')}
            subtitle={t('history.emptySubtitle')}
          />
        }
        contentContainerStyle={sessions.length === 0 ? styles.emptyContainer : styles.list}
      />
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  list: { paddingBottom: 20 },
  emptyContainer: { flex: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: 5,
    ...cardShadow(c),
  },
  cardLeft: { flex: 1, gap: 2 },
  cardDate: { fontSize: 12, color: c.textMuted, textTransform: 'capitalize' },
  cardTitle: { fontSize: 17, fontFamily: fonts.sansBold, color: c.textPrimary },
  cardSub: { fontSize: 14, color: c.primary, fontFamily: fonts.sansSemi },
  cardMeta: { fontSize: 13, color: c.textSecondary, marginTop: 2 },
});
