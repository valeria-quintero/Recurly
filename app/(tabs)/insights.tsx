import { icons } from "@/constants/icons";
import { colors } from "@/constants/theme";
import { useSubscriptions } from "@/lib/subscriptions";
import { formatCurrency } from "@/lib/utils";
import dayjs, { Dayjs } from "dayjs";
import { router } from "expo-router";
import { styled } from "nativewind";
import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const historyColors = ["#f5d64b", "#8fd1bd", "#e8def8", "#f2a383"];

const getBillingPeriod = (subscription: Subscription) => {
  const billing = subscription.billing || subscription.frequency || "";
  if (/year|annual/i.test(billing)) return "yearly";
  if (/quarter/i.test(billing)) return "quarterly";
  if (/week/i.test(billing)) return "weekly";
  if (/day/i.test(billing)) return "daily";
  return "monthly";
};

const getMonthlyPrice = (subscription: Subscription) => {
  switch (getBillingPeriod(subscription)) {
    case "yearly":
      return subscription.price / 12;
    case "quarterly":
      return subscription.price / 3;
    case "weekly":
      return (subscription.price * 52) / 12;
    case "daily":
      return (subscription.price * 365) / 12;
    default:
      return subscription.price;
  }
};

const getNextRenewal = (subscription: Subscription, today: Dayjs) => {
  if (!subscription.renewalDate) return null;

  let renewal = dayjs(subscription.renewalDate);
  if (!renewal.isValid()) return null;

  const billingPeriod = getBillingPeriod(subscription);
  while (renewal.isBefore(today, "day")) {
    switch (billingPeriod) {
      case "yearly":
        renewal = renewal.add(1, "year");
        break;
      case "quarterly":
        renewal = renewal.add(3, "month");
        break;
      case "weekly":
        renewal = renewal.add(1, "week");
        break;
      case "daily":
        renewal = renewal.add(1, "day");
        break;
      default:
        renewal = renewal.add(1, "month");
    }
  }
  return renewal;
};

const Insights = () => {
  const subscriptions = useSubscriptions();
  const today = dayjs().startOf("day");
  const monday = today.subtract((today.day() + 6) % 7, "day");
  const todayIndex = (today.day() + 6) % 7;
  const activeSubscriptions = subscriptions.filter(
    (subscription) => subscription.status === "active",
  );
  const upcomingSubscriptions = activeSubscriptions
    .map((subscription) => ({
      ...subscription,
      nextRenewal: getNextRenewal(subscription, today),
    }))
    .filter(
      (
        subscription,
      ): subscription is typeof subscription & {
        nextRenewal: Dayjs;
      } => subscription.nextRenewal !== null,
    )
    .sort(
      (first, second) =>
        first.nextRenewal.valueOf() - second.nextRenewal.valueOf(),
    );

  const weeklyChargesByCurrency = upcomingSubscriptions.reduce<
    Record<string, number[]>
  >((totals, subscription) => {
    const currency = subscription.currency || "USD";
    const charges = (totals[currency] ??= weekdays.map(() => 0));
    weekdays.forEach((_, index) => {
      const date = monday.add(index, "day");
      const isDue =
        getBillingPeriod(subscription) === "daily"
          ? !date.isBefore(subscription.nextRenewal, "day")
          : subscription.nextRenewal.isSame(date, "day");
      if (isDue) charges[index] += subscription.price;
    });
    return totals;
  }, {});
  const weeklyChartEntries = Object.entries(weeklyChargesByCurrency);
  if (weeklyChartEntries.length === 0) {
    weeklyChartEntries.push(["USD", weekdays.map(() => 0)]);
  }
  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const monthlyTotals = activeSubscriptions.reduce<Record<string, number>>(
    (totals, subscription) => {
      const currency = subscription.currency || "USD";
      totals[currency] =
        (totals[currency] || 0) + getMonthlyPrice(subscription);
      return totals;
    },
    {},
  );
  const monthlyTotalEntries = Object.entries(monthlyTotals);

  const navigateToSubscriptions = () =>
    router.navigate("/(tabs)/subscriptions");

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-7 mt-3 h-12 flex-row items-center justify-between">
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            className="h-12 w-12 items-center justify-center rounded-full border border-black/20"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/")
            }
          >
            <Image source={icons.back} className="h-6 w-6" />
          </Pressable>
          <Text className="text-xl font-sans-bold text-primary">
            Monthly Insights
          </Text>
          <Pressable
            accessibilityLabel="Open settings"
            accessibilityRole="button"
            className="h-12 w-12 items-center justify-center rounded-full border border-black/20"
            onPress={() => router.navigate("/(tabs)/settings")}
          >
            <Image source={icons.menu} className="h-6 w-6" />
          </Pressable>
        </View>

        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-xl font-sans-bold text-primary">Upcoming</Text>
          <Pressable
            accessibilityRole="button"
            className="rounded-full border border-black/20 px-4 py-2"
            onPress={navigateToSubscriptions}
          >
            <Text className="font-sans-semibold text-primary">View all</Text>
          </Pressable>
        </View>

        {weeklyChartEntries.map(([currency, weeklyCharges]) => {
          const chartScale = Math.max(
            45,
            Math.ceil(Math.max(...weeklyCharges) / 15) * 15,
          );
          return (
            <View
              key={currency}
              className="mb-4 h-[264px] rounded-2xl bg-muted px-4 pb-3 pt-4"
            >
              <Text className="mb-1 text-xs font-sans-semibold text-primary/60">
                {currency}
              </Text>
              <View className="flex-1 flex-row">
                <View className="mr-2 justify-between pb-1 pt-1">
                  {[3, 2, 1, 0].map((tick) => (
                    <Text key={tick} className="text-xs text-primary/60">
                      {formatCurrency((chartScale * tick) / 3, currency)}
                    </Text>
                  ))}
                </View>
                <View className="flex-1 flex-row justify-between">
                  {weeklyCharges.map((charge, index) => {
                    const selected = selectedDay === index;
                    const height = Math.max((charge / chartScale) * 148, 4);
                    return (
                      <Pressable
                        key={weekdays[index]}
                        accessibilityLabel={`${weekdays[index]}: ${formatCurrency(charge, currency)}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        className="flex-1 items-center justify-end"
                        onPress={() => setSelectedDay(index)}
                      >
                        <View className="mb-2 h-7 items-center justify-center">
                          {selected && (
                            <View className="rounded-xl bg-white px-2 py-1">
                              <Text
                                className="text-xs font-sans-bold"
                                style={{ color: colors.accent }}
                              >
                                {formatCurrency(charge, currency)}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View
                          className="w-3 rounded-full"
                          style={{
                            height,
                            backgroundColor: selected
                              ? colors.accent
                              : colors.primary,
                          }}
                        />
                        <Text className="mt-3 text-xs text-primary/70">
                          {weekdays[index]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          );
        })}

        <View className="mb-7 rounded-2xl border border-black/20 bg-card p-4">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-lg font-sans-bold text-primary">
                Expenses
              </Text>
              <Text className="mt-1 font-sans-medium text-primary/60">
                {today.format("MMMM YYYY")}
              </Text>
            </View>
            <View className="items-end">
              {monthlyTotalEntries.length ? (
                monthlyTotalEntries.map(([currency, total]) => (
                  <Text
                    key={currency}
                    className="text-lg font-sans-bold text-primary"
                  >
                    {formatCurrency(total, currency)}
                  </Text>
                ))
              ) : (
                <Text className="text-lg font-sans-bold text-primary">
                  {formatCurrency(0)}
                </Text>
              )}
              <Text className="mt-1 text-sm font-sans-semibold text-primary/60">
                N/A vs. previous month
              </Text>
            </View>
          </View>
        </View>

        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-xl font-sans-bold text-primary">History</Text>
          <Pressable
            accessibilityRole="button"
            className="rounded-full border border-black/20 px-4 py-2"
            onPress={navigateToSubscriptions}
          >
            <Text className="font-sans-semibold text-primary">View all</Text>
          </Pressable>
        </View>

        {upcomingSubscriptions.length ? (
          upcomingSubscriptions.map((subscription, index) => (
            <Pressable
              key={subscription.id}
              accessibilityRole="button"
              className="mb-4 min-h-24 flex-row items-center justify-between rounded-2xl px-4 py-3"
              onPress={() =>
                router.navigate(`/subscriptions/${subscription.id}`)
              }
              style={{
                backgroundColor:
                  subscription.color ||
                  historyColors[index % historyColors.length],
              }}
            >
              <View className="min-w-0 flex-1 flex-row items-center">
                <View className="mr-3 h-14 w-14 items-center justify-center rounded-xl bg-white/35">
                  <Image
                    source={subscription.icon}
                    className="h-10 w-10 rounded-lg"
                    resizeMode="contain"
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <Text
                    numberOfLines={1}
                    className="text-base font-sans-bold text-primary"
                  >
                    {subscription.name}
                  </Text>
                  <Text className="mt-1 text-sm font-sans-medium text-primary/70">
                    {subscription.nextRenewal.format("MMMM D, h:mm A")}
                  </Text>
                </View>
              </View>
              <View className="ml-2 items-end">
                <Text className="text-base font-sans-bold text-primary">
                  {formatCurrency(subscription.price, subscription.currency)}
                </Text>
                <Text className="mt-1 text-sm font-sans-medium text-primary/70">
                  {subscription.billing.toLowerCase()}
                </Text>
              </View>
            </Pressable>
          ))
        ) : (
          <Text className="py-4 text-sm font-sans-medium text-primary/60">
            No upcoming subscription charges.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Insights;
