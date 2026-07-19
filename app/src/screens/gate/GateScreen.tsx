/**
 * First-launch gate. The user cannot reach the app until they:
 *   1. read and acknowledge the disclaimer (this is a self-reflection tool, not
 *      therapy or care), and
 *   2. confirm they meet the minimum age (configurable via appConfig.minimumAge).
 *
 * Both acknowledgements are versioned and stored on-device; bumping a version in
 * appConfig re-shows the relevant step on next launch.
 */
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen, Title, Body, Muted, Button, Card, Spacer, Small } from '../../components/ui';
import { Markdown } from '../../components/Markdown';
import { appConfig } from '../../config/appConfig';
import { disclaimerMarkdown } from '../../data/content/registry';
import {
  acknowledgeDisclaimer,
  acknowledgeLegal,
  confirmAge,
} from '../../storage/repositories';
import { useAppState } from '../../state/AppStateProvider';
import { colors, spacing } from '../../theme';

export function GateScreen() {
  const { profile, reloadProfile } = useAppState();
  const needsDisclaimer = (profile?.disclaimerAckVersion ?? 0) < appConfig.disclaimerVersion;
  const [step, setStep] = useState<'disclaimer' | 'age'>(needsDisclaimer ? 'disclaimer' : 'age');
  const [busy, setBusy] = useState(false);

  async function acceptDisclaimer() {
    setBusy(true);
    await acknowledgeDisclaimer(appConfig.disclaimerVersion);
    await acknowledgeLegal(appConfig.termsVersion, appConfig.privacyVersion);
    setBusy(false);
    setStep('age');
  }

  async function confirmAgeStep() {
    setBusy(true);
    await confirmAge();
    await reloadProfile();
    setBusy(false);
  }

  if (step === 'disclaimer') {
    return (
      <Screen>
        <Title>Before you start</Title>
        <Spacer size={spacing.sm} />
        <Card>
          <Markdown source={disclaimerMarkdown} />
        </Card>
        <Small>
          You can reopen this anytime from Settings. By continuing you acknowledge you have read it.
        </Small>
        <Button label="I understand — continue" onPress={acceptDisclaimer} disabled={busy} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>One quick check</Title>
      <Spacer size={spacing.md} />
      <Card>
        <Body>Compass is intended for adults.</Body>
        <Spacer size={spacing.sm} />
        <Muted>
          Please confirm you are {appConfig.minimumAge} or older. This app is a self-reflection and
          coaching tool — it is not a substitute for professional support.
        </Muted>
      </Card>
      <View style={styles.actions}>
        <Button
          label={`I am ${appConfig.minimumAge} or older`}
          onPress={confirmAgeStep}
          disabled={busy}
        />
        <Spacer size={spacing.xs} />
        <Small>
          If you are under {appConfig.minimumAge}, please close the app and consider talking with a
          trusted adult or a mental-health professional.
        </Small>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { marginTop: spacing.md },
});
