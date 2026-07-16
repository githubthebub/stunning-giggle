/**
 * Onboarding: a structured values-and-patterns questionnaire that maps the user
 * onto a values profile + pattern tags via the deterministic scoring engine
 * (features/onboarding/scoring.ts). No free text here, so no crisis scan needed.
 */
import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Screen,
  Title,
  Heading,
  Body,
  Muted,
  Small,
  Button,
  Card,
  Chip,
  Spacer,
  Label,
} from '../../components/ui';
import { useAppState } from '../../state/AppStateProvider';
import { scoreValues, type ValuesAnswers } from '../../features/onboarding/scoring';
import { completeOnboarding, saveAssessment } from '../../storage/repositories';
import { spacing } from '../../theme';

type Phase = 'intro' | 'questions' | 'result';

export function OnboardingScreen() {
  const { content, reloadProfile } = useAppState();
  const model = content.valuesModel;
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<ValuesAnswers>({});
  const [busy, setBusy] = useState(false);

  const valueLabels = useMemo(
    () => Object.fromEntries(model.valueDimensions.map((d) => [d.id, d.label])),
    [model],
  );
  const patternDefs = useMemo(
    () => Object.fromEntries(model.patternTags.map((t) => [t.id, t])),
    [model],
  );

  const profile = useMemo(() => scoreValues(model, answers), [model, answers]);
  const question = model.questions[index];
  const selected = question ? answers[question.id] ?? [] : [];

  function toggle(optionId: string) {
    if (!question) return;
    setAnswers((prev) => {
      const cur = prev[question.id] ?? [];
      if (question.type === 'multi') {
        const next = cur.includes(optionId)
          ? cur.filter((o) => o !== optionId)
          : [...cur, optionId];
        return { ...prev, [question.id]: next };
      }
      return { ...prev, [question.id]: [optionId] };
    });
  }

  async function finish() {
    setBusy(true);
    await saveAssessment(answers, profile);
    await completeOnboarding(profile, profile.flaggedPatterns);
    await reloadProfile();
    setBusy(false);
  }

  if (phase === 'intro') {
    return (
      <Screen>
        <Title>Let's find your bearings</Title>
        <Spacer size={spacing.md} />
        <Body>
          A few questions to get to what actually matters to you and the patterns that tend to get in
          your way. There are no right answers, and nothing here is shared anywhere — it stays on
          your device.
        </Body>
        <Spacer size={spacing.md} />
        <Muted>Takes about three minutes. Answer honestly; that's where the value is.</Muted>
        <Spacer size={spacing.lg} />
        <Button label="Begin" onPress={() => setPhase('questions')} />
      </Screen>
    );
  }

  if (phase === 'result') {
    return (
      <Screen>
        <Label>Your bearings</Label>
        <Spacer size={spacing.sm} />
        <Title>What matters to you</Title>
        <Spacer size={spacing.md} />
        <Card>
          <Heading>Your top values</Heading>
          {profile.topValues.length ? (
            <View style={styles.chips}>
              {profile.topValues.map((id) => (
                <Chip key={id} label={valueLabels[id] ?? id} selected />
              ))}
            </View>
          ) : (
            <Muted>We'll learn these as you use the app.</Muted>
          )}
        </Card>
        <Card>
          <Heading>Patterns worth watching</Heading>
          {profile.flaggedPatterns.length ? (
            profile.flaggedPatterns.map((id) => {
              const def = patternDefs[id];
              return (
                <View key={id} style={styles.patternRow}>
                  <Body>{def?.label ?? id}</Body>
                  {def?.supportiveNote ? <Muted>{def.supportiveNote}</Muted> : null}
                </View>
              );
            })
          ) : (
            <Muted>
              Nothing jumped out yet. That's fine — patterns show up over time, and Compass will
              gently point them out when they do.
            </Muted>
          )}
        </Card>
        <Small>
          These are starting points, not labels. You can revisit this anytime, and none of it is a
          diagnosis.
        </Small>
        <Button label="Go to Compass" onPress={finish} disabled={busy} />
      </Screen>
    );
  }

  // questions
  const isLast = index === model.questions.length - 1;
  return (
    <Screen>
      <Label>
        Question {index + 1} of {model.questions.length}
      </Label>
      <Spacer size={spacing.sm} />
      <Heading>{question.prompt}</Heading>
      {question.helpText ? <Muted>{question.helpText}</Muted> : null}
      {question.type === 'multi' ? <Small>Choose any that fit.</Small> : null}
      <Spacer size={spacing.md} />
      <View>
        {question.options.map((opt) => (
          <Chip
            key={opt.id}
            label={opt.label}
            selected={selected.includes(opt.id)}
            onPress={() => toggle(opt.id)}
          />
        ))}
      </View>
      <Spacer size={spacing.lg} />
      <View style={styles.nav}>
        {index > 0 ? (
          <Button label="Back" variant="ghost" onPress={() => setIndex((i) => i - 1)} />
        ) : (
          <View />
        )}
        <Button
          label={isLast ? 'See results' : 'Next'}
          onPress={() => (isLast ? setPhase('result') : setIndex((i) => i + 1))}
          disabled={selected.length === 0}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm },
  patternRow: { marginBottom: spacing.md },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
