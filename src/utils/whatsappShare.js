import { NativeModules, Platform } from 'react-native';

const { WhatsAppShareModule } = NativeModules;

export const sharePdfToWhatsAppNumber = async ({
  filePath,
  phoneNumber,
  message,
}) => {
  if (Platform.OS !== 'android') {
    throw new Error('Direct WhatsApp attachment share is currently supported only on Android');
  }

  if (!WhatsAppShareModule?.shareDocumentToNumber) {
    throw new Error('WhatsApp share module unavailable. Rebuild the Android app.');
  }

  return WhatsAppShareModule.shareDocumentToNumber(
    filePath,
    phoneNumber,
    message || '',
  );
};

export const sharePdfToWhatsAppChooser = async ({
  filePath,
  message,
}) => {
  if (Platform.OS !== 'android') {
    throw new Error('WhatsApp attachment chooser is currently supported only on Android');
  }

  if (!WhatsAppShareModule?.shareDocument) {
    throw new Error('WhatsApp share module unavailable. Rebuild the Android app.');
  }

  return WhatsAppShareModule.shareDocument(
    filePath,
    message || '',
  );
};
