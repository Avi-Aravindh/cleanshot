/**
 * Smart Duplicate Management
 * Analyzes duplicate photos and suggests which to keep/delete
 */

/**
 * Score a photo based on quality indicators
 * Higher score = better quality, keep this one
 */
const scorePhoto = (photo) => {
  let score = 0;

  // 1. File size (larger generally means better quality)
  const fileSize = photo.fileSize || 0;
  score += fileSize / 1000000; // MB as score

  // 2. Resolution (higher is better)
  const pixels = (photo.width || 0) * (photo.height || 0);
  score += pixels / 1000000; // Megapixels

  // 3. Newer is better (recency)
  const ageScore = photo.creationTime ? (Date.now() - photo.creationTime) / (1000 * 60 * 60 * 24) : 0;
  score -= ageScore * 0.1; // Penalty for older photos

  // 4. Filename quality (edited versions often have better names)
  const filename = (photo.filename || '').toLowerCase();
  if (filename.includes('edit') || filename.includes('crop')) score += 5;
  if (filename.includes('copy')) score -= 2; // Copies are usually worse

  // 5. Has location data (might be original)
  if (photo.latitude && photo.longitude) score += 3;

  return score;
};

/**
 * Group duplicates by their original
 * Returns map of originalId -> [duplicate photos]
 */
export const groupDuplicates = (duplicatePhotos) => {
  const groups = new Map();

  duplicatePhotos.forEach(photo => {
    const originalId = photo.duplicateOf || photo.id;
    if (!groups.has(originalId)) {
      groups.set(originalId, []);
    }
    groups.get(originalId).push(photo);
  });

  return groups;
};

/**
 * For each duplicate group, select best photo to keep
 * Returns array of photo IDs to DELETE (keeping the best)
 */
export const selectBestInGroups = (duplicatePhotos) => {
  const groups = groupDuplicates(duplicatePhotos);
  const toDelete = [];

  groups.forEach((photos, originalId) => {
    if (photos.length <= 1) return; // No duplicates, skip

    // Score all photos in the group
    const scored = photos.map(photo => ({
      photo,
      score: scorePhoto(photo)
    }));

    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);

    // Keep the best (first), delete the rest
    const best = scored[0];
    const toDeleteInGroup = scored.slice(1).map(s => s.photo.id);

    console.log(`Group ${originalId}: Keeping ${best.photo.filename} (score: ${best.score.toFixed(2)})`);
    toDelete.push(...toDeleteInGroup);
  });

  return toDelete;
};

/**
 * Smart selection for "Keep Best" button
 * Returns { keep: [photos to keep], delete: [photos to delete] }
 */
export const smartSelectDuplicates = (duplicatePhotos) => {
  const toDeleteIds = selectBestInGroups(duplicatePhotos);
  const toDelete = duplicatePhotos.filter(p => toDeleteIds.includes(p.id));
  const toKeep = duplicatePhotos.filter(p => !toDeleteIds.includes(p.id));

  return {
    keep: toKeep,
    delete: toDelete,
    deletedCount: toDelete.length,
    keptCount: toKeep.length
  };
};
