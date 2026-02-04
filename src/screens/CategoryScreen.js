import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { deletePhotos } from '../utils/photoScanner';
import useStore from '../store';
import { formatBytes } from '../utils/photoScanner';

const CategoryScreen = ({ route, navigation }) => {
  const type = route?.params?.type || 'screenshots';
  const { scanResults, addCleanupRecord, setScanResults } = useStore();
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);

  const categoryNames = {
    screenshots: 'Screenshots',
    blurry: 'Blurry Photos',
    duplicates: 'Duplicates',
    old: 'Old Photos',
  };

  // Refresh photos when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('CategoryScreen focused, type:', type);
      console.log('scanResults.details:', JSON.stringify(scanResults.details, null, 2));
      
      if (scanResults.details && scanResults.details[type]) {
        console.log('Found', scanResults.details[type].length, 'photos for', type);
        // Update state directly instead of using separate photos state
      } else {
        console.log('No photos found for', type);
      }
      
      // Reset selection when screen focuses
      setSelectedPhotos([]);
      setIsSelecting(false);
    }, [type, scanResults])
  );

  // Get photos directly from store (no local state)
  const photos = (scanResults.details && scanResults.details[type]) || [];

  useEffect(() => {
    navigation.setOptions({
      title: categoryNames[type] || 'Category',
      headerRight: () => (
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => setIsSelecting(!isSelecting)}
          disabled={photos.length === 0}
        >
          <Text style={[styles.headerButtonText, photos.length === 0 && styles.headerButtonDisabled]}>
            {isSelecting ? 'Done' : 'Select'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [type, photos.length, isSelecting, navigation]);

  const togglePhoto = (photo) => {
    if (selectedPhotos.includes(photo.id)) {
      setSelectedPhotos(selectedPhotos.filter(id => id !== photo.id));
    } else {
      setSelectedPhotos([...selectedPhotos, photo.id]);
    }
  };

  const handleDelete = async () => {
    if (selectedPhotos.length === 0) return;

    Alert.alert(
      'Delete Photos',
      `Delete ${selectedPhotos.length} photos?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const photosToDelete = photos.filter(p => selectedPhotos.includes(p.id));
              await deletePhotos(photosToDelete);
              
              // Update store
              const newDetails = { ...scanResults.details };
              newDetails[type] = photos.filter(p => !selectedPhotos.includes(p.id));
              
              const deletedCount = selectedPhotos.length;
              
              setScanResults({
                ...scanResults,
                [type]: newDetails[type].length,
                details: newDetails,
              });

              // Add to history
              addCleanupRecord({
                date: new Date().toISOString(),
                type,
                count: deletedCount,
                space: deletedCount * 1024 * 500, // Rough estimate
              });

              setSelectedPhotos([]);
              setIsSelecting(false);
              
              Alert.alert('Success', `${deletedCount} photos deleted!`);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete photos');
            }
          }
        }
      ]
    );
  };

  const renderPhoto = ({ item }) => {
    const isSelected = selectedPhotos.includes(item.id);
    return (
      <TouchableOpacity 
        style={styles.photoItem} 
        onPress={() => isSelecting ? togglePhoto(item) : null}
        onLongPress={() => {
          setIsSelecting(true);
          togglePhoto(item);
        }}
      >
        <Image 
          source={{ uri: item.uri }} 
          style={styles.photo}
          resizeMode="cover"
        />
        {isSelecting && (
          <View style={[styles.selectOverlay, isSelected && styles.selectOverlayActive]}>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={32} color="#10B981" />
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Selection Bar */}
      {isSelecting && selectedPhotos.length > 0 && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionCount}>{selectedPhotos.length} selected</Text>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Photos Grid */}
      {photos.length > 0 ? (
        <FlatList
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.photoGrid}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyText}>No photos in this category</Text>
          <Text style={styles.emptySubtext}>Run a scan to find clutter</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerButtonText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
  headerButtonDisabled: {
    color: '#CBD5E1',
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  selectionCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 6,
  },
  photoGrid: {
    padding: 4,
  },
  photoItem: {
    flex: 1/3,
    aspectRatio: 1,
    padding: 2,
  },
  photo: {
    flex: 1,
    borderRadius: 8,
  },
  selectOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectOverlayActive: {
    backgroundColor: 'rgba(16,185,129,0.2)',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
});

export default CategoryScreen;
