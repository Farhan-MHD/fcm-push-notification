import express from "express";
import { GoogleAuth } from "google-auth-library";
import dotenv from "dotenv";
dotenv.config();

const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
};

const router = express.Router();
const projectId = serviceAccount.project_id;
const tokens = [];

// Register a new FCM token
router.post("/register-token", (req, res) => {
  const { token } = req.body;
  if (token && !tokens.includes(token)) tokens.push(token);
  console.log(tokens)
  res.json({ success: true });
});

// Send notification to all registered tokens (HTTP v1 requires one request per token)
router.post("/send-notification", async (req, res) => {
  const { title, body } = req.body;

  try {
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
    const client = await auth.getClient();
    const access = await client.getAccessToken();
    const accessToken = typeof access === "string" ? access : access.token;

    const sent = [];
    const failed = [];

    for (const token of tokens) {
      const payload = {
        message: {
          notification: { title, body },
          token,
          android: {
            priority: "HIGH", // 👈 Immediate delivery for Android
          },
          apns: {
            headers: {
              "apns-priority": "10", // 👈 Immediate delivery for iOS
            },
          },
        },
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
        failed.push({ token, error: await resp.text() });
      }
    }

    res.json({
      success: true,
      counts: { sent: sent.length, failed: failed.length },
      sent,
      failed,
    });
  } catch (err) {
    console.error("Error sending notification:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
