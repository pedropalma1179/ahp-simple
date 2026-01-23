// lib/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB4CuPhzhHF52psPcGxc6QNX9S9c9aouVc",
  authDomain: "ahp-bocr-investimento-i4.firebaseapp.com",
  projectId: "ahp-bocr-investimento-i4",
  storageBucket: "ahp-bocr-investimento-i4.firebasestorage.app",
  messagingSenderId: "502375279158",
  appId: "1:502375279158:web:303a86d1c0b262da21c697"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export { db };
