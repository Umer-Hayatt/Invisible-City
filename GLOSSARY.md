# Invisible City

A platform where citizens of Islamabad report civic problems with a photo and location, officials route each problem to the office that can fix it, and the citizen who reported it confirms the fix.

## People and organisations

**Citizen**:
A person with a verified Google account and a phone number who reports problems and confirms fixes.
_Avoid_: User, reporter (when meaning the account), complainant

**Authority**:
A city official who reviews incoming Issues, flags spam, and assigns Issues to Offices.
_Avoid_: Admin, government, moderator

**Super Admin**:
A member of the Invisible City team who checks access requests and grants the Authority role.
_Avoid_: Platform admin, owner, root

**Department**:
A type of public service responsible for a set of Categories, such as Electrical, Water & Sewerage, Roads, or Sanitation.
_Avoid_: Team, agency

**Business**:
Whoever carries out repairs for a Department in one sector: a government office (such as a CDA depot) or a private firm. A Business signs in with one email. Called "Office" in the code and database (`offices`, role `office`); every screen says Business (renamed 24 November 2026).
_Avoid_: Office (on screen), team, crew, contractor, field unit

**Revocation**:
The Super Admin taking away an Authority's or a Business's access. A revoked Authority is a Citizen again; a revoked Business cannot sign in or be assigned, and its unfinished jobs go back to Open.
_Avoid_: Ban, suspension (that is for Citizens)

**Area**:
The one Islamabad sector an Authority works for, such as G-9. An Authority with no Area works for the whole city.
_Avoid_: Zone, region, jurisdiction

**Spare workers**:
An Office's recorded workers minus its Issues that are Assigned or In progress. Spare workers while Issues wait more than 7 days make a sector neglected.
_Avoid_: Idle staff, free capacity

**MNA**:
The elected representative of a Constituency. Not part of the first release.
_Avoid_: Politician, representative

**Constituency**:
The electoral area an MNA represents. Not part of the first release.

## Problems

**Report**:
One Citizen's submission of a problem: a photo, a location, an optional description, and the AI's reading of it.
_Avoid_: Complaint, ticket, post

**Issue**:
One real-world problem at one place. Several Reports about the same problem are merged into one Issue.
_Avoid_: Problem, case, ticket

**Category**:
The kind of problem an Issue is, such as road damage, garbage, or a broken streetlight. Each Category belongs to exactly one Department.
_Avoid_: Type, tag

**Duplicate**:
A Report judged to describe an Issue that already exists, and therefore merged into it.

**Recurrence**:
A new Issue of the same Category at the same place as an Issue that was resolved recently.
_Avoid_: Repeat, relapse

## Workflow

**Assignment**:
An Authority handing an Issue to a specific Office.
_Avoid_: Dispatch, allocation

**Send back**:
An Office returning an Assignment to the Authorities with a reason, such as the Issue being outside its area or Department.
_Avoid_: Decline, reject (which belongs to Citizens)

**Fix**:
An Office's claim that it has repaired an Issue, backed by an after-repair photo. A Fix is not yet a Resolution.
_Avoid_: Completion, done

**Resolution**:
A Citizen who reported the Issue confirming that the Fix is real.
_Avoid_: Closure, verification

**Rejection**:
A Citizen who reported the Issue saying the Fix is not real, which sends the Issue back to the Office.
_Avoid_: Dispute, reopen

**Unconfirmed closure**:
An Issue closed after a Fix because no Citizen confirmed or rejected it in time. Recorded separately from a Resolution.
_Avoid_: Auto-resolve

## Trust

**Access request**:
A person asking to be made an Authority for an Area or the whole city, which a Super Admin approves or declines after checking they are a real official.

**Office registration**:
A Business (government or private) asking to join, with its Department, sector and workers, under the Google email it will sign in with. An Authority of that Area or of the whole city approves or declines it.

**Demo account**:
A made-up Citizen, Authority or Office login with seeded data, used to show the app without real accounts. Never mixed with real people's data: a Demo account sees only Demo data, a real account only real data.

**Spam flag**:
An Authority marking a Report as abusive or not a real civic problem. Repeated Spam flags lead to Suspension.
_Avoid_: Strike, report (as a verb)

**Suspension**:
A Citizen losing the ability to submit Reports.
_Avoid_: Ban
