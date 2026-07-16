/**
 * CBT-style thought record. Structured fields walk a thought from the trigger
 * situation through evidence to a more balanced thought and outcome. Distortions
 * can be tagged (each shows its curated reframe template as a writing aid). All
 * free-text is crisis-scanned on save and encrypted at rest.
 */
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Screen,
  Title,
  Body,
  Muted,
  Small,
  Card,
  Button,
  Chip,
  Label,
  Spacer,
  TextArea,
} from '../../components/ui';
import { useAppState } from '../../state/AppStateProvider';
import type { MainStackScreenProps } from '../../navigation/types';
import { addThoughtRecord } from '../../storage/repositories';
import { spacing } from '../../theme';

function Field({
  label,
  hint,
  value,
  onChangeText,
}: {
  label: string;
  hint?: string;
  value: string;
  onChangeText: (t: string) => void;
}) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Label>{label}</Label>
      {hint ? <Muted>{hint}</Muted> : null}
      <Spacer size={spacing.xs} />
      <TextArea value={value} onChangeText={onChangeText} minHeight={80} />
    </View>
  );
}

export function ThoughtRecordScreen({ navigation }: MainStackScreenProps<'ThoughtRecord'>) {
  const { content, checkText } = useAppState();
  const [situation, setSituation] = useState('');
  const [automaticThought, setAutomaticThought] = useState('');
  const [evidenceFor, setEvidenceFor] = useState('');
  const [evidenceAgainst, setEvidenceAgainst] = useState('');
  const [distortions, setDistortions] = useState<string[]>([]);
  const [reframe, setReframe] = useState('');
  const [outcome, setOutcome] = useState('');
  const [saved, setSaved] = useState(false);

  const selectedDistortions = content.distortions.distortions.filter((d) =>
    distortions.includes(d.id),
  );

  function toggle(id: string) {
    setDistortions((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function save() {
    checkText([situation, automaticThought, evidenceFor, evidenceAgainst, reframe, outcome].join(' '));
    await addThoughtRecord({
      situation,
      automaticThought,
      evidenceFor,
      evidenceAgainst,
      distortions,
      reframe,
      outcome,
    });
    setSaved(true);
  }

  if (saved) {
    return (
      <Screen>
        <Title>Saved</Title>
        <Spacer size={spacing.sm} />
        <Muted>Kept privately on this device. Coming back to it later is where the shift happens.</Muted>
        <Button label="Done" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Label>Thought record</Label>
      <Title>Slow the thought down</Title>
      <Spacer size={spacing.md} />

      <Field label="Situation" hint="What happened, factually?" value={situation} onChangeText={setSituation} />
      <Field
        label="Automatic thought"
        hint="What went through your mind? What did it mean to you?"
        value={automaticThought}
        onChangeText={setAutomaticThought}
      />

      <Label>Any thinking traps?</Label>
      <Muted>Optional. Tagging one shows a reframe you can borrow.</Muted>
      <Spacer size={spacing.sm} />
      <View style={styles.chips}>
        {content.distortions.distortions.map((d) => (
          <Chip key={d.id} label={d.name} selected={distortions.includes(d.id)} onPress={() => toggle(d.id)} />
        ))}
      </View>
      {selectedDistortions.map((d) => (
        <Card key={d.id}>
          <Small>{d.name}</Small>
          <Body style={{ fontStyle: 'italic' }}>{d.reframeTemplate}</Body>
        </Card>
      ))}
      <Spacer size={spacing.sm} />

      <Field
        label="Evidence it's true"
        hint="Be fair — what genuinely supports the thought?"
        value={evidenceFor}
        onChangeText={setEvidenceFor}
      />
      <Field
        label="Evidence against"
        hint="What would you tell a friend who said this?"
        value={evidenceAgainst}
        onChangeText={setEvidenceAgainst}
      />
      <Field
        label="A more balanced thought"
        hint="Not fake-positive — just truer and fairer."
        value={reframe}
        onChangeText={setReframe}
      />
      <Field
        label="What now?"
        hint="One small thing you can do or feel differently."
        value={outcome}
        onChangeText={setOutcome}
      />

      <Button label="Save" onPress={save} disabled={automaticThought.trim().length === 0} />
      <Spacer size={spacing.sm} />
      <Small>Self-reflection exercise, not a diagnosis or care.</Small>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
});
