require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/auth");
const jobsRoutes = require("./routes/jobs");
const applicationsRoutes = require("./routes/applications");
const dashboardRoutes = require("./routes/dashboard");

const app = express();
const port = Number(process.env.PORT) || 3000;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be set in backend/.env and contain at least 32 characters.");
  process.exit(1);
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env before starting.");
  process.exit(1);
}

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: false }));
app.use(express.json({ limit: "20kb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
app.use(express.static(path.join(__dirname, "..")));

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "campus-placement-tracking" }));
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use("/api", (_req, res) => res.status(404).json({ error: "API endpoint not found." }));
app.use((error, _req, res, _next) => {
  console.error("Request failed:", error && error.message ? error.message : "Unknown error");
  if (error && error.code === "PGRST116") return res.status(404).json({ error: "The requested record was not found." });
  if (error && error.code === "23505") return res.status(409).json({ error: "This record already exists." });
  res.status(500).json({ error: "A server error occurred. Check the backend terminal for details." });
});
app.listen(port, () => console.log(`CampusTrack running at http://localhost:${port}`));
