import React, { useState } from 'react';
import {
  View,
  Text,
  Button,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

export default function LicenseOCR() {
  const [frontImage, setFrontImage] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  const API_KEY = 'AIzaSyAzFeqvqzZUO9kfLVZZOrlOwP5Fg4LpLf4'; // 🔐 Replace with your actual API key

  const runOCR = async (base64: string) => {
    const body = {
      requests: [
        {
          image: { content: base64 },
          features: [{ type: 'TEXT_DETECTION' }],
        },
      ],
    };

    try {
      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`,
        body,
        { headers: { 'Content-Type': 'application/json' } }
      );
      return response.data.responses[0].fullTextAnnotation?.text || 'No text found';
    } catch (err) {
      console.error('OCR error:', err);
      Alert.alert('Error', 'Failed to extract text');
      return '';
    }
  };

  const pickImageFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.8 });
    if (!result.canceled) {
      setFrontImage(result.assets[0].uri);
      processImage(result.assets[0].base64);
    }
  };

  const captureImageWithCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera access is required.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 });
    if (!result.canceled) {
      setFrontImage(result.assets[0].uri);
      processImage(result.assets[0].base64);
    }
  };

  const processImage = async (base64: string) => {
    setLoading(true);
    setParsedData(null);
    setIsValid(null);
    const text = await runOCR(base64);
    setOcrText(text);
    const parsed = parseLicenseFields(text);
    setParsedData(parsed);
    setIsValid(isValidLicenseData(parsed));
    setLoading(false);
  };

  const isValidLicenseData = (data) => {
    return /^[A-Z0-9]{3}-\d{2}-\d{6}$/.test(data.licenseNumber);
  };

  const parseLicenseFields = (text: string) => {
    const rawDLCodes = text.match(/DL Codes\s*\n?([A-Z0-9,]+)/i)?.[1] || '';

    return {
      name: text.match(/[A-Z]+,\s+[A-Z]+\s+[A-Z]+/)?.[0] || 'Not found',
      licenseNumber: text.match(/[A-Z0-9]{3}-\d{2}-\d{6}/)?.[0] || 'Not found',
      birthDate: text.match(/\d{4}\/\d{2}\/\d{2}/)?.[0] || 'Not found',
      expiryDate:
        text.match(/Expiration Date\s*\n?(\d{4}\/\d{2}\/\d{2})/)?.[1] ||
        text.match(/\d{4}\/\d{2}\/\d{2}/g)?.[1] ||
        'Not found',
      address: text.match(/Address\s*\n?(.*)\n(BULACAN|CITY)/i)
        ? `${text.match(/Address\s*\n?(.*)\n(BULACAN|CITY)/i)[1]} ${text.match(/Address\s*\n?(.*)\n(BULACAN|CITY)/i)[2]}`
        : 'Not found',
      sex: text.match(/\b(M|F)\b/)?.[1] || 'Not found',
      height: text.match(/Height\(m\)\s*\n?([\d.]+)/)?.[1] || 'Not found',
      dlCodes: rawDLCodes || 'Not found',
    };
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Driver’s License OCR</Text>

      <Button title="📷 Capture with Camera" onPress={captureImageWithCamera} />
      <View style={{ height: 10 }} />
      <Button title="🖼️ Pick from Gallery" onPress={pickImageFromGallery} />

      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}
      {frontImage && <Image source={{ uri: frontImage }} style={styles.image} />}

      {parsedData && (
        <>
          <Text style={styles.sectionTitle}>Parsed Fields:</Text>
          {Object.entries(parsedData).map(([key, val]) => (
            <Text key={key} style={styles.text}>
              {key}: {String(val)}
            </Text>
          ))}
        </>
      )}

      {isValid !== null && (
        <Text style={[styles.validityText, { color: isValid ? 'green' : 'red' }]}>
          {isValid ? '✅ Valid Driver’s License' : '❌ Invalid License Number Format'}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  image: {
    width: '100%',
    height: 220,
    resizeMode: 'contain',
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 15,
    textAlign: 'center',
  },
  text: {
    fontSize: 14,
    marginVertical: 4,
  },
  validityText: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
