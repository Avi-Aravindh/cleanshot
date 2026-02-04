import React, { useState } from 'react';
import { View, FlatList, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');
const numColumns = 3;
const itemSize = width / numColumns;

const PhotoGrid = ({ photos, onSelectPhoto, selectedPhotos }) => {
  const renderItem = ({ item }) => {
    const isSelected = selectedPhotos.includes(item.uri);
    return (
      <TouchableOpacity 
        style={styles.itemContainer}
        onPress={() => onSelectPhoto(item.uri)}
      >
        <Image
          source={{ uri: item.uri }}
          style={styles.image}
          contentFit="cover"
          transition={1000}
        />
        {isSelected && <View style={styles.selectedOverlay} />}
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={photos}
      renderItem={renderItem}
      keyExtractor={(item) => item.uri}
      numColumns={numColumns}
      contentContainerStyle={styles.gridContainer}
    />
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    // paddingVertical: 10,
  },
  itemContainer: {
    width: itemSize,
    height: itemSize,
    padding: 2,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: getComputedStyle,
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16, 185, 129, 0.5)', // Emerald green with transparency
    borderColor: '#10B981',
    borderWidth: 3,
    borderRadius: 8,
  },
});

export default PhotoGrid;
