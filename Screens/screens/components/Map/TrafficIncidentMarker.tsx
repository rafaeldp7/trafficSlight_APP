import React from "react";
import { View, StyleSheet } from "react-native";
import { Marker } from "react-native-maps";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

type LocationCoords = {
  latitude: number;
  longitude: number;
};

type TrafficIncident = {
  id: string;
  location: LocationCoords;
  type: string;
  severity: string;
  description: string;
};

type Props = {
  incident: TrafficIncident;
};

const TrafficIncidentMarker: React.FC<Props> = ({ incident }) => {
  const getIconName = (type: string) => {
    switch (type) {
      case "Accident":
        return "warning";
      case "Hazard":
        return "report-problem";
      case "Road Closure":
        return "block";
      case "Traffic Jam":
        return "traffic";
      case "Police":
        return "local-police";
      default:
        return "info";
    }
  };

  const getIconColor = (severity: string) => {
    return severity === "high" ? "#e74c3c" : "#f39c12";
  };

  return (
    <Marker coordinate={incident.location} title={incident.type} description={incident.description}>
      <View style={styles.container}>
        <MaterialIcons
          name={getIconName(incident.type)}
          size={24}
          color={getIconColor(incident.severity)}
        />
      </View>
    </Marker>
  );
};

export default React.memo(TrafficIncidentMarker);

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
