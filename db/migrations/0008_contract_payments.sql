-- Contract payments: what was agreed (the price) and when the city paid it. Additive only.
-- Civora records the payment; it never moves money. The Authority marks an accepted contract Paid once the Citizen
-- has confirmed the Fix (the Issue is Resolved).
alter table contracts add column paid_at timestamptz;
alter table contracts add column paid_by text;
-- A cheque number, transfer reference or note, as the Authority wrote it.
alter table contracts add column payment_reference text check (payment_reference is null or length(payment_reference) <= 120);
