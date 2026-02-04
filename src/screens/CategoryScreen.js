import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, Modal } from 'react-native';
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
  const [previewPhoto, setPreviewPhoto] = useState(null);

  const categoryNames = {
    screenshots: 'Screenshots',
    blurry: 'Blurry Photos',
    duplicates: 'Duplicates',
  };

  // Refresh photos when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('CategoryScreen focused, type:', type);
      console.log('scanResults.details:', JSON.stringify(scanResults.details, null, 2));

      if (scanResults.details && scanResults.details[type]) {
        console.log('Found', scanResults.details[type].length, 'photos for', type);
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

  // Handle Done/Cancel button
  const handleDoneOrCancel = () => {
    if (isSelecting) {
      // Exit selection mode and clear selections
      setIsSelecting(false);
      setSelectedPhotos([]);
    }
  };

  // Select/Deselect All
  const handleSelectAll = () => {
    if (selectedPhotos.length === photos.length) {
      // Deselect all
      setSelectedPhotos([]);
    } else {
      // Select all
      setSelectedPhotos(photos.map(p => p.id));
    }
  };

  useEffect(() => {
    navigation.setOptions({
      title: categoryNames[type] || 'Category',
      headerRight: () => (
        <View style={styles.headerButtons}>
          {isSelecting && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleSelectAll}
            >
              <Text style={styles.headerButtonText}>
                {selectedPhotos.length === photos.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              if (isSelecting) {
                handleDoneOrCancel();
              } else {
                setIsSelecting(true);
              }
            }}
            disabled={photos.length === 0}
          >
            <Text style={[styles.headerButtonText, photos.length === 0 && styles.headerButtonDisabled]}>
              {isSelecting ? 'Cancel' : 'Select'}
            </Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [type, photos.length, isSelecting, selectedPhotos.length, navigation]);

  const togglePhoto = (photo) => {
    if (selectedPhotos.includes(photo.id)) {
      setSelectedPhotos(selectedPhotos.filter(id => id !== photo.id));
    } else {
      setSelectedPhotos([...selectedPhotos, photo.id]);
    }
  };

  const handlePhotoPress = (photo) => {
    if (isSelecting) {
      togglePhoto(photo);
    } else {
      // Show preview
      setPreviewPhoto(photo);
    }
  };

  const handleDelete = async () => {
    if (selectedPhotos.length === 0) {
      Alert.alert('No Selection', 'Please select photos to delete');
      return;
    }

    Alert.alert(
      'Delete Photos',
      `Are you sure you want to delete ${selectedPhotos.length} photo${selectedPhotos.length > 1 ? 's' : ''}? This action cannot be undone.`,
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

              Alert.alert('Success', `${deletedCount} photo${deletedCount > 1 ? 's' : ''} deleted!`);
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', error.message || 'Failed to delete photos');
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
        onPress={() => handlePhotoPress(item)}
        onLongPress={() => {
          if (!isSelecting) {
            setIsSelecting(true);
          }
          togglePhoto(item);
        }}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.uri }}
          style={styles.photo}
          resizeMode="cover"
        />
        {isSelecting && (
          <View style={[styles.selectOverlay, isSelected && styles.selectOverlayActive]}>
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && (
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              )}
            </View>
          </View>
        )}
        {!isSelecting && item.confidence && (
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>{Math.round(item.confidence * 100)}%</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Selection Bar */}
      {isSelecting && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionCount}>
            {selectedPhotos.length > 0
              ? `${selectedPhotos.length} selected`
              : 'Select photos to delete'}
          </Text>
          <TouchableOpacity
            style={[styles.deleteButton, selectedPhotos.length === 0 && styles.deleteButtonDisabled]}
            onPress={handleDelete}
            disabled={selectedPhotos.length === 0}
          >
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

      {/* Photo Preview Modal */}
      <Modal
        visible={previewPhoto !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewPhoto(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setPreviewPhoto(null)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setPreviewPhoto(null)} style={styles.closeButton}>
                  <Ionicons name="close" size={28} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              {previewPhoto && (
                <>
                  <Image
                    source={{ uri: previewPhoto.uri }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                  <View style={styles.previewInfo}>
                    <Text style={styles.previewFilename}>{previewPhoto.filename}</Text>
                    {previewPhoto.confidence && (
                      <Text style={styles.previewConfidence}>
                        Confidence: {Math.round(previewPhoto.confidence * 100)}%
                      </Text>
                    )}
                    <Text style={styles.previewDimensions}>
                      {previewPhoto.width} × {previewPhoto.height}
                    </Text>
                  </View>
                  <View style={styles.previewActions}>
                    <TouchableOpacity
                      style={styles.previewDeleteButton}
                      onPress={() => {
                        setSelectedPhotos([previewPhoto.id]);
                        setPreviewPhoto(null);
                        setIsSelecting(true);
                      }}
                    >
                      <Ionicons name="trash-outline" size={24} color="#EF4444" />
                      <Text style={styles.previewDeleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    paddingHorizontal: 12,
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
  deleteButtonDisabled: {
    backgroundColor: '#CBD5E1',
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
    backgroundColor: '#E2E8F0',
  },
  selectOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    padding: 8,
    alignItems: 'flex-end',
  },
  selectOverlayActive: {
    backgroundColor: 'rgba(16,185,129,0.2)',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  confidenceBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  confidenceText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
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
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    paddingTop: 50,
  },
  closeButton: {
    padding: 8,
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  previewInfo: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
    alignItems: 'center',
  },
  previewFilename: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewConfidence: {
    color: '#10B981',
    fontSize: 14,
    marginBottom: 4,
  },
  previewDimensions: {
    color: '#94A3B8',
    fontSize: 12,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  previewDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  previewDeleteText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default CategoryScreen;
