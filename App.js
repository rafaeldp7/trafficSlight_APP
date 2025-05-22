import 'react-native-gesture-handler';
import React, { useContext } from "react";
import 'react-native-gesture-handler';

import * as Linking from 'expo-linking';
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from 'react-native-safe-area-context'; // ✅ Add this
import { Provider as PaperProvider } from "react-native-paper";
import { AuthContext, AuthProvider } from "./AuthContext/AuthContext";
import { UserContext, UserProvider } from "./AuthContext/UserContext";
import SignedOutStack from "./Navigation/SignedOutStack";
import SignedInStack from "./Navigation/SignedInStack";

function MainApp() {
  const { userToken } = useContext(AuthContext);

  const linking = {
    prefixes: ['trafficslight://'],
    config: {
      screens: {
        VerifyScreen: 'verify/:token',
        Login: 'login',
        RegisterScreen: 'register',
        // Add more screens as needed
      },
    },
  };

  return (
    <SafeAreaProvider> {/* ✅ Wrap everything */}
      <PaperProvider>
        <NavigationContainer linking={linking}>
          {userToken ? <SignedInStack /> : <SignedOutStack />}
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <MainApp />
      </UserProvider>
    </AuthProvider>
  );
}
