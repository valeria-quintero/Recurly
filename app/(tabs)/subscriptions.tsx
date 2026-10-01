import { styled } from "nativewind";
import React, { useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";

import SubscriptionCard from "@/components/SubscriptionCard";
import { HOME_SUBSCRIPTIONS } from "@/constants/data";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const Subscriptions = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<
    string | null
  >(null);
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredSubscriptions = HOME_SUBSCRIPTIONS.filter((subscription) =>
    [
      subscription.name,
      subscription.category,
      subscription.plan,
      subscription.status,
    ].some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)),
  );

  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      <FlatList
        data={filteredSubscriptions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SubscriptionCard
            {...item}
            expanded={expandedSubscriptionId === item.id}
            onPress={() =>
              setExpandedSubscriptionId((currentId) =>
                currentId === item.id ? null : item.id,
              )
            }
          />
        )}
        ListHeaderComponent={
          <View className="mb-5 gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-2xl font-sans-bold text-primary">
                Subscriptions
              </Text>
              <Text className="text-sm font-sans-medium text-muted-foreground">
                {filteredSubscriptions.length}
              </Text>
            </View>
            <TextInput
              accessibilityLabel="Search subscriptions"
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              onChangeText={setSearchQuery}
              placeholder="Search by name, category, or plan"
              placeholderTextColor="#6b7280"
              returnKeyType="search"
              value={searchQuery}
              className="rounded-xl border border-border bg-card px-4 py-3 text-base font-sans-medium text-primary"
            />
          </View>
        }
        ItemSeparatorComponent={() => <View className="h-4" />}
        ListEmptyComponent={
          <Text className="py-4 text-sm font-sans-medium text-muted-foreground">
            {searchQuery.trim()
              ? "No subscriptions match your search."
              : "No subscriptions yet."}
          </Text>
        }
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-30"
        keyboardShouldPersistTaps="handled"
        extraData={expandedSubscriptionId}
      />
    </SafeAreaView>
  );
};

export default Subscriptions;
