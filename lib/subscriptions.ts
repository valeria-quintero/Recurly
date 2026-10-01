import { HOME_SUBSCRIPTIONS } from "@/constants/data";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "@recurly/subscriptions";
let subscriptions = [...HOME_SUBSCRIPTIONS];
const listeners = new Set<() => void>();
let loadPromise: Promise<void> | undefined;
let writeQueue: Promise<void> = Promise.resolve();

const notify = () => listeners.forEach((listener) => listener());

const loadSubscriptions = () => {
  if (!loadPromise) {
    loadPromise = AsyncStorage.getItem(STORAGE_KEY)
      .then((storedSubscriptions) => {
        if (storedSubscriptions) {
          const parsedSubscriptions: unknown = JSON.parse(storedSubscriptions);
          if (!Array.isArray(parsedSubscriptions)) {
            throw new Error("Stored subscriptions must be an array.");
          }
          subscriptions = parsedSubscriptions as Subscription[];
        }
        notify();
      })
      .catch((error: unknown) => {
        loadPromise = undefined;
        throw error;
      });
  }

  return loadPromise;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => subscriptions;

export const addSubscription = (subscription: Subscription): Promise<void> => {
  const save = writeQueue.then(async () => {
    await loadSubscriptions();
    const nextSubscriptions = [subscription, ...subscriptions];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextSubscriptions));
    subscriptions = nextSubscriptions;
    notify();
  });
  writeQueue = save.catch(() => undefined);
  return save;
};

export const useSubscriptions = () => {
  const currentSubscriptions = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );

  useEffect(() => {
    void loadSubscriptions().catch(() => undefined);
  }, []);

  return currentSubscriptions;
};
