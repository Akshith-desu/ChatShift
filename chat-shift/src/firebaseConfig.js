import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCLBw7UKkeULETXsmT1f8O3ONF-CR4rxiY",
  authDomain: "website-4e867.firebaseapp.com",
  projectId: "website-4e867",
  storageBucket: "website-4e867.appspot.com",
  messagingSenderId: "150067622786",
  appId: "1:150067622786:web:89fd9f9065cd68db18959b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
