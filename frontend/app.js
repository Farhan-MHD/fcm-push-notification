// Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB1vhFBj8Lx9ALU0OjOOcV6FjioFpGQyE0",
  authDomain: "push-notifica-3df89.firebaseapp.com",
  projectId: "push-notifica-3df89",
  storageBucket: "push-notifica-3df89.appspot.com",
  messagingSenderId: "49310141301",
  appId: "1:49310141301:web:6b346aa06278886938e13c",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Ensure the service worker is registered, then request permission and get token
(async () => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers not supported');
    return;
  }

  // Register the messaging service worker at site root
  const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('Notifications not granted');
    return;
  }

  try {
    const token = await messaging.getToken({
      vapidKey: 'BKngiN7WpimGYWTxaZycQ0vfvwxjqL3N0-FzATlCLNoEVFa0KGxJv3OnG6OYYgDaZmE5UMO3wiWhZma0uSbwRd0',
      serviceWorkerRegistration: swReg,
    });
    console.log('FCM Token:', token);
    if (token) {
      await fetch('/register-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
    }
  } catch (e) {
    console.error('getToken failed:', e);
  }
})();

// Send test notification
document.getElementById('notifyBtn').addEventListener('click', async () => {
  await fetch('/send-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title:  `Farhan's demo Application`, body: 'Hey iam Farhan! How are you?' }),
  });
});

// Show notification when message is received in the foreground
messaging.onMessage((payload) => {
  const { title, body } = payload.notification || {};
  new Notification(title || "Notification", { body: body || "" });
});
