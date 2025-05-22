import React, { useState, useContext } from "react";
import {
  View,
  Alert,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import {
  TextInput,
  Button,
  Portal,
  Modal,
  List,
} from "react-native-paper";
import { AuthContext } from "../AuthContext/AuthContext";
import { LOCALHOST_IP } from "@env";


const inputTheme = {
  colors: {
    text: "#fff",
    primary: "#007AFF",
    background: "#fff",
    placeholder: "#aaa",
    selectionColor: "#007AFF",
    underlineColor: "transparent",
  },
};

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secureText, setSecureText] = useState(true);
  const [province, setProvince] = useState("Metro Manila");
  const [city, setCity] = useState("Valenzuela");
  const [barangay, setBarangay] = useState("");
  const [street, setStreet] = useState("");
  const [barangayModal, setBarangayModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);

const handleRegister = async () => {
  if (loading) return;
  setLoading(true);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

  if (!name || !email || !password || !confirmPassword || !city || !province || !barangay || !street) {
    Alert.alert("Error", "Please fill out all fields");
    setLoading(false);
    return;
  }

  if (!emailRegex.test(email)) {
    Alert.alert("Invalid Email", "Please enter a valid email address.");
    setLoading(false);
    return;
  }

  if (!passwordRegex.test(password)) {
    Alert.alert(
      "Weak Password",
      "Password must be at least 8 characters long and include both letters and numbers."
    );
    setLoading(false);
    return;
  }

  if (password !== confirmPassword) {
    Alert.alert("Error", "Passwords do not match");
    setLoading(false);
    return;
  }

  try {
    const response = await fetch(`${LOCALHOST_IP}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email: email.toLowerCase(),
        password,
        city,
        province,
        barangay,
        street,
      }),
    });

    const data = await response.json();

    if (response.status === 201) {
      Alert.alert(
        "Success",
        "Registration successful! Please verify your email.",
        [
          {
            text: "OK",
            onPress: () => {
              // 👇 navigate to VerifyScreen and pass token
              if (data.token) {
                navigation.navigate("VerifyScreen", { token: data.token });
              } else {
                navigation.navigate("Login");
              }
            },
          },
        ]
      );

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setBarangay("");
      setStreet("");
    } else {
      const errorMsg = data?.msg || "Registration failed. Please try again.";
      Alert.alert("Error", errorMsg);
    }
  } catch (error) {
    console.error("Registration Error:", error);
    Alert.alert("Error", "Something went wrong. Please try again later.");
  }

  setLoading(false);
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create a New Account</Text>

      <TextInput
        label="Name"
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
        theme={inputTheme}
      />
      <TextInput
        label="Email"
        value={email}
        onChangeText={(text) => setEmail(text.toLowerCase())}
        mode="outlined"
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
        theme={inputTheme}
      />
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={secureText}
        mode="outlined"
        style={styles.input}
        theme={inputTheme}
        right={
          <TextInput.Icon
            icon={secureText ? "eye-off" : "eye"}
            onPress={() => setSecureText(!secureText)}
            color="#007AFF"
          />
        }
      />
      <TextInput
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry={secureText}
        mode="outlined"
        style={styles.input}
        theme={inputTheme}
        right={
          <TextInput.Icon
            icon={secureText ? "eye-off" : "eye"}
            onPress={() => setSecureText(!secureText)}
            color="#007AFF"
          />
        }
      />
      <TextInput
        label="Barangay"
        value={barangay}
        mode="outlined"
        onFocus={() => {
          setBarangayModal(true);
          Keyboard.dismiss();
        }}
        style={styles.input}
        theme={inputTheme}
      />
      <Portal>
        <Modal
          visible={barangayModal}
          onDismiss={() => setBarangayModal(false)}
          contentContainerStyle={styles.modal}
        >
          <ScrollView>
            {Object.keys(valenzuelaData).map((b) => (
              <List.Item
                key={b}
                title={b}
                titleStyle={styles.listItem}
                onPress={() => {
                  setBarangay(b);
                  setStreet("");
                  setBarangayModal(false);
                }}
              />
            ))}
          </ScrollView>
        </Modal>
      </Portal>

      <TextInput
        label="Street"
        value={street}
        onChangeText={setStreet}
        mode="outlined"
        style={styles.input}
        theme={inputTheme}
      />


      <Button
        mode="contained"
        onPress={handleRegister}
        style={styles.button}
        labelStyle={styles.buttonText}
        contentStyle={styles.buttonContent}
        loading={loading}
        disabled={loading}
      >
        Register
      </Button>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.loginText}>
          Already have an account? <Text style={styles.loginLink}>Login</Text>
        </Text>
      </TouchableOpacity>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    padding: 24,
    justifyContent: "center",
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    marginBottom: 15,
    color: "#fff",
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 30,
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
  },
  buttonContent: {
    paddingVertical: 10,
  },
  loginText: {
    marginTop: 30,
    color: "#aaa",
    textAlign: "center",
  },
  loginLink: {
    color: "#007AFF",
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
  modal: {
    backgroundColor: "#1c1c1e",
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 10,
  },
  listItem: {
    color: "#fff",
  },
});
