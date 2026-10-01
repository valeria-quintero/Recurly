import "@/global.css";
import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Feather } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { SplashScreen, Stack, usePathname } from "expo-router";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";

import { posthog, posthogLogger } from "@/lib/posthog";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error("Add your Clerk Publishable Key to the .env file");
}

function PostHogIdentity() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const posthog = usePostHog();
  const identifiedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      if (identifiedUserId.current !== null) {
        posthog.reset();
      }
      identifiedUserId.current = null;
      return;
    }

    if (!user) {
      identifiedUserId.current = null;
      return;
    }

    if (identifiedUserId.current === user.id) {
      return;
    }

    const email = user.primaryEmailAddress?.emailAddress;
    const name = user.fullName;

    posthog.identify(user.id, {
      $set: {
        ...(email ? { email } : {}),
        ...(name ? { name } : {}),
      },
    });
    identifiedUserId.current = user.id;
  }, [isLoaded, isSignedIn, posthog, user]);

  return null;
}

function PostHogScreenTracking() {
  const pathname = usePathname();
  const posthog = usePostHog();
  const previousScreen = useRef<string | undefined>(undefined);
  const screenName = pathname.startsWith("/subscriptions/")
    ? "/subscriptions/[id]"
    : pathname;

  useEffect(() => {
    posthog.screen(screenName, {
      ...(previousScreen.current
        ? { previous_screen: previousScreen.current }
        : {}),
    });
    previousScreen.current = screenName;
  }, [posthog, screenName]);

  return null;
}

function RootNavigator() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#ea7a53" size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={Boolean(isSignedIn)}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="subscriptions" />
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ...Feather.font,
    "sans-regular": require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
    "sans-bold": require("../assets/fonts/PlusJakartaSans-Bold.ttf"),
    "sans-medium": require("../assets/fonts/PlusJakartaSans-Medium.ttf"),
    "sans-semibold": require("../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    "sans-extrabold": require("../assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
    "sans-light": require("../assets/fonts/PlusJakartaSans-Light.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      posthogLogger?.info("app_ready");
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      {posthog ? (
        <PostHogProvider
          client={posthog}
          autocapture={{ captureScreens: false }}
        >
          <PostHogIdentity />
          <PostHogScreenTracking />
          <RootNavigator />
        </PostHogProvider>
      ) : (
        <RootNavigator />
      )}
    </ClerkProvider>
  );
}
