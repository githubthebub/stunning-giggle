/**
 * Values-clarification exercise. Reconnects the user to what matters, then asks
 * one honest question about where they're living it out and where they're not.
 * Saved as a journal entry (encrypted, on-device). Reflection is crisis-scanned.
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
  Card,
  Button,
  Chip,
  Label,
  Spacer,
  TextArea,
} from '../../components/ui';
import { useAppState } from '../../state/AppStateProvider';
import type { MainStackScreenProps } from '../../navigation/types';
import { addJournalEntry } from '../../storage/repositories';
import { spacing } from '../../theme';

const MAX = 3;

export function ValuesClarificationScreen({ navigation }: MainStackScreenProps<'ValuesClarification'>) {
  const { content, profile, checkText } = useAppState();
  const dims = content.valuesModel.valueDimensions;
  const [selected, setSelected] = useState<string[]>(profile?.valuesProfile?.topValues?.slice(0, MAX) ?? []);
  const [reflection, setReflection] = useState('');
  const [saved, setSaved] = useState(false);

  const selectedDefs = useMemo(() => dims.filter((d) => selected.includes(d.id)), [dims, selected]);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX) return prev;
      return [...prev, id];
    });
  }

  async function save() {
    const header = selectedDefs.map((d) => d.label).join(', ');
    checkText(reflection);
    await addJournalEntry('values-clarification', `Values: ${header}\n\n${reflection}`, []);
    setSaved(true);
  }

  if (saved) {
    return (
      <Screen>
        <Title>Saved to your journal</Title>
        <Spacer size={spacing.sm} />
        <Muted>Values drift quietly. Naming them out loud is how you catch it early.</Muted>
        <Button label="Done" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Label>Values check</Label>
      <Title>What actually matters here?</Title>
      <Spacer size={spacing.sm} />
      <Muted>Pick up to {MAX} that feel most alive for you right now.</Muted>
      <Spacer size={spacing.md} />
      <View style={styles.chips}>
        {dims.map((d) => (
          <Chip key={d.id} label={d.label} selected={selected.includes(d.id)} onPress={() => toggle(d.id)} />
        ))}
      </View>

      {selectedDefs.length > 0 ? (
        <>
          <Card>
            {selectedDefs.map((d) => (
              <View key={d.id} style={{ marginBottom: spacing.sm }}>
                <Body>{d.label}</Body>
                <Muted>{d.description}</Muted>
              </View>
            ))}
          </Card>
          <Heading>Where are you honoring these — and where aren't you?</Heading>
          <Muted>Be specific. Vague honesty isn't honesty.</Muted>
          <Spacer size={spacing.sm} />
          <TextArea value={reflection} onChangeText={setReflection} placeholder="This week, I…" />
          <Button label="Save" onPress={save} disabled={reflection.trim().length === 0} />
        </>
      ) : null}
      <Spacer size={spacing.sm} />
      <Small>Private to this device.</Small>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
});
