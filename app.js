// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAdw7H62c6teBPAiziUQ1_Ye4seCs5gRpA",
  authDomain: "lego-city-fb3fc.firebaseapp.com",
  projectId: "lego-city-fb3fc",
  storageBucket: "lego-city-fb3fc.firebasestorage.app",
  messagingSenderId: "467768703245",
  appId: "1:467768703245:web:e35ea2312071780fd61844",
  measurementId: "G-XGNHGDCEEW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);