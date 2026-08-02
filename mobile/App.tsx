import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnalyticsProvider } from './src/analytics/AnalyticsProvider';
import { HomeScreen } from './src/screens/HomeScreen';

/**
 * DXP renderer shell.
 *
 * There is no screen composition here on purpose: App mounts providers and one
 * screen, and that screen renders whatever the manifest describes.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <AnalyticsProvider>
        <StatusBar style="auto" />
        <HomeScreen />
      </AnalyticsProvider>
    </SafeAreaProvider>
  );
}
