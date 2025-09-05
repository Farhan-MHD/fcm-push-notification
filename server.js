import express from "express";
import bodyParser from "body-parser";
import fcmRoutes from "./routes/fcm.js";

const app = express();


app.use(express.static("frontend"));
app.use(bodyParser.json());

// Use FCM routes
app.use("/", fcmRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
