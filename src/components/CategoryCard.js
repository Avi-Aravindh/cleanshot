import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CATEGORY_ICONS = {
  screenshots: 'camera-outline',
  blurry: 'eye-off-outline',
  duplicates: 'copy-outline',
  old: 'time-outline',
};

const CATEGORY_COLORS = {
  screenshots: '#60A5FA',  // Blue
  blurry: '#F59E0B',       // Amber
  duplicates: '#10B981',    // Green
  old: '#8B5CF6',          // Purple
};

const CategoryCard = ({ title, count, icon, color, space, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon || CATEGORY_ICONS[title] || 'images-outline'} size={28} color={color} />
      </View>
      <Text style={styles.title}>{title.charAt(0).toUpperCase() + title.slice(1)}</Text>
      <Text style={styles.count}>{count} photos</Text>
      {space > 0 && (
        <Text style={styles.space}>{space}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    minWidth: 150,
    minHeight: 130,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  count: {
    fontSize: 14,
    color: '#64748B',
  },
  space: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
    marginTop: 4,
  },
});

export default CategoryCard;
