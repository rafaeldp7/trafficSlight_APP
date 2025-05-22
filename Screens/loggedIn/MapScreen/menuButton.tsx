import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import PropTypes from 'prop-types';

const IconButton = ({
  onPress,
  iconName = 'menu',
  iconSize = 28,
  iconColor = 'blue',
  style,
  accessibilityLabel = 'Icon Button',
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.button, style]}
    accessible
    accessibilityLabel={accessibilityLabel}
    accessibilityRole="button"
  >
    <MaterialIcons name={iconName} size={iconSize} color={iconColor} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    padding: 8,
    borderRadius: 8,
  },
});

IconButton.propTypes = {
  onPress: PropTypes.func.isRequired,
  iconName: PropTypes.string,
  iconSize: PropTypes.number,
  iconColor: PropTypes.string,
  style: PropTypes.any,
  accessibilityLabel: PropTypes.string,
};

export default IconButton;
