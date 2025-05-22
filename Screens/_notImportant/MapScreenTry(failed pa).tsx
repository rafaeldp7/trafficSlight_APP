// Updated MapScreen using refactored components with safe hook ordering

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  Modal,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import MapView from "react-native-maps";

import { useUser } from "../../AuthContext/UserContext";
import { GOOGLE_MAPS_API_KEY, LOCALHOST_IP } from "@env";

import MapComponent from "../loggedIn/MapComponent";
import Controls from "../loggedIn/Controls";
import SearchBar from "../loggedIn/SearchBar";
import RouteDetailsBottomSheet from "../loggedIn/RouteDetailsBottomSheet";
import TripSummaryModal from "../loggedIn/TripSummaryModal";
import useLocationTracker from "../hooks/useLocationTracker";
import useRoutes from "../hooks/useRoutes";

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [destination, setDestination] = useState(null);
  const [tripSummary, setTripSummary] = useState(null);
  const [selectedTab, setSelectedTab] = useState("alternatives");
  const [selectedAlternativeIndex, setSelectedAlternativeIndex] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [recentLocations, setRecentLocations] = useState([]);
  const [savedLocations] = useState([]);
  const [modalVisible, setModalVisible] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const { user } = useUser();

  const currentLocation = useLocationTracker(
    () => {
      setIsNavigating(false);
      setShowSummary(true);
    },
    destination,
    tripSummary,
    user
  );

  const {
    route,
    alternatives,
    isLoading,
    fetchRoutes
  } = useRoutes(currentLocation, destination);

  const animateToRegion = (region) => {
    mapRef.current?.animateToRegion(region, 1000);
  };

  const saveToRecent = (loc) => {
    setRecentLocations((prev) => [loc, ...prev].slice(0, 10));
  };

  const startNavigation = () => {
    if (route) {
      setIsNavigating(true);
      setTripSummary(route);
    }
  };

  const stopNavigation = () => setIsNavigating(false);

  const handleReroute = () => {
    if (currentLocation) {
      animateToRegion({
        ...currentLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const shouldShowLoading = !user || isLoading;
  const loadingMessage = !user ? "Loading user data..." : "Loading location...";

  return (
    <SafeAreaProvider>
      <SafeAreaView style={plainStyles.safeArea}>
        {shouldShowLoading ? (
          <View style={plainStyles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={plainStyles.loadingText}>{loadingMessage}</Text>
          </View>
        ) : (
          <>
            <View style={plainStyles.header}>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSearchText("");
                }}
                style={plainStyles.backButton}
              >
                <MaterialIcons name="arrow-back" size={24} color="black" />
              </TouchableOpacity>
              <Text style={plainStyles.headerText}>Traffic Slight</Text>
            </View>

            {destination && (
              <Pressable onPress={() => setModalVisible(true)}>
                <Text style={plainStyles.addressText}>
                  {destination.address ?? "Select Destination"}
                </Text>
              </Pressable>
            )}

            <Modal animationType="slide" transparent={false} visible={modalVisible}>
              <View style={plainStyles.modal_Header}>
                <TouchableOpacity
                  onPress={() => {
                    setModalVisible(false);
                    setSearchText("");
                  }}
                  style={plainStyles.modal_backButton}
                >
                  <MaterialIcons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text style={plainStyles.modal_headerText}>Traffic Slight</Text>
              </View>
              <Text style={plainStyles.destinationLabel}>Destination</Text>
              <SearchBar
                searchRef={useRef()}
                searchText={searchText}
                setSearchText={setSearchText}
                isTyping={isTyping}
                setIsTyping={setIsTyping}
                setDestination={setDestination}
                animateToRegion={animateToRegion}
                saveToRecent={saveToRecent}
                recentLocations={recentLocations}
                savedLocations={savedLocations}
              />
              <TouchableOpacity onPress={() => setModalVisible(false)} style={plainStyles.modalCloseButton}>
                <Text style={plainStyles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </Modal>

            <View style={plainStyles.screenContainer}>
              <View style={plainStyles.mapContainer}>
                <MapComponent
                  mapRef={mapRef}
                  region={null}
                  mapStyle="light"
                  currentLocation={currentLocation}
                  destination={destination}
                  route={route}
                  selectedTab={selectedTab}
                  selectedAlternativeIndex={selectedAlternativeIndex}
                  alternativeRoutes={alternatives}
                  onRouteReady={(result, best, alts) => {
                    setTripSummary(best);
                    setShowBottomSheet(true);
                  }}
                />
              </View>

              <Controls
                onGetRoute={fetchRoutes}
                onReroute={handleReroute}
                onStartNavigation={startNavigation}
                onStopNavigation={stopNavigation}
                isNavigating={isNavigating}
                hasRoute={!!route}
              />
            </View>

            <RouteDetailsBottomSheet
              visible={showBottomSheet}
              bestRoute={tripSummary}
              alternatives={alternatives}
              onClose={() => setShowBottomSheet(false)}
              selectedAlternativeId={
                selectedAlternativeIndex !== null
                  ? alternatives[selectedAlternativeIndex]?.id
                  : null
              }
              onSelectAlternative={(routeId) => {
                const idx = alternatives.findIndex((r) => r.id === routeId);
                if (idx !== -1) setSelectedAlternativeIndex(idx);
              }}
            />

            <TripSummaryModal
              visible={showSummary}
              summary={tripSummary}
              onClose={() => setShowSummary(false)}
            />
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}


// ----------------------------------------------------------------
// Styles
// ----------------------------------------------------------------
const plainStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  screenContainer: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  backButton: { padding: 10, top: 10 },
  addressText: { fontSize: 18, fontWeight: "bold", marginLeft: 12 },
  headerText: { fontSize: 20, fontWeight: "bold", marginLeft: 12, top: 10 },
  modal_Header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  modal_backButton: { padding: 10 },
  modal_headerText: { fontSize: 20, fontWeight: "bold", marginLeft: 12 },
  destinationLabel: { fontSize: 18, fontWeight: "600", margin: 16, marginBottom: 0 },
  modalCloseButton: { display: "none", alignSelf: "center", marginTop: 20, backgroundColor: "#3498db", padding: 10, borderRadius: 5 },
  modalCloseText: { color: "#fff", fontSize: 16 },
  mapContainer: { flex: 1, position: "relative" },
  mapInnerContainer: { height: "100%", backgroundColor: "#ccc", borderRadius: 10, overflow: "hidden" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  loadingText: { marginTop: 16, fontSize: 16 },
});

const styles = StyleSheet.create({
  map: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: Dimensions.get("window").height,
  },
  searchContainer: { padding: 16, backgroundColor: "#fff" },
  clearButton: { position: "absolute", top: 15, right: 15, zIndex: 101 },
  suggestionsContainer: { maxHeight: 150, backgroundColor: "#fff", elevation: 5, marginTop: 5 },
  suggestionItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  tabsContainer: { flexDirection: "row", justifyContent: "space-around", marginTop: 60 },
  tabText: { fontSize: 16, color: "#666" },
  activeTab: { color: "#000", fontWeight: "bold", textDecorationLine: "underline" },
  tabContent: { marginTop: 10 },
  rerouteButton: { position: "absolute", bottom: 100, right: 20, backgroundColor: "#3498db", padding: 12, borderRadius: 30, elevation: 5, display: "none" },
  rerouteText: { color: "#fff", fontSize: 16 },
  getrouteButton: { position: "absolute", top: 60, right: 20, left: 20, backgroundColor: "#3498db", padding: 12, borderRadius: 30, elevation: 5 },
  bottomSheetContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: Dimensions.get("window").height * 0.25,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
    padding: 16,
  },
  bottomSheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  bottomSheetTitle: { fontSize: 18, fontWeight: "bold" },
  summaryContainer: { marginBottom: 16 },
  summaryTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  sortOptionsContainer: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "bold", marginRight: 10 },
  sortButton: { backgroundColor: "#eee", padding: 6, marginRight: 8, borderRadius: 4 },
  activeSortButton: { backgroundColor: "#3498db" },
  sortButtonText: { fontSize: 12, color: "#000" },
  alternativesContainer: { marginTop: 10 },
  routeItem: { padding: 8, borderBottomWidth: 1, borderBottomColor: "#ccc" },
  activeRouteItem: {
    backgroundColor: "#e0f7fa",
    borderLeftWidth: 4,
    borderLeftColor: "#3498db",
  },
  navigationOverlay: { position: "absolute", top: 125, left: 20, right: 20, backgroundColor: "rgba(0, 0, 0, 0.6)", padding: 12, borderRadius: 8, alignItems: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  tripSummaryContainer: { width: "80%", backgroundColor: "#fff", padding: 20, borderRadius: 10, alignItems: "center" },
  tripSummaryTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  closeSummaryButton: { marginTop: 20, backgroundColor: "#3498db", padding: 10, borderRadius: 5 },
  closeSummaryText: { color: "#fff", fontSize: 16 },
  markerContainer: { alignItems: "center" },
  markerImage: { width: 40, height: 40 },
  
});
