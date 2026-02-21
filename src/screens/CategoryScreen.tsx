import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function CategoryScreen() {
  return (
    <View style={styles.container} testID="category-listing-screen">
      <Text style={styles.text}>Category</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8D5B7',
  },
  text: {
    fontSize: 24,
    color: '#3A2518',
  },
});
