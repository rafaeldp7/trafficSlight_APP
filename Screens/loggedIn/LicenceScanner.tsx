import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  Button,
  Modal,
  Pressable,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import {GOOGLE_MAPS_API_KEY} from '@env'; // Ensure you have this set up in your .env file

export default function LicenseOCRScreen() {
  const [image, setImage] = useState(null);
  const [ocrResult, setOcrResult] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const API_KEY = GOOGLE_MAPS_API_KEY; // Replace with your key

  const showImageOptions = () => {
    Alert.alert('Upload License', 'Choose an image source', [
      { text: 'Camera', onPress: pickFromCamera },
      { text: 'Gallery', onPress: pickFromGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.8 });
    if (!result.canceled) {
      const asset = result.assets[0];
      setImage(asset.uri);
      processOCR(asset.base64);
    }
  };

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission denied', 'Camera access is required.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 });
    if (!result.canceled) {
      const asset = result.assets[0];
      setImage(asset.uri);
      processOCR(asset.base64);
    }
  };

  const processOCR = async (base64) => {
    setLoading(true);
    setParsedData(null);
    setOcrResult('');
    setIsSuccess(false);

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

      const text = response.data.responses[0].fullTextAnnotation?.text || '';
      setOcrResult(text);
      const parsed = parseFields(text);
      setParsedData(parsed);

      const validation = validateLicense(parsed);
      if (!validation.valid) {
        setModalMessage(validation.reason);
        setModalVisible(true);
      } else {
        setIsSuccess(true);
        setModalMessage('✅ Valid driver’s license detected!');
        setModalVisible(true);
        // navigation.navigate('NextScreen'); // <- Uncomment and use as needed
      }
    } catch (err) {
      console.error(err);
      setModalMessage('Error extracting text. Please try again.');
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const parseFields = (text) => {
    const licenseNumber = text.match(/[A-Z0-9]{3}-\d{2}-\d{6}/)?.[0] || 'Not found';
    const birthDate = text.match(/\d{4}\/\d{2}\/\d{2}/)?.[0] || 'Not found';
    const expiryDate =
      text.match(/Expiration Date\s*\n?(\d{4}\/\d{2}\/\d{2})/)?.[1] ||
      text.match(/\d{4}\/\d{2}\/\d{2}/g)?.[1] ||
      'Not found';
    const sex = text.match(/\b(M|F)\b/)?.[1] || 'Not found';
    const dlCodes = text.match(/DL Codes\s*\n?([A-Z0-9,]+)/i)?.[1] || 'Not found';
    const addressMatch = text.match(/Address\s*\n?([^\n]+)\n([^\n]+)/i);
    const address = addressMatch ? `${addressMatch[1]} ${addressMatch[2]}` : 'Not found';

    const proCodes = ['B2', 'C', 'D', 'E'];
    const isPro = proCodes.some(code => dlCodes.includes(code));
    const licenseType = isPro
      ? 'PROFESSIONAL'
      : dlCodes !== 'Not found'
      ? 'NON-PROFESSIONAL'
      : 'UNKNOWN';

    return {
      name: text.match(/[A-Z]+,\s+[A-Z]+\s+[A-Z]+/)?.[0] || 'Not found',
      licenseNumber,
      birthDate,
      expiryDate,
      address,
      sex,
      dlCodes,
      licenseType,
    };
  };

const validateLicense = (data) => {
  const licenseNumberValid = /^[A-Z0-9]{3}-\d{2}-\d{6}$/.test(data.licenseNumber);
  if (!licenseNumberValid) return { valid: false, reason: '❌ Invalid License Number Format' };

  const expiry = new Date(data.expiryDate.replace(/\//g, '-')); // 👈 fix here
    console.log('Parsed Expiry not expired:', expiry);
  if (isNaN(expiry.getTime()) || expiry < new Date()) {
    console.log('Parsed Expiry:', expiry);
    return { valid: false, reason: '❌ License is expired or invalid date format' };
  }

  return { valid: true };
};


  return (
    <View style={styles.container}>
      <Button title="Scan Driver’s License" onPress={showImageOptions} />

      {image && <Image source={{ uri: image }} style={styles.image} />}
      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}

      {parsedData && (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.sectionTitle}>Parsed License Info</Text>
          {Object.entries(parsedData).map(([key, value]) => (
            <Text style={styles.text} key={key}>
              {key}: {String(value)}
            </Text>
          ))}
        </View>
      )}

      {/* Modal for feedback */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalText}>{modalMessage}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => {
                setModalVisible(false);
                setParsedData(null);
                setImage(null);
                setOcrResult('');
                setIsSuccess(false);
              }}
            >
              <Text style={{ color: '#fff' }}>{isSuccess ? 'OK' : 'Try Again'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flex: 1 },
  image: { width: '100%', height: 250, marginVertical: 15, resizeMode: 'contain' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  text: { fontSize: 14, marginBottom: 4 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalText: { fontSize: 16, textAlign: 'center', marginBottom: 15 },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
});
