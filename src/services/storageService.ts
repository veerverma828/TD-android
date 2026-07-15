import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Saves a sensitive value securely using the device's native keychain/keystore.
 */
export async function saveSecureItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error(`Error saving secure item ${key}:`, error);
  }
}

/**
 * Retrieves a sensitive value from the device's native keychain/keystore.
 */
export async function getSecureItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`Error getting secure item ${key}:`, error);
    return null;
  }
}

/**
 * Deletes a sensitive value securely.
 */
export async function deleteSecureItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`Error deleting secure item ${key}:`, error);
  }
}

/**
 * Saves non-sensitive preferences or cached data using AsyncStorage.
 */
export async function savePreference(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.error(`Error saving preference ${key}:`, error);
  }
}

/**
 * Retrieves non-sensitive preferences from AsyncStorage.
 */
export async function getPreference(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error(`Error getting preference ${key}:`, error);
    return null;
  }
}
