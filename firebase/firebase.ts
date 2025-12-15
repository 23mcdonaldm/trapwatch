
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC7yXY7vKtzsmKWpSgd3-IxpDSEybdHCvw",
  authDomain: "gen-lang-client-0521438359.firebaseapp.com",
  projectId: "gen-lang-client-0521438359",
  storageBucket: "gen-lang-client-0521438359.firebasestorage.app",
  messagingSenderId: "145467541462",
  appId: "1:145467541462:web:170aaefbfda77d32444677",
  measurementId: "G-VRM97S260Y"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const firestore = getFirestore(app);
export const auth = getAuth(app);



// export const auth = {};
// export const googleProvider = {};
// export const db = {};