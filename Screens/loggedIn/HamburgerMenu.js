import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useIsFocused } from '@react-navigation/native';
import PropTypes from 'prop-types';

const HamburgerMenu = ({
  drawerRef,
  mapStyle = 'standard',
  onToggleMapStyle,
  menuItems = [],
  onClose
}) => {
  const isFocused = useIsFocused();

  // Reset drawer when screen regains focus
  useEffect(() => {
    if (isFocused && drawerRef?.current) {
      try {
        drawerRef.current.setNativeProps({ drawerLockMode: 'unlocked' });
      } catch (error) {
        console.warn('Drawer reset error:', error);
      }
    }
  }, [isFocused, drawerRef]);

  const handleClose = () => {
    onClose?.();
    drawerRef.current?.closeDrawer();
  };

  return (
    <View style={styles.drawerContainer} testID="hamburger-menu">
      {/* Header with close button */}
      <View style={styles.header}>
        <Text style={styles.drawerTitle}>Menu</Text>
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeButton}
          accessibilityLabel="Close menu"
          testID="close-menu-button"
        >
          <MaterialIcons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Map style toggle */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Map Style</Text>
        <TouchableOpacity
          onPress={onToggleMapStyle}
          style={styles.menuItem}
          accessibilityLabel={`Switch to ${mapStyle === 'standard' ? 'dark' : 'light'} mode`}
          testID="map-style-toggle"
        >
          <MaterialIcons
            name={mapStyle === 'standard' ? 'wb-sunny' : 'nightlight-round'}
            size={22}
            color="#333"
            style={styles.icon}
          />
          <Text style={styles.menuText}>
            {mapStyle === 'standard' ? 'Dark Mode' : 'Light Mode'}
          </Text>
          <MaterialIcons 
            name="chevron-right" 
            size={22} 
            color="#888" 
            style={styles.chevron}
          />
        </TouchableOpacity>
      </View>

      {/* Additional menu items */}
      {menuItems.length > 0 && (
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Navigation</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={`menu-item-${index}`}
              onPress={() => {
                handleClose();
                item.onPress();
              }}
              style={styles.menuItem}
              accessibilityLabel={item.label}
              testID={`menu-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <MaterialIcons
                name={item.icon}
                size={22}
                color="#333"
                style={styles.icon}
              />
              <Text style={styles.menuText}>{item.label}</Text>
              <MaterialIcons 
                name="chevron-right" 
                size={22} 
                color="#888" 
                style={styles.chevron}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

HamburgerMenu.propTypes = {
  drawerRef: PropTypes.shape({
    current: PropTypes.shape({
      closeDrawer: PropTypes.func,
      setNativeProps: PropTypes.func,
    }),
  }).isRequired,
  mapStyle: PropTypes.oneOf(['standard', 'dark']),
  onToggleMapStyle: PropTypes.func.isRequired,
  menuItems: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      icon: PropTypes.string.isRequired,
      onPress: PropTypes.func.isRequired,
    })
  ),
  onClose: PropTypes.func,
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 8,
    marginRight: -8,
  },
  menuSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginLeft: 15,
  },
  icon: {
    width: 24,
    textAlign: 'center',
  },
  chevron: {
    marginLeft: 10,
  },
});

export default HamburgerMenu;