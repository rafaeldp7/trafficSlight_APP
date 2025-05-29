import React from "react";
import { TouchableOpacity, StyleSheet, Alert } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

type Props = {
  onPress: () => void;
  bottom: number;
  left: number;
  iconName: string;
  disabled?: boolean;
};

const MyLocationButton: React.FC<Props> = ({
  onPress,
  bottom,
  left,
  iconName,
  disabled = false,
}) => {
  const handlePress = () => {
    if (disabled) {
      Alert.alert("Location Denied", "Enable location in your device settings.");
    } else {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { bottom, left },
        disabled && styles.disabled,
      ]}
      onPress={handlePress}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <MaterialIcons name={iconName} size={32} color="#fff" />
    </TouchableOpacity>
  );
};

export default React.memo(MyLocationButton);

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    padding: 12,
    borderRadius: 50,
    backgroundColor: "#007AFF",
    zIndex: 300,
    elevation: 5,
  },
  disabled: {
    backgroundColor: "#aaa",
    opacity: 0.6,
  },
});
