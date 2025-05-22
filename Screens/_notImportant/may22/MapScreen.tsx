import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { Feather, MaterialIcons } from '@expo/vector-icons';

import {
  geocodeAddress,
  getDirections,
  getETAWithTraffic,
  snapToRoads
} from '../../loggedIn/gmapsAPI'; // adjust this path as needed

const RouteSelectionScreen = () => {
  const mapRef = useRef(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [eta, setEta] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Enable location services for full functionality.');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    })();
  }, []);

  const decodePolyline = (encoded) => {
    let points = [], index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = result & 1 ? ~(result >> 1) : (result >> 1);
      lat += dlat;
      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = result & 1 ? ~(result >> 1) : (result >> 1);
      lng += dlng;
      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
  };

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      const geo = await geocodeAddress(searchInput);
      const destinationObj = {
        latitude: geo.lat,
        longitude: geo.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
        name: geo.address
      };
      setDestination(destinationObj);
      mapRef.current.animateToRegion(destinationObj, 1000);
    } catch {
      Alert.alert("Error", "Failed to geocode the address.");
    } finally {
      setIsLoading(false);
    }
  };

  const getRoute = async () => {
    if (!currentLocation || !destination) return;
    setIsLoading(true);
    try {
      const direction = await getDirections(currentLocation, destination);
      const decodedPath = decodePolyline(direction.polyline);
      const snapped = await snapToRoads(decodedPath);
      setRouteCoordinates(snapped);

      const etaInfo = await getETAWithTraffic(currentLocation, destination);
      setEta({
        distanceText: etaInfo.distance,
        durationText: etaInfo.durationInTraffic,
      });

      Speech.speak(`ETA is ${etaInfo.durationInTraffic}, distance is ${etaInfo.distance}`);
    } catch {
      Alert.alert("Error", "Could not get route or ETA.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {currentLocation && (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={currentLocation}
          showsUserLocation
          showsTraffic
        >
          {destination && (
            <Marker coordinate={destination} title="Destination" />
          )}
          {routeCoordinates.length > 0 && (
            <Polyline coordinates={routeCoordinates} strokeWidth={6} strokeColor="blue" />
          )}
        </MapView>
      )}

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search destination"
          value={searchInput}
          onChangeText={setSearchInput}
        />
        <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
          <Feather name="search" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.controls}>
        {destination && (
          <TouchableOpacity onPress={getRoute} style={styles.controlButton}>
            <MaterialIcons name="directions" size={22} color="#fff" />
            <Text style={styles.buttonText}>Get Route</Text>
          </TouchableOpacity>
        )}
      </View>

      {eta && (
        <View style={styles.etaBox}>
          <Text style={styles.etaText}>ETA: {eta.durationText} • Distance: {eta.distanceText}</Text>
        </View>
      )}

      {isLoading && (
        <View style={styles.loader}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  searchContainer: {
    position: 'absolute', top: 30, left: 20, right: 20, backgroundColor: '#fff',
    flexDirection: 'row', borderRadius: 8, padding: 8, elevation: 4
  },
  searchInput: { flex: 1, padding: 8 },
  searchButton: {
    backgroundColor: '#007AFF', borderRadius: 6, padding: 8, justifyContent: 'center'
  },
  controls: {
    position: 'absolute', bottom: 100, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between'
  },
  controlButton: {
    backgroundColor: '#28a745', flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8
  },
  buttonText: { color: '#fff', marginLeft: 6 },
  etaBox: {
    position: 'absolute', bottom: 40, left: 20, right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)', padding: 12, borderRadius: 8, alignItems: 'center'
  },
  etaText: { color: '#fff', fontSize: 16 },
  loader: {
    position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -50 }, { translateY: -50 }]
  },
  loadingText: { color: 'black', fontSize: 16 },
});

export default RouteSelectionScreen;