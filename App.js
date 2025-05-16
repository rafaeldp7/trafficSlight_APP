import 'react-native-gesture-handler';
import React, { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { Provider as PaperProvider } from "react-native-paper";
import { AuthContext, AuthProvider } from "./AuthContext/AuthContext"; // Import AuthContext
import { UserContext, UserProvider } from "./AuthContext/UserContext"; // Import AuthContext
import SignedOutStack from "./Navigation/SignedOutStack";
import SignedInStack from "./Navigation/SignedInStack";

function MainApp() {
  const { userToken } = useContext(AuthContext);

  return (

    <PaperProvider>
      <NavigationContainer>
        {userToken ? <SignedInStack /> : <SignedOutStack />}
        
      </NavigationContainer>
    </PaperProvider>
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
