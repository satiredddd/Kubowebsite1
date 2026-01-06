import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBKbVKLxT_wUN-C9OkSteaPtvyYixFDWV4",
  authDomain: "kubo-ph.firebaseapp.com",
  projectId: "kubo-ph",
  storageBucket: "kubo-ph.firebasestorage.app",
  messagingSenderId: "955370405797",
  appId: "1:955370405797:web:f0bd167040848f2792724c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);


export const auth = getAuth(app); 
export const db = getFirestore(app); 
export const storage = getStorage(app);


export default app;