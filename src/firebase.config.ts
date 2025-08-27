import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: 'AIzaSyBj8BmTKrauLcB7c0BL_56GKexxzJXPocA',
  authDomain: 'legalx-b64a7.firebaseapp.com',
  projectId: 'legalx-b64a7',
  storageBucket: 'legalx-b64a7.firebasestorage.app',
  messagingSenderId: '34186005691',
  appId: '1:34186005691:web:e6bf474c3893ba3a0dad9e',
  measurementId: 'G-HESNWJTHSZ'
};

// Inicializa
const app = initializeApp(firebaseConfig);

// Analytics (opcional, só funciona em produção com HTTPS)
const analytics = getAnalytics(app);

// Serviços que vamos usar
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export { app };
export { analytics };

