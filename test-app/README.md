# MRcipher Test App

Bu loyihada MRcipher shifrlash xizmatini sinab ko'rish uchun oddiy HTML ilova.

## Firebase config

`app.js` ichidagi `firebaseConfig` siz yuborgan `test-36e06` loyihasiga qaratilgan.

## Boshlash

1. `test-app/index.html` faylini brauzerda oching.
2. **Google bilan kirish** tugmasini bosing.
3. **MRcipher sozlamalari** bo'limiga server URL va API key kiriting.
4. **Shifrlashni sinash** bo'limida matn yoki JSON kiriting va shifrlang.

## MRcipher ga ulash

`app.js` ichidagi `callApi` funksiyasi allaqachon MRcipher endpointlariga so'rov yuborishga tayyor. Siz faqat API key va server URL ni kiritishingiz kerak.

## Eslatma

Agar CORS muammosi bo'lsa, MRcipher serverida `origin` ruxsat etilganligini tekshiring.
