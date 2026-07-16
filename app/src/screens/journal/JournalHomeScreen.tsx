/**
 * Guided journaling. A prompt is chosen deterministically from the curated bank
 * (weighted, non-repeating). The user can tag themes, which become pattern
 * events for the tracking engine. Entries are crisis-scanned and encrypted.
 */
import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Screen,
  Title,
  Heading,
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
import type { TabScreenProps } from '../../navigation/types';
import { addJournalEntry, recentQuestionIds } from '../../storage/repositories';
import { selectQuestion } from '../../features/questions/selector';
import type { JournalPrompt } from '../../data/schema';
import { spacing } from '../../theme';

export function JournalHomeScreen({ navigation }: TabScreenProps<'Journal'>) {
  const { content, profile, checkText } = useAppState();
  const [prompt, setPrompt] = useState<JournalPrompt | null>(null);
  const [served, setServed] = useState<string[]>([]);
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const pick = useCallback(
    (recent: string[]) =>
      selectQuestion(content.journalPrompts.prompts, {
        patternTags: profile?.patternTags ?? [],
        recentlyServedIds: recent,
      }) as JournalPrompt | null,
    [content, profile],
  );

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const recent = await recentQuestionIds();
        setServed(recent);
        setPrompt(pick(recent));
      })();
    }, [pick]),
  );

  function another() {
    if (!prompt) return;
    const next = [prompt.id, ...served];
    setServed(next);
    setPrompt(pick(next));
  }

  function toggleTag(id: string) {
    setTags((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function save() {
    checkText(body);
    await addJournalEntry(prompt?.id ?? null, body, tags);
    setSaved(true);
    setBody('');
    setTags([]);
  }

  if (saved) {
    return (
      <Screen>
        <Title>Entry saved</Title>
        <Spacer size={spacing.sm} />
        <Muted>Stored privately on this device.</Muted>
        <Button label="Write another" onPress={() => { setSaved(false); another(); }} />
        <Button label="See past entries" variant="ghost" onPress={() => navigation.navigate('JournalList')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Label>Journal</Label>
      <Title>Write it out</Title>
      <Spacer size={spacing.sm} />
      <Card>
        <Label>Prompt</Label>
        <Spacer size={spacing.xs} />
        {prompt ? <Heading>{prompt.text}</Heading> : <Muted>Loading a prompt…</Muted>}
        <Button label="Different prompt" variant="ghost" onPress={another} />
      </Card>

      <TextArea value={body} onChangeText={setBody} placeholder="No filter needed here." minHeight={160} />

      <Spacer size={spacing.md} />
      <Label>Tag a theme (optional)</Label>
      <Muted>Tagging helps Compass gently notice what keeps coming up.</Muted>
      <Spacer size={spacing.sm} />
      <View style={styles.chips}>
        {content.valuesModel.patternTags.map((t) => (
          <Chip key={t.id} label={t.label} selected={tags.includes(t.id)} onPress={() => toggleTag(t.id)} />
        ))}
      </View>

      <Button label="Save entry" onPress={save} disabled={body.trim().length === 0} />
      <Button label="See past entries" variant="ghost" onPress={() => navigation.navigate('JournalList')} />
      <Spacer size={spacing.sm} />
      <Small>Everything you write stays on this device.</Small>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
});
