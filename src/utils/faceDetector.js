import * as FaceDetector from 'expo-face-detector';

// ============================================
// FACE DETECTION
// ============================================

export const detectFaces = async (asset) => {
  try {
    // Detect faces in the image
    const { faces } = await FaceDetector.detectFacesAsync(asset.uri, {
      mode: FaceDetector.FaceDetectorMode.fast,
      detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
      runClassifications: FaceDetector.FaceDetectorClassifications.none,
    });

    return {
      faceCount: faces.length,
      faces,
      hasFaces: faces.length > 0,
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

// Group photos by face similarity (basic grouping)
export const groupPhotosByFaces = (photosWithFaces) => {
  // Simple grouping: group by number of faces
  const groups = {
    solo: [], // 1 face
    group: [], // 2+ faces
    noFaces: [], // 0 faces
  };

  photosWithFaces.forEach(photo => {
    if (photo.faceCount === 0) {
      groups.noFaces.push(photo);
    } else if (photo.faceCount === 1) {
      groups.solo.push(photo);
    } else {
      groups.group.push(photo);
    }
  });

  return groups;
};
