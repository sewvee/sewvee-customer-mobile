import RNFS from 'react-native-fs';
import ImagePicker from 'react-native-image-crop-picker';

export const MAX_IMAGE_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;

export const IMAGE_UPLOAD_SIZE_ERROR =
  'Image size should not exceed 50MB';

export const getImageUploadSize = file =>
  Number(file?.size ?? file?.fileSize ?? file?.file_size ?? 0) || 0;

export const isImageUploadTooLarge = file =>
  getImageUploadSize(file) > MAX_IMAGE_UPLOAD_SIZE_BYTES;

const getCandidatePaths = file => {
  const candidates = [
    file?.path,
    file?.sourceURL,
    file?.uri,
    file?.realPath,
  ]
    .map(value => `${value || ''}`.trim())
    .filter(Boolean);

  if (candidates.length === 0) {
    return [];
  }

  const expandedCandidates = [];

  candidates.forEach(candidate => {
    expandedCandidates.push(candidate);

    if (/^file:\/\//i.test(candidate)) {
      expandedCandidates.push(candidate.replace(/^file:\/\//i, ''));
    }
  });

  return [...new Set(expandedCandidates)];
};

export const getResolvedImageUploadSize = async file => {
  const directSize = getImageUploadSize(file);
  if (directSize > 0) {
    return directSize;
  }

  for (const candidatePath of getCandidatePaths(file)) {
    try {
      const statResult = await RNFS.stat(candidatePath);
      const nextSize = Number(statResult?.size) || 0;

      if (nextSize > 0) {
        return nextSize;
      }
    } catch (error) {
      continue;
    }
  }

  return 0;
};

export const isImageUploadTooLargeAsync = async file =>
  (await getResolvedImageUploadSize(file)) > MAX_IMAGE_UPLOAD_SIZE_BYTES;

export const pickValidatedImageWithCrop = async (options = {}) => {
  const selectedImage = await ImagePicker.openPicker({
    cropping: false,
    includeBase64: false,
    mediaType: 'photo',
  });

  if (await isImageUploadTooLargeAsync(selectedImage)) {
    throw new Error(IMAGE_UPLOAD_SIZE_ERROR);
  }

  const cropperPath = getCandidatePaths(selectedImage)[0];

  if (!cropperPath) {
    throw new Error('Failed to select image');
  }

  return ImagePicker.openCropper({
    path: cropperPath,
    width: options.width || 400,
    height: options.height || 400,
    cropping: options.cropping !== false,
    includeBase64: false,
  });
};
