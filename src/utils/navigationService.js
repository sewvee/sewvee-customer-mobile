import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
    if (navigationRef.isReady()) {
        navigationRef.navigate(name, params);
    } else {
        // If navigator is not ready, retry once after a delay
        // This is crucial for app startup from a killed state
        setTimeout(() => {
            if (navigationRef.isReady()) {
                navigationRef.navigate(name, params);
            }
        }, 1000);
    }
}
