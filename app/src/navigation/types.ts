import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

export type MainStackParamList = {
  Tabs: undefined;
  FlowPlayer: { flowId: string };
  ThoughtRecord: undefined;
  DistortionIdentifier: undefined;
  ValuesClarification: undefined;
  JournalList: undefined;
  Quests: undefined;
  Settings: undefined;
  LegalDoc: { doc: 'disclaimer' | 'terms' | 'privacy' };
};

export type TabParamList = {
  Home: undefined;
  Coaching: undefined;
  Toolkit: undefined;
  Journal: undefined;
  Progress: undefined;
};

export type MainStackScreenProps<T extends keyof MainStackParamList> = NativeStackScreenProps<
  MainStackParamList,
  T
>;

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<MainStackParamList>
>;
