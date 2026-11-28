-- NGOs (28 November 2026): a non-profit can work on Issues as a third kind of Business, beside government offices and
-- private firms. It registers with its legal registration number, and the Super Admin (not an Authority) approves it.
-- Once approved it works exactly like a Business. Additive only: the live code keeps working while this is applied.

alter table offices add column is_ngo boolean not null default false;
-- The NGO's registration number with the government (for example Social Welfare Department or SECP), and its website.
alter table offices add column registration_number text check (registration_number is null or length(registration_number) <= 60);
alter table offices add column website text check (website is null or length(website) <= 200);

alter table office_registrations add column is_ngo boolean not null default false;
alter table office_registrations add column registration_number text check (registration_number is null or length(registration_number) <= 60);
alter table office_registrations add column website text check (website is null or length(website) <= 200);
-- What the NGO does, in its own words, for the Super Admin deciding.
alter table office_registrations add column about text check (about is null or length(about) <= 500);
