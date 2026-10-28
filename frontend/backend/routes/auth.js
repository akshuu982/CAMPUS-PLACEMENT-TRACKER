const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const supabase = require("../supabase");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: "Too many sign-in attempts. Please wait a little and try again." } });
router.use(authLimiter);

function issueToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "8h" });
}
function publicUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, roll_number, branch, graduation_year } = req.body || {};
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80) return res.status(400).json({ error: "Enter a name between 2 and 80 characters." });
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ error: "Enter a valid email address." });
    if (typeof password !== "string" || password.length < 8 || password.length > 72) return res.status(400).json({ error: "Password must be between 8 and 72 characters." });
    if (typeof roll_number !== "string" || roll_number.trim().length < 2 || roll_number.trim().length > 30) return res.status(400).json({ error: "Enter a valid student roll number." });
    if (typeof branch !== "string" || branch.trim().length < 2 || branch.length > 50) return res.status(400).json({ error: "Select a valid branch." });
    const year = Number(graduation_year);
    if (!Number.isInteger(year) || year < 2026 || year > 2040) return res.status(400).json({ error: "Graduation year must be between 2026 and 2040." });

    const emailNormalized = email.trim().toLowerCase();
    const rollNormalized = roll_number.trim().toUpperCase();
    const { data: duplicate, error: duplicateError } = await supabase.from("users").select("id").or(`email.eq.${emailNormalized},roll_number.eq.${rollNormalized}`).limit(1);
    if (duplicateError) throw duplicateError;
    if (duplicate && duplicate.length) return res.status(409).json({ error: "An account with this email or roll number already exists." });

    const password_hash = await bcrypt.hash(password, 12);
    const { data: user, error } = await supabase.from("users").insert({
      name: name.trim(), email: emailNormalized, password_hash, roll_number: rollNormalized,
      branch: branch.trim(), graduation_year: year, role: "student"
    }).select("id, name, email, role, roll_number, branch, graduation_year, cgpa").single();
    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "An account with this email or roll number already exists." });
      throw error;
    }
    return res.status(201).json({ token: issueToken(user), user });
  } catch (error) { next(error); }
});
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) return res.status(400).json({ error: "Enter your email and password." });
    const { data: user, error } = await supabase.from("users")
      .select("id, name, email, password_hash, role, roll_number, branch, graduation_year, cgpa")
      .eq("email", email.trim().toLowerCase()).maybeSingle();
    if (error) throw error;
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: "Incorrect email or password." });
    const safe = publicUser(user);
    return res.json({ token: issueToken(user), user: safe });
  } catch (error) { next(error); }
});
router.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));
module.exports = router;
