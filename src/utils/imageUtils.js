import { Platform } from 'react-native';
import { BASE_URL } from '../config/env';

export const normalizeImageUrl = (uri) => {
    if (!uri) return null;
    let finalUri = typeof uri === 'object' ? uri.uri : uri;
    
    // Fallbacks to get the domain
    let apiDomain = BASE_URL;
    if (apiDomain.includes('/mobile/')) {
        apiDomain = apiDomain.split('/mobile/')[0];
    } else if (apiDomain.includes('/api/')) {
        apiDomain = apiDomain.split('/api/')[0];
    }
    
    if (typeof finalUri === 'string') {
        if (finalUri.startsWith('http://localhost:3021')) {
            finalUri = finalUri.replace('http://localhost:3021', apiDomain);
        } else if (finalUri.startsWith('http://localhost:3022')) {
            finalUri = finalUri.replace('http://localhost:3022', apiDomain);
        } else if (finalUri.startsWith('/media/') || finalUri.startsWith('/uploads/') || finalUri.startsWith('/api/')) {
            finalUri = `${apiDomain}${finalUri}`;
        }

        try {
            // Decode first to prevent double encoding, then encode
            finalUri = encodeURI(decodeURI(finalUri));
        } catch (e) {
            console.log("URI encoding failed", e);
        }
    }
    return finalUri;
};