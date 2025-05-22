import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Button, Alert } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { LOCALHOST_IP } from "@env";

export default function VerifyScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const token = route?.params?.token ?? null;

  const [message, setMessage] = useState("Verifying your email...");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const verifyEmail = async () => {
    if (!token) {
      setMessage("❌ Invalid or missing verification token.");
      setLoading(false);
      setRetry(false);
      return;
    }

    setLoading(true);
    setRetry(false);
    
    // Only log in development - remove in production
    if (__DEV__) {
      console.log("🔑 Received token:", token.substring(0, 10) + "...");
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(
        `${LOCALHOST_IP}/api/auth/verify/${token}`,
        {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ msg: 'Unknown error occurred' }));
        throw new Error(data.msg || `Server error: ${response.status}`);
      }

      const data = await response.json();
      
      setMessage("✅ Email verified successfully! Redirecting to login...");
      setIsSuccess(true);
      
      setTimeout(() => {
        navigation.navigate("Login");
      }, 2500);

    } catch (error) {
      console.error("Verification error:", error);
      
      if (error.name === 'AbortError') {
        setMessage("❌ Request timed out. Please check your connection and try again.");
      } else if (error.message) {
        setMessage(`❌ Verification failed: ${error.message}`);
      } else {
        setMessage("❌ Something went wrong. Please try again later.");
      }
      
      setRetry(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    verifyEmail();
  };

  const handleGoToLogin = () => {
    navigation.navigate("Login");
  };

  useEffect(() => {
    verifyEmail();
  }, [token]);

  return (
    <View style={styles.container}>
      {loading && (
        <ActivityIndicator 
          size="large" 
          color="#007AFF" 
          accessibilityLabel="Verifying email"
        />
      )}
      
      <Text 
        style={[styles.text, isSuccess && styles.successText]}
        accessibilityRole="text"
        accessibilityLiveRegion="polite"
      >
        {message}
      </Text>

      {!loading && retry && (
        <View style={styles.buttonContainer}>
          <Button 
            title="Retry Verification" 
            onPress={handleRetry} 
            color="#007AFF"
            accessibilityLabel="Retry email verification"
          />
        </View>
      )}

      {!loading && !retry && !isSuccess && (
        <View style={styles.buttonContainer}>
          <Button 
            title="Go to Login" 
            onPress={handleGoToLogin} 
            color="#666"
            accessibilityLabel="Navigate to login screen"
          />
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
    lineHeight: 24,
  },
  successText: {
    color: "#4CAF50",
  },
  buttonContainer: {
    marginTop: 30,
    minWidth: 200,
  },
});