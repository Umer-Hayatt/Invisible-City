-- Assignment by agreement: an Authority sends a Business a contract for an Open Issue, and the Issue is Assigned only
-- when the Business accepts it. Additive only.
create table contracts (
  id              integer generated always as identity primary key,
  issue_id        integer not null references issues(id) on delete cascade,
  office_id       integer not null references offices(id) on delete cascade,
  -- Who sent it; the name is kept as it was when sent.
  authority_id    uuid references people(id) on delete set null,
  authority_name  text not null,
  -- The terms.
  scope           text not null,
  price_pkr       integer check (price_pkr >= 0),
  start_date      date,
  finish_date     date not null,
  payment_terms   text,
  -- sent: waiting for the Business. Only an accepted contract assigns the Issue.
  status          text not null default 'sent' check (status in ('sent', 'accepted', 'declined', 'withdrawn')),
  sent_at         timestamptz not null default now(),
  -- The Business's answer, or the withdrawal.
  decided_at      timestamptz,
  decided_by      text,
  decline_reason  text
);
create index idx_contracts_issue on contracts(issue_id);
create index idx_contracts_office on contracts(office_id);
-- An Issue waits on one Business at a time.
create unique index uq_contracts_sent on contracts(issue_id) where status = 'sent';

alter table contracts enable row level security;
