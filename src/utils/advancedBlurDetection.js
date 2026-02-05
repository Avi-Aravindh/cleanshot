import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';

/**
 * Advanced blur detection using multiple methods
 * Combines file size heuristic with edge detection estimation
 */

// Calculate edge strength score from image data
const calculateEdgeScore = (pixels, width, height) => {
  let edgeSum = 0;
  let count = 0;

  // Simple Sobel-like edge detection on pixel data
  // We approximate this using pixel differences
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;

      // Get surrounding pixels
      const top = pixels[idx - width] || 0;
      const bottom = pixels[idx + width] || 0;
      const left = pixels[idx - 1] || 0;
      const right = pixels[idx + 1] || 0;
      const center = pixels[idx] || 0;

      // Calculate gradient (edge strength)
      const gx = Math.abs(right - left);
      const gy = Math.abs(bottom - top);
      const gradient = Math.sqrt(gx * gx + gy * gy);

      edgeSum += gradient;
      count++;
    }
  }

  return count > 0 ? edgeSum / count : 0;
};

/**
 * Detect blur using advanced methods
 * @param {object} asset - Photo asset from MediaLibrary
 * @param {boolean} deepScan - Use advanced detection (slower but more accurate)
 * @returns {object} - Detection result with confidence
 */
export const detectBlurAdvanced = async (asset, deepScan = true) => {
  try {
    const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.id);

    // Method 1: File size heuristic (fast)
    const fileSize = assetInfo.fileSize || 0;
    const pixelCount = (asset.width || 1) * (asset.height || 1);
    const bytesPerPixel = fileSize / pixelCount;

    // Blurry images: <0.3 bytes/pixel
    // Sharp images: 0.5-2 bytes/pixel
    const fileSizeScore = Math.min(bytesPerPixel / 0.5, 1.0);

    if (!deepScan) {
      const isBlurry = bytesPerPixel < 0.3;
      return {
        isBlurry,
        confidence: isBlurry ? 0.7 : 0.3,
        method: 'fast',
        scores: {
          fileSize: fileSizeScore,
        },
      };
    }

    // Method 2: Edge detection estimation (deep scan)
    // Resize to small size for faster processing
    const manipResult = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 64, height: 64 } }],
      { compress: 1.0, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    // Approximate edge score from base64 data
    // In a perfect world, we'd use expo-gl to read actual pixel data
    // For now, we use the compressed size as a proxy
    const smallImageSize = manipResult.base64 ? manipResult.base64.length : 0;
    const expectedSize = 64 * 64 * 1.5; // Expected size for sharp 64x64 image
    const compressionRatio = smallImageSize / expectedSize;

    // Sharp images compress less (more detail)
    // Blurry images compress more (less detail)
    const edgeScore = Math.max(0, Math.min(1.0, compressionRatio - 0.5));

    // Method 3: Aspect ratio and resolution check
    // Very low resolution images are often blurry
    const resolution = asset.width * asset.height;
    const resolutionScore = resolution > 1000000 ? 1.0 : resolution / 1000000;

    // Combine scores
    const weights = {
      fileSize: 0.4,
      edges: 0.4,
      resolution: 0.2,
    };

    const combinedScore =
      fileSizeScore * weights.fileSize +
      edgeScore * weights.edges +
      resolutionScore * weights.resolution;

    // Threshold: Combined score < 0.4 = blurry
    const isBlurry = combinedScore < 0.4;
    const confidence = isBlurry ? 1.0 - combinedScore : combinedScore;

    return {
      isBlurry,
      confidence: Math.min(Math.max(confidence, 0), 1),
      method: 'deep',
      scores: {
        fileSize: fileSizeScore,
        edges: edgeScore,
        resolution: resolutionScore,
        combined: combinedScore,
      },
      signals: [
        { type: 'bytes_per_pixel', value: bytesPerPixel, weight: weights.fileSize },
        { type: 'edge_estimation', value: edgeScore, weight: weights.edges },
        { type: 'resolution', value: resolution, weight: weights.resolution },
      ],
    };
  } catch (error) {
    console.error('Advanced blur detection error:', error);
    return {
      isBlurry: false,
      confidence: 0,
      error: error.message,
    };
  }
};

/**
 * Batch process multiple photos for blur detection
 * Processes in chunks to avoid memory issues
 */
export const batchDetectBlur = async (assets, options = {}) => {
  const { deepScan = true, batchSize = 20, onProgress = null } = options;

  const results = [];

  for (let i = 0; i < assets.length; i += batchSize) {
    const batch = assets.slice(i, Math.min(i + batchSize, assets.length));

    const batchResults = await Promise.all(
      batch.map(asset => detectBlurAdvanced(asset, deepScan))
    );

    results.push(...batchResults);

    if (onProgress) {
      onProgress({
        current: Math.min(i + batchSize, assets.length),
        total: assets.length,
      });
    }
  }

  return results;
};
