import { Link } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

const SignIn = () => {
  return (
    <View>
      <Text>SignIn</Text>
      <Link href="/(auth)/sign-up">Create Account</Link>
      <Link href="/">Ir a Home</Link>
    </View>
  );
};

export default SignIn;
