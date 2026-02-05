import * as React from 'react';
import { useColorScheme } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './src/screens/HomeScreen';
import CategoryScreen from './src/screens/CategoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import useStore from './src/store';

const Stack = createStackNavigator();

const CleanShotLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#10B981',
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#1E293B',
    border: '#E2E8F0',
  },
};

const CleanShotDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#10B981',
    background: '#0F172A',
    card: '#1E293B',
    text: '#F8FAFC',
    border: '#334155',
  },
};

export default function App() {
  const systemColorScheme = useColorScheme();
  const { settings } = useStore();

  // Determine theme based on user preference or system
  const getTheme = () => {
    if (settings.darkMode === 'auto') {
      return systemColorScheme === 'dark' ? CleanShotDarkTheme : CleanShotLightTheme;
    }
    return settings.darkMode === 'dark' ? CleanShotDarkTheme : CleanShotLightTheme;
  };

  return (
    <NavigationContainer theme={getTheme()}>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Category" component={CategoryScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
