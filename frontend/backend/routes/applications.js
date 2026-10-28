const express = require("express");
const supabase = require("../supabase");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const router = express.Router();
const STATUSES = ["Applied", "Shortlisted", "Interview", "Selected", "Rejected", "Withdrawn"];

router.post("/", requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== "student") return res.status(403).json({ error: "Only student accounts can apply to opportunities." });
    const job_id = req.body && req.body.job_id;
    if (typeof job_id !== "string" || !job_id) return res.status(400).json({ error: "Select a valid opportunity." });
    const { data: job, error: jobError } = await supabase.from("jobs").select("id, is_open, deadline, eligible_branches").eq("id", job_id).maybeSingle();
    if (jobError) throw jobError;
    if (!job) return res.status(404).json({ error: "Opportunity not found." });
    if (!job.is_open) return res.status(409).json({ error: "This opportunity is closed." });
    if (job.deadline && job.deadline < new Date().toISOString().slice(0, 10)) return res.status(409).json({ error: "The application deadline has passed." });
    const eligible = (job.eligible_branches || "All branches").split(",").map((x) => x.trim().toLowerCase());
    if (eligible.length && !eligible.includes("all branches") && !eligible.includes("all") && !eligible.includes(req.user.branch.toLowerCase())) {
      return res.status(403).json({ error: "Your branch is not listed as eligible for this opportunity." });
    }
    const { data, error } = await supabase.from("applications").insert({ job_id, student_id: req.user.id, status: "Applied" }).select("id, job_id, student_id, status, applied_at").single();
    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "You have already applied to this opportunity." });
      throw error;
    }
    res.status(201).json({ application: data });
  } catch (error) { next(error); }
});
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    let query = supabase.from("applications").select("id, job_id, student_id, status, applied_at, jobs(company_name, role)").order("applied_at", { ascending: false });
    if (req.user.role !== "admin") query = query.eq("student_id", req.user.id);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ applications: data || [] });
  } catch (error) { next(error); }
});
router.patch("/:id/status", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const status = req.body && req.body.status;
    if (!STATUSES.includes(status)) return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(", ")}.` });
    const { data, error } = await supabase.from("applications").update({ status }).eq("id", req.params.id).select("id, status").maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Application not found." });
    res.json({ application: data });
  } catch (error) { next(error); }
});
module.exports = router;
