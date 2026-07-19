/**
 * Coaching-flow player. Interprets a curated decision tree via the pure flow
 * engine (features/flows/engine.ts). Reflection free-text is crisis-scanned. On
 * completion it persists the session and the action, and offers to turn the
 * action into a quest.
 */
import React, { useMemo, useRef, useState, useEffect } from 'react';
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
import {
  startFlow,
  advance,
  getNode,
  collectedPatternTags,
  type FlowSessionState,
} from '../../features/flows/engine';
import { addActiveQuest, saveFlowSession } from '../../storage/repositories';
import { nowIso } from '../../storage/db';
import { spacing } from '../../theme';

export function FlowPlayerScreen({ route, navigation }: MainStackScreenProps<'FlowPlayer'>) {
  const { content, checkText } = useAppState();
  const flow = useMemo(
    () => content.flows.find((f) => f.id === route.params.flowId),
    [content, route.params.flowId],
  );

  const startedAt = useRef(nowIso());
  const [session, setSession] = useState<FlowSessionState | null>(() =>
    flow ? startFlow(flow) : null,
  );
  const [reflection, setReflection] = useState('');
  const [questAdded, setQuestAdded] = useState(false);
  const savedRef = useRef(false);

  useEffect(() => {
    if (!flow || !session || !session.finished || savedRef.current) return;
    savedRef.current = true;
    saveFlowSession({
      flowId: flow.id,
      startedAt: startedAt.current,
      path: session.history,
      collectedTags: collectedPatternTags(session),
      actionTitle: session.action?.title ?? null,
      actionDescription: session.action?.description ?? null,
    });
  }, [flow, session]);

  if (!flow || !session) {
    return (
      <Screen>
        <Title>Flow not found</Title>
        <Muted>This coaching flow isn't installed.</Muted>
        <Button label="Back" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  const node = getNode(flow, session.currentNodeId);

  if (session.finished && session.action) {
    const action = session.action;
    return (
      <Screen>
        <Label>Your next step</Label>
        <Spacer size={spacing.sm} />
        <Title>{action.title}</Title>
        <Spacer size={spacing.sm} />
        <Card>
          <Body>{action.description}</Body>
        </Card>
        <Muted>
          One small step beats a perfect plan you never start. You don't have to do it perfectly —
          just start.
        </Muted>
        <Spacer size={spacing.md} />
        {questAdded ? (
          <Card>
            <Body>Added to your quests.</Body>
            <Muted>You'll find it under Progress → Quests, whenever you're ready.</Muted>
          </Card>
        ) : (
          <Button
            label="Add this as a quest"
            onPress={async () => {
              await addActiveQuest({
                questId: null,
                title: action.title,
                description: action.description,
                cadence: 'once',
                custom: true,
              });
              setQuestAdded(true);
            }}
          />
        )}
        <Button label="Done" variant="secondary" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  if (!node) {
    return (
      <Screen>
        <Title>{flow.title}</Title>
        <Muted>This conversation reached an unexpected end.</Muted>
        <Button label="Back" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Label>{flow.title}</Label>
      <Spacer size={spacing.md} />

      {node.type === 'reframe' ? (
        <Card>
          <Label>Consider this</Label>
          <Spacer size={spacing.xs} />
          <Heading>{node.text}</Heading>
        </Card>
      ) : (
        <Heading>{node.text}</Heading>
      )}

      <Spacer size={spacing.md} />

      {node.type === 'choice' ? (
        <View>
          {(node.options ?? []).map((opt) => (
            <Button
              key={opt.id}
              label={opt.label}
              variant="secondary"
              onPress={() => setSession(advance(flow, session, { kind: 'choice', optionId: opt.id }))}
            />
          ))}
        </View>
      ) : null}

      {node.type === 'reflection' ? (
        <View>
          <TextArea
            value={reflection}
            onChangeText={setReflection}
            placeholder={node.capture?.placeholder ?? 'Take your time…'}
          />
          <Small>Private to this device.</Small>
          <Button
            label="Continue"
            onPress={() => {
              checkText(reflection);
              setSession(advance(flow, session, { kind: 'reflection', text: reflection }));
              setReflection('');
            }}
          />
        </View>
      ) : null}

      {node.type === 'prompt' || node.type === 'reframe' ? (
        <Button label="Continue" onPress={() => setSession(advance(flow, session, { kind: 'next' }))} />
      ) : null}

      <Spacer size={spacing.md} />
      <View style={styles.tags}>
        {collectedPatternTags(session).map((tag) => (
          <Chip key={tag} label={tag.replace(/_/g, ' ')} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tags: { flexDirection: 'row', flexWrap: 'wrap' },
});
