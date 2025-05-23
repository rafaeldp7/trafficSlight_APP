import React, { useState } from "react";
import { View, Alert, StyleSheet, Text } from "react-native";
import { TextInput, Button } from "react-native-paper";
import { LOCALHOST_IP } from "@env";

export default function ResetOtpScreen({ navigation, route }) {
  const [otp, setOtp] = useState("");
  const email = route.params?.email;
  const [loading, setLoading] = useState(false);

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
        navigation.navigate("NewPassword", { email, otp });
      } else {
        Alert.alert("Error", data?.msg || "Invalid OTP.");
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
        {loading ? "Verifying..." : "Verify"}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black", padding: 24, justifyContent: "center" },
  title: { color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 30, textAlign: "center" },
  input: { marginBottom: 12, backgroundColor: "#1c1c1e" },
});
