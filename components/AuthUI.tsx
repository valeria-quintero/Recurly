import { Feather } from "@expo/vector-icons";
import { clsx } from "clsx";
import { Link } from "expo-router";
import { styled } from "nativewind";
import { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
    type TextInputProps,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

type AuthFieldProps = TextInputProps & {
  label: string;
  error?: string;
  showPasswordToggle?: boolean;
};

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView className="auth-safe-area">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="auth-scroll"
          contentContainerClassName="grow"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="auth-content grow px-5 pb-10 pt-8">
            <View className="w-full max-w-[560px] self-center">
              <View className="auth-brand-block">
                <View className="auth-logo-wrap">
                  <View className="auth-logo-mark">
                    <Text className="auth-logo-mark-text">R</Text>
                  </View>
                  <View>
                    <Text className="auth-wordmark">Recurly</Text>
                    <Text className="auth-wordmark-sub">Smart billing</Text>
                  </View>
                </View>
                <Text className="auth-title">{title}</Text>
                <Text className="auth-subtitle">{subtitle}</Text>
              </View>
              {children}
              <View className="mt-6 flex-row items-center justify-center gap-2">
                <Feather color="#5b6472" name="lock" size={13} />
                <Text className="auth-helper">Secure account access</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthField({
  label,
  error,
  showPasswordToggle = false,
  secureTextEntry = false,
  ...inputProps
}: AuthFieldProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <View className="auth-field">
      <Text className="auth-label">{label}</Text>
      <View
        className={clsx(
          "auth-input flex-row items-center",
          error && "auth-input-error",
        )}
      >
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error}
          autoCorrect={false}
          className="min-h-6 min-w-0 flex-1 p-0 text-base font-sans-medium text-primary"
          placeholderTextColor="#647084"
          secureTextEntry={secureTextEntry && !passwordVisible}
          spellCheck={false}
          {...inputProps}
        />
        {showPasswordToggle && (
          <Pressable
            accessibilityLabel={
              passwordVisible ? "Hide password" : "Show password"
            }
            accessibilityRole="button"
            className="ml-3 size-8 items-center justify-center"
            onPress={() => setPasswordVisible((visible) => !visible)}
          >
            <Feather
              color="#5b6472"
              name={passwordVisible ? "eye-off" : "eye"}
              size={18}
            />
          </Pressable>
        )}
      </View>
      {error ? <Text className="auth-error">{error}</Text> : null}
    </View>
  );
}

export function AuthButton({
  title,
  loading = false,
  disabled = false,
  onPress,
}: {
  title: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={clsx("auth-button", isDisabled && "auth-button-disabled")}
      disabled={isDisabled}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color="#081126" />
      ) : (
        <Text className="auth-button-text">{title}</Text>
      )}
    </Pressable>
  );
}

export function AuthNotice({
  message,
  tone = "error",
}: {
  message: string;
  tone?: "error" | "success";
}) {
  return (
    <View
      accessibilityRole={tone === "error" ? "alert" : "text"}
      className={clsx(
        "rounded-xl border px-4 py-3",
        tone === "error"
          ? "border-destructive/20 bg-destructive/5"
          : "border-success/20 bg-success/5",
      )}
    >
      <Text
        className={clsx(
          "text-sm font-sans-medium",
          tone === "error" ? "text-destructive" : "text-success",
        )}
      >
        {message}
      </Text>
    </View>
  );
}

export function AuthSwitch({
  prompt,
  label,
  href,
}: {
  prompt: string;
  label: string;
  href: "/(auth)/sign-in" | "/(auth)/sign-up";
}) {
  return (
    <View className="auth-link-row">
      <Text className="auth-link-copy">{prompt}</Text>
      <Link asChild href={href}>
        <Pressable accessibilityRole="link">
          <Text className="auth-link">{label}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

export function getAuthErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const clerkError = error as {
      errors?: { longMessage?: string; message?: string }[];
      message?: string;
    };

    const apiMessage =
      clerkError.errors?.[0]?.longMessage ?? clerkError.errors?.[0]?.message;
    if (apiMessage) return apiMessage;
    if (clerkError.message) return clerkError.message;
  }

  return "We couldn't complete that request. Please try again.";
}
