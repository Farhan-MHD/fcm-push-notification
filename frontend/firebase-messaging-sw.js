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
  const url =
    (payload && payload.data && payload.data.url) ||
    (payload && payload.fcmOptions && payload.fcmOptions.link) ||
    'https://fcm-push-notification.onrender.com/';
  self.registration.showNotification(title || 'Notification', {
    body: body || '',
    icon: '/logo.png',
    data: { url }, // keep URL for click handler
  });
});

// Open/focus the URL on click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || 'https://fcm-push-notification.onrender.com/';
  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Try to focus an existing client with the same origin
    let client = allClients.find(c => new URL(c.url).origin === new URL(url).origin);
    if (client) {
      await client.focus();
    } else if (client.openWindow) {
      await client.openWindow(url);
    }
  })());
});
