-- Invisible City schema (ticket 02). Plain Postgres; runs on Supabase and on PGlite in tests.
-- The app connects with a server-side connection string, never through Supabase's REST API,
-- so row level security is switched on with no policies: the publishable key can read nothing.

create table departments (
  id   integer generated always as identity primary key,
  name text not null unique
);

create table categories (
  key           text primary key,
  label         text not null,
  department_id integer not null references departments(id),
  hazard_bonus  integer not null default 0
);

create table people (
  id           uuid primary key default gen_random_uuid(),
  auth_id      text unique,            -- Supabase Auth user id (or the browser id until sign-in exists)
  email        text unique,
  display_name text,
  phone        text,
  is_demo      boolean not null default false,
  suspended_at timestamptz,
  created_at   timestamptz not null default now()
);

create table offices (
  id            integer generated always as identity primary key,
  name          text not null,
  department_id integer not null references departments(id),
  sector        text not null,
  lat           double precision not null,
  lng           double precision not null,
  is_demo       boolean not null default false
);

create table office_staff (
  id        integer generated always as identity primary key,
  office_id integer not null references offices(id) on delete cascade,
  email     text not null unique        -- one Office per email
);

create table access_requests (
  id             integer generated always as identity primary key,
  name           text not null,
  department_id  integer references departments(id),
  official_email text not null,
  phone          text,
  decision       text not null default 'pending' check (decision in ('pending', 'approved', 'declined')),
  decided_by     text,
  created_at     timestamptz not null default now(),
  decided_at     timestamptz
);

create table issues (
  id            integer generated always as identity primary key,
  category      text not null references categories(key),
  severity      text not null check (severity in ('low', 'medium', 'high', 'critical')),
  title         text not null,
  summary       text not null,
  lat           double precision not null,
  lng           double precision not null,
  neighborhood  text not null,
  constituency  text,
  status        text not null default 'open'
                check (status in ('open', 'assigned', 'in_progress', 'fixed', 'resolved', 'closed_unconfirmed')),
  priority      integer not null default 0,
  office_id     integer references offices(id),
  report_count  integer not null default 1,
  cover_image   text,                   -- public photo URL
  after_image   text,                   -- public photo URL
  resolution_note text,
  fix_note      text,
  recurrence_of integer references issues(id),
  is_demo       boolean not null default false,
  created_at    timestamptz not null,
  updated_at    timestamptz not null,
  fixed_at      timestamptz,
  resolved_at   timestamptz,
  closed_at     timestamptz,
  deleted_at    timestamptz
);

create table reports (
  id              integer generated always as identity primary key,
  issue_id        integer not null references issues(id),
  reporter_id     uuid not null references people(id),
  description     text not null default '',
  image           text,                 -- public photo URL
  image_hash      text,
  lat             double precision not null,
  lng             double precision not null,
  ai_category     text not null,
  ai_severity     text not null,
  ai_confidence   double precision not null,
  ai_summary      text not null,
  ai_source       text not null,
  duplicate_score double precision,
  is_spam         boolean not null default false,
  flagged_by      uuid references people(id),
  deleted_at      timestamptz,
  voice_url       text,                 -- reserved for Urdu voice Reports
  voice_transcript text,
  created_at      timestamptz not null
);

create table events (
  id         integer generated always as identity primary key,
  issue_id   integer not null references issues(id),
  kind       text not null,
  message    text not null,
  actor_role text,
  created_at timestamptz not null
);

create index idx_issues_status on issues(status) where deleted_at is null;
create index idx_issues_office on issues(office_id);
create index idx_reports_issue on reports(issue_id);
create index idx_reports_reporter on reports(reporter_id);
create index idx_events_issue on events(issue_id);
create index idx_offices_department on offices(department_id);

alter table departments     enable row level security;
alter table categories      enable row level security;
alter table people          enable row level security;
alter table offices         enable row level security;
alter table office_staff    enable row level security;
alter table access_requests enable row level security;
alter table issues          enable row level security;
alter table reports         enable row level security;
alter table events          enable row level security;

insert into departments (name) values
  ('Roads'), ('Sanitation'), ('Electrical'), ('Water & Sewerage'),
  ('Accessibility'), ('Building Control'), ('General Maintenance');

insert into categories (key, label, department_id, hazard_bonus)
select c.key, c.label, d.id, c.hazard
from (values
  ('road_damage',      'Road damage / pothole',    'Roads',              6),
  ('blocked_footpath', 'Blocked footpath',         'Roads',              0),
  ('garbage',          'Garbage overflow',         'Sanitation',         0),
  ('streetlight',      'Broken streetlight',       'Electrical',         3),
  ('electrical_hazard','Electrical hazard',        'Electrical',         0),
  ('water_leak',       'Water leak',               'Water & Sewerage',   5),
  ('drainage',         'Blocked drain / flooding', 'Water & Sewerage',   5),
  ('accessibility',    'Accessibility barrier',    'Accessibility',      6),
  ('building_damage',  'Building damage',          'Building Control',   0),
  ('other',            'Other',                    'General Maintenance',0)
) as c(key, label, department, hazard)
join departments d on d.name = c.department;
