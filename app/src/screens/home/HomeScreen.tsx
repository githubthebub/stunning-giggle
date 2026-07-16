/**
 * Home dashboard.
 *
 * Pulls together the deterministic signals: a gentle pattern call-out (counting
 * engine), a rotating Socratic question (selection engine), and quick entries
 * into each area. Nothing here is generated — every line is curated content
 * chosen by rules.
 */
import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
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
} from '../../components/ui';
import { useAppState } from '../../state/AppStateProvider';
import type { TabScreenProps } from '../../navigation/types';
import {
  allPatternEvents,
  getLastSurfacedMap,
  markInsightSurfaced,
  recentQuestionIds,
  recordQuestionServed,
} from '../../storage/repositories';
import {
  detectRecurrences,
  filterByCooldown,
  formatInsight,
} from '../../features/patterns/detector';
import { selectQuestion } from '../../features/questions/selector';
import type { SocraticQuestion } from '../../data/schema';
import { colors, spacing } from '../../theme';

export function HomeScreen({ navigation }: TabScreenProps<'Home'>) {
  const { content, profile } = useAppState();
  const [insight, setInsight] = useState<{ tag: string; text: string } | null>(null);
  const [question, setQuestion] = useState<SocraticQuestion | null>(null);
  const [served, setServed] = useState<string[]>([]);

  const patternLabel = useCallback(
    (id: string) => content.valuesModel.patternTags.find((t) => t.id === id),
    [content],
  );

  const load = useCallback(async () => {
    const events = await allPatternEvents();
    const lastSurfaced = await getLastSurfacedMap();
    const insights = filterByCooldown(detectRecurrences(events), lastSurfaced);
    if (insights.length) {
      const top = insights[0];
      const def = patternLabel(top.tag);
      setInsight({ tag: top.tag, text: formatInsight(top, def?.label ?? top.tag, def?.supportiveNote) });
      await markInsightSurfaced(top.tag);
    } else {
      setInsight(null);
    }

    const recent = await recentQuestionIds();
    setServed(recent);
    const q = selectQuestion(content.questionBank.questions, {
      patternTags: profile?.patternTags ?? [],
      recentlyServedIds: recent,
    });
    setQuestion(q);
  }, [content, profile, patternLabel]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function anotherQuestion() {
    if (question) {
      await recordQuestionServed(question.id);
      const nextRecent = [question.id, ...served];
      setServed(nextRecent);
      const q = selectQuestion(content.questionBank.questions, {
        patternTags: profile?.patternTags ?? [],
        recentlyServedIds: nextRecent,
      });
      setQuestion(q);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Label>Compass</Label>
          <Title>Where are you today?</Title>
        </View>
        <Pressable
          onPress={() => navigation.navigate('Settings')}
          accessibilityLabel="Settings"
          style={styles.gear}
        >
          <Small>Settings</Small>
        </Pressable>
      </View>

      <Spacer size={spacing.md} />

      {insight ? (
        <Card>
          <Label>A pattern to notice</Label>
          <Spacer size={spacing.xs} />
          <Body>{insight.text}</Body>
          <Small>Noticing it is the point — no pressure to fix it today.</Small>
          <Button
            label="Sit with this"
            variant="secondary"
            onPress={() => navigation.navigate('Journal')}
          />
        </Card>
      ) : null}

      <Card>
        <Label>A question worth your honesty</Label>
        <Spacer size={spacing.sm} />
        {question ? <Heading>{question.text}</Heading> : <Muted>Loading a question…</Muted>}
        <View style={styles.row}>
          <Button label="Journal on this" onPress={() => navigation.navigate('Journal')} />
          <Button label="Another" variant="ghost" onPress={anotherQuestion} />
        </View>
      </Card>

      <Heading>Do something with it</Heading>
      <Card onPress={() => navigation.navigate('Coaching')}>
        <Body>Start a coaching session</Body>
        <Muted>A short, branching conversation that ends in one concrete next step.</Muted>
      </Card>
      <Card onPress={() => navigation.navigate('Toolkit')}>
        <Body>Open the toolkit</Body>
        <Muted>Thought records, the distortion check, and values work.</Muted>
      </Card>
      <Card onPress={() => navigation.navigate('Progress')}>
        <Body>Track how you're doing</Body>
        <Muted>Log a mood, tag a theme, and keep your quests moving.</Muted>
      </Card>

      <Spacer size={spacing.sm} />
      <Small>
        Compass is a self-reflection tool, not therapy or care. If things feel heavy, reaching out to
        a trusted person or a mental-health professional is a strong move.
      </Small>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  gear: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
  },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
});
