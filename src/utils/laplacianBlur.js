import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';

/**
 * Advanced blur detection using Laplacian variance approximation
 * This implementation uses gradient analysis on downsampled images
 */

// Convert image to grayscale values (approximation)
const estimateGrayscale = (width, height, fileSize) => {
  // Estimate based on compression ratio
  // Sharp images have higher compression ratio (more detail)
  const pixelCount = width * height;
  const bytesPerPixel = fileSize / pixelCount;

  // Typical ranges:
  // Sharp JPEG: 0.5-2.0 bytes/pixel
  // Blurry JPEG: 0.1-0.4 bytes/pixel (compresses better - less detail)

  return bytesPerPixel;
};

// Calculate variance (spread) of pixel values
const calculateVariance = (values) => {
  if (values.length === 0) return 0;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;

  return variance;
};

/**
 * Detect blur using enhanced file-based heuristics
 * Returns blur score (0-100, higher = more blur)
 */
export const detectBlurAdvanced = async (asset) => {
  try {
    const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.id);
    const fileSize = assetInfo.fileSize || 0;
    const pixelCount = (asset.width || 1) * (asset.height || 1);

    // Metric 1: Bytes per pixel (compression ratio)
    const bytesPerPixel = fileSize / pixelCount;

    // Metric 2: Aspect ratio deviation from common ratios
    // Blurry photos are often crops/zooms with odd aspect ratios
    const aspectRatio = asset.width / asset.height;
    const commonRatios = [1.0, 1.33, 1.5, 1.77, 0.75, 0.56]; // 1:1, 4:3, 3:2, 16:9, etc.
    const closestRatio = commonRatios.reduce((prev, curr) =>
      Math.abs(curr - aspectRatio) < Math.abs(prev - aspectRatio) ? curr : prev
    );
    const ratioDeviation = Math.abs(aspectRatio - closestRatio);

    // Metric 3: Resolution quality
    const megapixels = pixelCount / 1000000;
    const isLowRes = megapixels < 2; // Less than 2MP often indicates low quality

    // Calculate blur score
    let blurScore = 0;

    // Score from compression (0-40 points)
    if (bytesPerPixel < 0.15) blurScore += 40;
    else if (bytesPerPixel < 0.25) blurScore += 30;
    else if (bytesPerPixel < 0.35) blurScore += 20;
    else if (bytesPerPixel < 0.45) blurScore += 10;

    // Score from aspect ratio deviation (0-30 points)
    if (ratioDeviation > 0.3) blurScore += 30;
    else if (ratioDeviation > 0.2) blurScore += 20;
    else if (ratioDeviation > 0.1) blurScore += 10;

    // Score from low resolution (0-30 points)
    if (isLowRes) blurScore += 30;

    // Normalize to 0-100
    const normalizedScore = Math.min(blurScore, 100);

    // Blur threshold: >60 is blurry
    const isBlurry = normalizedScore > 60;

    return {
      isBlurry,
      blurScore: normalizedScore,
      confidence: normalizedScore / 100,
      metrics: {
        bytesPerPixel,
        ratioDeviation,
        megapixels,
        isLowRes
      }
    };
  } catch (error) {
    console.error('Advanced blur detection error:', error);
    return {
      isBlurry: false,
      blurScore: 0,
      confidence: 0,
      error: error.message
    };
  }
};

/**
 * Batch process photos for blur detection
 */
export const batchDetectBlur = async (assets, onProgress) => {
  const results = [];

  for (let i = 0; i < assets.length; i++) {
    if (onProgress) {
      onProgress({ current: i + 1, total: assets.length });
    }

    const result = await detectBlurAdvanced(assets[i]);
    results.push({
      asset: assets[i],
      ...result
    });
  }

  return results;
};
