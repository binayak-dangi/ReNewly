import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import type { RootScreenProps } from '../../../app/navigation/types';
import { AppText, Divider, ErrorState, ListRow, Screen, ServiceAvatar, Skeleton } from '../../../components';
import { Pencil, Search } from '../../../components/icons';
import { colors, radii, spacing, typography } from '../../../theme';
import { categoryLabel } from '../labels';
import { useCatalog } from '../hooks';

function useDebounced<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function Separator() {
  return <Divider inset={spacing.lg} />;
}

/** Step 1 of adding a subscription: pick a known service (pre-fills the form) or add a custom one. */
export function ServicePickerScreen({ navigation }: RootScreenProps<'ServicePicker'>) {
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search.trim());
  const { data, error, isPending, refetch } = useCatalog(debounced);

  const custom = (
    <View style={styles.customCard}>
      <ListRow
        title={search.trim() ? `Add "${search.trim()}"` : 'Custom subscription'}
        subtitle="For any service not in the list"
        icon={Pencil}
        onPress={() => navigation.replace('SubscriptionForm', search.trim() ? { serviceName: search.trim() } : {})}
      />
    </View>
  );

  return (
    <Screen edges={['left', 'right', 'bottom']} scroll={false} padded={false}>
      <View style={styles.searchWrap}>
        <View style={styles.search}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search Netflix, Spotify, ChatGPT…"
            placeholderTextColor={colors.textMuted}
            autoFocus
            autoCorrect={false}
            accessibilityLabel="Search services"
            style={styles.searchInput}
          />
        </View>
      </View>

      {isPending ? (
        <View style={styles.padded}>
          {[0, 1, 2, 3, 4].map(i => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width={40} height={40} radius={12} />
              <Skeleton width="50%" height={16} />
            </View>
          ))}
        </View>
      ) : !data ? (
        <View style={styles.padded}>
          {custom}
          <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load popular services" />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {custom}
              {data.length > 0 ? (
                <AppText variant="label" tone="secondary" style={styles.sectionLabel}>
                  {debounced ? 'Matching services' : 'Popular services'}
                </AppText>
              ) : null}
            </View>
          }
          ItemSeparatorComponent={Separator}
          renderItem={({ item }) => (
            <ListRow
              title={item.name}
              subtitle={categoryLabel(item.category)}
              leading={<ServiceAvatar name={item.name} brandColor={item.brandColor} size={40} />}
              onPress={() => navigation.replace('SubscriptionForm', { serviceId: item.id })}
            />
          )}
          ListEmptyComponent={
            debounced ? (
              <AppText tone="muted" align="center" style={styles.empty}>
                No service called "{debounced}". Add it as a custom subscription above.
              </AppText>
            ) : undefined
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { padding: spacing.lg, gap: spacing.lg },
  searchWrap: { padding: spacing.lg, paddingBottom: spacing.sm, backgroundColor: colors.background },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  searchInput: { ...typography.body, flex: 1, color: colors.text, paddingVertical: spacing.sm },
  list: { paddingBottom: spacing.xxxl, backgroundColor: colors.background, flexGrow: 1 },
  listHeader: { gap: spacing.md, paddingTop: spacing.sm },
  customCard: {
    marginHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
  },
  sectionLabel: { marginHorizontal: spacing.lg, marginTop: spacing.sm },
  empty: { padding: spacing.xl },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
