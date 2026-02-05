import * as FaceDetector from 'expo-face-detector';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Detect faces in a photo
 * Returns number of faces and face data
 */
export const detectFaces = async (imageUri) => {
  try {
    const result = await FaceDetector.detectFacesAsync(imageUri, {
      mode: FaceDetector.FaceDetectorMode.fast,
      detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
      runClassifications: FaceDetector.FaceDetectorClassifications.none,
    });

    return {
      faceCount: result.faces.length,
      faces: result.faces,
      hasFaces: result.faces.length > 0,
    };
  } catch (error) {
    console.error('Face detection error:', error);
    return {
      faceCount: 0,
      faces: [],
      hasFaces: false,
      error: error.message,
    };
  }
};

/**
 * Group photos by similar faces
 * Useful for "keep best photo of each person"
 */
export const groupPhotosByFaces = async (photos) => {
  const groups = new Map();

  for (const photo of photos) {
    try {
      const faceResult = await detectFaces(photo.uri);

      if (faceResult.hasFaces) {
        // Group by number of faces for now
        // Advanced: Could group by face similarity using face landmarks
        const key = `${faceResult.faceCount}_faces`;

        if (!groups.has(key)) {
          groups.set(key, []);
        }

        groups.get(key).push({
          ...photo,
          faceCount: faceResult.faceCount,
          faces: faceResult.faces,
        });
      }
    } catch (error) {
      console.error('Error grouping photo:', error);
    }
  }

  return groups;
};

/**
 * Find best photo with faces in a group
 * Criteria: Most faces, highest resolution, centered faces
 */
export const findBestFacePhoto = (photos) => {
  if (!photos || photos.length === 0) return null;

  const sorted = photos.sort((a, b) => {
    // Priority 1: More faces is better
    if (a.faceCount !== b.faceCount) {
      return b.faceCount - a.faceCount;
    }

    // Priority 2: Higher resolution
    const aPixels = a.width * a.height;
    const bPixels = b.width * b.height;
    if (aPixels !== bPixels) {
      return bPixels - aPixels;
    }

    // Priority 3: Larger face size (closer/more prominent)
    if (a.faces && b.faces && a.faces.length > 0 && b.faces.length > 0) {
      const aFaceSize = a.faces[0].bounds.size.width * a.faces[0].bounds.size.height;
      const bFaceSize = b.faces[0].bounds.size.width * b.faces[0].bounds.size.height;
      return bFaceSize - aFaceSize;
    }

    return 0;
  });

  return sorted[0];
};
