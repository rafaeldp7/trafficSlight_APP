// components/Modals/SearchDestinationModal.tsx
import React from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import SearchBar from "../../../loggedIn/SearchBar"; // adjust path if needed

export default function SearchDestinationModal({
  visible,
  onClose,
  searchProps,
}) {
  return (
    <Modal animationType="slide" visible={visible}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.title}>Search Destination</Text>
        </View>

        <SearchBar {...searchProps} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  backBtn: { marginRight: 16 },
  title: { fontSize: 18, fontWeight: "bold", color: "#2c3e50" },
});
