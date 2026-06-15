import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';

const { FileDownloadModule } = NativeModules;

export const requestDeviceDownloadPermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  if (Number(Platform.Version) < 29) {
    const permissionResult = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'Storage Permission Required',
        message:
          'Storage permission is needed to download the invoice to your device.',
        buttonPositive: 'Allow',
        buttonNegative: 'Cancel',
      },
    );

    return permissionResult === PermissionsAndroid.RESULTS.GRANTED;
  }

  return true;
};

export const downloadFileToDevice = async ({
  url,
  fileName,
  authToken = '',
  mimeType = 'application/octet-stream',
  title,
  description,
}) => {
  if (!url) {
    throw new Error('Download URL missing');
  }

  if (Platform.OS === 'android' && FileDownloadModule?.downloadToDownloads) {
    const response = await FileDownloadModule.downloadToDownloads(
      url,
      fileName,
      authToken,
      mimeType,
      title || fileName,
      description || 'Downloading file',
    );

    return {
      ...response,
      fileName,
      directory: response?.directory || 'Downloads',
      filePath: `${RNFS.DownloadDirectoryPath}/${fileName}`,
    };
  }

  if (Platform.OS === 'android') {
    throw new Error(
      'DOWNLOAD_MANAGER_UNAVAILABLE: rebuild the Android app to enable device downloads.',
    );
  }

  const targetDirectory =
    RNFS.DocumentDirectoryPath;
  const targetFilePath = `${targetDirectory}/${fileName}`;
  const downloadResult = await RNFS.downloadFile({
    fromUrl: url,
    toFile: targetFilePath,
    headers: {
      accept: '*/*',
      Authorization: authToken,
    },
  }).promise;

  if (downloadResult.statusCode !== 200) {
    throw new Error(`Download failed with status ${downloadResult.statusCode}`);
  }

  if (Platform.OS === 'android' && typeof RNFS.scanFile === 'function') {
    await RNFS.scanFile(targetFilePath).catch(() => null);
  }

  return {
    fileName,
    filePath: targetFilePath,
    directory: Platform.OS === 'android' ? 'Downloads' : 'Documents',
  };
};
