/**
 * Settings: legal docs, crisis resources (reachable anytime), region selection,
 * an honest "about", and full local data erase. No account, nothing to sign out
 * of — because nothing leaves the device.
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
  Divider,
} from '../../components/ui';
import { useAppState } from '../../state/AppStateProvider';
import type { MainStackScreenProps } from '../../navigation/types';
import { appConfig } from '../../config/appConfig';
import { updateSettings } from '../../storage/repositories';
import { wipeAllData } from '../../storage/db';
import { destroyMasterKey } from '../../storage/keys';
import { spacing, colors } from '../../theme';

export function SettingsScreen({ navigation }: MainStackScreenProps<'Settings'>) {
  const { content, profile, reloadProfile, showCrisis } = useAppState();
  const [region, setRegion] = useState<string>(
    (profile?.settings?.crisisRegion as string) ?? content.crisisResources.defaultRegion,
  );
  const [armed, setArmed] = useState(false);

  async function chooseRegion(code: string) {
    setRegion(code);
    await updateSettings({ ...(profile?.settings ?? {}), crisisRegion: code });
  }

  async function eraseEverything() {
    await wipeAllData();
    await destroyMasterKey();
    await reloadProfile();
  }

  return (
    <Screen>
      <Label>Settings</Label>
      <Title>Compass</Title>
      <Spacer size={spacing.md} />

      <Card>
        <Label>If you need support now</Label>
        <Spacer size={spacing.xs} />
        <Muted>Crisis lines and a reminder that reaching out is a strength.</Muted>
        <Button label="Get support resources" onPress={showCrisis} />
      </Card>

      <Heading>Your documents</Heading>
      <Card onPress={() => navigation.navigate('LegalDoc', { doc: 'disclaimer' })}>
        <Body>Disclaimer</Body>
        <Muted>What Compass is and isn't.</Muted>
      </Card>
      <Card onPress={() => navigation.navigate('LegalDoc', { doc: 'privacy' })}>
        <Body>Privacy policy</Body>
        <Muted>Short version: your data stays on this device.</Muted>
      </Card>
      <Card onPress={() => navigation.navigate('LegalDoc', { doc: 'terms' })}>
        <Body>Terms of service</Body>
      </Card>

      <Heading>Crisis-resource region</Heading>
      <Muted>Which region's placeholder crisis lines to show. Editable in the content files.</Muted>
      <Spacer size={spacing.sm} />
      <View style={styles.chips}>
        {content.crisisResources.regions.map((r) => (
          <Chip key={r.code} label={r.label} selected={region === r.code} onPress={() => chooseRegion(r.code)} />
        ))}
      </View>

      <Heading>About</Heading>
      <Card>
        <Body>{appConfig.appName}</Body>
        <Muted>
          A deterministic, on-device self-reflection tool. No AI, no account, no server, no analytics.
          Nothing you write is transmitted anywhere.
        </Muted>
        <Spacer size={spacing.xs} />
        <Small>Minimum age: {appConfig.minimumAge}+ · Content is fully offline and editable.</Small>
      </Card>

      <Heading>Your data</Heading>
      <Card>
        <Body>Erase everything on this device</Body>
        <Muted>
          Permanently deletes every reflection, entry, mood, quest, and answer stored locally. This
          can't be undone — and since nothing is on a server, there's no copy anywhere else.
        </Muted>
        <Divider />
        {armed ? (
          <>
            <Small style={{ color: colors.danger }}>Are you sure? This is permanent.</Small>
            <View style={styles.row}>
              <Button label="Yes, erase it all" onPress={eraseEverything} />
              <Button label="Cancel" variant="ghost" onPress={() => setArmed(false)} />
            </View>
          </>
        ) : (
          <Button label="Erase all my data" variant="secondary" onPress={() => setArmed(true)} />
        )}
      </Card>

      <Spacer size={spacing.sm} />
      <Small>
        The disclaimer, Terms, and Privacy Policy are placeholders pending review by a licensed
        attorney. Compass is not therapy, medical, or mental-health care.
      </Small>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
});
