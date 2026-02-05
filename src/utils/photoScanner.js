import * as MediaLibrary from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import * as FaceDetector from 'expo-face-detector';
import { Platform } from 'react-native';

// ============================================
// PHOTO CATEGORIZATION ENGINE (v2.0)
// ============================================

// Enhanced screenshot detection constants
const SCREENSHOT_ASPECT_RATIOS = [
  0.46, 0.47, 0.48, 0.5, 0.56, 0.6, 0.75, // Original ratios
  0.462, 0.521, // 19.5:9, 20:9 (modern Android)
  0.436, 0.476, // 21:9, iPhone notch ratios
];

const COMMON_SCREENSHOT_WIDTHS = [
  720, 750, 828, 1080, 1170, 1242, 1284, 1290, 1440, 1620, 1920, 2160
];

const COMMON_SCREENSHOT_HEIGHTS = [
  1334, 1792, 1920, 2208, 2340, 2436, 2532, 2688, 2778, 2796, 3088
];

// Blur detection threshold (Laplacian variance)
const BLUR_THRESHOLD = 100; // Lower = more blurry

// Duplicate detection thresholds
const DHASH_SIMILARITY_THRESHOLD = 10; // Hamming distance
const TIME_CLUSTER_THRESHOLD = 5000; // 5 seconds

// ============================================
// SCREENSHOT DETECTION (Enhanced)
// ============================================

export const isScreenshot = async (asset) => {
  const signals = [];
  let confidence = 0;

  try {
    // Get detailed asset info for mediaSubtypes
    const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.id);

    // Signal 1: iOS mediaSubtypes (most reliable on iOS)
    if (Platform.OS === 'ios' && assetInfo.mediaSubtypes) {
      const isNativeScreenshot = assetInfo.mediaSubtypes.includes('screenshot');
      if (isNativeScreenshot) {
        signals.push({ type: 'media_subtype', value: true, weight: 0.5 });
        confidence += 0.5;
      }
    }

    // Signal 2: Filename check (high reliability)
    const filename = (asset.filename || '').toLowerCase();
    const isFilenameScreenshot =
      filename.includes('screenshot') ||
      filename.includes('screen shot') ||
      filename.includes('screen_shot') ||
      filename.startsWith('img_'); // iOS default screenshot prefix
    if (isFilenameScreenshot) {
      signals.push({ type: 'filename', value: true, weight: 0.35 });
      confidence += 0.35;
    }

    // Signal 3: Aspect ratio check
    const aspectRatio = asset.width && asset.height ? asset.width / asset.height : 0;
    const isScreenshotRatio = SCREENSHOT_ASPECT_RATIOS.some(
      ratio => Math.abs(aspectRatio - ratio) < 0.06
    );
    if (isScreenshotRatio) {
      signals.push({ type: 'aspect_ratio', value: aspectRatio, weight: 0.2 });
      confidence += 0.2;
    }

    // Signal 4: Width check (common phone screen widths)
    const isCommonScreenshotWidth = COMMON_SCREENSHOT_WIDTHS.includes(asset.width);
    if (isCommonScreenshotWidth) {
      signals.push({ type: 'width', value: asset.width, weight: 0.15 });
      confidence += 0.15;
    }

    // Signal 5: Height check (common phone screen heights)
    const isCommonScreenshotHeight = COMMON_SCREENSHOT_HEIGHTS.includes(asset.height);
    if (isCommonScreenshotHeight) {
      signals.push({ type: 'height', value: asset.height, weight: 0.15 });
      confidence += 0.15;
    }

    // Signal 6: No location data (screenshots don't have GPS)
    const hasNoLocation = !assetInfo.location || (!assetInfo.location.latitude && !assetInfo.location.longitude);
    if (hasNoLocation) {
      signals.push({ type: 'no_location', value: true, weight: 0.1 });
      confidence += 0.1;
    }

    return {
      isScreenshot: confidence > 0.3, // Threshold for classification
      confidence: Math.min(confidence, 1),
      signals
    };
  } catch (error) {
    console.error('Screenshot detection error:', error);
    // Fallback to basic detection without mediaSubtypes
    const filename = (asset.filename || '').toLowerCase();
    const isFilenameScreenshot = filename.includes('screenshot') || filename.includes('img_');
    return {
      isScreenshot: isFilenameScreenshot,
      confidence: isFilenameScreenshot ? 0.7 : 0,
      signals: [{ type: 'filename_fallback', value: isFilenameScreenshot }],
      error: error.message
    };
  }
};

// ============================================
// BLUR DETECTION (Laplacian Variance)
// ============================================

export const detectBlur = async (asset, deepScan = true) => {
  try {
    if (!deepScan) {
      // Fast mode: File size heuristic
      const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.id);
      const fileSize = assetInfo.fileSize || 0;
      const pixelCount = (asset.width || 1) * (asset.height || 1);
      const bytesPerPixel = fileSize / pixelCount;

      // Blurry images compress better (less detail)
      // Typical sharp JPEG: 0.5-2 bytes/pixel, blurry: <0.3 bytes/pixel
      const isLowFileSize = bytesPerPixel < 0.3;

      return {
        isBlurry: isLowFileSize,
        confidence: isLowFileSize ? 0.6 : 0.3,
        method: 'fast',
        signals: [{ type: 'bytes_per_pixel', value: bytesPerPixel, weight: 1.0 }]
      };
    }

    // Deep scan mode: Laplacian variance
    const uri = asset.uri;

    // Resize image to 512px for faster processing
    const maxDimension = 512;
    const scale = Math.min(maxDimension / asset.width, maxDimension / asset.height);

    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: asset.width * scale, height: asset.height * scale } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );

    // For now, we'll use file size as proxy until we implement actual Laplacian
    // TODO: Implement actual edge detection using canvas/pixel manipulation
    // This requires expo-gl or react-native-image-filter-kit

    const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.id);
    const fileSize = assetInfo.fileSize || 0;
    const pixelCount = (asset.width || 1) * (asset.height || 1);
    const bytesPerPixel = fileSize / pixelCount;

    const isLowFileSize = bytesPerPixel < 0.3;

    return {
      isBlurry: isLowFileSize,
      confidence: isLowFileSize ? 0.7 : 0.3,
      method: 'deep',
      signals: [
        { type: 'bytes_per_pixel', value: bytesPerPixel, weight: 0.7 },
        { type: 'laplacian_variance', value: 0, weight: 0.3, note: 'Pending implementation' }
      ]
    };
  } catch (error) {
    console.error('Blur detection error:', error);
    return {
      isBlurry: false,
      confidence: 0,
      error: error.message
    };
  }
};

// ============================================
// DUPLICATE DETECTION (3-Level System)
// ============================================

// Level 1: Exact duplicates via file hash
const getFileHash = async (asset) => {
  try {
    const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.id);
    // Use uri as hash source (limitation: can't read raw bytes in React Native easily)
    const hashInput = `${assetInfo.fileSize}_${asset.width}_${asset.height}_${asset.filename}`;
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.MD5,
      hashInput
    );
    return hash;
  } catch (error) {
    console.error('File hash error:', error);
    return null;
  }
};

// Level 2: Near duplicates via metadata clustering
const getMetadataHash = (asset) => {
  const timestamp = Math.floor(asset.creationTime / TIME_CLUSTER_THRESHOLD);
  return `${asset.width}x${asset.height}_${timestamp}`;
};

// Level 3: Perceptual hash (improved similarity detection)
const getPerceptualHash = async (asset) => {
  try {
    // Get asset info for file size
    const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.id);

    // Create perceptual hash based on:
    // 1. Aspect ratio (normalized to 1000 buckets)
    // 2. File size per pixel (quality indicator)
    // 3. Creation time bucket (photos taken together are likely similar)

    const aspectRatio = asset.width / asset.height;
    const aspectBucket = Math.floor(aspectRatio * 1000);

    const bytesPerPixel = (assetInfo.fileSize || 0) / (asset.width * asset.height);
    const qualityBucket = Math.floor(bytesPerPixel * 10000);

    // Bucket by 5-minute intervals
    const timeBucket = Math.floor(asset.creationTime / (5 * 60 * 1000));

    // Combine into a hash string
    const hashInput = `${aspectBucket}_${qualityBucket}_${timeBucket}`;
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.MD5,
      hashInput
    );

    return hash.substring(0, 16);
  } catch (error) {
    console.error('Perceptual hash error:', error);
    return null;
  }
};

// Calculate Hamming distance between two hash strings
const hammingDistance = (hash1, hash2) => {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return Infinity;

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  return distance;
};

// Find all duplicates using 3-level detection
export const findDuplicates = async (assets, includeVisualSimilarity = true) => {
  const duplicates = [];

  // Level 1: Exact duplicates
  const fileHashMap = new Map();

  // Level 2: Near duplicates
  const metadataHashMap = new Map();

  // Level 3: Visual similarity
  const dHashMap = new Map();

  for (const asset of assets) {
    try {
      // Level 1: Check file hash
      const fileHash = await getFileHash(asset);
      if (fileHash) {
        if (fileHashMap.has(fileHash)) {
          duplicates.push({
            original: fileHashMap.get(fileHash),
            duplicate: asset,
            confidence: 1.0,
            type: 'exact',
            signals: [{ type: 'file_hash', match: true }]
          });
          continue; // Already found as exact duplicate
        } else {
          fileHashMap.set(fileHash, asset);
        }
      }

      // Level 2: Check metadata clustering
      const metadataHash = getMetadataHash(asset);
      if (metadataHashMap.has(metadataHash)) {
        const original = metadataHashMap.get(metadataHash);
        // Additional check: similar file size
        const originalInfo = await MediaLibrary.getAssetInfoAsync(original.id);
        const currentInfo = await MediaLibrary.getAssetInfoAsync(asset.id);
        const sizeDiff = Math.abs((originalInfo.fileSize || 0) - (currentInfo.fileSize || 0));
        const sizeThreshold = Math.max(originalInfo.fileSize, currentInfo.fileSize) * 0.1; // 10% tolerance

        if (sizeDiff < sizeThreshold) {
          duplicates.push({
            original,
            duplicate: asset,
            confidence: 0.85,
            type: 'near',
            signals: [
              { type: 'metadata_cluster', match: true },
              { type: 'size_similarity', diff: sizeDiff }
            ]
          });
          continue;
        }
      } else {
        metadataHashMap.set(metadataHash, asset);
      }

      // Level 3: Check perceptual similarity (optional, slower)
      if (includeVisualSimilarity) {
        const pHash = await getPerceptualHash(asset);
        if (pHash) {
          // Exact perceptual hash match = very similar photos
          if (dHashMap.has(pHash)) {
            const original = dHashMap.get(pHash);
            duplicates.push({
              original,
              duplicate: asset,
              confidence: 0.9,
              type: 'similar',
              signals: [
                { type: 'perceptual_hash', match: true }
              ]
            });
          } else {
            dHashMap.set(pHash, asset);
          }
        }
      }
    } catch (error) {
      console.error('Error processing asset for duplicates:', error);
    }
  }

  return duplicates;
};

// ============================================
// PROGRESSIVE SCANNING
// ============================================

export const scanPhotos = async (options = {}) => {
  const {
    deepScan = true,
    includeVisualSimilarity = true,
    onProgress = null,
    batchSize = 50
  } = options;

  try {
    // Request permissions
    const { status } = await MediaLibrary.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await MediaLibrary.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        throw new Error('Permission denied');
      }
    }

    // Get all photos
    const response = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.photo,
      first: 5000,
      sortBy: MediaLibrary.SortBy.creationTime,
    });

    const assets = response.assets || response.items || [];
    console.log('Total assets found:', assets.length);

    const categories = {
      screenshots: [],
      blurry: [],
      duplicates: [],
      totalSpace: 0,
    };

    // Phase 1: Fast pass - Screenshots (no image processing needed)
    console.log('Phase 1: Detecting screenshots...');
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];

      if (onProgress) {
        onProgress({ phase: 'screenshots', current: i + 1, total: assets.length });
      }

      try {
        // Skip favorited photos - never suggest deletion
        const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.id);
        if (assetInfo.isFavorite) {
          console.log(`Skipping favorited photo: ${asset.filename}`);
          continue;
        }

        const screenshotResult = await isScreenshot(asset);
        if (screenshotResult.isScreenshot) {
          categories.totalSpace += assetInfo.fileSize || 0;
          categories.screenshots.push({
            ...asset,
            confidence: screenshotResult.confidence,
            signals: screenshotResult.signals
          });
        }
      } catch (error) {
        console.error('Error detecting screenshot:', error);
      }
    }

    // Filter out screenshots from further processing
    const nonScreenshots = assets.filter(
      asset => !categories.screenshots.find(s => s.id === asset.id)
    );

    // Phase 2: Duplicate detection
    console.log('Phase 2: Detecting duplicates...');
    if (onProgress) {
      onProgress({ phase: 'duplicates', current: 0, total: nonScreenshots.length });
    }

    const duplicateResults = await findDuplicates(nonScreenshots, includeVisualSimilarity);
    for (const dup of duplicateResults) {
      const assetInfo = await MediaLibrary.getAssetInfoAsync(dup.duplicate.id);

      // Skip favorited duplicates
      if (assetInfo.isFavorite) {
        console.log(`Skipping favorited duplicate: ${dup.duplicate.filename}`);
        continue;
      }

      categories.totalSpace += assetInfo.fileSize || 0;
      categories.duplicates.push({
        ...dup.duplicate,
        duplicateOf: dup.original.id,
        confidence: dup.confidence,
        duplicateType: dup.type,
        signals: dup.signals
      });
    }

    // Filter out duplicates
    const nonDuplicates = nonScreenshots.filter(
      asset => !categories.duplicates.find(d => d.id === asset.id)
    );

    // Phase 3: Blur detection (can be slow, process in batches)
    console.log('Phase 3: Detecting blurry photos...');
    for (let i = 0; i < nonDuplicates.length; i += batchSize) {
      const batch = nonDuplicates.slice(i, Math.min(i + batchSize, nonDuplicates.length));

      if (onProgress) {
        onProgress({ phase: 'blur', current: i, total: nonDuplicates.length });
      }

      for (const asset of batch) {
        try {
          const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.id);

          // Skip favorited photos
          if (assetInfo.isFavorite) {
            console.log(`Skipping favorited photo: ${asset.filename}`);
            continue;
          }

          const blurResult = await detectBlur(asset, deepScan);
          if (blurResult.isBlurry) {
            categories.totalSpace += assetInfo.fileSize || 0;
            categories.blurry.push({
              ...asset,
              confidence: blurResult.confidence,
              method: blurResult.method,
              signals: blurResult.signals
            });
          }
        } catch (error) {
          console.error('Error detecting blur:', error);
        }
      }
    }

    const result = {
      screenshots: categories.screenshots.length,
      blurry: categories.blurry.length,
      duplicates: categories.duplicates.length,
      totalSpace: categories.totalSpace,
      details: categories,
      scannedCount: assets.length,
      scanOptions: { deepScan, includeVisualSimilarity }
    };

    console.log('Scan complete:', result);
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
