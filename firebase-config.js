// 🔧 SUBSTITUA pelas credenciais do projeto Firebase.
// Console: https://console.firebase.google.com > Configurações do projeto > Seus apps (Web)
// Estas chaves são públicas por design — proteja com Regras do Firestore.
// Configurações do projeto Firebase Real

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBeGZ6kXjS21k2WVHlkzDNnsStVT9IiSuU",
  authDomain: "barbearias-40070.firebaseapp.com",
  databaseURL: "https://barbearias-40070-default-rtdb.firebaseio.com",
  projectId: "barbearias-40070",
  storageBucket: "barbearias-40070.firebasestorage.app",
  messagingSenderId: "784765952485",
  appId: "1:784765952485:web:eed1709e4e7d3ab1554f0c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);