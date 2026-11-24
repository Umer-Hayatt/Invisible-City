-- Office staff can ask to join an Office themselves; an Authority approves or declines.
-- Additive only: a new table, so the live code keeps working while this is applied.
-- The request carries the signed-in Google email, so approving it adds exactly that email to office_staff.
create table office_join_requests (
  id          integer generated always as identity primary key,
  office_id   integer not null references offices(id) on delete cascade,
  name        text not null,
  email       text not null,
  phone       text,
  decision    text not null default 'pending' check (decision in ('pending', 'approved', 'declined')),
  decided_by  text,
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now(),
  decided_at  timestamptz
);

create index idx_office_join_requests_email on office_join_requests(lower(email));
-- One waiting request per email per world.
create unique index uq_office_join_requests_pending
  on office_join_requests(lower(email), is_demo) where decision = 'pending';

alter table office_join_requests enable row level security;
