import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function HomeScreen() {
  return (
    <SafeAreaView style={styles.container} testID="home-screen">
      <View style={styles.content}>
        <Text style={styles.title}>Carolina Futons</Text>
        <Text style={styles.subtitle}>Hendersonville, NC</Text>
        <Text style={styles.tagline}>Blue Ridge Mountain comfort, delivered.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8D5B7',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#3A2518',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#5C4033',
    marginBottom: 16,
  },
  tagline: {
    fontSize: 16,
    color: '#5B8FA8',
    fontStyle: 'italic',
  },
});
