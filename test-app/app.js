// Bu test ilova MRcipher'ga ulash uchun tayyor. O'zingiz server URL va API key kiritasiz.
// Firebase config siz yuborgan test-36e06 loyihasidan olingan.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyA8SGEx8i6pSzQ1RBTnnWxehrctdpih59c',
  authDomain: 'test-36e06.firebaseapp.com',
  projectId: 'test-36e06',
  storageBucket: 'test-36e06.firebasestorage.app',
  messagingSenderId: '311567938421',
  appId: '1:311567938421:web:27f4d69652515b6ab3d93c',
  measurementId: 'G-MK8N9K9N2C',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

let idToken = null;

const signInBtn = document.getElementById('signInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const userInfo = document.getElementById('userInfo');
const encryptBtn = document.getElementById('encryptBtn');
const decryptBtn = document.getElementById('decryptBtn');
const autoEncryptBtn = document.getElementById('autoEncryptBtn');
const output = document.getElementById('output');
const autoOutput = document.getElementById('autoOutput');
const serverUrlInput = document.getElementById('serverUrl');
const apiKeyInput = document.getElementById('apiKey');
const plaintextInput = document.getElementById('plaintext');
const phoneField = document.getElementById('phoneField');

function setOut(el, data) {
  el.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
}

async function getApiKey() {
  const raw = apiKeyInput.value.trim();
  if (!raw) {
    throw new Error('Avval MRcipher API key kiriting.');
  }
  return raw;
}

async function getServerUrl() {
  return serverUrlInput.value.trim().replace(/\/$/, '');
}

signInBtn.addEventListener('click', async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const token = await result.user.getIdToken();
    idToken = token;
  } catch (err) {
    setOut(output, { error: err.message, code: err.code });
  }
});

signOutBtn.addEventListener('click', async () => {
  await signOut(auth);
  idToken = null;
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    idToken = await user.getIdToken();
    userInfo.classList.remove('hidden');
    signOutBtn.classList.remove('hidden');
    signInBtn.classList.add('hidden');
    userInfo.textContent = `Kirdi: ${user.email} | UID: ${user.uid.slice(0, 8)}...`;
  } else {
    userInfo.classList.add('hidden');
    signOutBtn.classList.add('hidden');
    signInBtn.classList.remove('hidden');
  }
});

async function callApi(path, body) {
  const serverUrl = await getServerUrl();
  const apiKey = await getApiKey();

  const res = await fetch(`${serverUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      origin: window.location.origin,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error?.message || `HTTP ${res.status}`);
  }
  return json;
}

encryptBtn.addEventListener('click', async () => {
  try {
    let content;
    try {
      content = JSON.parse(plaintextInput.value);
    } catch {
      content = plaintextInput.value;
    }

    const result = await callApi('/api/v1/encrypt', { content });
    setOut(output, result);
  } catch (err) {
    setOut(output, { error: err.message });
  }
});

decryptBtn.addEventListener('click', async () => {
  try {
    let content;
    try {
      content = JSON.parse(plaintextInput.value);
    } catch {
      throw new Error('Decrypt uchun shifrlangan JSON container kiriting.');
    }

    const result = await callApi('/api/v1/decrypt', { content });
    setOut(output, result);
  } catch (err) {
    setOut(output, { error: err.message });
  }
});

// Oddiy avto-shifrlash namunasi: faqat phone maydonini shifrlaydi.
autoEncryptBtn.addEventListener('click', async () => {
  try {
    const phone = phoneField.value.trim();
    const encrypted = await callApi('/api/v1/encrypt', { content: phone });

    // Bu yerda o'z serveringizga yuborilgani tasavvur qilinadi.
    const fakeServerPayload = {
      phone: encrypted.data,
      createdAt: new Date().toISOString(),
    };

    setOut(autoOutput, {
      plain: phone,
      encryptedContainer: encrypted.data,
      toYourServer: fakeServerPayload,
    });
  } catch (err) {
    setOut(autoOutput, { error: err.message });
  }
});
