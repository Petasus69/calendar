// Заполните значениями из Firebase Console → Project settings → SDK setup
// Безопасность: оставьте правила Firestore ограниченными по ID-календаря

window.FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Инициализация (compat)
if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.projectId) {
    apiKey: "AIzaSyAk7l_J_bnE8-_H58cJPnIoCwlIrzL8sWk",

    authDomain: "calendar-74774.firebaseapp.com",
  
    projectId: "calendar-74774",
  
    storageBucket: "calendar-74774.firebasestorage.app",
  
    messagingSenderId: "233785608654",
  
    appId: "1:233785608654:web:f0d0062c85f52ba26f839f",
  
    measurementId: "G-RGHH41F0J4"
  
} else {
  console.warn('Firebase config не задан. Использую localStorage.');
}


