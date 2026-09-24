import { useQuery } from '@tanstack/react-query';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { calendarApi } from '../../api/endpoints';
import { queryKeys } from '../../api/queryKeys';
import type { CalendarEvent } from '../../api/types';
import type { TabScreenProps } from '../../app/navigation/types';
import { AppText, Card, Chip, Divider, EmptyState, ErrorState, IconButton, Screen, SectionHeader, Skeleton } from '../../components';
import { CalendarDays, ChevronLeft, ChevronRight } from '../../components/icons';
import { colors, radii, spacing } from '../../theme';
import { formatDate, formatMoneyList, parseIsoDate, toIsoDate } from '../../utils/format';
import { RenewalRow } from '../subscriptions/components/RenewalRow';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarScreen({ navigation }: TabScreenProps<'Calendar'>) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<string | null>(null);

  const from = toIsoDate(startOfMonth(month));
  const to = toIsoDate(endOfMonth(month));
  const { data, error, isPending, isRefetching, refetch } = useQuery({
    queryKey: queryKeys.calendar(from, to),
    queryFn: () => calendarApi.get(from, to),
    placeholderData: previous => previous,
  });

  const today = data ? parseIsoDate(data.today) : new Date();
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    (data?.from === from ? data.events : []).forEach(e => map.set(e.date, [...(map.get(e.date) ?? []), e]));
    return map;
  }, [data, from]);

  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    const days: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) {
      days.push(d);
    }
    return Array.from({ length: days.length / 7 }, (_, i) => days.slice(i * 7, i * 7 + 7));
  }, [month]);

  const changeMonth = (delta: number) => {
    setMonth(m => addMonths(m, delta));
    setSelected(null);
  };

  const visibleDates = selected ? [selected] : [...eventsByDate.keys()].sort();
  const currentMonth = isSameMonth(month, today);

  return (
    <Screen edges={['top', 'left', 'right']} refreshing={isRefetching} onRefresh={() => refetch()}>
      <View style={styles.header}>
        <AppText variant="title" accessibilityRole="header" style={styles.flex}>
          Calendar
        </AppText>
        {!currentMonth ? (
          <Chip
            label="Today"
            onPress={() => {
              setMonth(startOfMonth(today));
              setSelected(null);
            }}
          />
        ) : null}
      </View>

      <Card padding="md">
        <View style={styles.monthRow}>
          <IconButton icon={ChevronLeft} accessibilityLabel="Previous month" onPress={() => changeMonth(-1)} />
          <AppText variant="headline" align="center" style={styles.flex} accessibilityRole="header">
            {formatDate(month, 'MMMM yyyy')}
          </AppText>
          <IconButton icon={ChevronRight} accessibilityLabel="Next month" onPress={() => changeMonth(1)} />
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map(d => (
            <AppText key={d} variant="caption" tone="muted" align="center" style={styles.cell}>
              {d}
            </AppText>
          ))}
        </View>

        {weeks.map(week => (
          <View key={toIsoDate(week[0])} style={styles.weekRow}>
            {week.map(day => {
              const iso = toIsoDate(day);
              const events = eventsByDate.get(iso) ?? [];
              const inMonth = isSameMonth(day, month);
              const isToday = isSameDay(day, today);
              const isSelected = selected === iso;
              const label = `${formatDate(day, 'EEEE, MMMM d')}${events.length ? `, ${events.length} renewal${events.length > 1 ? 's' : ''}` : ''}`;
              return (
                <Pressable
                  key={iso}
                  disabled={!inMonth}
                  onPress={() => setSelected(isSelected ? null : iso)}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: isSelected, disabled: !inMonth }}
                  style={styles.cell}>
                  <View style={[styles.day, isToday && styles.today, isSelected && styles.selectedDay]}>
                    <AppText
                      variant="label"
                      numeric
                      color={isSelected ? colors.onPrimary : !inMonth ? colors.border : day < today && !isToday ? colors.textMuted : colors.text}>
                      {day.getDate()}
                    </AppText>
                  </View>
                  <View style={styles.dots}>
                    {inMonth
                      ? events.slice(0, 3).map(e => (
                          <View key={e.subscriptionId} style={[styles.dot, { backgroundColor: e.brandColor ?? colors.primary }]} />
                        ))
                      : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </Card>

      {isPending ? (
        <Card>
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} style={styles.skeletonGap} />
        </Card>
      ) : !data ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <Card padding="md" tone="primary">
            <AppText variant="label" tone="secondary">
              Renewing in {formatDate(month, 'MMMM')}
            </AppText>
            <AppText variant="headline" numeric>
              {data.events.length ? formatMoneyList(data.totals) : 'Nothing due'}
            </AppText>
            {data.events.length ? (
              <AppText variant="caption" tone="muted">
                {data.events.length} renewal{data.events.length > 1 ? 's' : ''}
                {currentMonth ? ' from today' : ''}
              </AppText>
            ) : null}
          </Card>

          <SectionHeader
            title={selected ? formatDate(selected, 'EEEE, MMMM d') : 'Renewals this month'}
            action={selected ? <Chip label="Show all" onPress={() => setSelected(null)} /> : undefined}
          />

          {visibleDates.length === 0 || (selected && !eventsByDate.get(selected)?.length) ? (
            <EmptyState
              icon={CalendarDays}
              title={selected ? 'No renewals on this day' : 'No renewals this month'}
              message={selected ? 'Pick a day with a dot to see what renews.' : 'Nothing renews this month.'}
            />
          ) : (
            visibleDates.map(date => (
              <View key={date} style={styles.dateGroup}>
                {!selected ? (
                  <AppText variant="label" tone="secondary">
                    {formatDate(date, 'EEE, MMM d')}
                  </AppText>
                ) : null}
                <Card padding="none">
                  {(eventsByDate.get(date) ?? []).map((e, i) => (
                    <View key={`${e.subscriptionId}-${date}`}>
                      {i > 0 ? <Divider inset={spacing.lg} /> : null}
                      <RenewalRow
                        serviceName={e.serviceName}
                        brandColor={e.brandColor}
                        planName={e.planName}
                        price={e.price}
                        currency={e.currency}
                        renewalDate={e.date}
                        daysRemaining={differenceInCalendarDays(parseIsoDate(e.date), today)}
                        onPress={() => navigation.navigate('SubscriptionDetail', { id: e.subscriptionId })}
                      />
                    </View>
                  ))}
                </Card>
              </View>
            ))
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  weekRow: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: spacing.xs, minHeight: 48 },
  day: { width: 34, height: 34, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1.5, borderColor: colors.primary },
  selectedDay: { backgroundColor: colors.primary, borderColor: colors.primary },
  dots: { flexDirection: 'row', gap: 3, height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dateGroup: { gap: spacing.sm },
  skeletonGap: { marginTop: spacing.sm },
});
