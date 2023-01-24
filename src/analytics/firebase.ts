import {initializeApp} from "firebase/app";
import {getAnalytics} from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyAIT8n1cvivmZJZ0vTmQNsaeQnxVbjdNM4",
    authDomain: "crypto-bot-df2c1.firebaseapp.com",
    projectId: "crypto-bot-df2c1",
    storageBucket: "crypto-bot-df2c1.appspot.com",
    messagingSenderId: "326064800654",
    appId: "1:326064800654:web:76f9035d0f349f0edb5adf",
    measurementId: "G-HT03ZCT5JK"
};

export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);