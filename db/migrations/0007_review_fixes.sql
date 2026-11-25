-- Fixes from the architecture review of 25 November 2026. Safe to apply before the code that uses it.

-- Which Business a timeline entry is about, so each Fix and Rejection counts for the Business that made the Fix even
-- after the Issue goes to another one.
alter table events add column office_id integer references offices(id) on delete set null;
create index idx_events_office on events(office_id);

-- Earlier entries: an Assignment names its Business; what follows is about the Business assigned last.
update events e set office_id = (
  select o.id from offices o join issues i on i.id = e.issue_id
  where o.is_demo = i.is_demo and e.message = 'Assigned to ' || o.name
  order by (o.id = i.office_id) desc nulls last, o.id limit 1
) where e.kind = 'assigned';
update events e set office_id = (
  select a.office_id from events a
  where a.issue_id = e.issue_id and a.kind = 'assigned' and (a.created_at, a.id) <= (e.created_at, e.id)
  order by a.created_at desc, a.id desc limit 1
) where e.kind in ('in_progress', 'sent_back', 'fixed', 'rejected', 'resolved', 'closed_unconfirmed');

-- An accepted contract ends when its Issue leaves the Business: sent back, reopened by a Revocation, or removed.
alter table contracts add column ended_at timestamptz;
alter table contracts drop constraint contracts_status_check;
alter table contracts add constraint contracts_status_check check (status in ('sent', 'accepted', 'declined', 'withdrawn', 'ended'));
update contracts c set status = 'ended', ended_at = coalesce(i.deleted_at, now())
from issues i
where i.id = c.issue_id and c.status = 'accepted'
  and (i.deleted_at is not null or i.office_id is distinct from c.office_id
       or exists (select 1 from contracts n where n.issue_id = c.issue_id and n.status = 'accepted' and n.id > c.id));
update contracts c set status = 'withdrawn', decided_at = i.deleted_at
from issues i where i.id = c.issue_id and c.status = 'sent' and i.deleted_at is not null;

-- A withdrawn or spam-flagged Report's photo is no longer the cover: show the first remaining Report's.
update issues i set cover_image = (
  select r.image from reports r
  where r.issue_id = i.id and not r.is_spam and r.deleted_at is null and r.image is not null
  order by r.created_at, r.id limit 1
) where i.deleted_at is null
  and exists (select 1 from reports r where r.issue_id = i.id and (r.is_spam or r.deleted_at is not null));
