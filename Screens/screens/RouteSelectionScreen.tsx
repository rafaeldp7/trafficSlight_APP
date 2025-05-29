// import React, { useEffect, useRef, useState, useCallback } from "react";
// import {
//   View,
//   Text,
//   SafeAreaView,
//   KeyboardAvoidingView,
//   Platform,
//   ActivityIndicator,
//   Alert,
//   Modal,
//   TextInput,
//   TouchableOpacity,
//   TouchableWithoutFeedback,
//   Keyboard,
//   StyleSheet,
// } from "react-native";
// import DropDownPicker from "react-native-dropdown-picker";
// import Toast from "react-native-toast-message";
// import MaterialIcons from "react-native-vector-icons/MaterialIcons";

// import { useUserLocation } from "./hooks/useUserLocation";
// import { useUser } from "../../AuthContext/UserContext";
// import CustomMapViewComponent from "./components/Map/CustomMapViewComponent";
// import MyLocationButton from "./components/Controls/MyLocationButton";
// import FAB from "./components/Controls/FAB";
// import { LOCALHOST_IP, GOOGLE_MAPS_API_KEY } from "@env";

// export default function RouteSelectionScreen({ navigation, route }) {
//   const { user } = useUser();
//   const { focusLocation } = route.params || {};
//   const mapRef = useRef(null);

//   const {
//     region,
//     currentLocation,
//     setRegion,
//     setCurrentLocation,
//     getCurrentLocation,
//     locationPermissionGranted,
//   } = useUserLocation(mapRef, focusLocation);

//   const [reportMarkers, setReportMarkers] = useState([]);
//   const [gasStations, setGasStations] = useState([]);
//   const [showReports, setShowReports] = useState(true);
//   const [showGasStations, setShowGasStations] = useState(true);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isReportModalVisible, setIsReportModalVisible] = useState(false);
//   const [trafficReportType, setTrafficReportType] = useState("Accident");
//   const [description, setDescription] = useState("");
//   const [submitting, setSubmitting] = useState(false);
//   const [mapStyle, setMapStyle] = useState("standard");
//   const [open, setOpen] = useState(false);

//   const reportTypes = [
//     { label: "Accident", value: "Accident" },
//     { label: "Traffic Jam", value: "Traffic Jam" },
//     { label: "Road Closure", value: "Road Closure" },
//     { label: "Hazard", value: "Hazard" },
//     { label: "Police", value: "Police" },
//   ];

//   const fetchReports = useCallback(async () => {
//     try {
//       const res = await fetch(`${LOCALHOST_IP}/api/reports`);
//       const data = await res.json();
//       setReportMarkers(data || []);
//     } catch (err) {
//       console.error("Error fetching reports", err);
//     }
//   }, []);

//   const fetchGasStations = useCallback(async () => {
//     try {
//       const res = await fetch(`${LOCALHOST_IP}/api/gas-stations`);
//       const data = await res.json();
//       setGasStations(data || []);
//     } catch (err) {
//       console.error("Error fetching gas stations", err);
//     }
//   }, []);

//   useEffect(() => {
//     fetchReports();
//     fetchGasStations();
//   }, [fetchReports, fetchGasStations]);

//   const submitTrafficReport = async () => {
//     if (submitting || !description.trim()) {
//       return Alert.alert("Required", "Enter description");
//     }
//     setSubmitting(true);
//     try {
//       const response = await fetch(`${LOCALHOST_IP}/api/reports/`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           reportType: trafficReportType,
//           location: currentLocation,
//           description,
//           userId: user?._id,
//         }),
//       });

//       if (response.ok) {
//         Toast.show({
//           type: "success",
//           text1: "Report Submitted",
//           text2: `Type: ${trafficReportType}`,
//         });
//         setDescription("");
//         await fetchReports();
//       } else {
//         Alert.alert("Error", "Submit failed");
//       }
//     } catch (e) {
//       console.error("Submit error:", e);
//     } finally {
//       setSubmitting(false);
//       setIsReportModalVisible(false);
//     }
//   };

//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
//       <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
//         <KeyboardAvoidingView
//           style={{ flex: 1 }}
//           behavior={Platform.OS === "ios" ? "padding" : "height"}
//         >
//           <CustomMapViewComponent
//             mapRef={mapRef}
//             region={region}
//             mapStyle={mapStyle}
//             currentLocation={currentLocation}
//             reportMarkers={reportMarkers}
//             gasStations={gasStations}
//             showReports={showReports}
//             showGasStations={showGasStations}
//           />

//           <View style={styles.toggleContainer}>
//             {["Reports", "Gas"].map((label, idx) => (
//               <TouchableOpacity
//                 key={label}
//                 onPress={() =>
//                   idx === 0
//                     ? setShowReports(!showReports)
//                     : setShowGasStations(!showGasStations)
//                 }
//                 style={[
//                   styles.segmentButton,
//                   idx === 0
//                     ? showReports
//                       ? styles.activeReport
//                       : styles.inactive
//                     : showGasStations
//                     ? styles.activeGas
//                     : styles.inactive,
//                 ]}
//               >
//                 <MaterialIcons
//                   name={idx === 0 ? "report" : "local-gas-station"}
//                   size={18}
//                   color="#000"
//                 />
//                 <Text style={styles.segmentText}>{label}</Text>
//               </TouchableOpacity>
//             ))}
//           </View>

//           {isLoading && (
//             <ActivityIndicator
//               size="large"
//               color="#3498db"
//               style={styles.loadingContainer}
//             />
//           )}

//           <FAB onPress={() => navigation.navigate("MapScreenTry")} label="Where to?" bottom={0} />

//           <MyLocationButton
//             onPress={() => setIsReportModalVisible(true)}
//             bottom={100}
//             left={20}
//             iconName="warning"
//           />
//           <MyLocationButton
//             onPress={getCurrentLocation}
//             bottom={100}
//             left={300}
//             iconName="my-location"
//             disabled={!locationPermissionGranted}
//           />

//           <Modal transparent visible={isReportModalVisible} animationType="slide">
//             <TouchableWithoutFeedback onPress={() => setIsReportModalVisible(false)}>
//               <View style={styles.modalOverlay}>
//                 <View style={styles.modalContent}>
//                   <Text style={styles.menuHeader}>Add Traffic Report</Text>
//                   <DropDownPicker
//                     open={open}
//                     value={trafficReportType}
//                     items={reportTypes}
//                     setOpen={setOpen}
//                     setValue={setTrafficReportType}
//                     setItems={() => {}}
//                     style={{ borderColor: "#ccc", marginBottom: 20 }}
//                   />
//                   <TextInput
//                     value={description}
//                     onChangeText={setDescription}
//                     placeholder="Short description"
//                     style={styles.input}
//                     maxLength={20}
//                   />
//                   <TouchableOpacity
//                     onPress={submitTrafficReport}
//                     disabled={submitting}
//                     style={styles.closeButton}
//                   >
//                     <Text style={styles.btnText}>{submitting ? "Submitting..." : "Submit Report"}</Text>
//                   </TouchableOpacity>
//                   <TouchableOpacity
//                     onPress={() => setIsReportModalVisible(false)}
//                     style={[styles.closeButton, { backgroundColor: "#aaa" }]}
//                   >
//                     <Text style={styles.btnText}>Cancel</Text>
//                   </TouchableOpacity>
//                 </View>
//               </View>
//             </TouchableWithoutFeedback>
//           </Modal>
//         </KeyboardAvoidingView>
//       </TouchableWithoutFeedback>
//       <Toast />
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   toggleContainer: {
//     position: "absolute",
//     top: 90,
//     right: 15,
//     flexDirection: "row",
//     zIndex: 500,
//   },
//   segmentButton: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#f1f1f1",
//     paddingVertical: 6,
//     paddingHorizontal: 10,
//     marginLeft: 8,
//     borderRadius: 20,
//     elevation: 3,
//   },
//   segmentText: {
//     fontSize: 12,
//     fontWeight: "bold",
//     marginLeft: 4,
//   },
//   activeReport: {
//     backgroundColor: "#ffc107",
//   },
//   activeGas: {
//     backgroundColor: "#00bcd4",
//   },
//   inactive: {
//     backgroundColor: "#ddd",
//   },
//   loadingContainer: {
//     position: "absolute",
//     top: "50%",
//     left: "50%",
//     marginLeft: -18,
//     marginTop: -18,
//     zIndex: 999,
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.5)",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   modalContent: {
//     width: "85%",
//     backgroundColor: "white",
//     borderRadius: 10,
//     padding: 20,
//     elevation: 10,
//   },
//   menuHeader: {
//     fontSize: 18,
//     fontWeight: "bold",
//     marginBottom: 12,
//   },
//   input: {
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 8,
//     padding: 10,
//     marginBottom: 16,
//   },
//   closeButton: {
//     backgroundColor: "#007bff",
//     padding: 10,
//     borderRadius: 8,
//     marginTop: 10,
//   },
//   btnText: {
//     color: "#fff",
//     textAlign: "center",
//     fontWeight: "bold",
//   },
// });
