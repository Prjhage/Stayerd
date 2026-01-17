import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCzF5bu-YibyR4M6LQCVXiKtaH4UFTI0Bk",
  authDomain: "wanderlust-fc9ed.firebaseapp.com",
  projectId: "wanderlust-fc9ed", //
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Function to handle Google sign-in
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const idToken = await user.getIdToken();

    // Send token to backend
    const response = await fetch("/firebase-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (response.ok) {
      // Redirect to home or profile
      window.location.href = "/listings";
    } else {
      alert("Login failed");
    }
  } catch (error) {
    console.error("Error during Google sign-in:", error);
    alert("Google sign-in failed");
  }
}
