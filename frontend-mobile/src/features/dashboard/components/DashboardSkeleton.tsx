import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Skeleton } from '../../../components';
import { spacing } from '../../../theme';

/** Mirrors the dashboard layout so the page does not jump when data arrives. */
export function DashboardSkeleton() {
  return (
    <View style={styles.container} accessibilityLabel="Loading your dashboard">
      <Skeleton width="55%" height={28} />
      <Card padding="xl">
        <Skeleton width="30%" height={12} />
        <View style={styles.row}>
          <Skeleton width={52} height={52} radius={14} />
          <View style={styles.flex}>
            <Skeleton width="60%" height={18} />
            <Skeleton width="35%" height={14} style={styles.gap} />
          </View>
        </View>
        <Skeleton width="45%" height={30} style={styles.gapLg} />
        <Skeleton width="40%" height={20} style={styles.gap} />
      </Card>
      <View style={styles.stats}>
        {[0, 1, 2].map(i => (
          <Card key={i} style={styles.flex}>
            <Skeleton width="60%" height={12} />
            <Skeleton width="80%" height={20} style={styles.gap} />
          </Card>
        ))}
      </View>
      <Card padding="none">
        {[0, 1, 2].map(i => (
          <View key={i} style={styles.listRow}>
            <Skeleton width={40} height={40} radius={12} />
            <View style={styles.flex}>
              <Skeleton width="50%" height={16} />
              <Skeleton width="35%" height={12} style={styles.gap} />
            </View>
            <Skeleton width={56} height={16} />
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  flex: { flex: 1 },
  gap: { marginTop: spacing.sm },
  gapLg: { marginTop: spacing.lg },
  stats: { flexDirection: 'row', gap: spacing.md },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
});
