import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyA-e__5S1InaT4HOtskIqf23vATXPTG7Zw",
  authDomain: "spotify-4e845.firebaseapp.com",
  databaseURL: "https://spotify-4e845-default-rtdb.firebaseio.com",
  projectId: "spotify-4e845",
  storageBucket: "spotify-4e845.firebasestorage.app",
  messagingSenderId: "642421867348",
  appId: "1:642421867348:web:47cfbd41733114d214bec1",
  measurementId: "G-TBDEYXJ31M",
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
