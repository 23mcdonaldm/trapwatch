
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBb9hv-CZtSwlxRuTTrfD8xTiDJMUEoYKw",
  authDomain: "trapwatch-2d010.firebaseapp.com",
  projectId: "trapwatch-2d010",
  storageBucket: "trapwatch-2d010.firebasestorage.app",
  messagingSenderId: "303636092972",
  appId: "1:303636092972:web:231a6d03bc84f30d7f9989",
  measurementId: "G-K21DSZQLG0"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const firestore = getFirestore(app);
export const auth = getAuth(app);



// export const auth = {};
// export const googleProvider = {};
// export const db = {};