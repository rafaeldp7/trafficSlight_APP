import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

type Props = {
  onPress: () => void;
  label: string;
  bottom?: number;
  iconName?: string;
};

const FAB: React.FC<Props> = ({ onPress, label, bottom = 20, iconName = "search" }) => {
  return (
    <TouchableOpacity style={[styles.fab, { bottom }]} onPress={onPress}>
      <View style={styles.fabContent}>
        <MaterialIcons name={iconName} size={32} color="#000" />
        <Text style={styles.fabText}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default React.memo(FAB);

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    left: 0,
    right: 0,
    padding: 15,
    zIndex: 999,
    alignItems: "center",
  },
  fabContent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 50,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabText: {
    color: "#000",
    fontSize: 16,
    marginLeft: 8,
    fontWeight: "bold",
  },
});
