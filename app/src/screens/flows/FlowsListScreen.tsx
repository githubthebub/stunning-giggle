/**
 * List of coaching flows (curated decision trees). Each opens the flow player.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen, Title, Body, Muted, Small, Card, Label, Spacer } from '../../components/ui';
import { useAppState } from '../../state/AppStateProvider';
import type { TabScreenProps } from '../../navigation/types';
import { spacing } from '../../theme';

export function FlowsListScreen({ navigation }: TabScreenProps<'Coaching'>) {
  const { content } = useAppState();
  return (
    <Screen>
      <Label>Coaching</Label>
      <Title>Pick something to work through</Title>
      <Spacer size={spacing.sm} />
      <Muted>
        Short, honest conversations. Each one branches on your answers and ends with a single small
        step — not a lecture.
      </Muted>
      <Spacer size={spacing.md} />
      {content.flows.map((flow) => (
        <Card key={flow.id} onPress={() => navigation.navigate('FlowPlayer', { flowId: flow.id })}>
          <View style={styles.cardHead}>
            <Body>{flow.title}</Body>
            <Small>{flow.estMinutes} min</Small>
          </View>
          <Muted>{flow.description}</Muted>
        </Card>
      ))}
      {content.flows.length === 0 ? <Muted>No flows are installed yet.</Muted> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
});
