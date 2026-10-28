const express = require("express");
const supabase = require("../supabase");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ jobs: data || [] });
  } catch (error) { next(error); }
});
router.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const body = req.body || {};
    const company_name = typeof body.company_name === "string" ? body.company_name.trim() : "";
    const role = typeof body.role === "string" ? body.role.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const eligible_branches = typeof body.eligible_branches === "string" ? body.eligible_branches.trim() : "";
    const package_lpa = body.package_lpa === null || body.package_lpa === "" || body.package_lpa === undefined ? null : Number(body.package_lpa);
    const min_cgpa = body.min_cgpa === null || body.min_cgpa === "" || body.min_cgpa === undefined ? null : Number(body.min_cgpa);
    const deadline = body.deadline || null;
    if (company_name.length < 2 || company_name.length > 100) return res.status(400).json({ error: "Company name must be 2–100 characters." });
    if (role.length < 2 || role.length > 120) return res.status(400).json({ error: "Job role must be 2–120 characters." });
    if (description.length > 2000 || eligible_branches.length > 250) return res.status(400).json({ error: "Description or eligible branches are too long." });
    if (package_lpa !== null && (!Number.isFinite(package_lpa) || package_lpa < 0 || package_lpa > 1000)) return res.status(400).json({ error: "Package must be between 0 and 1000 LPA." });
    if (min_cgpa !== null && (!Number.isFinite(min_cgpa) || min_cgpa < 0 || min_cgpa > 10)) return res.status(400).json({ error: "Minimum CGPA must be between 0 and 10." });
    if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return res.status(400).json({ error: "Deadline must be a valid date." });
    const { data, error } = await supabase.from("jobs").insert({
      company_name, role, description, eligible_branches: eligible_branches || "All branches",
      package_lpa, min_cgpa, deadline, created_by: req.user.id, is_open: true
    }).select("*").single();
    if (error) throw error;
    res.status(201).json({ job: data });
  } catch (error) { next(error); }
});
router.patch("/:id/close", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("jobs").update({ is_open: false }).eq("id", req.params.id).select("id, is_open").maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Opportunity not found." });
    res.json({ job: data });
  } catch (error) { next(error); }
});
module.exports = router;
