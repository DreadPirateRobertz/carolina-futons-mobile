import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function ProductDetailScreen() {
  return (
    <View style={styles.container} testID="product-detail-screen">
      <Text style={styles.text}>Product Detail</Text>
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
