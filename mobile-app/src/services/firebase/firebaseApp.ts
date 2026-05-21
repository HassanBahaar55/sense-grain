import firebase from '@react-native-firebase/app';

export function getFirebaseApp() {
  return firebase.app();
}

export function isFirebaseConfigured(): boolean {
  return firebase.apps.length > 0;
}
