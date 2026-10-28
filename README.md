# Campus Placement Tracking

A beginner-friendly full-stack web application for managing campus placement opportunities and tracking student applications.

## 1. Overview

Campus Placement Tracking gives students one place to view campus job opportunities, apply to eligible roles, and follow application statuses. A placement administrator can add opportunities and update each student's progress through the selection process.

### Problem statement
Placement information is often shared across notices, spreadsheets, and messages. Students may find it difficult to keep track of deadlines and application outcomes. This application centralizes opportunities and application status in one portal.

### Objectives
- Provide student registration and sign-in.
- Display searchable campus placement opportunities.
- Let students apply once per opportunity.
- Track application status from Applied to Selected or Rejected.
- Give authorized administrators a view of all applications and status updates.

## 2. Roles and features

**Student**
- Register with name, email, roll number, branch, graduation year, and password.
- Sign in securely.
- Search and filter opportunities.
- Apply to open roles for which the student's branch is eligible.
- View personal applications and statuses.

**Placement administrator**
- Sign in using an account whose role was assigned securely in the database.
- Add company/job opportunities.
- View all student applications.
- Update application status.

The initial version does not include resume uploads, email/SMS notifications, automated CGPA verification, interview calendar integration, or a company login.

## 3. Technology stack

- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Node.js and Express.js
- Database: Supabase PostgreSQL
- Password hashing: bcryptjs
- Authentication: server-issued JWT
- Security middleware: Helmet and express-rate-limit
- Version control: Git and GitHub

## 4. Folder structure

```text
campus-placement-tracking/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── backend/
│   ├── server.js
│   ├── supabase.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── jobs.js
│   │   ├── applications.js
│   │   └── dashboard.js
│   ├── middleware/
│   │   └── auth.js
│   ├── package.json
│   ├── .env
│   ├── .env.example
│   └── .gitignore
├── database/
│   └── schema.sql
├── .gitignore
└── README.md
```

## 5. Prerequisites

Install:
- [Visual Studio Code](https://code.visualstudio.com/)
- [Node.js LTS (includes npm)](https://nodejs.org/)
- [Git](https://git-scm.com/downloads)
- A free [Supabase](https://supabase.com/) account

Verify in a new terminal:
```bash
node --version
npm --version
git --version
```
Each command should print a version number. If a command is not recognized, install the relevant program and reopen the terminal.

## 6. Supabase setup

1. Sign in to Supabase and create a new project.
2. Choose a project name and database password; save the database password privately.
3. Wait until the project is ready.
4. Open **SQL Editor** in the Supabase dashboard.
5. Open `database/schema.sql` in VS Code, copy the entire file, paste it into the SQL Editor, and run it.
6. Open **Table Editor** and verify that `users`, `jobs`, and `applications` exist.
7. In **Project Settings → API** (or the project's API keys page), copy the Project URL and the server-side `service_role`/secret key. The label may differ on newer Supabase dashboards.

The service-role/secret key bypasses Row Level Security. It must remain in `backend/.env` only. Never paste it into frontend files, screenshots, GitHub, or public reports. The application uses its own Node backend authentication and does not connect directly to Supabase from the browser.

## 7. Configure environment variables

In VS Code, create `backend/.env` by copying `backend/.env.example`. Replace the example values with your own Supabase project URL and server-only key.

Example template:
```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_real_server_only_key_here
JWT_SECRET=replace_with_a_long_random_secret_at_least_32_characters
JWT_EXPIRES_IN=8h
```

Generate a JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Copy the generated string into `JWT_SECRET`. Keep `.env` private. `.env.example` contains placeholders only and is safe to commit.

## 8. Install and run on Windows

1. Open the `campus-placement-tracking` folder in VS Code.
2. Choose **Terminal → New Terminal**.
3. Change to the backend directory:
   ```bash
   cd backend
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
   npm creates `node_modules/` and `package-lock.json`.
5. Run syntax checks:
   ```bash
   npm run check
   ```
6. Start the server:
   ```bash
   npm start
   ```
   Expected terminal output: `CampusTrack running at http://localhost:3000`
7. Open [http://localhost:3000](http://localhost:3000) in your browser.

Keep the terminal open while using the app. For development with automatic restart on supported Node.js versions, use `npm run dev`.

## 9. Create an administrator account

For safety, public registration always creates a `student` account. First register a normal account in the app. Then, from Supabase **SQL Editor**, run the following query after replacing the email with that exact account email:

```sql
update public.users
set role = 'admin'
where email = 'your-admin-email@example.com';
```

Verify that exactly one row was updated. Sign out and sign back in to refresh the role in your token/session. Only a trusted project owner should assign admin roles. Never add a public API route that lets users change their own role.

## 10. Architecture and workflows

```text
Browser (HTML/CSS/Vanilla JS)
       | fetch() + Bearer JWT
       v
Express REST API (validation + role checks)
       | server-only Supabase client
       v
Supabase PostgreSQL (users, jobs, applications)
```

- Registration: validate details → hash password with bcrypt → save user → issue JWT.
- Sign in: look up email → compare password hash → issue JWT.
- Apply: verify student role → check job is open, deadline and branch → insert application. A database unique constraint prevents duplicate applications.
- Status update: verify administrator role → validate status → update application record.

## 11. REST API reference

All protected endpoints require `Authorization: Bearer <token>`.

| Method | Path | Purpose | Access |
|---|---|---|---|
| GET | `/api/health` | Health check | Public |
| POST | `/api/auth/register` | Create student account | Public; role always student |
| POST | `/api/auth/login` | Sign in | Public, rate-limited |
| GET | `/api/auth/me` | Get current user profile | Signed-in user |
| GET | `/api/dashboard` | Dashboard data and summary | Student sees own applications; admin sees all |
| GET | `/api/jobs` | List opportunities | Signed-in user |
| POST | `/api/jobs` | Add opportunity | Admin only |
| PATCH | `/api/jobs/:id/close` | Close an opportunity | Admin only |
| POST | `/api/applications` | Apply to opportunity | Student only |
| GET | `/api/applications/mine` | List personal applications (admin can list all) | Signed-in user |
| PATCH | `/api/applications/:id/status` | Update application status | Admin only |

Request examples:
- Register: `{ "name": "Sample Student", "email": "student@example.com", "password": "a-long-password", "roll_number": "24CSE001", "branch": "CSE", "graduation_year": 2028 }`
- Add opportunity (admin): `{ "company_name": "Example Technologies", "role": "Graduate Trainee", "package_lpa": 6.5, "eligible_branches": "CSE, IT", "min_cgpa": 7, "deadline": "2027-01-30", "description": "Entry-level role" }`
- Apply: `{ "job_id": "UUID-FROM-JOBS" }`
- Update status (admin): `{ "status": "Shortlisted" }`

Successful responses are JSON. Validation errors generally return HTTP 400, missing/invalid authentication returns 401, role restrictions return 403, missing records return 404, and duplicates return 409.

## 12. Database design

- `users`: student/admin profile and bcrypt password hash.
- `jobs`: company, role, eligibility, package, deadline, and open/closed status.
- `applications`: connects one student to one job, stores status and timestamps. A unique `(job_id, student_id)` constraint prevents duplicates.

Foreign keys preserve relationships; deleting a job cascades its applications. RLS is enabled, and no browser-facing policies are created because the browser never calls Supabase directly. The backend uses the privileged key, so API authorization checks are mandatory.

## 13. Manual testing checklist

1. Open `/api/health`; expect `{"status":"ok","service":"campus-placement-tracking"}`.
2. Register a student with valid details; expect the dashboard.
3. Try registering the same email or roll number; expect a duplicate error.
4. Sign in with the wrong password; expect an error and no dashboard access.
5. Promote a test account to admin using the SQL above, then sign in again.
6. As admin, add a role; it should appear in the opportunities list.
7. As a student from an eligible branch, apply; the application should appear in My applications.
8. Apply to the same role again; expect a duplicate warning.
9. Try to apply from an ineligible branch; expect a 403 response.
10. As admin, change the application status to Shortlisted or Selected; the student should see the updated status after refresh.
11. As a student, attempt to call admin endpoints; expect 403.
12. Search and filter opportunities; the list should update.
13. Resize the browser to mobile width; cards and forms should stack.
14. Stop the backend and refresh; the page should show a server connection message.

## 14. Troubleshooting

- **Server exits immediately:** check that `backend/.env` exists and `JWT_SECRET` is at least 32 characters; check Supabase URL/key.
- **Invalid API key / database errors:** ensure the URL and server-only key come from the same Supabase project. Do not add quotes around `.env` values unless needed.
- **Table not found:** run all of `database/schema.sql` in Supabase SQL Editor and verify table names.
- **Port already in use:** set `PORT=3001` in `.env` and open `http://localhost:3001`.
- **Cannot sign in:** confirm registration succeeded and the email is spelled the same way.
- **Admin panel not visible:** verify the account role is `admin`, then sign out and sign in again.
- **Changes do not appear:** click Refresh and inspect the backend terminal for errors.
- **`npm` not recognized:** install Node.js LTS and restart VS Code.

## 15. GitHub upload

From the project root (not the backend folder):
```bash
git init
git status
git add .
git status
git commit -m "Build Campus Placement Tracking"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Create an empty repository on GitHub, copy its repository URL, and replace `YOUR_GITHUB_REPOSITORY_URL`. If Git asks for your identity, configure it:
```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

Before pushing, inspect `git status` and confirm `.env`, `node_modules/`, real keys, and private student information are not included. `.gitignore` does not remove secrets that were committed earlier; if a key is exposed, rotate it immediately and clean repository history as appropriate.

## 16. Security notes and limitations

- Passwords are hashed; they are not stored as plain text.
- The JWT secret and Supabase privileged key are server-only.
- Registration cannot create administrator accounts.
- API inputs are validated and login attempts are rate-limited.
- This is an educational MVP. Before real institutional use, add HTTPS deployment, stronger audit logging, account recovery, privacy review, backups, formal authorization review, and appropriate data-retention rules.
- CGPA is stored as an optional profile field, but automatic eligibility checking against CGPA is not currently enforced. The current application workflow enforces branch eligibility, open status, and deadline.
