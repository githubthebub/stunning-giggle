/**
 * Past journal entries (read-only list). Decrypted on read from the on-device
 * store; never leaves the device.
 */
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Screen, Title, Body, Muted, Small, Card, Label, Spacer } from '../../components/ui';
import type { MainStackScreenProps } from '../../navigation/types';
import { listJournalEntries, type JournalEntry } from '../../storage/repositories';
import { spacing } from '../../theme';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function JournalListScreen(_: MainStackScreenProps<'JournalList'>) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => setEntries(await listJournalEntries()))();
    }, []),
  );

  return (
    <Screen>
      <Label>Journal</Label>
      <Title>Past entries</Title>
      <Spacer size={spacing.md} />
      {entries.length === 0 ? (
        <Muted>Nothing here yet. Your entries will show up as you write them.</Muted>
      ) : (
        entries.map((e) => (
          <Card key={e.id}>
            <Small>{formatDate(e.createdAt)}</Small>
            <Spacer size={spacing.xs} />
            <Body>{e.body || '(empty)'}</Body>
            {e.tags.length ? (
              <>
                <Spacer size={spacing.xs} />
                <Small>Themes: {e.tags.join(', ')}</Small>
              </>
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}
