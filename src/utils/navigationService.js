
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
    const tryNavigate = (attempts) => {
        if (navigationRef.isReady()) {
            // Check if the current state contains the target screen
            // If it's a cold boot, we might still be on the "Auth" stack while waiting for the token.
            const state = navigationRef.getRootState();
            const routeNames = state ? state.routeNames : [];
            
            // If the route name doesn't exist in the current root state, it means the Auth stack is still active.
            // Wait for RootNavigator to switch to the main App stack.
            if (routeNames.includes(name) || routeNames.includes('Main')) {
                navigationRef.navigate(name, params);
                return;
            }
        }
        
        if (attempts < 20) {
            // Retry up to 20 times (10 seconds total) for slow cold boots
            setTimeout(() => tryNavigate(attempts + 1), 500);
        } else {
            console.warn("Navigation failed: Target route not available after 10 seconds.");
        }
    };
    tryNavigate(0);
}
