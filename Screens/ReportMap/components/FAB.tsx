import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

type FABProps = {
  onPress: () => void;
  label: string;
  bottom: number;
};

const FAB = ({ onPress, label, bottom }: FABProps) => (
  <TouchableOpacity
    style={[styles.fab, { bottom }]}
    onPress={onPress}
    accessible
    accessibilityLabel={label}
  >
    <View style={styles.container}>
      <MaterialIcons name="search" size={40} color="#000" />
      <Text style={styles.fabText}>{label}</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 0,
    left: 0,
    padding: 15,
    zIndex: 999,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 50,
  },
  fabText: {
    color: "#000",
    fontSize: 16,
    marginLeft: 8,
  },
});

export default React.memo(FAB);
