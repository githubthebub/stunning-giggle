/**
 * Crisis screen.
 *
 * Shown immediately when the on-device keyword scan matches free text, and also
 * reachable from Settings. It is intentionally calm and NON-CLINICAL: it does
 * not counsel, assess, or diagnose. It surfaces configurable crisis-line info
 * (crisisResources.json) and encourages contacting a professional or trusted
 * person. Resources are placeholders to be localised before release.
 */
import React from 'react';
import { View, StyleSheet, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { Title, Body, Muted, Small, Button, Spacer, Label } from '../../components/ui';
import { useAppState } from '../../state/AppStateProvider';
import { colors, spacing, radius } from '../../theme';
import type { CrisisRegion } from '../../data/schema';

function resolveRegion(regions: CrisisRegion[], preferred: string, fallback: string): CrisisRegion | undefined {
  return (
    regions.find((r) => r.code === preferred) ??
    regions.find((r) => r.code === fallback) ??
    regions[0]
  );
}

export function CrisisScreen() {
  const { content, profile, dismissCrisis } = useAppState();
  const resources = content.crisisResources;
  const preferred = (profile?.settings?.crisisRegion as string) ?? resources.defaultRegion;
  const region = resolveRegion(resources.regions, preferred, resources.defaultRegion);

  function open(url: string) {
    Linking.openURL(url).catch(() => {});
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Label>You're not alone in this</Label>
        <Spacer size={spacing.sm} />
        <Title>It sounds like things are really heavy right now.</Title>
        <Spacer size={spacing.md} />
        <Body>{resources.globalNote}</Body>
        <Spacer size={spacing.md} />
        <Muted>
          Compass isn't the right tool for this moment, and that's okay. Please consider reaching out
          to one of the lines below, a mental-health professional, or someone you trust. You deserve
          real support from a real person.
        </Muted>

        <Spacer size={spacing.lg} />
        {region ? (
          <View>
            <Label>{region.label}</Label>
            <Spacer size={spacing.sm} />
            {region.lines.map((line, i) => (
              <View key={i} style={styles.line}>
                <Body>{line.name}</Body>
                {line.hours ? <Small>{line.hours}</Small> : null}
                <Spacer size={spacing.xs} />
                <View style={styles.lineActions}>
                  {line.number ? (
                    <Pressable style={styles.callBtn} onPress={() => open(`tel:${line.number}`)}>
                      <Body>Call {line.number}</Body>
                    </Pressable>
                  ) : null}
                  {line.sms ? (
                    <Pressable style={styles.callBtn} onPress={() => open(`sms:${line.sms}`)}>
                      <Body>Text {line.sms}</Body>
                    </Pressable>
                  ) : null}
                  {line.url ? (
                    <Pressable style={styles.callBtn} onPress={() => open(line.url as string)}>
                      <Body>Open</Body>
                    </Pressable>
                  ) : null}
                </View>
                {line.note ? <Small>{line.note}</Small> : null}
              </View>
            ))}
          </View>
        ) : (
          <Muted>Crisis resources haven't been configured yet.</Muted>
        )}

        <Spacer size={spacing.lg} />
        <Button label="Okay — close this" variant="secondary" onPress={dismissCrisis} />
        <Spacer size={spacing.sm} />
        <Small>
          If you are in immediate danger, contact your local emergency number now. These resources
          are placeholders until localised for your region.
        </Small>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.crisisBg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  line: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  lineActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  callBtn: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
});
