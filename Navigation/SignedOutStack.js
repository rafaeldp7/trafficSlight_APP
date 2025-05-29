import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import LoginScreen from "../Screens/ACCOUNT_AUTH/LoginScreen";
import RegisterScreen from "../Screens/ACCOUNT_AUTH/RegisterScreen";
import IndexScreen from "../Screens/ACCOUNT_AUTH/IndexScreen";
import VerifyOtpScreen from "../Screens/ACCOUNT_AUTH/VerifyOtpScreen";
import ForgotPasswordScreen from "../Screens/ACCOUNT_AUTH/ForgotPasswordScreen";
import ResetOtpScreen from "../Screens/ACCOUNT_AUTH/ResetOtpScreen";
import NewPasswordScreen from "../Screens/ACCOUNT_AUTH/NewPasswordScreen";


const Stack = createStackNavigator();

export default function SignedOutStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} >
      <Stack.Screen name="Index" component={IndexScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      
      <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetOtp" component={ResetOtpScreen} />
      <Stack.Screen name="NewPassword" component={NewPasswordScreen} />

    </Stack.Navigator>
  );
}
