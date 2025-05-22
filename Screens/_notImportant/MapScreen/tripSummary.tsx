import { Modal, View, Text, TouchableOpacity,StyleSheet } from 'react-native';

const TripSummaryModal = ({ visible, tripSummary, onClose }) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={styles.modalBackground}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Trip Summary</Text>
        <Text>
          Distance: {tripSummary?.distance ? tripSummary.distance + " km" : "N/A"}
        </Text>
        <Text>
          Duration: {tripSummary?.duration ? tripSummary.duration + " mins" : "N/A"}
        </Text>
        <Text>
          Fuel Used: {tripSummary?.fuel ? tripSummary.fuel + " liters" : "N/A"}
        </Text>
        <TouchableOpacity style={styles.button} onPress={onClose}>
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
    modalContent: {
        width: '80%',
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 10,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    button: {
        marginTop: 20,
        padding: 10,
        backgroundColor: '#007BFF',
        borderRadius: 5,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
    },
});
export default TripSummaryModal;