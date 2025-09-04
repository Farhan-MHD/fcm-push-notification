import express from "express";
import { GoogleAuth } from "google-auth-library";
import dotenv from "dotenv";
import admin from "firebase-admin";
dotenv.config();

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: privateKey,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      ...serviceAccount,
      private_key: privateKey,
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}
const db = admin.database();

const router = express.Router();
const projectId = serviceAccount.project_id;

// Helper to create a safe key for RTDB
const tokenKey = (t) => t.replace(/[.#$/\[\]]/g, "_");

// Register a new FCM token -> store/update in RTDB
router.post("/register-token", async (req, res) => {
  try {
    const { token, uid } = req.body;
    if (!token) return res.status(400).json({ success: false, error: "token is required" });

    const ref = db.ref("fcmTokens").child(tokenKey(token));
    const snap = await ref.get();

    if (snap.exists()) {
      await ref.update({
        token,
        uid: uid ?? snap.val()?.uid ?? null,
        lastSeenAt: admin.database.ServerValue.TIMESTAMP,
      });
    } else {
      await ref.set({
        token,
        uid: uid ?? null,
        createdAt: admin.database.ServerValue.TIMESTAMP,
        lastSeenAt: admin.database.ServerValue.TIMESTAMP,
      });
    }

    res.json({ success: true });
  } catch (e) {
    console.error("Error registering token:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Send notification -> read tokens from RTDB each time
router.post("/send-notification", async (req, res) => {
  const { title, body } = req.body;

  try {
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging", "https://www.googleapis.com/auth/firebase.database"],
    });
    const client = await auth.getClient();
    const access = await client.getAccessToken();
    const accessToken = typeof access === "string" ? access : access.token;

    // Fetch tokens from RTDB
    const snap = await db.ref("fcmTokens").get();
    const tokens = [];
    if (snap.exists()) {
      snap.forEach((child) => {
        const v = child.val();
        if (v?.token) tokens.push(v.token);
      });
    }

    if (tokens.length === 0) {
      return res.json({ success: true, counts: { sent: 0, failed: 0 }, sent: [], failed: [], note: "No tokens found" });
    }

    const sent = [];
    const failed = [];

    for (const token of tokens) {
      const payload = {
        message: { notification: { title, body }, token },
      };

      const resp = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (resp.ok) {
        const data = await resp.json();
        sent.push({ token, name: data.name });
      } else {
        const text = await resp.text();
        let errJson;
        try { errJson = JSON.parse(text); } catch {}
        const msg = errJson?.error?.message || text;
        failed.push({ token, error: msg });

        // Optional cleanup of invalid/unregistered tokens
        const messageLower = String(msg).toLowerCase();
        const shouldRemove =
          resp.status === 404 ||
          errJson?.error?.status === "NOT_FOUND" ||
          errJson?.error?.status === "INVALID_ARGUMENT" ||
          messageLower.includes("requested entity was not found") ||
          messageLower.includes("not a valid fcm registration token") ||
          messageLower.includes("unregistered");

        if (shouldRemove) {
          await db.ref("fcmTokens").child(tokenKey(token)).remove().catch(() => {});
        }
      }
    }

    res.json({ success: true, counts: { sent: sent.length, failed: failed.length }, sent, failed });
  } catch (err) {
    console.error("Error sending notification:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
