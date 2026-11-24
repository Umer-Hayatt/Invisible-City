-- Fixes of 24 November 2026 (fixes.docx, backend half). Additive only: the live code keeps working while this is applied.

-- Offices record how many workers they have (0 = not recorded), and private businesses can be Offices.
alter table offices add column workers integer not null default 0 check (workers >= 0);
alter table offices add column is_private boolean not null default false;

-- An Authority registers for one area (an Islamabad sector such as G-9). Null = the whole city, which is what every
-- Authority approved before this migration keeps.
alter table access_requests add column area text;

-- Offices register themselves and ask for access; an Authority (of that area, or of the whole city) approves.
-- Approval creates the Office and makes the registering Google email its one sign-in.
create table office_registrations (
  id             integer generated always as identity primary key,
  name           text not null,
  department_id  integer not null references departments(id),
  sector         text not null,
  is_private     boolean not null default false,
  workers        integer not null default 0 check (workers >= 0),
  contact_name   text not null,
  email          text not null,
  phone          text,
  decision       text not null default 'pending' check (decision in ('pending', 'approved', 'declined')),
  decided_by     text,
  office_id      integer references offices(id) on delete set null,
  is_demo        boolean not null default false,
  created_at     timestamptz not null default now(),
  decided_at     timestamptz
);

create index idx_office_registrations_email on office_registrations(lower(email));
-- One waiting registration per email per world.
create unique index uq_office_registrations_pending
  on office_registrations(lower(email), is_demo) where decision = 'pending';

alter table office_registrations enable row level security;
