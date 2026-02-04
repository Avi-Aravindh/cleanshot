// Mock expo modules before importing
jest.mock('expo-media-library');
jest.mock('expo-image-manipulator');
jest.mock('expo-crypto');

import * as MediaLibrary from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import { isScreenshot, detectBlur, findDuplicates, scanPhotos } from '../src/utils/photoScanner';

// ============================================
// MOCK DATA
// ============================================

const mockScreenshot = {
  id: 'screenshot1',
  filename: 'Screenshot_20240204.png',
  width: 1080,
  height: 2340,
  uri: 'file://screenshot1.jpg',
  creationTime: Date.now(),
  mediaType: 'photo',
};

const mockNormalPhoto = {
  id: 'photo1',
  filename: 'IMG_1234.jpg',
  width: 4032,
  height: 3024,
  uri: 'file://photo1.jpg',
  creationTime: Date.now(),
  mediaType: 'photo',
};

const mockBlurryPhoto = {
  id: 'blurry1',
  filename: 'IMG_5678.jpg',
  width: 3024,
  height: 4032,
  uri: 'file://blurry1.jpg',
  creationTime: Date.now(),
  mediaType: 'photo',
};

const mockDuplicate1 = {
  id: 'dup1',
  filename: 'photo_copy.jpg',
  width: 3024,
  height: 4032,
  uri: 'file://dup1.jpg',
  creationTime: 1612345600000,
  mediaType: 'photo',
};

const mockDuplicate2 = {
  id: 'dup2',
  filename: 'photo_copy2.jpg',
  width: 3024,
  height: 4032,
  uri: 'file://dup2.jpg',
  creationTime: 1612345601000, // 1 second later
  mediaType: 'photo',
};

// ============================================
// SETUP MOCKS
// ============================================

beforeEach(() => {
  // Mock MediaLibrary.getAssetInfoAsync
  MediaLibrary.getAssetInfoAsync = jest.fn((assetId) => {
    const assetInfoMap = {
      screenshot1: {
        fileSize: 500000,
        mediaSubtypes: ['screenshot'],
        location: null,
      },
      photo1: {
        fileSize: 3500000,
        mediaSubtypes: [],
        location: { latitude: 37.7749, longitude: -122.4194 },
      },
      blurry1: {
        fileSize: 800000, // Low file size for dimensions = blurry
        mediaSubtypes: [],
        location: { latitude: 37.7749, longitude: -122.4194 },
      },
      dup1: {
        fileSize: 2500000,
        mediaSubtypes: [],
        location: null,
      },
      dup2: {
        fileSize: 2520000, // Similar size
        mediaSubtypes: [],
        location: null,
      },
    };
    return Promise.resolve(assetInfoMap[assetId] || { fileSize: 1000000 });
  });

  // Mock ImageManipulator
  ImageManipulator.manipulateAsync = jest.fn((uri, actions, options) => {
    return Promise.resolve({ uri: 'file://manipulated.jpg' });
  });

  // Mock Crypto.digestStringAsync
  Crypto.digestStringAsync = jest.fn((algorithm, input) => {
    // Create deterministic hash based on input
    const hashMap = {
      // File hashes (same dimensions + size + time = same hash)
      '2500000_3024_4032_photo_copy.jpg': 'hash_dup_original',
      '2520000_3024_4032_photo_copy2.jpg': 'hash_dup_different',
      // dHashes (filename based for mocking)
      'photo_copy.jpg': '1234567890abcdef',
      'photo_copy2.jpg': '1234567890abcdef', // Same to simulate visual similarity
      'IMG_1234.jpg': 'abcdefabcdefabcd',
      'Screenshot_20240204.png': '9999999999999999',
    };
    return Promise.resolve(hashMap[input] || 'default_hash_' + input.substring(0, 8));
  });
});

// ============================================
// TESTS: Screenshot Detection
// ============================================

describe('Screenshot Detection', () => {
  test('should detect screenshot by filename', async () => {
    const result = await isScreenshot(mockScreenshot);
    expect(result.isScreenshot).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  test('should detect screenshot by iOS mediaSubtype', async () => {
    const result = await isScreenshot(mockScreenshot);
    expect(result.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'media_subtype', value: true })
      ])
    );
  });

  test('should detect screenshot by dimensions', async () => {
    const tallScreenshot = {
      ...mockScreenshot,
      filename: 'random.jpg', // No filename hint
      width: 1080,
      height: 2340, // Common phone resolution
    };

    MediaLibrary.getAssetInfoAsync = jest.fn(() =>
      Promise.resolve({ fileSize: 500000, mediaSubtypes: [], location: null })
    );

    const result = await isScreenshot(tallScreenshot);
    expect(result.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'width' })
      ])
    );
  });

  test('should NOT detect normal photos as screenshots', async () => {
    const result = await isScreenshot(mockNormalPhoto);
    expect(result.isScreenshot).toBe(false);
  });

  test('should handle errors gracefully', async () => {
    MediaLibrary.getAssetInfoAsync = jest.fn(() =>
      Promise.reject(new Error('Permission denied'))
    );

    const result = await isScreenshot(mockScreenshot);
    expect(result).toHaveProperty('error');
    // Should still try filename fallback
    expect(result.isScreenshot).toBe(true);
  });
});

// ============================================
// TESTS: Blur Detection
// ============================================

describe('Blur Detection', () => {
  test('should detect blurry photo by low bytes-per-pixel', async () => {
    const result = await detectBlur(mockBlurryPhoto, false); // Fast mode
    expect(result.method).toBe('fast');

    const bytesPerPixel = 800000 / (3024 * 4032);
    expect(bytesPerPixel).toBeLessThan(0.3);
    expect(result.isBlurry).toBe(true);
  });

  test('should NOT detect sharp photos as blurry', async () => {
    const result = await detectBlur(mockNormalPhoto, false);

    const bytesPerPixel = 3500000 / (4032 * 3024);
    expect(bytesPerPixel).toBeGreaterThan(0.3);
    expect(result.isBlurry).toBe(false);
  });

  test('should use deep scan method when enabled', async () => {
    const result = await detectBlur(mockBlurryPhoto, true);
    expect(result.method).toBe('deep');
    expect(ImageManipulator.manipulateAsync).toHaveBeenCalled();
  });

  test('should handle errors in blur detection', async () => {
    MediaLibrary.getAssetInfoAsync = jest.fn(() =>
      Promise.reject(new Error('Asset not found'))
    );

    const result = await detectBlur(mockNormalPhoto, false);
    expect(result.isBlurry).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result).toHaveProperty('error');
  });
});

// ============================================
// TESTS: Duplicate Detection
// ============================================

describe('Duplicate Detection', () => {
  test('should detect near-duplicates by metadata clustering', async () => {
    const assets = [mockDuplicate1, mockDuplicate2];
    const duplicates = await findDuplicates(assets, false);

    expect(duplicates.length).toBeGreaterThan(0);
    expect(duplicates[0].type).toBe('near');
    expect(duplicates[0].confidence).toBeGreaterThan(0.8);
  });

  test('should detect exact duplicates by file hash', async () => {
    Crypto.digestStringAsync = jest.fn((algorithm, input) => {
      // Same hash for both
      if (input.includes('photo_copy')) {
        return Promise.resolve('same_hash_12345');
      }
      return Promise.resolve('different_hash_' + Math.random());
    });

    const assets = [mockDuplicate1, mockDuplicate2];
    const duplicates = await findDuplicates(assets, false);

    const exactDup = duplicates.find(d => d.type === 'exact');
    expect(exactDup).toBeDefined();
    expect(exactDup.confidence).toBe(1.0);
  });

  test('should detect visual similarity when enabled', async () => {
    const assets = [mockDuplicate1, mockDuplicate2];
    const duplicates = await findDuplicates(assets, true);

    // With visual similarity enabled, should check dHash
    expect(Crypto.digestStringAsync).toHaveBeenCalled();
    expect(ImageManipulator.manipulateAsync).toHaveBeenCalled();
  });

  test('should NOT find duplicates for different photos', async () => {
    const assets = [mockNormalPhoto, mockScreenshot];
    const duplicates = await findDuplicates(assets, false);

    expect(duplicates.length).toBe(0);
  });
});

// ============================================
// TESTS: Full Scan Integration
// ============================================

describe('Full Photo Scan', () => {
  test('should scan photos and categorize correctly', async () => {
    MediaLibrary.getPermissionsAsync = jest.fn(() =>
      Promise.resolve({ status: 'granted' })
    );

    MediaLibrary.getAssetsAsync = jest.fn(() =>
      Promise.resolve({
        assets: [mockScreenshot, mockNormalPhoto, mockBlurryPhoto, mockDuplicate1, mockDuplicate2],
      })
    );

    const result = await scanPhotos({
      deepScan: false,
      includeVisualSimilarity: false,
    });

    expect(result.scannedCount).toBe(5);
    expect(result.screenshots).toBeGreaterThan(0);
    expect(result.duplicates).toBeGreaterThan(0);
    expect(result).toHaveProperty('totalSpace');
  });

  test('should call onProgress callback during scan', async () => {
    MediaLibrary.getPermissionsAsync = jest.fn(() =>
      Promise.resolve({ status: 'granted' })
    );

    MediaLibrary.getAssetsAsync = jest.fn(() =>
      Promise.resolve({ assets: [mockScreenshot, mockNormalPhoto] })
    );

    const onProgress = jest.fn();

    await scanPhotos({
      deepScan: false,
      includeVisualSimilarity: false,
      onProgress,
    });

    expect(onProgress).toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        phase: expect.any(String),
        current: expect.any(Number),
        total: expect.any(Number),
      })
    );
  });

  test('should handle permission denial', async () => {
    MediaLibrary.getPermissionsAsync = jest.fn(() =>
      Promise.resolve({ status: 'denied' })
    );

    MediaLibrary.requestPermissionsAsync = jest.fn(() =>
      Promise.resolve({ status: 'denied' })
    );

    await expect(scanPhotos()).rejects.toThrow('Permission denied');
  });

  test('should process in batches for blur detection', async () => {
    MediaLibrary.getPermissionsAsync = jest.fn(() =>
      Promise.resolve({ status: 'granted' })
    );

    const manyPhotos = Array.from({ length: 120 }, (_, i) => ({
      ...mockNormalPhoto,
      id: `photo_${i}`,
    }));

    MediaLibrary.getAssetsAsync = jest.fn(() =>
      Promise.resolve({ assets: manyPhotos })
    );

    const result = await scanPhotos({
      deepScan: false,
      includeVisualSimilarity: false,
      batchSize: 50,
    });

    expect(result.scannedCount).toBe(120);
  });
});

// ============================================
// TESTS: Edge Cases
// ============================================

describe('Edge Cases', () => {
  test('should handle photos with missing metadata', async () => {
    const photoWithoutMetadata = {
      id: 'no_meta',
      filename: null,
      width: null,
      height: null,
      uri: 'file://no_meta.jpg',
      creationTime: null,
      mediaType: 'photo',
    };

    MediaLibrary.getAssetInfoAsync = jest.fn(() =>
      Promise.resolve({ fileSize: 1000000 })
    );

    const screenshotResult = await isScreenshot(photoWithoutMetadata);
    expect(screenshotResult).toBeDefined();
    expect(screenshotResult.isScreenshot).toBe(false);

    const blurResult = await detectBlur(photoWithoutMetadata, false);
    expect(blurResult).toBeDefined();
  });

  test('should handle empty photo library', async () => {
    MediaLibrary.getPermissionsAsync = jest.fn(() =>
      Promise.resolve({ status: 'granted' })
    );

    MediaLibrary.getAssetsAsync = jest.fn(() =>
      Promise.resolve({ assets: [] })
    );

    const result = await scanPhotos();
    expect(result.scannedCount).toBe(0);
    expect(result.screenshots).toBe(0);
    expect(result.blurry).toBe(0);
    expect(result.duplicates).toBe(0);
  });
});
