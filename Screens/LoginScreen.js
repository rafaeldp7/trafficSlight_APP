import React, { useState, useEffect, useContext } from "react";
import { View, Alert } from "react-native";
import { TextInput, Button, Card, IconButton, Text } from "react-native-paper"; // Import IconButton
import * as Google from "expo-auth-session/providers/google";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { GOOGLE_CLIENT_ID, LOCALHOST_IP } from "@env";
import tw from "twrnc"; // Import Tailwind

import { AuthContext } from "../AuthContext/AuthContext"; // Import AuthContext
import { useUser } from "../AuthContext/UserContext";

console.log("LOCALHOST_IP:", LOCALHOST_IP); // Debugging

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secureText, setSecureText] = useState(true); // Toggle state
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
  });
  const { login } = useContext(AuthContext); // Get login function from AuthContext
  const { saveUser } = useUser(); // Import saveUser from UserContext


  // Handle Email/Password Login
  const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert("Error", "Please fill in both fields");
    return;
  }

  console.log("Fetching from:", `${LOCALHOST_IP}/api/auth/login`);

  try {
    const res = await fetch(`${LOCALHOST_IP}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      await login(data.token); // Save token in AuthContext
      await saveUser(data.user); // Save user details in UserContext

      Alert.alert("Login Successful");
      // navigation.replace("Home");
    } else {
      Alert.alert("Error", data.msg || "Login failed");
    }
  } catch (error) {
    console.error("Fetch Error:", error);
    Alert.alert("Error", "Network request failed. Check API connection.");
  }
};
  

  // Handle Google OAuth Login
  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      AsyncStorage.setItem("token", authentication.accessToken);
      Alert.alert("Login Successful with Google");
      navigation.replace("Home");
    }
  }, [response]);

  return (
    <View style={tw`flex-1 justify-center p-5 bg-gray-100`}>
      <Card style={tw`p-5 shadow-lg`}>
        <Card.Title title="Login" />
        <Card.Content>
          <TextInput label="Email" value={email} onChangeText={setEmail} mode="outlined" style={tw`mb-3`} />
          <TextInput
            label="Password"
            value={password}
            secureTextEntry={secureText} // Toggle visibility
            onChangeText={setPassword}
            mode="outlined"
            style={tw`mb-5`}
            right={
              <TextInput.Icon 
                icon={secureText ? "eye-off" : "eye"} 
                onPress={() => setSecureText(!secureText)}
              />
            }
          />
          <Button mode="contained" onPress={handleLogin} style={tw`bg-blue-500 py-2`}>
            Login
          </Button>
          <Button mode="outlined" onPress={() => promptAsync()} style={tw`mt-3 border-blue-500`}>
            Login with Google
          </Button>
          <Text style={tw`mt-5 text-center text-blue-500`} onPress={() => navigation.navigate("Register")}>
            Don't have an account? Register
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}
