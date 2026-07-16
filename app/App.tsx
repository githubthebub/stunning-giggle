import 'react-native-gesture-handler';
import React from 'react';
import { Modal, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, type Theme as NavTheme } from '@react-navigation/native';

import { AppStateProvider, useAppState } from './src/state/AppStateProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { CrisisScreen } from './src/screens/crisis/CrisisScreen';
import { colors } from './src/theme';

const navTheme: NavTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};

/**
 * The crisis overlay lives above the navigator so it can appear over any screen
 * the moment the on-device scan matches, or when opened from Settings.
 */
function AppShell() {
  const { crisisVisible, dismissCrisis } = useAppState();
  return (
    <>
      <NavigationContainer theme={navTheme}>
        <RootNavigator />
      </NavigationContainer>
      <Modal
        visible={crisisVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={dismissCrisis}
      >
        <CrisisScreen />
      </Modal>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <AppStateProvider>
        <AppShell />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
