/**
 * Quests: small actions tied to the user's patterns/values, with a gentle
 * check-in loop. Progress counts what you did; missed days are never penalised
 * (no streaks, no guilt — per the product non-goals).
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
  Label,
  Spacer,
  Divider,
} from '../../components/ui';
import { useAppState } from '../../state/AppStateProvider';
import type { MainStackScreenProps } from '../../navigation/types';
import {
  addActiveQuest,
  addCheckIn,
  checkInsFor,
  deactivateQuest,
  listActiveQuests,
  type ActiveQuest,
} from '../../storage/repositories';
import { suggestQuests, questProgress, type CheckIn } from '../../features/quests/engine';
import { spacing } from '../../theme';

type Row = { quest: ActiveQuest; checkIns: CheckIn[]; encouragement: string };

export function QuestsScreen(_: MainStackScreenProps<'Quests'>) {
  const { content, profile } = useAppState();
  const [rows, setRows] = useState<Row[]>([]);

  const encouragementFor = useCallback(
    (quest: ActiveQuest): string => {
      const src = content.quests.quests.find((q) => q.id === quest.questId);
      return src?.encouragement ?? 'Showing up at all counts. Come back whenever you can.';
    },
    [content],
  );

  const load = useCallback(async () => {
    const active = await listActiveQuests();
    const built: Row[] = [];
    for (const quest of active) {
      const checkIns = await checkInsFor(quest.id);
      built.push({ quest, checkIns, encouragement: encouragementFor(quest) });
    }
    setRows(built);
  }, [encouragementFor]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const activeQuestIds = rows.map((r) => r.quest.questId).filter(Boolean) as string[];
  const suggestions = suggestQuests(
    content.quests.quests,
    { patterns: profile?.patternTags ?? [], topics: [], excludeIds: activeQuestIds },
    3,
  );

  async function check(quest: ActiveQuest, status: CheckIn['status']) {
    await addCheckIn(quest.id, status);
    await load();
  }

  return (
    <Screen>
      <Label>Quests</Label>
      <Title>Small moves</Title>
      <Spacer size={spacing.sm} />
      <Muted>Reflection is only worth something if it changes a next step. Keep these tiny.</Muted>
      <Spacer size={spacing.md} />

      {rows.length === 0 ? (
        <Muted>No active quests yet. Add one below, or finish a coaching session to create one.</Muted>
      ) : (
        rows.map(({ quest, checkIns, encouragement }) => {
          const progress = questProgress(checkIns);
          return (
            <Card key={quest.id}>
              <Body>{quest.title}</Body>
              <Muted>{quest.description}</Muted>
              <Spacer size={spacing.sm} />
              <Small>
                {progress.completed} done · {progress.totalCheckIns} check-ins · {quest.cadence}
              </Small>
              <Spacer size={spacing.xs} />
              <Small>{encouragement}</Small>
              <Divider />
              <View style={styles.actions}>
                <Button label="Did it" onPress={() => check(quest, 'done')} />
                <Button label="Some of it" variant="secondary" onPress={() => check(quest, 'partial')} />
                <Button label="Not today" variant="ghost" onPress={() => check(quest, 'skipped')} />
              </View>
              <Button
                label="Retire this quest"
                variant="ghost"
                onPress={async () => {
                  await deactivateQuest(quest.id);
                  await load();
                }}
              />
            </Card>
          );
        })
      )}

      {suggestions.length ? (
        <>
          <Heading>Suggested for you</Heading>
          <Muted>Chosen to match the patterns you've been flagging.</Muted>
          <Spacer size={spacing.sm} />
          {suggestions.map((q) => (
            <Card key={q.id}>
              <Body>{q.title}</Body>
              <Muted>{q.description}</Muted>
              <Small>~{q.estMinutes} min · {q.cadence}</Small>
              <Button
                label="Add to my quests"
                variant="secondary"
                onPress={async () => {
                  await addActiveQuest({
                    questId: q.id,
                    title: q.title,
                    description: q.description,
                    cadence: q.cadence,
                    custom: false,
                  });
                  await load();
                }}
              />
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
