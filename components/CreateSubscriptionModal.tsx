import { icons } from "@/constants/icons";
import { clsx } from "clsx";
import dayjs from "dayjs";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

const categories = [
  "Entertainment",
  "AI tools",
  "Developer Tools",
  "Design",
  "Productivity",
  "Cloud",
  "Music",
  "Other",
] as const;

const categoryColors: Record<(typeof categories)[number], string> = {
  Entertainment: "#f4c7a1",
  "AI tools": "#b8d4e3",
  "Developer Tools": "#e8def8",
  Design: "#f5c542",
  Productivity: "#b8e8d0",
  Cloud: "#b9dce8",
  Music: "#e9bfd0",
  Other: "#d8dfbd",
};

type Frequency = "Monthly" | "Yearly";

type CreateSubscriptionModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreate: (subscription: Subscription) => void;
};

export default function CreateSubscriptionModal({
  visible,
  onClose,
  onCreate,
}: CreateSubscriptionModalProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("Monthly");
  const [category, setCategory] =
    useState<(typeof categories)[number]>(categories[0]);
  const parsedPrice = Number(price);
  const isNameValid = name.trim().length > 0;
  const isPriceValid = Number.isFinite(parsedPrice) && parsedPrice > 0;
  const isFormValid = isNameValid && isPriceValid;

  const resetForm = () => {
    setName("");
    setPrice("");
    setFrequency("Monthly");
    setCategory(categories[0]);
  };

  const handleCreate = () => {
    if (!isFormValid) return;

    const startDate = dayjs();
    const renewalDate = startDate.add(1, frequency === "Monthly" ? "month" : "year");
    const subscription: Subscription = {
      id: `subscription-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      price: parsedPrice,
      currency: "USD",
      frequency,
      billing: frequency,
      category,
      status: "active",
      startDate: startDate.toISOString(),
      renewalDate: renewalDate.toISOString(),
      icon: icons.wallet,
      color: categoryColors[category],
    };

    onCreate(subscription);
    resetForm();
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View className="modal-overlay justify-end">
        <KeyboardAvoidingView
          className="flex-1 justify-end"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View className="modal-container">
            <View className="modal-header">
              <Text className="modal-title">New Subscription</Text>
              <Pressable
                accessibilityLabel="Close new subscription form"
                accessibilityRole="button"
                className="modal-close"
                onPress={onClose}
              >
                <Text className="modal-close-text">X</Text>
              </Pressable>
            </View>

            <ScrollView
              className="max-h-full"
              contentContainerClassName="modal-body"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View className="auth-field">
                <Text className="auth-label">Name</Text>
                <TextInput
                  accessibilityLabel="Name"
                  autoCapitalize="words"
                  className="auth-input"
                  onChangeText={setName}
                  placeholder="e.g. Netflix"
                  placeholderTextColor="#647084"
                  returnKeyType="next"
                  value={name}
                />
                {name.length > 0 && !isNameValid ? (
                  <Text className="auth-error">Enter a subscription name.</Text>
                ) : null}
              </View>

              <View className="auth-field">
                <Text className="auth-label">Price</Text>
                <TextInput
                  accessibilityLabel="Price"
                  className="auth-input"
                  keyboardType="decimal-pad"
                  onChangeText={setPrice}
                  placeholder="0.00"
                  placeholderTextColor="#647084"
                  value={price}
                />
                {price.length > 0 && !isPriceValid ? (
                  <Text className="auth-error">
                    Enter a price greater than zero.
                  </Text>
                ) : null}
              </View>

              <View className="auth-field">
                <Text className="auth-label">Frequency</Text>
                <View className="picker-row">
                  {(["Monthly", "Yearly"] as const).map((option) => {
                    const isSelected = frequency === option;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        className={clsx(
                          "picker-option",
                          isSelected && "picker-option-active",
                        )}
                        key={option}
                        onPress={() => setFrequency(option)}
                      >
                        <Text
                          className={clsx(
                            "picker-option-text",
                            isSelected && "picker-option-text-active",
                          )}
                        >
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View className="auth-field">
                <Text className="auth-label">Category</Text>
                <View className="category-scroll">
                  {categories.map((option) => {
                    const isSelected = category === option;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        className={clsx(
                          "category-chip",
                          isSelected && "category-chip-active",
                        )}
                        key={option}
                        onPress={() => setCategory(option)}
                      >
                        <Text
                          className={clsx(
                            "category-chip-text",
                            isSelected && "category-chip-text-active",
                          )}
                        >
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !isFormValid }}
                className={clsx(
                  "auth-button",
                  !isFormValid && "auth-button-disabled",
                )}
                disabled={!isFormValid}
                onPress={handleCreate}
              >
                <Text className="auth-button-text">Create Subscription</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}