import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function ShopScreen() {
  return (
    <View style={styles.container} testID="shop-screen">
      <Text style={styles.title}>Shop</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8D5B7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3A2518',
  },
});
