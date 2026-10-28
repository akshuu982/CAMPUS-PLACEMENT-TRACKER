const jwt = require("jsonwebtoken");
const supabase = require("../supabase");

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: "Please sign in to continue." });
  try {
    const payload = jwt.verify(match[1], process.env.JWT_SECRET);
    const { data: user, error } = await supabase.from("users")
      .select("id, name, email, role, roll_number, branch, graduation_year, cgpa")
      .eq("id", payload.sub).maybeSingle();
    if (error || !user) return res.status(401).json({ error: "Your session is no longer valid. Please sign in again." });
    req.user = user;
    next();
  } catch (_) {
    return res.status(401).json({ error: "Your session is invalid or expired. Please sign in again." });
  }
}
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ error: "Administrator access is required." });
  next();
}
module.exports = { requireAuth, requireAdmin };
