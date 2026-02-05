import * as FaceDetector from 'expo-face-detector';
import * as MediaLibrary from 'expo-media-library';

// Detect faces in a photo
export const detectFaces = async (asset) => {
  try {
    const result = await FaceDetector.detectFacesAsync(asset.uri, {
      mode: FaceDetector.FaceDetectorMode.fast,
      detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
      runClassifications: FaceDetector.FaceDetectorClassifications.none,
    });

    return {
      faceCount: result.faces.length,
      faces: result.faces,
      hasFaces: result.faces.length > 0
    };
  } catch (error) {
    console.error('Face detection error:', error);
    return {
      faceCount: 0,
      faces: [],
      hasFaces: false,
      error: error.message
    };
  }
};

// Group photos by face similarity (simplified - groups by face count)
export const groupPhotosByFaces = async (assets) => {
  const groups = {
    noFaces: [],
    onePerson: [],
    group: [],
    unknown: []
  };

  for (const asset of assets) {
    try {
      const faceResult = await detectFaces(asset);

      if (faceResult.error) {
        groups.unknown.push(asset);
      } else if (faceResult.faceCount === 0) {
        groups.noFaces.push(asset);
      } else if (faceResult.faceCount === 1) {
        groups.onePerson.push({
          ...asset,
          faceCount: 1,
          faces: faceResult.faces
        });
      } else {
        groups.group.push({
          ...asset,
          faceCount: faceResult.faceCount,
          faces: faceResult.faces
        });
      }
    } catch (error) {
      console.error('Error processing faces for asset:', error);
      groups.unknown.push(asset);
    }
  }

  return groups;
};

// Keep best photo from each group (highest quality with most clear faces)
export const selectBestFromGroup = (photos) => {
  if (photos.length <= 1) return [];

  // Sort by: face count (prefer more faces), then quality (file size/pixels)
  const sorted = [...photos].sort((a, b) => {
    // Prefer photos with more faces
    const faceCountDiff = (b.faceCount || 0) - (a.faceCount || 0);
    if (faceCountDiff !== 0) return faceCountDiff;

    // Then by quality (resolution)
    return (b.width * b.height) - (a.width * a.height);
  });

  // Keep best, return rest for deletion
  return sorted.slice(1);
};
