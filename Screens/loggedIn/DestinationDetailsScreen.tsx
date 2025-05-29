import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, SafeAreaView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  DestinationDetails: { item: any; fullList?: any[] };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'DestinationDetails'>;

type RouteParams = {
  item?: any;
  fullList?: any[];
};

export default function DestinationDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation<NavigationProp>();
  const { item, fullList } = route.params as RouteParams;

  // If we have a full list, show all destinations
  if (fullList) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#00ADB5" />
        
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#00ADB5', '#00C2CC']}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity 
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Saved Destinations</Text>
                <Text style={styles.headerSubtitle}>View and manage your favorite places</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
        
        <FlatList
          data={fullList}
          keyExtractor={(item, index) => item._id || index.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.destinationCard}
              onPress={() => navigation.navigate('DestinationDetails', { item })}
            >
              <Text style={styles.destinationName}>{item.label || 'Unnamed Location'}</Text>
              <Text style={styles.destinationAddress}>{item.address || 'No address'}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContainer}
        />

        <TouchableOpacity style={styles.fab}>
          <AntDesign name="plus" size={24} color="white" />
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // If we have a single item, show its details
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#00ADB5" />
      
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={['#00ADB5', '#00C2CC']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Destination Details</Text>
              <Text style={styles.headerSubtitle}>View location information</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.detailsContainer}>
        <Text style={styles.destinationName}>{item?.label || 'Unnamed Location'}</Text>
        <Text style={styles.destinationAddress}>{item?.address || 'No address'}</Text>
        
        {item?.coordinates && (
          <View style={styles.coordinatesContainer}>
            <Text style={styles.coordinatesLabel}>Location:</Text>
            <Text style={styles.coordinates}>
              {`${item.coordinates.latitude.toFixed(6)}, ${item.coordinates.longitude.toFixed(6)}`}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2EEEE',
  },
  header: {
    width: '100%',
    backgroundColor: '#00ADB5',
  },
  headerGradient: {
    width: '100%',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  listContainer: {
    padding: 16,
  },
  destinationCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  detailsContainer: {
    padding: 16,
  },
  destinationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  destinationAddress: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
  },
  coordinatesContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  coordinatesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 4,
  },
  coordinates: {
    fontSize: 16,
    color: '#333333',
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    backgroundColor: '#00ADB5',
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
  },
});
