import React, { useState, useEffect, useContext } from "react";
import { View, Alert, Text, StyleSheet, Image } from "react-native";
import { TextInput, Button } from "react-native-paper";
import * as Google from "expo-auth-session/providers/google";

import { GOOGLE_CLIENT_ID, LOCALHOST_IP } from "@env";
import { AuthContext } from "../AuthContext/AuthContext";
import { useUser } from "../AuthContext/UserContext";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    scopes: ["profile", "email"],
  });

  const { login } = useContext(AuthContext);
  const { saveUser } = useUser();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in both fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${LOCALHOST_IP}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        await login(data.token);
        if (data.user) {
          await saveUser(data.user);
        }
        Alert.alert("Login Successful");
        // navigation.navigate("Main"); // <- replace with your actual screen name
      } else {
        setPassword("");
        Alert.alert("Error", data.msg || "Login failed");
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      Alert.alert("Error", "Network request failed. Check API connection.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      fetch(`${LOCALHOST_IP}/api/auth/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: authentication.idToken || authentication.accessToken,
        }),
      })
        .then((res) => res.json())
        .then(async (data) => {
          if (data.token) {
            await login(data.token);
            if (data.user) {
              await saveUser(data.user);
            }
            Alert.alert("Login Successful with Google");
            navigation.replace("Main"); // <- replace if needed
          } else {
            Alert.alert("Google Login failed");
          }
        })
        .catch((err) => {
          console.error("Google login error:", err);
          Alert.alert("Network error during Google login");
        });
    }
  }, [response]);

  return (
    <View style={styles.container}>
      <Image source={require("../assets/logo.png")} style={styles.logo} />

      <Text style={styles.title}>Login to Your Account</Text>

      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        mode="outlined"
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
        theme={{ colors: { text: "#fff", primary: "#007AFF", background: "#1c1c1e" } }}
        textColor="#fff"
      />
      <TextInput
        label="Password"
        value={password}
        secureTextEntry={secureText}
        onChangeText={setPassword}
        mode="outlined"
        style={styles.input}
        theme={{ colors: { text: "#fff", primary: "#007AFF", background: "#1c1c1e" } }}
        textColor="#fff"
        right={
          <TextInput.Icon
            icon={secureText ? "eye-off" : "eye"}
            onPress={() => setSecureText(!secureText)}
            color="#007AFF"
          />
        }
      />

      <Button
        mode="contained"
        onPress={handleLogin}
        loading={loading}
        disabled={loading}
        style={styles.button}
        labelStyle={styles.buttonText}
        contentStyle={styles.buttonContent}
      >
        Login
      </Button>

      <Button
        mode="outlined"
        onPress={() => promptAsync()}
        disabled={!request}
        style={styles.googleButton}
        labelStyle={styles.googleButtonText}
        contentStyle={styles.buttonContent}
      >
        Login with Google
      </Button>

      <Text
        style={styles.registerText}
        onPress={() => navigation.navigate("Register")}
      >
        Don't have an account? <Text style={styles.registerLink}>Register</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
    resizeMode: "contain",
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 30,
  },
  input: {
    width: "100%",
    marginBottom: 15,
    backgroundColor: "#1c1c1e",
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 30,
    width: "100%",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
  },
  buttonContent: {
    paddingVertical: 10,
  },
  googleButton: {
    borderColor: "#007AFF",
    borderWidth: 1,
    borderRadius: 30,
    width: "100%",
    marginTop: 15,
  },
  googleButtonText: {
    color: "#007AFF",
    fontSize: 16,
  },
  registerText: {
    marginTop: 30,
    color: "#aaa",
    textAlign: "center",
  },
  registerLink: {
    color: "#007AFF",
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
});
