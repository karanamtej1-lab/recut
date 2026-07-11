import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import DiscoverScreen from './src/screens/DiscoverScreen';
import TemplateDetailScreen from './src/screens/TemplateDetailScreen';
import HomeScreen from './src/screens/HomeScreen';
import ImportScreen from './src/screens/ImportScreen';
import TemplateScreen from './src/screens/TemplateScreen';
import ClipEditorScreen from './src/screens/ClipEditorScreen';
import AudioScreen from './src/screens/AudioScreen';
import ExportScreen from './src/screens/ExportScreen';

const Stack = createStackNavigator();

const darkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#0D0D0D',
    card: '#0D0D0D',
    border: 'transparent',
    text: '#fff',
    primary: '#FF3B5C',
  },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0D0D0D' }}>
      <StatusBar style="light" />
      <NavigationContainer theme={darkTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Discover" component={DiscoverScreen} />
          <Stack.Screen name="TemplateDetail" component={TemplateDetailScreen} />
          <Stack.Screen name="Projects" component={HomeScreen} />
          <Stack.Screen name="Import" component={ImportScreen} />
          <Stack.Screen name="Template" component={TemplateScreen} />
          <Stack.Screen name="ClipEditor" component={ClipEditorScreen} />
          <Stack.Screen name="Audio" component={AudioScreen} />
          <Stack.Screen name="Export" component={ExportScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
