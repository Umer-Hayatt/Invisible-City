-- Super Admin can revoke an Authority or a Business (an Office) at any time. Additive only.

-- A revoked Authority approval no longer gives the Authority role. Null = still in force.
alter table access_requests add column revoked_at timestamptz;
alter table access_requests add column revoked_by text;

-- A revoked Business can no longer sign in as a Business, is not suggested for Assignments, and its unfinished
-- jobs go back to Open. Null = active.
alter table offices add column revoked_at timestamptz;
alter table offices add column revoked_by text;
