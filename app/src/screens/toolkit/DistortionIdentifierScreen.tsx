/**
 * Cognitive-distortion identifier.
 *
 * The user writes the thought, selects which distortion(s) apply, and the app
 * shows the pre-written reframe template + prompts + public-source citation for
 * each. All content is curated (see distortions.json) — nothing is generated.
 * The thought text is crisis-scanned.
 */
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
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
  TextArea,
  Divider,
} from '../../components/ui';
import { useAppState } from '../../state/AppStateProvider';
import type { MainStackScreenProps } from '../../navigation/types';
import { addThoughtRecord } from '../../storage/repositories';
import { spacing } from '../../theme';

export function DistortionIdentifierScreen({ navigation }: MainStackScreenProps<'DistortionIdentifier'>) {
  const { content, checkText } = useAppState();
  const distortions = content.distortions.distortions;
  const [thought, setThought] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const selectedDistortions = distortions.filter((d) => selected.includes(d.id));

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function save() {
    checkText(thought);
    const reframe = selectedDistortions.map((d) => d.reframeTemplate).join('\n\n');
    await addThoughtRecord({
      situation: '',
      automaticThought: thought,
      evidenceFor: '',
      evidenceAgainst: '',
      distortions: selected,
      reframe,
      outcome: '',
    });
    setSaved(true);
  }

  return (
    <Screen>
      <Label>Spot the distortion</Label>
      <Title>What's the thought?</Title>
      <Spacer size={spacing.sm} />
      <Muted>Write it as it actually sounds in your head — blunt is fine.</Muted>
      <Spacer size={spacing.sm} />
      <TextArea
        value={thought}
        onChangeText={setThought}
        placeholder="e.g. I always mess these things up."
        minHeight={90}
      />

      <Spacer size={spacing.md} />
      <Heading>Which traps are in there?</Heading>
      <Muted>Pick any that fit. You'll get a reframe for each.</Muted>
      <Spacer size={spacing.sm} />
      <View style={styles.chips}>
        {distortions.map((d) => (
          <Chip key={d.id} label={d.name} selected={selected.includes(d.id)} onPress={() => toggle(d.id)} />
        ))}
      </View>

      {selectedDistortions.map((d) => (
        <Card key={d.id}>
          <Body>{d.name}</Body>
          <Muted>{d.description}</Muted>
          <Small>Example: {d.example}</Small>
          <Divider />
          <Label>Try reframing</Label>
          <Spacer size={spacing.xs} />
          {d.reframePrompts.map((p, i) => (
            <Muted key={i}>• {p}</Muted>
          ))}
          <Spacer size={spacing.sm} />
          <Body style={{ fontStyle: 'italic' }}>{d.reframeTemplate}</Body>
          <Spacer size={spacing.xs} />
          <Small>Source: {d.citation}</Small>
        </Card>
      ))}

      {selected.length > 0 && thought.trim().length > 0 ? (
        saved ? (
          <Card>
            <Body>Saved.</Body>
            <Muted>Kept on this device, in your thought records.</Muted>
            <Button label="Done" onPress={() => navigation.goBack()} />
          </Card>
        ) : (
          <Button label="Save this" onPress={save} />
        )
      ) : null}

      <Spacer size={spacing.sm} />
      <Small>This is a self-reflection exercise, not a diagnosis of any condition.</Small>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
});
