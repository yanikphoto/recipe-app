import { initializeApp } from "firebase/app";
import { 
    initializeFirestore, 
    persistentLocalCache, 
    persistentMultipleTabManager 
} from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyATlY3mHs15wjVjyO_9b1BMtKtXKVfteF0",
  authDomain: "nos-recettes-285a0.firebaseapp.com",
  projectId: "nos-recettes-285a0",
  storageBucket: "nos-recettes-285a0.firebasestorage.app",
  messagingSenderId: "62556526835",
  appId: "1:62556526835:web:28c414253bfeb532ccbf86"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Authentication (Anonymous Sign-In)
export const auth = getAuth(app);
signInAnonymously(auth).catch((err) => {
  console.warn("Anonymous auth notice:", err.message);
});

// Initialize Firestore with robust multi-tab offline caching
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
