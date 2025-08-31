importScripts('https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyB1vhFBj8Lx9ALU0OjOOcV6FjioFpGQyE0',
  authDomain: 'push-notifica-3df89.firebaseapp.com',
  projectId: 'push-notifica-3df89',
  storageBucket: 'push-notifica-3df89.appspot.com',
  messagingSenderId: '49310141301',
  appId: '1:49310141301:web:6b346aa06278886938e13c',
});

const messaging = firebase.messaging();

// Handle background notifications
messaging.onBackgroundMessage(function(payload) {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'Notification', {
    body: body || '',
    icon: '/logo.png',
  });
});
