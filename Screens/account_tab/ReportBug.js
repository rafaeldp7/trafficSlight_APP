import React from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import tw from "twrnc";

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <SafeAreaView style={tw`flex-1 bg-[#F2EEEE]`}>
      <StatusBar barStyle="light-content" backgroundColor="#00ADB5" />
      
      {/* Header */}
      <View style={tw`w-full bg-[#00ADB5]`}>
        <LinearGradient
          colors={['#00ADB5', '#00C2CC']}
          style={tw`w-full`}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={tw`flex-row items-center p-4 pt-${Platform.OS === 'android' ? '6' : '4'}`}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={tw`p-2 mr-2`}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={tw`flex-1`}>
              <Text style={tw`text-2xl font-semibold text-white mb-1`}>Privacy Policy</Text>
              <Text style={tw`text-sm text-white opacity-80`}>Our data handling practices</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Scrollable Content */}
      <ScrollView style={tw`p-4`} showsVerticalScrollIndicator={false}>
        <View style={tw`bg-white rounded-2xl p-5 shadow-sm`}>
          <View style={tw`mb-6`}>
            <Text style={tw`text-lg font-semibold mb-3 text-gray-800`}>Processing of Personal Data</Text>
            <Text style={tw`text-gray-600 leading-6`}>
              The organization collects personal data only for specified, legitimate purposes. All personal data is used in accordance with applicable laws and is retained only as long as necessary to fulfill its intended purpose. Once no longer required, personal data is securely destroyed to prevent unauthorized access or misuse.
            </Text>
          </View>

          <View style={tw`mb-6`}>
            <Text style={tw`text-lg font-semibold mb-3 text-gray-800`}>Collection</Text>
            <Text style={tw`text-gray-600 leading-6`}>
              The Traffic Slight mobile application collects personal data from users during registration and through their usage of various app features. This includes full name, email address, and location-related details such as city, province, barangay, and street. Users may also provide information about their motorcycles (e.g., name, type, engine displacement, and fuel efficiency), as well as data from their gas sessions (e.g., travel distance, fuel used, and estimated time of arrival).{"\n\n"}
              All data are collected directly via the app interface, either through form submissions (e.g., user registration, profile updates) or automatically during app usage (e.g., GPS location tracking during a trip). The system logs additional traffic-related data when users submit advisories. Data are stored in a MongoDB database and may be retrieved by authorized personnel through a secure web-based admin panel.
            </Text>
          </View>

          <View style={tw`mb-6`}>
            <Text style={tw`text-lg font-semibold mb-3 text-gray-800`}>Use</Text>
            <Text style={tw`text-gray-600 leading-6`}>
              Collected personal data are used for the following purposes:{"\n\n"}
              - To personalize user experience and deliver relevant features (e.g., route suggestions, estimated fuel consumption).{"\n"}
              - To allow users to store and manage their motorcycle data.{"\n"}
              - To calculate gas consumption statistics and suggest fuel-efficient routes.{"\n"}
              - To provide accurate, location-based traffic information and enable community reporting via advisories.{"\n"}
              - To assist administrators in monitoring traffic reports and validating user-submitted data for public advisories and gas price updates.
            </Text>
          </View>

          <View style={tw`mb-6`}>
            <Text style={tw`text-lg font-semibold mb-3 text-gray-800`}>Storage, Retention, and Destruction</Text>
            <Text style={tw`text-gray-600 leading-6`}>
              All personal data are stored securely in a MongoDB database, with key sensitive fields (e.g., passwords) protected through password hashing and encryption. Access to this database is restricted and protected using role-based access controls.{"\n\n"}
              The retention period for personal data shall be two (2) years from the date of the user's last activity. After this period, inactive accounts and their associated data will be automatically flagged for deletion. Deletion involves permanent removal from the live database, and in the case of backup files, secure erasure via automated scripts.
            </Text>
          </View>

          <View style={tw`mb-6`}>
            <Text style={tw`text-lg font-semibold mb-3 text-gray-800`}>Access</Text>
            <Text style={tw`text-gray-600 leading-6`}>
              Only the user and authorized system administrators can access personal data. Users may access and modify their information (such as profile or motorcycle details) through the app interface. Requests to access or amend non-editable data may be sent to system administrators through the in-app support feature.{"\n\n"}
              Administrative access is strictly controlled through role-based permissions. Admins may view limited user data such as travel statistics, session logs, and advisory submissions, but do not have access to encrypted data like passwords.
            </Text>
          </View>

          <View style={tw`mb-6`}>
            <Text style={tw`text-lg font-semibold mb-3 text-gray-800`}>Disclosure and Sharing</Text>
            <Text style={tw`text-gray-600 leading-6`}>
              Personal data stored in Traffic Slight shall not be shared with third parties or external organizations. No data is outsourced, sold, or transferred outside the app's operating team. Data may only be disclosed if required by law or in compliance with government authorities for official purposes.{"\n\n"}
              All developers and system administrators are required to maintain the confidentiality of any personal data they have access to, even beyond the termination of their role or contract. Any form of disclosure without explicit user consent or legal requirement is strictly prohibited.
            </Text>
          </View>

          <Text style={tw`text-sm text-gray-500 mt-4 italic`}>
            Last Updated: May 23, 2025
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
