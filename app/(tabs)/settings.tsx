import { useClerk, useUser } from "@clerk/expo";
import { styled } from "nativewind";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const Settings = () => {
  const { signOut } = useClerk();
  const { user } = useUser();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const confirmSignOut = () => {
    Alert.alert("Sign out?", "You can sign back in at any time.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          setIsSigningOut(true);
          try {
            await signOut();
          } catch {
            setIsSigningOut(false);
            Alert.alert("Unable to sign out", "Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      <Text className="mb-6 text-2xl font-sans-bold text-primary">
        Settings
      </Text>
      <View className="rounded-2xl border border-border bg-card p-5">
        <Text className="text-lg font-sans-bold text-primary">
          {user?.fullName || "Your account"}
        </Text>
        <Text className="mt-1 text-sm font-sans-medium text-muted-foreground">
          {user?.primaryEmailAddress?.emailAddress}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isSigningOut }}
        className="mt-6 items-center rounded-2xl border border-border bg-card py-4"
        disabled={isSigningOut}
        onPress={confirmSignOut}
      >
        <Text className="text-base font-sans-bold text-primary">
          {isSigningOut ? "Signing out…" : "Sign out"}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
};

export default Settings;
