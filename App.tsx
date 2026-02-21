import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={styles.container} testID="app-root">
        <Text style={styles.heading}>Carolina Futons</Text>
        <Text style={styles.subheading}>Hendersonville, NC</Text>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8D5B7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3A2518',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 16,
    color: '#5C4033',
  },
});
