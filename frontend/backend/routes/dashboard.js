const express = require("express");
const supabase = require("../supabase");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { data: jobs, error: jobsError } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
    if (jobsError) throw jobsError;
    let appQuery = supabase.from("applications")
      .select("id, job_id, student_id, status, applied_at, jobs(company_name, role)")
      .order("applied_at", { ascending: false });
    if (req.user.role !== "admin") appQuery = appQuery.eq("student_id", req.user.id);
    const { data: rawApps, error: appError } = await appQuery;
    if (appError) throw appError;
    const applications = (rawApps || []).map((app) => ({
      id: app.id, job_id: app.job_id, student_id: app.student_id, status: app.status, applied_at: app.applied_at,
      company_name: app.jobs?.company_name || "Company", role: app.jobs?.role || "Role"
    }));
    let allApplications = [];
    if (req.user.role === "admin") {
      const { data: all, error: allError } = await supabase.from("applications")
        .select("id, job_id, student_id, status, applied_at, users(name, roll_number), jobs(company_name, role)")
        .order("applied_at", { ascending: false });
      if (allError) throw allError;
      allApplications = (all || []).map((app) => ({
        id: app.id, status: app.status, applied_at: app.applied_at,
        student_name: app.users?.name || "Student", roll_number: app.users?.roll_number || "—",
        company_name: app.jobs?.company_name || "Company", role: app.jobs?.role || "Role"
      }));
    }
    const totalApplications = applications.length;
    const inProgress = applications.filter((app) => ["Applied", "Shortlisted", "Interview"].includes(app.status)).length;
    const offers = applications.filter((app) => app.status === "Selected").length;
    const openJobs = (jobs || []).filter((job) => job.is_open && (!job.deadline || job.deadline >= new Date().toISOString().slice(0, 10))).length;
    res.json({ jobs: jobs || [], applications, allApplications, stats: { totalApplications, inProgress, offers, openJobs } });
  } catch (error) { next(error); }
});
module.exports = router;
