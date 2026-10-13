import { Alert, Platform } from 'react-native';

// Alert.alert is a no-op on react-native-web, so the browser build falls back to window dialogs.
const web = Platform.OS === 'web';

/** Asks the user to confirm a destructive action. Resolves true when they confirm. */
export function confirmDestructive(title: string, message: string, confirmLabel: string): Promise<boolean> {
  if (web) return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

/** Shows a simple message on every platform. */
export function showMessage(title: string, message: string): void {
  if (web) window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}
