// ✅ MUST be first!
import 'react-native-gesture-handler';

import { registerRootComponent } from 'expo';
import App from './App';

// ✅ Ensures proper app setup for both Expo Go and standalone builds
registerRootComponent(App);
