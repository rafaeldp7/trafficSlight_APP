import React from 'react';
import { View, Text } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from './HomeScreen'; // import or duplicate

type Props = {
  route: RouteProp<RootStackParamList, 'MotorDetails'>;
};

export default function MotorDetailsScreen({ route }: Props) {
  const { item } = route.params;

  return (
    <View>
      <Text>Motor Nickname: {item.nickname}</Text>
      <Text>Plate Number: {item.plateNumber}</Text>
      {/* Add more motor details here */}
    </View>
  );
}
