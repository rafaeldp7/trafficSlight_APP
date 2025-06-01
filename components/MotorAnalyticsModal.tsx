import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type MotorAnalyticsModalProps = {
  visible: boolean;
  onClose: () => void;
  analyticsData: {
    lowFuel: boolean;
    needsOilChange: boolean;
    maintenanceDue: boolean;
  } | null;
  selectedMotor: {
    name: string;
    currentFuelLevel: number;
    fuelEfficiency: number;
    totalDistance: number;
    lastOilChange?: string;
    lastMaintenanceDate?: string;
  } | null;
};

export const MotorAnalyticsModal = ({ visible, onClose, analyticsData, selectedMotor }: MotorAnalyticsModalProps) => {
  if (!visible || !selectedMotor) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.analyticsModal}>
          <LinearGradient
            colors={['#00ADB5', '#00858B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.analyticsModalHeader}
          >
            <Text style={styles.analyticsModalTitle}>Motor Analytics</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.analyticsModalContent}>
            {/* Fuel Status */}
            <View style={[styles.analyticsItem, analyticsData?.lowFuel && styles.warningItem]}>
              <MaterialIcons 
                name="local-gas-station" 
                size={24} 
                color={analyticsData?.lowFuel ? '#e74c3c' : '#2ecc71'} 
              />
              <View style={styles.analyticsItemContent}>
                <Text style={styles.analyticsLabel}>Fuel Level</Text>
                <Text style={[styles.analyticsValue, analyticsData?.lowFuel && styles.warningText]}>
                  {selectedMotor.currentFuelLevel}%
                  {analyticsData?.lowFuel && ' (Low)'}
                </Text>
              </View>
            </View>

            {/* Oil Status */}
            <View style={[styles.analyticsItem, analyticsData?.needsOilChange && styles.warningItem]}>
              <MaterialIcons 
                name="opacity" 
                size={24} 
                color={analyticsData?.needsOilChange ? '#e74c3c' : '#2ecc71'} 
              />
              <View style={styles.analyticsItemContent}>
                <Text style={styles.analyticsLabel}>Oil Status</Text>
                <Text style={[styles.analyticsValue, analyticsData?.needsOilChange && styles.warningText]}>
                  {analyticsData?.needsOilChange ? 'Change Needed' : 'Good'}
                </Text>
                {selectedMotor.lastOilChange && (
                  <Text style={styles.analyticsSubtext}>
                    Last changed: {new Date(selectedMotor.lastOilChange).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>

            {/* Maintenance Status */}
            <View style={[styles.analyticsItem, analyticsData?.maintenanceDue && styles.warningItem]}>
              <MaterialIcons 
                name="build" 
                size={24} 
                color={analyticsData?.maintenanceDue ? '#e74c3c' : '#2ecc71'} 
              />
              <View style={styles.analyticsItemContent}>
                <Text style={styles.analyticsLabel}>Maintenance Status</Text>
                <Text style={[styles.analyticsValue, analyticsData?.maintenanceDue && styles.warningText]}>
                  {analyticsData?.maintenanceDue ? 'Due' : 'Up to date'}
                </Text>
                {selectedMotor.lastMaintenanceDate && (
                  <Text style={styles.analyticsSubtext}>
                    Last maintenance: {new Date(selectedMotor.lastMaintenanceDate).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>

            {/* Motor Details */}
            <View style={styles.analyticsItem}>
              <MaterialIcons name="two-wheeler" size={24} color="#00ADB5" />
              <View style={styles.analyticsItemContent}>
                <Text style={styles.analyticsLabel}>Motor Details</Text>
                <Text style={styles.analyticsValue}>{selectedMotor.name}</Text>
                <Text style={styles.analyticsSubtext}>
                  Fuel Efficiency: {selectedMotor.fuelEfficiency} km/L
                </Text>
                <Text style={styles.analyticsSubtext}>
                  Total Distance: {selectedMotor.totalDistance.toFixed(1)} km
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyticsModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    alignSelf: 'center',
    marginTop: '20%',
  },
  analyticsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  analyticsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  analyticsModalContent: {
    padding: 16,
  },
  analyticsItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  analyticsItemContent: {
    marginLeft: 12,
    flex: 1,
  },
  analyticsLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  analyticsValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  analyticsSubtext: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 2,
  },
  warningItem: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
  },
  warningText: {
    color: '#e74c3c',
  },
  closeButton: {
    padding: 8,
  },
}); 