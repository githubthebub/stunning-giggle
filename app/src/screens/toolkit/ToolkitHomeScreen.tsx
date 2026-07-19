/**
 * Toolkit hub. Links to the CBT-style tools. Framed explicitly as educational
 * self-reflection informed by public cognitive behavioral frameworks — not
 * therapy or care.
 */
import React from 'react';
import { Screen, Title, Body, Muted, Small, Card, Label, Spacer } from '../../components/ui';
import { useAppState } from '../../state/AppStateProvider';
import type { TabScreenProps } from '../../navigation/types';
import { spacing } from '../../theme';

export function ToolkitHomeScreen({ navigation }: TabScreenProps<'Toolkit'>) {
  const { content } = useAppState();
  return (
    <Screen>
      <Label>Toolkit</Label>
      <Title>Work with a thought</Title>
      <Spacer size={spacing.sm} />
      <Muted>
        Structured exercises informed by public cognitive behavioral frameworks. These are for
        self-reflection and learning — they are not therapy or care.
      </Muted>
      <Spacer size={spacing.md} />

      <Card onPress={() => navigation.navigate('ThoughtRecord')}>
        <Body>Thought record</Body>
        <Muted>Walk a stuck thought through evidence and land on a more balanced one.</Muted>
      </Card>

      <Card onPress={() => navigation.navigate('DistortionIdentifier')}>
        <Body>Spot the distortion</Body>
        <Muted>
          Name the thinking trap you're in and get a pre-written reframe to adapt.{' '}
          {content.distortions.distortions.length} common ones included.
        </Muted>
      </Card>

      <Card onPress={() => navigation.navigate('ValuesClarification')}>
        <Body>Values check</Body>
        <Muted>Reconnect a decision to what actually matters to you.</Muted>
      </Card>

      <Spacer size={spacing.sm} />
      <Small>{content.distortions.frameworkNote}</Small>
    </Screen>
  );
}
