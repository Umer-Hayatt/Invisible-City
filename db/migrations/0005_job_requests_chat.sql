-- Part 2 of the Business plan: Businesses ask for jobs, talk with the Authority, and can be called. Additive only.

-- A Business's phone, so the Authority can call it. Copied from its registration; the Business can change it.
alter table offices add column phone text;

-- A Business asking an Authority to be given an Open Issue in its sector and Department.
create table job_requests (
  id          integer generated always as identity primary key,
  issue_id    integer not null references issues(id) on delete cascade,
  office_id   integer not null references offices(id) on delete cascade,
  note        text,
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at  timestamptz not null default now(),
  decided_at  timestamptz
);
create index idx_job_requests_issue on job_requests(issue_id);
create index idx_job_requests_office on job_requests(office_id);
-- One waiting request per Business per Issue.
create unique index uq_job_requests_pending on job_requests(issue_id, office_id) where status = 'pending';

-- One conversation per Issue and Business, between that Business and the Authorities of the Issue's area.
create table job_messages (
  id            integer generated always as identity primary key,
  issue_id      integer not null references issues(id) on delete cascade,
  office_id     integer not null references offices(id) on delete cascade,
  sender_role   text not null check (sender_role in ('authority', 'office')),
  sender_name   text,
  body          text not null,
  created_at    timestamptz not null default now()
);
create index idx_job_messages_thread on job_messages(issue_id, office_id, created_at);

alter table job_requests enable row level security;
alter table job_messages enable row level security;
