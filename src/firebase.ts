import { initializeApp } from 'firebase/app';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export { app };
