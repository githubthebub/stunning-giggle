/**
 * Progress: mood logging + the pattern-recurrence read-out (counting engine).
 * Framing is encouraging, never punishing — no streaks, no red numbers.
 */
import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Screen,
  Title,
  Heading,
  Body,
  Muted,
  Small,
  Card,
  Button,
  Chip,
  Label,
  Spacer,
  Divider,
} from '../../components/ui';
import { useAppState } from '../../state/AppStateProvider';
import type { TabScreenProps } from '../../navigation/types';
import { allPatternEvents, logMood, recentMoods, type MoodLog } from '../../storage/repositories';
import { detectRecurrences } from '../../features/patterns/detector';
import { appConfig } from '../../config/appConfig';
import { colors, spacing } from '../../theme';

const MOOD_LABELS: Record<number, string> = {
  1: 'Rough',
  2: 'Low',
  3: 'Okay',
  4: 'Good',
  5: 'Great',
};

export function ProgressScreen({ navigation }: TabScreenProps<'Progress'>) {
  const { content, checkText } = useAppState();
  const [mood, setMood] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [recent, setRecent] = useState<MoodLog[]>([]);
  const [counts, setCounts] = useState<{ tag: string; count: number }[]>([]);

  const patternDef = useCallback(
    (id: string) => content.valuesModel.patternTags.find((t) => t.id === id),
    [content],
  );

  const load = useCallback(async () => {
    setRecent(await recentMoods(7));
    const events = await allPatternEvents();
    const insights = detectRecurrences(events, { minOccurrences: 1 });
    setCounts(insights.map((i) => ({ tag: i.tag, count: i.count })));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function toggleTag(id: string) {
    setTags((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function save() {
    if (mood == null) return;
    await logMood(mood, '', tags);
    setMood(null);
    setTags([]);
    await load();
  }

  const threshold = appConfig.patterns.minOccurrences;

  return (
    <Screen>
      <Label>Progress</Label>
      <Title>How are you, honestly?</Title>
      <Spacer size={spacing.md} />

      <Card>
        <Label>Log a mood</Label>
        <Spacer size={spacing.sm} />
        <View style={styles.moods}>
          {[1, 2, 3, 4, 5].map((m) => (
            <Chip key={m} label={MOOD_LABELS[m]} selected={mood === m} onPress={() => setMood(m)} />
          ))}
        </View>
        <Spacer size={spacing.sm} />
        <Small>Tag what's driving it (optional):</Small>
        <View style={styles.chips}>
          {content.valuesModel.patternTags.map((t) => (
            <Chip key={t.id} label={t.label} selected={tags.includes(t.id)} onPress={() => toggleTag(t.id)} />
          ))}
        </View>
        <Button label="Save" onPress={save} disabled={mood == null} />
      </Card>

      {recent.length ? (
        <Card>
          <Label>Recent moods</Label>
          <Spacer size={spacing.xs} />
          <View style={styles.recentRow}>
            {recent.map((r) => (
              <View key={r.id} style={styles.recentItem}>
                <Body>{MOOD_LABELS[r.mood] ?? r.mood}</Body>
              </View>
            ))}
          </View>
          <Small>No judgement in these numbers — they're just information.</Small>
        </Card>
      ) : null}

      <Heading>What keeps coming up</Heading>
      {counts.length === 0 ? (
        <Muted>Nothing tagged in the last {appConfig.patterns.windowDays} days yet.</Muted>
      ) : (
        <Card>
          {counts.map((c, i) => {
            const def = patternDef(c.tag);
            const recurring = c.count >= threshold;
            return (
              <View key={c.tag}>
                {i > 0 ? <Divider /> : null}
                <View style={styles.countRow}>
                  <Body>{def?.label ?? c.tag}</Body>
                  <Small>{c.count}×</Small>
                </View>
                {recurring && def?.supportiveNote ? (
                  <Muted style={{ color: colors.accent }}>{def.supportiveNote}</Muted>
                ) : null}
              </View>
            );
          })}
        </Card>
      )}

      <Button label="Your quests" variant="secondary" onPress={() => navigation.navigate('Quests')} />
      <Spacer size={spacing.sm} />
      <Small>
        Counting, not diagnosing. If a theme feels heavier than an app can hold, a trusted person or
        a mental-health professional is worth reaching for.
      </Small>
    </Screen>
  );
}

const styles = StyleSheet.create({
  moods: { flexDirection: 'row', flexWrap: 'wrap' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm },
  recentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  recentItem: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
  },
  countRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
});
