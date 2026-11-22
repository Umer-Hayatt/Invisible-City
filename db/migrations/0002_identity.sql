-- Ticket 03: demo and real data stay apart, including Access requests.
-- Additive only, so the live code keeps working while this is applied.
alter table access_requests add column is_demo boolean not null default false;
update access_requests set is_demo = true where official_email like '%@invisible.city';
create index idx_access_requests_email on access_requests(lower(official_email));
