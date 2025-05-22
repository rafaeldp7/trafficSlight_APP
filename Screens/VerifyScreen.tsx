import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Button } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { LOCALHOST_IP } from "@env";

export default function VerifyScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const token = route?.params?.token ?? null;

  const [message, setMessage] = useState("Verifying your email...");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(false);

  const verifyEmail = async () => {
    if (!token) {
      setMessage("❌ Invalid or missing token.");
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log("🔑 Received token:", token);

    try {
      const response = await fetch(`${LOCALHOST_IP}/api/auth/verify/${token}`);
      const data = await response.json();

      if (response.ok) {
        setMessage("✅ Email verified successfully! You may now login.");
        setTimeout(() => {
          navigation.navigate("Login");
        }, 3000);
      } else {
        setMessage(`❌ Verification failed: ${data.msg}`);
        setRetry(true);
      }
    } catch (error) {
      console.error("Verification error:", error);
      setMessage("❌ Something went wrong. Try again later.");
      setRetry(true);
    }

    setLoading(false);
  };

  useEffect(() => {
    verifyEmail();
  }, [token]);

  return (
    <View style={styles.container}>
      {loading && <ActivityIndicator size="large" color="#007AFF" />}
      <Text style={styles.text}>
        {message}
        </Text>

      {!loading && retry && (
        <View style={{ marginTop: 20 }}>
          <Button title="Retry" onPress={verifyEmail} color="#007AFF" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  text: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    marginTop: 20,
  },
});
