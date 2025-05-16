import React, { useState, useContext } from "react";
import {
  View,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { TextInput, Button, Modal, Portal, List, Card } from "react-native-paper";
import { LOCALHOST_IP } from "@env"; // Use environment variable
import tw from "twrnc";

import { AuthContext } from "../AuthContext/AuthContext"; // Import AuthContext

const valenzuelaData = {
  "Arkong Bato": ["San Juan St.", "M.H. Del Pilar St.", "MacArthur Highway"],
  "Balangkas": ["Balangkas St.", "Rivera St.", "Mendoza St."],
  "Bignay": ["Maliputo St.", "Tilapia St.", "Bangus St."],
  "Bisig": ["Tugatog St.", "Mangga St.", "Ilang-Ilang St."],
  "Canumay East": ["Cayetano St.", "Marang St.", "Molave St."],
  "Canumay West": ["Bayabas St.", "Narra St.", "Ipil St."],
  "Coloong": ["Sampaguita St.", "Dahlia St.", "Rizal St."],
  "Dalandanan": ["Pulo St.", "R. Mercado St.", "Sampalok St."],
  "Gen. T. de Leon": ["Buhay Na Tubig St.", "Capistrano St.", "Camia St."],
  "Karuhatan": ["Karuhatan Road", "Doña Trinidad St.", "Villanueva St."],
  "Lawang Bato": ["Kaybiga Road", "Camachile St.", "Dama de Noche St."],
  "Lingunan": ["Villa St.", "Marcos St.", "Cruz St."],
  "Mabolo": ["Sapang Bakaw St.", "Talong St.", "Pechay St."],
  "Malinta": ["T. Santiago St.", "Lazaro St.", "F. Cruz St."],
  "Mapulang Lupa": ["Caimito St.", "Atis St.", "Sampalok St."],
  "Marulas": ["Dalandan St.", "Gomburza St.", "San Miguel St."],
  "Maysan": [
      "A. Marcelo St.",
      "Ador St.",
      "Alberto St.",
      "Alley 3",
      "Ann Ville Ave.",
      "Antonio St.",
      "Arsing St.",
      "Baltazar St.",
      "Bible St.",
      "Buenaventura St.",
      "C. Cabral St.",
      "Cable St.",
      "Cadena De Amor St.",
      "Catalina St.",
      "Champaca St.",
      "Colombia St.",
      "De Galicia St.",
      "De Leon St.",
      "Dela Cruz Alley",
      "Derupa St.",
      "Digital St.",
      "Dionisio Alley",
      "Dito St.",
      "Doon St.",
      "E. Cabral St.",
      "E. Cantillon St.",
      "E. Dela Cruz Alley",
      "E. Roberto St.",
      "Earth St.",
      "Elisa St.",
      "F. Alarcon St.",
      "F. De Zafra St.",
      "F. San Diego St.",
      "F. Santiago St.",
      "Faith St.",
      "First St.",
      "G. Marcelo St.",
      "Galguera St.",
      "Ilang-Ilang St.",
      "Induction St.",
      "Ipil St.",
      "Isidoro Francisco St.",
      "J. Francisco St.",
      "Kamagong St.",
      "Lanozo St.",
      "Lorenzo St.",
      "M. De Galicia St.",
      "M. Delos Reyes St.",
      "Mars St.",
      "Maysan Rd.",
      "Medina St.",
      "Menlo 2nd St.",
      "Menlo 3rd St.",
      "Menlo 4th St.",
      "Mercury St.",
      "Metro Sotanghon St.",
      "Molave St.",
      "Narra St.",
      "New Prodon St.",
      "O. Miranda St.",
      "Padrigal Extension St.",
      "Padrinao St.",
      "Pluto St.",
      "R. Jacinto St.",
      "Region B St.",
      "S. Cabral St.",
      "S. Lucas St.",
      "S. Marcelo St.",
      "Sabino Alley",
      "Saint Alviar St.",
      "Saint Matthew St.",
      "Salvador St.",
      "San Andres St.",
      "San Diego 2nd St.",
      "San Diego 3rd St.",
      "San Matias St.",
      "San Miguel St.",
      "Santa Monica St.",
      "San Antonio St.",
      "San Isidro St.",
      "San Jose St.",
      "San Juan St.",
      "San Pedro St.",
      "San Vicente St.",
      "Santo Niño St.",
      "Santol St.",
      "Sapang Palay St.",
      "Sityo 1st St.",
      "Sityo 2nd St.",
      "Tandang Sora St.",
      "Tayuman St.",
      "Trinidad St.",
      "Tulip St.",
      "Vicente St.",
      "Villanueva St."
    ],
  "Palasan": ["Banaba St.", "Acacia St.", "Mahogany St."],
  "Parada": ["G. Lazaro St.", "Lopez St.", "Sikatuna St."],
  "Paso de Blas": ["Ilang-Ilang St.", "Pangilinan St.", "Bougainvilla St."],
  "Pasolo": ["Pasolo Road", "J. Cruz St.", "Tulip St."],
  "Polo": ["Katipunan St.", "R. Santos St.", "Bonifacio St."],
  "Punturin": ["C. Pascual St.", "C. Cruz St.", "Daisy St."],
  "Rincon": ["Sampaguita St.", "Marigold St.", "Ilaw St."],
  "Tagalag": ["Talaba St.", "Tahong St.", "Alimango St."],
  "Ugong": ["J.P. Rizal St.", "A. Mabini St.", "M. Roxas St."],
  "Viente Reales": ["Katmon St.", "Lawaan St.", "Yakal St."],
  "Wawang Pulo": ["Bignay St.", "Kangkong St.", "Pandan St."],
};

export default function RegisterScreen() {
  console.log(LOCALHOST_IP);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); // New state for confirm password
  const [secureText, setSecureText] = useState(true);
  const [province, setProvince] = useState("Metro Manila");
  const [city, setCity] = useState("Valenzuela");
  const [barangay, setBarangay] = useState("");
  const [street, setStreet] = useState("");
  const [barangayModal, setBarangayModal] = useState(false);
  const [streetModal, setStreetModal] = useState(false);
  const { login } = useContext(AuthContext);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword || !city || !province || !barangay || !street) {
      Alert.alert("Error", "Please fill out all fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    const requestBody = { name, email, password, city, province, barangay, street };
    console.log("Sending request:", requestBody);

    try {
      const response = await fetch(`${LOCALHOST_IP}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.status === 201) {
        Alert.alert("Success", "Registration Successful!");
        await login(data.token);
        Alert.alert("Registration Successful"); //Alert.alert("Login Successful");
      } else {
        Alert.alert("Error", data.msg || "Registration Failed");
      }
    } catch (error) {
      console.error("Registration Error:", error);
      Alert.alert("Error", "Something went wrong");
    }
  };

  return (
    <View style={tw`flex-1 justify-center px-5 bg-gray-100`}>
      <Card style={tw`p-5 shadow-lg`}>
        <Card.Title title="Register" />
        <Card.Content>
          <TextInput label="Name" value={name} onChangeText={setName} mode="outlined" style={tw`mb-3`} />
          <TextInput label="Email" value={email} onChangeText={setEmail} mode="outlined" style={tw`mb-3`} />
          <TextInput
            label="Password"
            value={password}
            secureTextEntry={secureText}
            onChangeText={setPassword}
            mode="outlined"
            style={tw`mb-3`}
            right={<TextInput.Icon icon={secureText ? "eye-off" : "eye"} onPress={() => setSecureText(!secureText)} />}
          />
          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            secureTextEntry={secureText}
            onChangeText={setConfirmPassword}
            mode="outlined"
            style={tw`mb-5`}
            right={<TextInput.Icon icon={secureText ? "eye-off" : "eye"} onPress={() => setSecureText(!secureText)} />}
          />

          <TextInput
            label="Barangay"
            value={barangay}
            mode="outlined"
            onFocus={() => {
              setBarangayModal(true);
              Keyboard.dismiss();
            }}
            style={tw`mb-3`}
          />
          <Portal>
            <Modal visible={barangayModal} onDismiss={() => setBarangayModal(false)} contentContainerStyle={tw`bg-white p-5 rounded-lg mx-5`}>
              <ScrollView style={tw`max-h-60`}>
                {Object.keys({...valenzuelaData}).map((b) => (
                  <List.Item key={b} title={b} onPress={() => { setBarangay(b); setStreet(""); setBarangayModal(false); }} />
                ))}
              </ScrollView>
            </Modal>
          </Portal>

          <TextInput
            label="Street"
            value={street}
            mode="outlined"
            editable={!!barangay}
            onFocus={() => {
              setStreetModal(true);
              Keyboard.dismiss();
            }}
            style={tw`mb-3`}
          />
          <Portal>
            <Modal visible={streetModal} onDismiss={() => setStreetModal(false)} contentContainerStyle={tw`bg-white p-5 rounded-lg mx-5`}>
              <ScrollView style={tw`max-h-60`}>
                {(valenzuelaData[barangay] || []).map((s) => (
                  <List.Item key={s} title={s} onPress={() => { setStreet(s); setStreetModal(false); }} />
                ))}
              </ScrollView>
            </Modal>
          </Portal>     

          <Button mode="contained" onPress={handleRegister} style={tw`bg-blue-500 py-2`}>
            Register
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
}
