import {
    AuthButton,
    AuthField,
    AuthLayout,
    AuthNotice,
    AuthSwitch,
    getAuthErrorMessage,
} from "@/components/AuthUI";
import { useSignUp } from "@clerk/expo";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

export default function SignUp() {
  const { signUp, fetchStatus } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldError, setFieldError] = useState<{
    field: "email" | "password" | "confirmPassword" | "code";
    message: string;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const isLoading = fetchStatus === "fetching";
  const normalizedEmail = email.trim().toLowerCase();

  const handleSignUp = async () => {
    setFormError("");
    setFieldError(null);
    setNotice("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail)) {
      setFieldError({
        field: "email",
        message: "Enter a valid email address.",
      });
      return;
    }
    if (password.length < 8) {
      setFieldError({
        field: "password",
        message: "Use at least 8 characters for your password.",
      });
      return;
    }
    if (password !== confirmPassword) {
      setFieldError({
        field: "confirmPassword",
        message: "Your passwords don't match.",
      });
      return;
    }

    const { error } = await signUp.password({
      emailAddress: normalizedEmail,
      password,
    });
    if (error) {
      setFormError(getAuthErrorMessage(error));
      return;
    }

    const { error: sendError } = await signUp.verifications.sendEmailCode();
    if (sendError) {
      setFormError(getAuthErrorMessage(sendError));
      return;
    }
    setCode("");
    setIsVerifying(true);
    setNotice(`A verification code is on its way to ${normalizedEmail}.`);
  };

  const handleVerify = async () => {
    setFormError("");
    if (!/^\d{4,8}$/.test(code.trim())) {
      setFieldError({
        field: "code",
        message: "Enter the verification code from your email.",
      });
      return;
    }
    setFieldError(null);

    const { error } = await signUp.verifications.verifyEmailCode({
      code: code.trim(),
    });
    if (error) {
      setFormError(getAuthErrorMessage(error));
      return;
    }
    if (signUp.status !== "complete") {
      setFormError(
        "Your account needs another step before it can be activated.",
      );
      return;
    }

    const { error: finalizeError } = await signUp.finalize();
    if (finalizeError) setFormError(getAuthErrorMessage(finalizeError));
  };

  const handleResendCode = async () => {
    setFormError("");
    const { error } = await signUp.verifications.sendEmailCode();
    if (error) setFormError(getAuthErrorMessage(error));
    else setNotice("A new verification code has been sent.");
  };

  const changeEmail = async () => {
    await signUp.reset();
    setIsVerifying(false);
    setCode("");
    setPassword("");
    setConfirmPassword("");
    setFormError("");
    setFieldError(null);
    setNotice("");
  };

  return (
    <AuthLayout
      title={isVerifying ? "Verify your email" : "Create your account"}
      subtitle={
        isVerifying
          ? `Enter the code we sent to ${normalizedEmail}.`
          : "One place to stay ahead of every subscription."
      }
    >
      <View className="auth-card">
        <View className="auth-form">
          <>
            {(formError || notice) && (
              <AuthNotice
                message={formError || notice}
                tone={formError ? "error" : "success"}
              />
            )}
            {isVerifying ? (
              <>
                <AuthField
                  autoCapitalize="characters"
                  error={
                    fieldError?.field === "code"
                      ? fieldError.message
                      : undefined
                  }
                  keyboardType="number-pad"
                  label="Verification code"
                  maxLength={8}
                  onChangeText={(value) => {
                    setCode(value.replace(/\D/g, ""));
                    setFieldError(null);
                  }}
                  onSubmitEditing={handleVerify}
                  placeholder="Enter your code"
                  returnKeyType="go"
                  value={code}
                />
                <AuthButton
                  loading={isLoading}
                  onPress={handleVerify}
                  title="Verify email"
                />
                <Pressable
                  accessibilityRole="button"
                  className="items-center py-2"
                  disabled={isLoading}
                  onPress={handleResendCode}
                >
                  <Text className="auth-link">Send a new code</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  className="items-center py-2"
                  disabled={isLoading}
                  onPress={changeEmail}
                >
                  <Text className="auth-helper">Use a different email</Text>
                </Pressable>
              </>
            ) : (
              <>
                <AuthField
                  autoCapitalize="none"
                  autoComplete="email"
                  error={
                    fieldError?.field === "email"
                      ? fieldError.message
                      : undefined
                  }
                  keyboardType="email-address"
                  label="Email"
                  onChangeText={(value) => {
                    setEmail(value);
                    setFieldError(null);
                  }}
                  placeholder="Enter your email"
                  returnKeyType="next"
                  textContentType="emailAddress"
                  value={email}
                />
                <AuthField
                  autoComplete="new-password"
                  error={
                    fieldError?.field === "password"
                      ? fieldError.message
                      : undefined
                  }
                  label="Password"
                  onChangeText={(value) => {
                    setPassword(value);
                    setFieldError(null);
                  }}
                  placeholder="At least 8 characters"
                  secureTextEntry
                  showPasswordToggle
                  textContentType="newPassword"
                  value={password}
                />
                <AuthField
                  autoComplete="new-password"
                  error={
                    fieldError?.field === "confirmPassword"
                      ? fieldError.message
                      : undefined
                  }
                  label="Confirm password"
                  onChangeText={(value) => {
                    setConfirmPassword(value);
                    setFieldError(null);
                  }}
                  onSubmitEditing={handleSignUp}
                  placeholder="Enter your password again"
                  returnKeyType="go"
                  secureTextEntry
                  showPasswordToggle
                  textContentType="newPassword"
                  value={confirmPassword}
                />
                <Text className="auth-helper">
                  We&apos;ll verify your email before activating your account.
                </Text>
                <AuthButton
                  loading={isLoading}
                  onPress={handleSignUp}
                  title="Create account"
                />
                <View nativeID="clerk-captcha" />
                <AuthSwitch
                  href="/(auth)/sign-in"
                  label="Sign in"
                  prompt="Already have an account?"
                />
              </>
            )}
          </>
        </View>
      </View>
    </AuthLayout>
  );
}
