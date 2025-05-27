import React, { useEffect, useState } from "react";
import { View, Alert, StyleSheet, Text } from "react-native";
import { TextInput, Button } from "react-native-paper";
import { LOCALHOST_IP } from "@env";

export default function ResetOtpScreen({ navigation, route }) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const email = route.params?.email;

  useEffect(() => {
    // Automatically send OTP when screen opens
    const sendOtp = async () => {
      try {
        const res = await fetch(`${LOCALHOST_IP}/api/auth/request-reset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const data = await res.json();
        if (!res.ok) {
          Alert.alert("Error", data?.msg || "Failed to send OTP.");
          navigation.goBack();
        }
      } catch (err) {
        Alert.alert("Error", "Failed to connect to server.");
        navigation.goBack();
      }
    };

    if (email) sendOtp();
    else navigation.goBack();
  }, []);

  const handleVerifyOtp = async () => {
    if (!otp) return Alert.alert("Missing", "Enter the OTP sent to your email.");

    setLoading(true);
    try {
      const res = await fetch(`${LOCALHOST_IP}/api/auth/verify-reset-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      if (res.ok) {
        navigation.replace("NewPassword", { email, otp });
      } else {
        Alert.alert("Invalid OTP", data?.msg || "Incorrect or expired code.");
      }
    } catch (err) {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subtitle}>We sent a code to: {email}</Text>

      <TextInput
        label="6-digit OTP"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={6}
        style={styles.input}
        textColor="#fff"
      />

      <Button mode="contained" onPress={handleVerifyOtp} loading={loading}>
        {loading ? "Verifying..." : "Verify OTP"}
      </Button>
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
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    color: "#aaa",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
    backgroundColor: "#1c1c1e",
  },
});
