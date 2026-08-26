import { Platform } from 'react-native';
import { BASE_URL } from '../config/env';

export const normalizeImageUrl = (uri) => {
    if (!uri) return null;
    let finalUri = typeof uri === 'object' ? uri.uri : uri;
    
    // Get the base API domain without /mobile/
    const apiDomain = BASE_URL.replace('/mobile/customer-portal/', '').replace('/mobile/', '');

    if (typeof finalUri === 'string') {
        if (finalUri.startsWith('/media/') || finalUri.startsWith('/uploads/') || finalUri.startsWith('/api/')) {
            finalUri = `${apiDomain}${finalUri}`;
        }

        // Encode the URI to handle spaces and special characters, which crash Android's Image loader
        try {
            finalUri = encodeURI(finalUri);
        } catch (e) {
            console.log("URI encoding failed", e);
        }
    }
    return finalUri;
};