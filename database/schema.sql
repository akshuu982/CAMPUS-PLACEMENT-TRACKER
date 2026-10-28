-- Campus Placement Tracking: run this script in the Supabase SQL Editor.
-- Passwords are hashed by the Node.js backend with bcryptjs. Never store plain-text passwords.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name varchar(80) not null check (char_length(trim(name)) >= 2),
  email varchar(254) not null unique,
  password_hash text not null,
  role varchar(20) not null default 'student' check (role in ('student', 'admin')),
  roll_number varchar(30) not null unique,
  branch varchar(50) not null,
  graduation_year integer not null check (graduation_year between 2026 and 2040),
  cgpa numeric(3,2) check (cgpa between 0 and 10),
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_name varchar(100) not null,
  role varchar(120) not null,
  description text not null default '',
  eligible_branches varchar(250) not null default 'All branches',
  package_lpa numeric(7,2) check (package_lpa between 0 and 1000),
  min_cgpa numeric(3,2) check (min_cgpa between 0 and 10),
  deadline date,
  is_open boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  status varchar(20) not null default 'Applied'
    check (status in ('Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected', 'Withdrawn')),
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, student_id)
);

create index if not exists idx_users_role on public.users(role);
create index if not exists idx_jobs_is_open_deadline on public.jobs(is_open, deadline);
create index if not exists idx_applications_student on public.applications(student_id, applied_at desc);
create index if not exists idx_applications_job_status on public.applications(job_id, status);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

-- The Node backend uses the server-only service-role key and performs authorization
-- checks in middleware. RLS is enabled as defense in depth. Do not expose the service key.
alter table public.users enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;

-- No anon/authenticated policies are created because this application authenticates
-- through its Node backend and never queries Supabase directly from browser JavaScript.
-- Service-role access bypasses RLS; backend route authorization is therefore essential.

-- Optional demo job records can be added after creating an administrator:
-- insert into public.jobs (company_name, role, description, eligible_branches, package_lpa, min_cgpa, deadline)
-- values ('Demo Technologies', 'Graduate Software Trainee', 'Demo data: replace with a real campus opportunity.',
--         'CSE, IT', 5.5, 7.0, current_date + 30);
