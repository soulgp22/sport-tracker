import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CommunityFoodDatabaseEntry } from '../../store/communityStore';
import { fonts } from '../../theme/fonts';
import type { ThemeColors } from '../../theme/palettes';
import { useColors } from '../../theme/useColors';
import { TextInput } from '../ui/TextInput';

interface RetailerPickerProps {
  entries: CommunityFoodDatabaseEntry[];
  value: string | null;
  loading?: boolean;
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  noneLabel: string;
  githubLabel: string;
  closeLabel: string;
  emptyLabel: string;
  onChange: (id: string | null) => void;
  onRefresh?: () => void;
}

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function RetailerPicker({
  entries,
  value,
  loading,
  label,
  placeholder,
  searchPlaceholder,
  noneLabel,
  githubLabel,
  closeLabel,
  emptyLabel,
  onChange,
  onRefresh,
}: RetailerPickerProps) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = entries.find((entry) => entry.id === value);
  const filteredEntries = useMemo(() => {
    const term = normalize(query);
    if (!term) return entries;
    return entries.filter((entry) =>
      normalize(`${entry.name} ${entry.retailer} ${entry.country}`).includes(term)
    );
  }, [entries, query]);

  const select = (id: string | null) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.78}>
        <View style={styles.triggerIcon}>
          <Ionicons name={selected ? 'basket-outline' : 'storefront-outline'} size={21} color={c.primary} />
        </View>
        <View style={styles.triggerCopy}>
          <Text style={[styles.triggerTitle, !selected && styles.placeholder]} numberOfLines={1}>
            {selected?.retailer ?? placeholder}
          </Text>
          {selected ? (
            <Text style={styles.triggerMeta} numberOfLines={1}>
              {selected.country} · {selected.foodsCount} aliments
            </Text>
          ) : null}
        </View>
        {loading ? <ActivityIndicator size="small" color={c.primary} /> : null}
        <Ionicons name="chevron-down" size={20} color={c.textMuted} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        animationType="slide"
        onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <SafeAreaView style={styles.sheet} edges={['bottom']}>
            <View style={styles.grabber} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleBlock}>
                <Text style={styles.sheetEyebrow}>GITHUB · LIFE SPORT TRACKER</Text>
                <Text style={styles.sheetTitle}>{label}</Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={closeLabel}
                style={styles.closeButton}
                onPress={() => setOpen(false)}>
                <Ionicons name="close" size={21} color={c.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchRow}>
              <View style={styles.searchInput}>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={searchPlaceholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {onRefresh ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.refreshButton}
                  onPress={onRefresh}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator size="small" color={c.primary} />
                  ) : (
                    <Ionicons name="refresh" size={21} color={c.primary} />
                  )}
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              data={filteredEntries}
              keyExtractor={(entry) => entry.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.list}
              ListHeaderComponent={
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ selected: !value }}
                  style={[styles.option, !value && styles.optionSelected]}
                  onPress={() => select(null)}>
                  <View style={styles.optionIcon}>
                    <Ionicons name="remove-circle-outline" size={21} color={c.primary} />
                  </View>
                  <Text style={styles.optionTitle}>{noneLabel}</Text>
                  {!value ? <Ionicons name="checkmark-circle" size={21} color={c.primary} /> : null}
                </TouchableOpacity>
              }
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="search-outline" size={28} color={c.textMuted} />
                  <Text style={styles.emptyText}>{emptyLabel}</Text>
                </View>
              }
              renderItem={({ item }) => {
                const active = item.id === value;
                return (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[styles.option, active && styles.optionSelected]}
                    onPress={() => select(item.id)}>
                    <View style={[styles.optionIcon, active && styles.optionIconSelected]}>
                      <Ionicons name="basket-outline" size={21} color={active ? c.primaryText : c.primary} />
                    </View>
                    <View style={styles.optionCopy}>
                      <Text style={styles.optionTitle} numberOfLines={1}>{item.retailer}</Text>
                      <Text style={styles.optionMeta} numberOfLines={1}>
                        {item.country} · {item.foodsCount} aliments · {githubLabel}
                      </Text>
                    </View>
                    {active ? <Ionicons name="checkmark-circle" size={21} color={c.primary} /> : null}
                  </TouchableOpacity>
                );
              }}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  wrapper: { gap: 10 },
  label: { fontFamily: fonts.sansBold, fontSize: 13, color: c.textPrimary },
  trigger: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  triggerIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accentSoft },
  triggerCopy: { flex: 1 },
  triggerTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: c.textPrimary },
  triggerMeta: { fontFamily: fonts.sans, fontSize: 12, color: c.textSecondary, marginTop: 2 },
  placeholder: { color: c.textSecondary },
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: c.overlay },
  sheet: {
    height: '78%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bg,
    overflow: 'hidden',
  },
  grabber: { width: 42, height: 4, borderRadius: 2, alignSelf: 'center', backgroundColor: c.border, marginTop: 10 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12 },
  sheetTitleBlock: { flex: 1 },
  sheetEyebrow: { fontFamily: fonts.sansBold, fontSize: 9, letterSpacing: 1.2, color: c.primary, marginBottom: 3 },
  sheetTitle: { fontFamily: fonts.sansHeavy, fontSize: 21, color: c.textPrimary },
  closeButton: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceAlt },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 18, paddingBottom: 10 },
  searchInput: { flex: 1 },
  refreshButton: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 13, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  list: { paddingHorizontal: 18, paddingBottom: 28, gap: 9 },
  option: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, borderRadius: 15, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  optionSelected: { borderColor: c.primary, backgroundColor: c.accentSoft },
  optionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accentSoft },
  optionIconSelected: { backgroundColor: c.primary },
  optionCopy: { flex: 1 },
  optionTitle: { flex: 1, fontFamily: fonts.sansBold, fontSize: 15, color: c.textPrimary },
  optionMeta: { fontFamily: fonts.sans, fontSize: 11, color: c.textSecondary, marginTop: 3 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 36 },
  emptyText: { fontFamily: fonts.sansSemi, color: c.textSecondary },
});
