import React, { useState } from "react";
import { View, Alert, StyleSheet, Text } from "react-native";
import { TextInput, Button } from "react-native-paper";
import { LOCALHOST_IP } from "@env";



export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);


  const handleRequestOtp = async () => {
    if (!email) return Alert.alert("Missing", "Please enter your email.");

    setLoading(true);
    try {
      const res = await fetch(`${LOCALHOST_IP}/api/auth/request-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });


      const data = await res.json();
      if (res.ok) {
        Alert.alert("OTP Sent", "Check your email for a reset code.");
        navigation.navigate("ResetOtp", { email });
      } else {
        Alert.alert("Error", data?.msg || "Failed to send OTP.");
      }
    } catch (err) {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>
      <TextInput
        label="Email"
        value={email}
        onBlur={() => validateEmail(email)}

        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
        textColor="#fff"
      />
      <Button mode="contained" onPress={handleRequestOtp} loading={loading}>
        {loading ? "Sending..." : "Send OTP"}
      </Button>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black", padding: 24, justifyContent: "center" },
  title: { color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 30, textAlign: "center" },
  input: { marginBottom: 12, backgroundColor: "#1c1c1e",color:"#fff" },
});
