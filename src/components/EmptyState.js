import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const EmptyState = ({ message }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    fontSize: 18,
    color: '#6B7280', // Gray color
    textAlign: 'center',
  },
});

export default EmptyState;
