import { useMemo } from 'react';
import { SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSessionStore } from '../../../store/sessionStore';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useColors } from '../../../theme/useColors';
import { fonts } from '../../../theme/fonts';

import type { ThemeColors } from '../../../theme/palettes';
import { useTranslation } from '../../../i18n/useTranslation';
import type { Session } from '../../../types';

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}min ${s}s` : `${s}s`;
}

type DaySection = { key: string; title: string; data: Session[] };

export default function HistoryScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { t, locale } = useTranslation();
  const router = useRouter();
  const sessions = useSessionStore((s) => s.sessions);

  const sections = useMemo<DaySection[]>(() => {
    const groups = new Map<string, Session[]>();
    for (const session of sessions) {
      const d = new Date(session.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const bucket = groups.get(key);
      if (bucket) {
        bucket.push(session);
      } else {
        groups.set(key, [session]);
      }
    }
    return Array.from(groups.entries()).map(([key, data]) => ({
      key,
      title: new Date(data[0].date).toLocaleDateString(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }),
      data,
    }));
  }, [sessions, locale]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerKicker}>{t('nav.history')}</Text>
        <Text style={styles.headerTitle}>{t('history.title')}</Text>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(s) => s.id}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={styles.dayHeader}>
            <Text style={styles.dayHeaderText}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const totalSets = item.exercises.reduce(
            (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
            0
          );
          const meta = t('history.cardMetaShort', {
            exercises: item.exercises.length,
            sets: totalSets,
          });
          const detail = item.dayName ? `${item.dayName} · ${meta}` : meta;
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push(`/(tabs)/history/${item.id}`)}
              activeOpacity={0.75}
              accessibilityRole="button">
              <View style={styles.dot} />
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{item.programName ?? t('history.freeSession')}</Text>
                <Text style={styles.rowDetail}>{detail}</Text>
              </View>
              <Text style={styles.rowValue}>{fmt(item.durationSeconds)}</Text>
            </TouchableOpacity>
          );
        }}
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

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },

    header: {
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 14,
      borderBottomWidth: 2,
      borderBottomColor: c.border,
    },
    headerKicker: {
      fontFamily: fonts.serifBold,
      fontSize: 11,
      lineHeight: 15,
      letterSpacing: 1.54,
      textTransform: 'uppercase',
      color: c.secondary,
    },
    headerTitle: {
      fontFamily: fonts.serifBold,
      fontSize: 34,
      lineHeight: 40,
      marginTop: 6,
      color: c.textPrimary,
    },

    list: { paddingBottom: 20 },
    emptyContainer: { flex: 1 },

    dayHeader: {
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 8,
      backgroundColor: c.surface,
      borderBottomWidth: 2,
      borderBottomColor: c.border,
    },
    dayHeaderText: {
      fontFamily: fonts.serifBold,
      fontSize: 13,
      lineHeight: 17,
      letterSpacing: 1.04,
      textTransform: 'uppercase',
      color: c.textPrimary,
    },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 20,
      paddingVertical: 14,
      minHeight: 64,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    dot: {
      width: 8,
      height: 8,
      backgroundColor: c.secondary,
    },
    rowCopy: { flex: 1 },
    rowTitle: {
      fontFamily: fonts.serifBold,
      fontSize: 15,
      lineHeight: 19,
      color: c.textPrimary,
    },
    rowDetail: {
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 2,
      color: c.textSecondary,
    },
    rowValue: {
      fontFamily: fonts.serifBold,
      fontSize: 15,
      lineHeight: 19,
      color: c.textPrimary,
    },
  });
