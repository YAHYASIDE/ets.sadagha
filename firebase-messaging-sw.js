/* Service Worker لإشعارات مؤسسة الصداقة (Firebase Cloud Messaging) */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA87qpAXXLa2AXJFQJutzoJqaLCKo7ztkk",
  authDomain: "sadaqa-store-deea7.firebaseapp.com",
  projectId: "sadaqa-store-deea7",
  storageBucket: "sadaqa-store-deea7.firebasestorage.app",
  messagingSenderId: "235682599633",
  appId: "1:235682599633:web:2c605dadb51cdafd84abf0"
});

const messaging = firebase.messaging();

// إشعارات تصل والتطبيق مغلق / في الخلفية
messaging.onBackgroundMessage(function (payload) {
  const n = payload.notification || {};
  self.registration.showNotification(n.title || 'مؤسسة الصداقة', {
    body: n.body || '',
    icon: 'https://yahyaside.github.io/ets.sadagha/icon-192.png',
    badge: 'https://yahyaside.github.io/ets.sadagha/icon-192.png',
    dir: 'rtl',
    lang: 'ar'
  });
});

// فتح المتجر عند النقر على الإشعار
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow('https://yahyaside.github.io/ets.sadagha/'));
});
