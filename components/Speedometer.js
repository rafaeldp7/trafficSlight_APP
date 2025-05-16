import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import * as Location from "expo-location";

const Speedometer = ({ position = "right" }) => {
  const [speed, setSpeed] = useState(0);
  const [locationPermission, setLocationPermission] = useState(false);

  // Request location permission
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        setLocationPermission(true);
      }
    })();
  }, []);

  // Get current speed
  useEffect(() => {
    let subscription;
    if (locationPermission) {
      const subscribe = async () => {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
          },
          (location) => {
            // If speed is null or undefined, default to 0
            const currentSpeed = location.coords.speed
              ? (location.coords.speed * 3.6).toFixed(2)
              : 0;
            setSpeed(currentSpeed);
          }
        );
      };
      subscribe();
    }
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [locationPermission]);

  return (
    <View
      style={[
        styles.container,
        position === "left" ? styles.leftPosition : styles.rightPosition,
      ]}
    >
      <TouchableOpacity style={styles.circle}>
        <Text style={styles.speed}>{speed ? `${speed}` : "0"}</Text>
        <Text style={styles.unit}>km/h</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 150,
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  leftPosition: {
    left: 10,
  },
  rightPosition: {
    right: 10,
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#333",
  },
  speed: {
    fontSize: 32,
    fontWeight: "bold",
    color: "black",
  },
  unit: {
    fontSize: 12,
    color: "gray",
  },
});

export default Speedometer;
