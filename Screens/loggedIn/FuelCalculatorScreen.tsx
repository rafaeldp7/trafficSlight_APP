import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useUser } from '../../AuthContext/UserContext';
import axios from 'axios';
import { LOCALHOST_IP } from '@env';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

export default function FuelCalculatorScreen() {
  const navigation = useNavigation();
  const { user } = useUser();
  const [distance, setDistance] = useState('');
  const [fuelPrice, setFuelPrice] = useState('');
  const [motorList, setMotorList] = useState([]);
  const [selectedMotor, setSelectedMotor] = useState(null);
  const [manualEfficiency, setManualEfficiency] = useState('');
  const [fuelNeeded, setFuelNeeded] = useState(0);
  const [costEstimate, setCostEstimate] = useState(0);

  useEffect(() => {
    const fetchMotors = async () => {
      try {
        const res = await axios.get(`${LOCALHOST_IP}/api/user-motors/user/${user._id}`);
        setMotorList(res.data);
      } catch (err) {
        console.error('Failed to fetch motor list:', err.message);
      }
    };
    fetchMotors();
  }, [user]);

  const calculate = () => {
    const km = parseFloat(distance);
    const price = parseFloat(fuelPrice);
    const efficiency = selectedMotor?.fuelEfficiency || parseFloat(manualEfficiency);

    if (!km || !price || !efficiency) return;

    const estimatedFuel = km / efficiency;
    const totalCost = estimatedFuel * price;

    setFuelNeeded(estimatedFuel);
    setCostEstimate(totalCost);
  };

  const isButtonDisabled = () => {
    const hasMotor = !!selectedMotor;
    const manualEffOk = !hasMotor && parseFloat(manualEfficiency) > 0;
    const filled = distance && fuelPrice && (hasMotor || manualEffOk);
    return !filled;
  };

  return (
    <ScrollView style={styles.container}>

    {/* kapag gusto natin na may back button */}
      {/* <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fuel Calculator</Text>
      </View> */}


      <Text style={styles.title}>⛽ Fuel Calculator</Text>

      <Text style={styles.label}>Distance (km)</Text>
      <TextInput
        style={styles.input}
        value={distance}
        onChangeText={setDistance}
        keyboardType="numeric"
        placeholder="e.g. 50"
      />

      <Text style={styles.label}>Fuel Price (₱ per liter)</Text>
      <TextInput
        style={styles.input}
        value={fuelPrice}
        onChangeText={setFuelPrice}
        keyboardType="numeric"
        placeholder="e.g. 65"
      />

      <Text style={styles.label}>Select Motor</Text>
      {motorList.length === 0 && (
        <Text style={styles.warningText}>No motors found. Enter fuel efficiency manually below.</Text>
      )}
      {motorList.map((motor, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.motorItem,
            selectedMotor?.model === motor.model ? styles.motorItemSelected : null,
          ]}
          onPress={() => setSelectedMotor(motor)}
        >
          <Text style={styles.motorText}>
            {motor.nickname || motor.model} - {motor.fuelEfficiency} km/L
          </Text>
        </TouchableOpacity>
      ))}

      {selectedMotor ? (
        <>
          <Text style={styles.label}>Fuel Efficiency</Text>
          <Text style={styles.readOnlyInput}>{selectedMotor.fuelEfficiency} km/L</Text>
        </>
      ) : (
        <>
          <Text style={styles.label}>Manual Fuel Efficiency (km/L)</Text>
          <TextInput
            style={styles.input}
            value={manualEfficiency}
            onChangeText={setManualEfficiency}
            keyboardType="numeric"
            placeholder="e.g. 35"
          />
        </>
      )}

      <TouchableOpacity
        style={[styles.button, isButtonDisabled() && styles.buttonDisabled]}
        onPress={calculate}
        disabled={isButtonDisabled()}
      >
        <Text style={styles.buttonText}>Calculate</Text>
      </TouchableOpacity>

      {fuelNeeded > 0 && (
        <View style={styles.resultBox}>
          <Text style={styles.resultText}>
            Estimated Fuel: {fuelNeeded.toFixed(2)} L
          </Text>
          <Text style={styles.resultText}>
            Estimated Cost: ₱{costEstimate.toFixed(2)}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 50,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#2c3e50',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2c3e50',
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    marginTop: 15,
    color: '#34495e',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  readOnlyInput: {
    fontSize: 16,
    padding: 12,
    backgroundColor: '#ecf0f1',
    borderRadius: 8,
    color: '#2c3e50',
  },
  warningText: {
    fontSize: 14,
    color: 'tomato',
    marginBottom: 5,
    fontStyle: 'italic',
  },
  motorItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginTop: 10,
    backgroundColor: '#f5f5f5',
  },
  motorItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#e6f0ff',
  },
  motorText: {
    fontSize: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultBox: {
    marginTop: 30,
    padding: 20,
    borderRadius: 8,
    backgroundColor: '#ecf0f1',
  },
  resultText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 10,
    color: '#2c3e50',
  },
});
