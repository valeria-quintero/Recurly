import {
  AuthButton,
  AuthField,
  AuthLayout,
  AuthNotice,
  AuthSwitch,
  getAuthErrorMessage,
} from "@/components/AuthUI";
import { posthog } from "@/lib/posthog";
import { useSignIn } from "@clerk/expo";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

type SignInStep =
  | "credentials"
  | "device-trust"
  | "mfa"
  | "reset-email"
  | "reset-code"
  | "new-password";
type VerificationMethod =
  | "device-email"
  | "device-phone"
  | "mfa-phone"
  | "mfa-totp";
type SignInField =
  | "email"
  | "password"
  | "code"
  | "newPassword"
  | "confirmPassword";

export default function SignIn() {
  const { signIn, fetchStatus } = useSignIn();
  const [step, setStep] = useState<SignInStep>("credentials");
  const [verificationMethod, setVerificationMethod] =
    useState<VerificationMethod>("mfa-totp");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldError, setFieldError] = useState<{
    field: SignInField;
    message: string;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const isLoading = fetchStatus === "fetching";
  const normalizedEmail = email.trim().toLowerCase();

  const finishSignIn = async () => {
    const { error } = await signIn.finalize();
    if (error) {
      setFormError(getAuthErrorMessage(error));
      return false;
    }
    return true;
  };

  const startVerification = async () => {
    if (signIn.status === "needs_client_trust") {
      const emailFactor = signIn.supportedSecondFactors.find(
        (factor) => factor.strategy === "email_code",
      );
      const phoneFactor = signIn.supportedSecondFactors.find(
        (factor) => factor.strategy === "phone_code",
      );

      if (emailFactor) {
        setVerificationMethod("device-email");
        const { error } = await signIn.mfa.sendEmailCode();
        if (error) setFormError(getAuthErrorMessage(error));
        else setStep("device-trust");
        return;
      }

      if (phoneFactor) {
        setVerificationMethod("device-phone");
        const { error } = await signIn.mfa.sendPhoneCode();
        if (error) setFormError(getAuthErrorMessage(error));
        else setStep("device-trust");
        return;
      }

      setFormError("No verification method is available for this device.");
      return;
    }

    if (signIn.status === "needs_second_factor") {
      const phoneFactor = signIn.supportedSecondFactors.find(
        (factor) => factor.strategy === "phone_code",
      );
      const totpFactor = signIn.supportedSecondFactors.find(
        (factor) => factor.strategy === "totp",
      );
      const backupFactor = signIn.supportedSecondFactors.find(
        (factor) => factor.strategy === "backup_code",
      );

      if (phoneFactor) {
        setVerificationMethod("mfa-phone");
        setUseBackupCode(false);
        const { error } = await signIn.mfa.sendPhoneCode();
        if (error) setFormError(getAuthErrorMessage(error));
      } else if (totpFactor) {
        setVerificationMethod("mfa-totp");
        setUseBackupCode(false);
      } else if (backupFactor) {
        setUseBackupCode(true);
      } else {
        setFormError(
          "No supported verification method is available for this account.",
        );
      }
      setStep("mfa");
      return;
    }

    setFormError("We couldn't continue the sign-in. Please try again.");
  };

  const handleSignIn = async () => {
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
    if (!password) {
      setFieldError({ field: "password", message: "Enter your password." });
      return;
    }

    const { error } = await signIn.password({
      emailAddress: normalizedEmail,
      password,
    });
    if (error) {
      setFormError(getAuthErrorMessage(error));
      return;
    }

    if (signIn.status === "complete") {
      if (await finishSignIn()) posthog?.capture("sign_in_completed");
      return;
    }

    await startVerification();
  };

  const handleVerify = async () => {
    setFormError("");
    if (!code.trim()) {
      setFieldError({ field: "code", message: "Enter the verification code." });
      return;
    }
    setFieldError(null);

    let error;
    if (step === "device-trust") {
      error =
        verificationMethod === "device-email"
          ? (await signIn.mfa.verifyEmailCode({ code: code.trim() })).error
          : (await signIn.mfa.verifyPhoneCode({ code: code.trim() })).error;
    } else if (useBackupCode) {
      error = (await signIn.mfa.verifyBackupCode({ code: code.trim() })).error;
    } else if (verificationMethod === "mfa-phone") {
      error = (await signIn.mfa.verifyPhoneCode({ code: code.trim() })).error;
    } else {
      error = (await signIn.mfa.verifyTOTP({ code: code.trim() })).error;
    }

    if (error) {
      setFormError(getAuthErrorMessage(error));
      return;
    }
    if (signIn.status === "complete") {
      if (await finishSignIn()) posthog?.capture("sign_in_completed");
    } else
      setFormError("That code couldn't be verified. Check it and try again.");
  };

  const resendVerificationCode = async () => {
    setFormError("");
    const { error } =
      verificationMethod === "device-email"
        ? await signIn.mfa.sendEmailCode()
        : await signIn.mfa.sendPhoneCode();
    if (error) setFormError(getAuthErrorMessage(error));
    else setNotice("A new verification code has been sent.");
  };

  const handleSendResetCode = async () => {
    setFormError("");
    setFieldError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail)) {
      setFieldError({
        field: "email",
        message: "Enter a valid email address.",
      });
      return;
    }

    const { error: createError } = await signIn.create({
      identifier: normalizedEmail,
    });
    if (createError) {
      setFormError(getAuthErrorMessage(createError));
      return;
    }
    const { error } = await signIn.resetPasswordEmailCode.sendCode();
    if (error) {
      setFormError(getAuthErrorMessage(error));
      return;
    }
    setCode("");
    setStep("reset-code");
    setNotice("Check your inbox for a password reset code.");
  };

  const handleVerifyResetCode = async () => {
    setFormError("");
    if (!code.trim()) {
      setFieldError({
        field: "code",
        message: "Enter the code from your email.",
      });
      return;
    }
    setFieldError(null);
    const { error } = await signIn.resetPasswordEmailCode.verifyCode({
      code: code.trim(),
    });
    if (error) {
      setFormError(getAuthErrorMessage(error));
      return;
    }
    setStep("new-password");
    setNotice("");
  };

  const handleResetPassword = async () => {
    setFormError("");
    setFieldError(null);
    if (newPassword.length < 8) {
      setFieldError({
        field: "newPassword",
        message: "Use at least 8 characters for your password.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldError({
        field: "confirmPassword",
        message: "Your passwords don't match.",
      });
      return;
    }
    const { error } = await signIn.resetPasswordEmailCode.submitPassword({
      password: newPassword,
      signOutOfOtherSessions: true,
    });
    if (error) {
      setFormError(getAuthErrorMessage(error));
      return;
    }
    if (await finishSignIn()) posthog?.capture("password_reset_completed");
  };

  const handleBackToSignIn = async () => {
    await signIn.reset();
    setStep("credentials");
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setFormError("");
    setFieldError(null);
    setNotice("");
  };

  const verificationStep = step === "device-trust" || step === "mfa";
  const isCodeStep = verificationStep || step === "reset-code";
  const title =
    step === "reset-email"
      ? "Reset your password"
      : step === "new-password"
        ? "Choose a new password"
        : isCodeStep
          ? step === "reset-code"
            ? "Check your email"
            : "Verify your account"
          : "Welcome back";
  const subtitle =
    step === "reset-email"
      ? "We'll email you a code to reset your password."
      : step === "new-password"
        ? "Create a new password for your Recurly account."
        : isCodeStep
          ? step === "reset-code"
            ? `Enter the reset code sent to ${normalizedEmail}.`
            : step === "mfa" && useBackupCode
              ? "Enter one of your backup codes."
              : verificationMethod === "mfa-totp"
                ? "Enter the code from your authenticator app."
                : verificationMethod === "device-phone" ||
                    verificationMethod === "mfa-phone"
                  ? "Enter the code sent to your phone."
                  : `Enter the code sent to ${normalizedEmail}.`
          : "Sign in to continue managing your subscriptions.";

  return (
    <AuthLayout title={title} subtitle={subtitle}>
      <View className="auth-card">
        <View className="auth-form">
          <>
            {(formError || notice) && (
              <AuthNotice
                message={formError || notice}
                tone={formError ? "error" : "success"}
              />
            )}
            {step === "credentials" && (
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
                  autoComplete="current-password"
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
                  placeholder="Enter your password"
                  returnKeyType="go"
                  secureTextEntry
                  showPasswordToggle
                  textContentType="password"
                  value={password}
                  onSubmitEditing={handleSignIn}
                />
                <Pressable
                  accessibilityRole="button"
                  className="self-end py-1"
                  onPress={() => {
                    setFormError("");
                    setFieldError(null);
                    setNotice("");
                    setStep("reset-email");
                  }}
                >
                  <Text className="auth-link">Forgot password?</Text>
                </Pressable>
                <AuthButton
                  loading={isLoading}
                  onPress={handleSignIn}
                  title="Sign in"
                />
                <AuthSwitch
                  href="/(auth)/sign-up"
                  label="Create an account"
                  prompt="New to Recurly?"
                />
              </>
            )}

            {step === "device-trust" && (
              <>
                <AuthField
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
                  placeholder="Enter the code"
                  value={code}
                />
                <AuthButton
                  loading={isLoading}
                  onPress={handleVerify}
                  title="Verify and sign in"
                />
                <Pressable
                  accessibilityRole="button"
                  className="items-center py-2"
                  disabled={isLoading}
                  onPress={resendVerificationCode}
                >
                  <Text className="auth-link">Send a new code</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  className="items-center py-2"
                  onPress={handleBackToSignIn}
                >
                  <Text className="auth-helper">Back to sign in</Text>
                </Pressable>
              </>
            )}

            {step === "mfa" && (
              <>
                <AuthField
                  autoCapitalize={useBackupCode ? "characters" : "none"}
                  error={
                    fieldError?.field === "code"
                      ? fieldError.message
                      : undefined
                  }
                  keyboardType={
                    useBackupCode || verificationMethod === "mfa-totp"
                      ? "default"
                      : "number-pad"
                  }
                  label={useBackupCode ? "Backup code" : "Verification code"}
                  maxLength={16}
                  onChangeText={(value) => {
                    setCode(value);
                    setFieldError(null);
                  }}
                  placeholder={
                    useBackupCode ? "Enter a backup code" : "Enter your code"
                  }
                  value={code}
                />
                <AuthButton
                  loading={isLoading}
                  onPress={handleVerify}
                  title="Verify and sign in"
                />
                {signIn.supportedSecondFactors.some(
                  (factor) => factor.strategy === "backup_code",
                ) && (
                  <Pressable
                    accessibilityRole="button"
                    className="items-center py-2"
                    onPress={() => {
                      setUseBackupCode((value) => !value);
                      setCode("");
                      setFormError("");
                      setFieldError(null);
                    }}
                  >
                    <Text className="auth-link">
                      {useBackupCode
                        ? "Use another verification method"
                        : "Use a backup code"}
                    </Text>
                  </Pressable>
                )}
                {!useBackupCode &&
                  signIn.supportedSecondFactors.some(
                    (factor) => factor.strategy === "totp",
                  ) &&
                  signIn.supportedSecondFactors.some(
                    (factor) => factor.strategy === "phone_code",
                  ) && (
                    <Pressable
                      accessibilityRole="button"
                      className="items-center py-2"
                      disabled={isLoading}
                      onPress={async () => {
                        setFormError("");
                        setCode("");
                        if (verificationMethod === "mfa-phone") {
                          setVerificationMethod("mfa-totp");
                        } else {
                          setVerificationMethod("mfa-phone");
                          const { error } = await signIn.mfa.sendPhoneCode();
                          if (error) setFormError(getAuthErrorMessage(error));
                        }
                      }}
                    >
                      <Text className="auth-link">
                        {verificationMethod === "mfa-phone"
                          ? "Use authenticator app"
                          : "Use SMS code"}
                      </Text>
                    </Pressable>
                  )}
                {verificationMethod === "mfa-phone" && !useBackupCode && (
                  <Pressable
                    accessibilityRole="button"
                    className="items-center py-2"
                    disabled={isLoading}
                    onPress={resendVerificationCode}
                  >
                    <Text className="auth-link">Send a new code</Text>
                  </Pressable>
                )}
                <Pressable
                  accessibilityRole="button"
                  className="items-center py-2"
                  onPress={handleBackToSignIn}
                >
                  <Text className="auth-helper">Back to sign in</Text>
                </Pressable>
              </>
            )}

            {step === "reset-email" && (
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
                  textContentType="emailAddress"
                  value={email}
                />
                <AuthButton
                  loading={isLoading}
                  onPress={handleSendResetCode}
                  title="Send reset code"
                />
                <Pressable
                  accessibilityRole="button"
                  className="items-center py-2"
                  onPress={handleBackToSignIn}
                >
                  <Text className="auth-helper">Back to sign in</Text>
                </Pressable>
              </>
            )}

            {step === "reset-code" && (
              <>
                <AuthField
                  error={
                    fieldError?.field === "code"
                      ? fieldError.message
                      : undefined
                  }
                  keyboardType="number-pad"
                  label="Reset code"
                  maxLength={8}
                  onChangeText={(value) => {
                    setCode(value.replace(/\D/g, ""));
                    setFieldError(null);
                  }}
                  placeholder="Enter the code from your email"
                  value={code}
                />
                <AuthButton
                  loading={isLoading}
                  onPress={handleVerifyResetCode}
                  title="Continue"
                />
                <Pressable
                  accessibilityRole="button"
                  className="items-center py-2"
                  disabled={isLoading}
                  onPress={async () => {
                    setFormError("");
                    const { error } =
                      await signIn.resetPasswordEmailCode.sendCode();
                    if (error) setFormError(getAuthErrorMessage(error));
                    else setNotice("A new reset code has been sent.");
                  }}
                >
                  <Text className="auth-link">Send a new code</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  className="items-center py-2"
                  onPress={handleBackToSignIn}
                >
                  <Text className="auth-helper">Back to sign in</Text>
                </Pressable>
              </>
            )}

            {step === "new-password" && (
              <>
                <AuthField
                  autoComplete="new-password"
                  error={
                    fieldError?.field === "newPassword"
                      ? fieldError.message
                      : undefined
                  }
                  label="New password"
                  onChangeText={(value) => {
                    setNewPassword(value);
                    setFieldError(null);
                  }}
                  placeholder="At least 8 characters"
                  secureTextEntry
                  showPasswordToggle
                  textContentType="newPassword"
                  value={newPassword}
                />
                <AuthField
                  autoComplete="new-password"
                  error={
                    fieldError?.field === "confirmPassword"
                      ? fieldError.message
                      : undefined
                  }
                  label="Confirm new password"
                  onChangeText={(value) => {
                    setConfirmPassword(value);
                    setFieldError(null);
                  }}
                  placeholder="Enter your new password again"
                  secureTextEntry
                  showPasswordToggle
                  textContentType="newPassword"
                  value={confirmPassword}
                />
                <AuthButton
                  loading={isLoading}
                  onPress={handleResetPassword}
                  title="Update password"
                />
                <Pressable
                  accessibilityRole="button"
                  className="items-center py-2"
                  onPress={handleBackToSignIn}
                >
                  <Text className="auth-helper">Back to sign in</Text>
                </Pressable>
              </>
            )}
          </>
        </View>
      </View>
    </AuthLayout>
  );
}
