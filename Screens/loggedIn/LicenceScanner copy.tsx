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
import * as Camera from 'expo-camera';
import axios from 'axios';

export default function LicenseOCR() {
  const [image, setImage] = useState(null);
  const [ocrResult, setOcrResult] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_KEY = 'AIzaSyAzFeqvqzZUO9kfLVZZOrlOwP5Fg4LpLf4';

  const showImageSourceOptions = () => {
    Alert.alert('Select Source', 'Choose how you want to upload the license image:', [
      { text: 'Camera', onPress: launchCamera },
      { text: 'Gallery', onPress: launchGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera access is required.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setImage(asset.uri);
      sendToGoogleVision(asset.base64);
    }
  };

  const launchGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setImage(asset.uri);
      sendToGoogleVision(asset.base64);
    }
  };

  const sendToGoogleVision = async (base64) => {
    setLoading(true);
    setOcrResult('');
    setParsedData(null);

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

      const text = response.data.responses[0].fullTextAnnotation?.text || 'No text found';
      const parsed = parseLicenseFields(text);

      setOcrResult(text);
      setParsedData(parsed);
      console.log('Parsed Data:', parsed);
      console.log('OCR Result:', text);
      isValidLicenseData(parsed);
      console.log('Is valid license data:', isValidLicenseData(parsed));


    } catch (err) {
      console.error('OCR error:', err);
      Alert.alert('Error', 'Failed to extract text');
    } finally {
      setLoading(false);
    }
  };

const isValidLicenseData = (data) => {
  const licenseNumberValid = /^[A-Z0-9]{3}-\d{2}-\d{6}$/.test(data.licenseNumber);
  const dobValid = new Date(data.birthDate) < new Date();
  const expiryValid = new Date(data.expiryDate) > new Date();
  const age = new Date().getFullYear() - new Date(data.birthDate).getFullYear();
  const sexValid = data.sex === "M" || data.sex === "F";
  const minAge = age >= 16;

  console.log('License Number Valid:', licenseNumberValid);
  console.log('Date of Birth Valid:', dobValid);
  console.log('Expiry Date Valid:', expiryValid);
  console.log('adult age:', age);

  return licenseNumberValid && dobValid && expiryValid && sexValid && minAge;
};



const parseLicenseFields = (text) => {
  const name = text.match(/([A-Z]+,\s+[A-Z]+\s+[A-Z]+)/)?.[1]; // Last, First Middle
  const licenseNumber = text.match(/[A-Z]\d{2}-\d{2}-\d{6}/)?.[0] || 
                        text.match(/[A-Z0-9]{3}-\d{2}-\d{6}/)?.[0]; // C07-12-002747
  const birthDate = text.match(/\d{4}\/\d{2}\/\d{2}/)?.[0];
  const expiryDate = text.match(/Expiration Date\s*\n?(\d{4}\/\d{2}\/\d{2})/)?.[1] || 
                     text.match(/\d{4}\/\d{2}\/\d{2}/g)?.[1]; // 2nd date
  const address = text.match(/Address\s*\n?(.*)\n(BULACAN)/i);
  const sex = text.match(/\b(M|F)\b/)?.[1];

  const height = text.match(/Height\(m\)\s*\n?([\d.]+)/)?.[1];
  const restrictions = text.match(/DL Codes\s*\n?([A-Z0-9,]+)/i)?.[1];
  const licenseType = text.includes('NON-PROFESSIONAL')
    ? 'NON-PROFESSIONAL'
    : text.includes('PROFESSIONAL')
    ? 'PROFESSIONAL'
    : 'UNKNOWN';

  return {
    name: name || 'Not found',
    licenseNumber: licenseNumber || 'Not found',
    birthDate: birthDate || 'Not found',
    expiryDate: expiryDate || 'Not found',
    address: address ? `${address[1]} ${address[2]}` : 'Not found',
    sex: sex || 'Not found',
    height: height || 'Not found',
    restrictions: restrictions || 'Not found',
    licenseType,
  };
};


  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button title="Scan License" onPress={showImageSourceOptions} />

      {image && <Image source={{ uri: image }} style={styles.image} />}
      {loading && <ActivityIndicator size="large" style={{ marginTop: 10 }} />}

      {ocrResult !== '' && (
        <>
          <Text style={styles.sectionTitle}>Raw OCR Result:</Text>
          <Text selectable style={styles.text}>{ocrResult}</Text>
        </>
      )}

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
    marginTop: 20,
  },
  text: {
    fontSize: 14,
    marginVertical: 4,
  },
});
