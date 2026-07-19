/**
 * Navigation root.
 *
 * Gates the whole app deterministically off the on-device profile:
 *   not ready        -> loading
 *   age/disclaimer   -> GateScreen (must acknowledge)
 *   not onboarded    -> OnboardingScreen (values questionnaire)
 *   otherwise        -> main tabs + detail stack
 */
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAppState } from '../state/AppStateProvider';
import { appConfig } from '../config/appConfig';
import { colors } from '../theme';
import type { MainStackParamList, TabParamList } from './types';

import { GateScreen } from '../screens/gate/GateScreen';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { FlowsListScreen } from '../screens/flows/FlowsListScreen';
import { FlowPlayerScreen } from '../screens/flows/FlowPlayerScreen';
import { ToolkitHomeScreen } from '../screens/toolkit/ToolkitHomeScreen';
import { ThoughtRecordScreen } from '../screens/toolkit/ThoughtRecordScreen';
import { DistortionIdentifierScreen } from '../screens/toolkit/DistortionIdentifierScreen';
import { ValuesClarificationScreen } from '../screens/toolkit/ValuesClarificationScreen';
import { JournalHomeScreen } from '../screens/journal/JournalHomeScreen';
import { JournalListScreen } from '../screens/journal/JournalListScreen';
import { ProgressScreen } from '../screens/patterns/ProgressScreen';
import { QuestsScreen } from '../screens/quests/QuestsScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { LegalDocScreen } from '../screens/settings/LegalDocScreen';

const Stack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabDot({ focused }: { focused: boolean }) {
  return (
    <View
      style={[styles.dot, { backgroundColor: focused ? colors.primary : colors.textFaint }]}
    />
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarIcon: ({ focused }) => <TabDot focused={focused} />,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Coaching" component={FlowsListScreen} />
      <Tab.Screen name="Toolkit" component={ToolkitHomeScreen} />
      <Tab.Screen name="Journal" component={JournalHomeScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
    </Tab.Navigator>
  );
}

function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="FlowPlayer" component={FlowPlayerScreen} options={{ title: 'Coaching' }} />
      <Stack.Screen name="ThoughtRecord" component={ThoughtRecordScreen} options={{ title: 'Thought record' }} />
      <Stack.Screen
        name="DistortionIdentifier"
        component={DistortionIdentifierScreen}
        options={{ title: 'Spot the distortion' }}
      />
      <Stack.Screen
        name="ValuesClarification"
        component={ValuesClarificationScreen}
        options={{ title: 'Values check' }}
      />
      <Stack.Screen name="JournalList" component={JournalListScreen} options={{ title: 'Past entries' }} />
      <Stack.Screen name="Quests" component={QuestsScreen} options={{ title: 'Quests' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="LegalDoc" component={LegalDocScreen} options={{ title: '' }} />
    </Stack.Navigator>
  );
}

export function RootNavigator() {
  const { ready, profile } = useAppState();

  if (!ready || !profile) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const needsDisclaimer = profile.disclaimerAckVersion < appConfig.disclaimerVersion;
  const needsAge = !profile.ageAck;
  if (needsAge || needsDisclaimer) return <GateScreen />;
  if (!profile.onboarded) return <OnboardingScreen />;
  return <MainNavigator />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
