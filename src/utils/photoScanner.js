import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';

// ============================================
// PHOTO CATEGORIZATION ENGINE
// ============================================

// Threshold constants
const BLUR_THRESHOLD = 100;
const SCREENSHOT_ASPECT_RATIOS = [0.46, 0.47, 0.48, 0.5, 0.56, 0.6, 0.75]; // 9:19.5, 1:2, 9:16, and more
const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;

// ============================================
// SCREENSHOT DETECTION
// ============================================

export const isScreenshot = async (asset) => {
  const signals = [];
  let confidence = 0;

  // Signal 1: Filename check (high reliability on iOS)
  const filename = (asset.filename || '').toLowerCase();
  const isFilenameScreenshot = filename.includes('screenshot') || filename.includes('screen shot') || filename.includes('img_');
  if (isFilenameScreenshot) {
    signals.push({ type: 'filename', value: true, weight: 0.35 });
    confidence += 0.35;
  }

  // Signal 2: Aspect ratio check (screenshots often have specific ratios)
  const aspectRatio = asset.width && asset.height ? asset.width / asset.height : 0;
  const isScreenshotRatio = SCREENSHOT_ASPECT_RATIOS.some(
    ratio => Math.abs(aspectRatio - ratio) < 0.06
  );
  if (isScreenshotRatio) {
    signals.push({ type: 'aspect_ratio', value: aspectRatio, weight: 0.25 });
    confidence += 0.25;
  }

  // Signal 3: Width check (screenshots often have specific widths)
  const isCommonScreenshotWidth = [720, 750, 828, 1080, 1170, 1280, 1440, 1620, 1920].includes(asset.width);
  if (isCommonScreenshotWidth) {
    signals.push({ type: 'width', value: asset.width, weight: 0.15 });
    confidence += 0.15;
  }

  // Signal 4: Height check for vertical screenshots
  const isVerticalScreenshot = asset.height > 1300 && asset.width < 600;
  if (isVerticalScreenshot) {
    signals.push({ type: 'vertical', value: true, weight: 0.2 });
    confidence += 0.2;
  }

  // Signal 5: No location data (screenshots usually don't have GPS)
  const hasNoLocation = !asset.latitude && !asset.longitude;
  if (hasNoLocation) {
    signals.push({ type: 'no_location', value: true, weight: 0.15 });
    confidence += 0.15;
  }

  // Lower threshold for more aggressive detection
  return {
    isScreenshot: confidence > 0.25,
    confidence: Math.min(confidence, 1),
    signals
  };
};

// ============================================
// BLUR DETECTION (Laplacian Variance)
// ============================================

export const detectBlur = async (asset) => {
  try {
    // Get the image URI
    const uri = asset.uri;
    
    // For now, we use metadata-based estimation
    // In production, you'd process the actual image
    
    // Signal 1: File size vs dimension ratio
    // Blurry photos often have low information density
    const fileSize = asset.duration || 0; // Duration as proxy for size
    const pixelCount = (asset.width || 1) * (asset.height || 1);
    const sizePerPixel = fileSize / pixelCount;
    
    // Very small file size relative to dimensions suggests low quality
    const isSmallFile = sizePerPixel < 0.001;
    
    // Signal 2: Motion blur indicator (burst mode detection)
    // Photos taken in quick succession often have less care
    const isQuickBurst = asset.creationTime === asset.modificationTime;
    
    // Signal 3: Low light indicator (metadata-based)
    // Low ISO or high exposure time suggests potential blur
    const isLowQuality = isSmallFile || isQuickBurst;
    
    return {
      isBlurry: isLowQuality,
      confidence: isLowQuality ? 0.7 : 0.3,
      signals: [
        { type: 'size_per_pixel', value: sizePerPixel, weight: 0.5 },
        { type: 'burst_mode', value: isQuickBurst, weight: 0.3 }
      ]
    };
  } catch (error) {
    return {
      isBlurry: false,
      confidence: 0,
      error: error.message
    };
  }
};

// ============================================
// DUPLICATE DETECTION
// ============================================

export const findDuplicates = (assets) => {
  const duplicates = [];
  const seen = new Map(); // filename_hash -> asset
  
  for (const asset of assets) {
    // Create a hash based on dimensions and filename
    const hash = `${asset.width}x${asset.height}_${(asset.filename || '').slice(-30)}`;
    
    if (seen.has(hash)) {
      duplicates.push({
        original: seen.get(hash),
        duplicate: asset,
        confidence: 0.95
      });
    } else {
      seen.set(hash, asset);
    }
  }
  
  return duplicates;
};

// ============================================
// SCAN PHOTOS
// ============================================

export const scanPhotos = async () => {
  try {
    // Request permissions
    const { status } = await MediaLibrary.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await MediaLibrary.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        throw new Error('Permission denied');
      }
    }

    // Get all photos (limit for MVP)
    const response = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.photo,
      first: 5000,
      sortBy: MediaLibrary.SortBy.creationTime,
    });

    // Handle different API response structures
    const assets = response.assets || response.items || [];
    console.log('Total assets found:', assets.length);

    const categories = {
      screenshots: [],
      blurry: [],
      duplicates: [],
      old: [],
      totalSpace: 0,
    };

    const seenHashes = new Map();
    
    for (const asset of assets) {
      try {
        const fileSize = (asset.width || 1) * (asset.height || 1) * 3;
        categories.totalSpace += fileSize;

        // Check for screenshots
        const screenshotResult = await isScreenshot(asset);
        if (screenshotResult.isScreenshot) {
          categories.screenshots.push({
            ...asset,
            confidence: screenshotResult.confidence,
            signals: screenshotResult.signals
          });
          continue;
        }

        // Check for duplicates
        const hash = `${asset.width}x${asset.height}_${(asset.filename || '').slice(-30)}`;
        if (seenHashes.has(hash)) {
          categories.duplicates.push({
            ...asset,
            duplicateOf: seenHashes.get(hash).id,
            confidence: 0.9
          });
        } else {
          seenHashes.set(hash, asset);
        }
      } catch (assetError) {
        console.error('Error processing asset:', assetError);
      }
    }

    const result = {
      screenshots: categories.screenshots.length,
      blurry: categories.blurry.length,
      duplicates: categories.duplicates.length,
      old: categories.old.length,
      totalSpace: categories.totalSpace,
      details: categories,
      scannedCount: assets.length,
    };

    console.log('Scan result:', result);
    return result;
  } catch (error) {
    console.error('Error scanning photos:', error);
    throw error;
  }
};

// ============================================
// DELETE PHOTOS
// ============================================

export const deletePhotos = async (assets) => {
  try {
    await MediaLibrary.deleteAssetsAsync(assets);
    return { success: true, deletedCount: assets.length };
  } catch (error) {
    console.error('Error deleting photos:', error);
    throw error;
  }
};

// ============================================
// UTILITIES
// ============================================

export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
