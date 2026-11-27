# Civora: Product Requirements

_See the unseen. Fix the forgotten._ Agreed with the team on 22 November 2026; hackathon deadline 28 November 2026. Terms in **bold** are defined in [`GLOSSARY.md`](../GLOSSARY.md).

## 1. Problem

Civic problems in Islamabad (potholes, overflowing garbage, broken streetlights, leaks) are reported in scattered places, if at all. Officials do not see a full picture, nobody knows which office should act, and citizens never learn whether anything was fixed. Neighbourhoods with few complaints but almost no repairs stay invisible.

## 2. What we build

A web app that turns individual **Reports** into one record per real-world problem (**Issue**), routes each Issue to the **Office** that can fix it, and closes the loop with the **Citizen** who reported it. City-wide insights show hotspots, neglected neighbourhoods and recurring damage.

The demo story: a Citizen reports a pothole in F-10 → the AI recognises road damage and rates it high → a second Citizen reports the same pothole and it merges → it shows on the map → an **Authority** sends the nearest Roads Office a **Contract** → the Office accepts and the Issue is Assigned to it → the Office fixes it and uploads an after-photo → the Citizen confirms → neighbourhood statistics and the Office's record update.

## 3. Roles

| Role | Who | How they get the role |
|---|---|---|
| **Citizen** | Any member of the public | Signs in with Google and completes their profile |
| **Authority** | A city official who reviews, flags spam and sends **Contracts**, for one **Area** or the whole city | Submits an **Access request** naming the Area (or the whole city); a **Super Admin** approves it |
| **Office** | One Office of a **Department**, or a private business doing that Department's work, signing in with one email | Files an **Office registration** with the Google account it will use; an Authority of that Area (or of the whole city) approves it. An Authority can also add an Office and set its email |
| **Super Admin** | The Civora team | Their Gmail is listed in the server setting `SUPER_ADMIN_EMAILS` |
| **MNA** | Elected representative of a **Constituency** | Later release |

Every screen calls an Office a **Business** (government or private); the code keeps the name Office. Authorities, Businesses and the Super Admin each work in a sidebar workspace with no top bar and no site footer: Businesses have Jobs and My Business (details and workers); the Super Admin has Access requests, Authorities, Businesses and Insights. Citizens and visitors see only the map (home), Report and My reports; Insights is for Authorities and the Super Admin only (24 November 2026).

The Super Admin sees every Authority (area, Department, email, phone) and every Business (Department, sector, government or private, workers, email, jobs in hand, Fixes) of their world, and can **revoke** either at any time. A revoked Authority is a Citizen again on their next page load. A revoked Business cannot sign in or be suggested or offered a Contract, its waiting Contracts are withdrawn, and its Assigned and In progress Issues go back to Open with a note on the timeline. A Fix it had made stays for the Citizens to answer; if one rejects it, that Issue goes back to Open too. Both are told by email. A revoked Business can come back two ways (25 November 2026): the Super Admin **restores** it, or its people register again with the same email; the Authority deciding sees "Revoked before", and approval moves the email to the new Business. A revoked Authority sends a new Access request.

**Jobs between Authorities and Businesses** (24 November 2026). A Business sees **Available jobs**: the Open Issues of its Department in its own sector. It can ask for one with a note (a **Job request**); the Authorities of that area are emailed. An Authority sees the Job requests of its area and sends that Business a Contract, or declines the request (not while a Contract waits on that Business). The Assignment accepts that Business's request and declines the others, and a declined Business may ask again. A Business and the Authorities of the Issue's area talk in a **chat** per Issue and Business, open to nobody else, and each sees the other's phone and email to call or write. A Business records its phone (from its registration, editable). 

**Assignment by agreement** (25 November 2026). An Authority never assigns an Issue on its own, whether or not the Business asked for it. It sends one of the suggested Businesses a **Contract**: the work to be done and a finish date (required), and a price in rupees, a start date and payment terms (optional). The Business is emailed and answers on its Contracts page:
- **Accept** (after ticking that it agrees to the terms): the Issue becomes Assigned to it. The area's Authorities are emailed.
- **Decline**, with a reason: the Issue stays Open and the area's Authorities are emailed. The Authority may send new terms or offer it to another Business.

The Issue stays Open until a Contract is accepted, and only one Contract may wait per Issue; an Authority of the area can **withdraw** it while it waits, which the Business is told by email. Contracts are seen only by that Business and the Authorities of the Issue's area. The public timeline shows the Assignment, never an offer, its terms or a decline. Reporter email and phone stay hidden from the Business until it accepts. A Business nobody can sign in as (no email) cannot be offered a Contract, except in the Demo, where most Businesses have no account. Issues Assigned before this rule stay as they are. An accepted Contract **ends** when the Issue leaves the Business: sent back, reopened by a Revocation, or removed. Removing an Issue (its last Report withdrawn or flagged) withdraws a waiting Contract, and the Business is told by email. **Contract PDF** (25 November 2026): either side downloads any Contract as an A4 PDF (Download PDF on both Contracts pages; `GET /api/contracts/[id]/pdf`, for the Authority of the Issue's area or the whole city, and the Business it is for, in their own world). It holds the title, number and date sent, both parties with contact details (both are officials of this job), the Issue with its cover photo (left out if it cannot be fetched), the terms (price "To be agreed" when none), the acceptance record (a declined, withdrawn or ended Contract says so, never as agreed), two signature lines and "This document is not legally binding by itself." The PDF text is English for now; only the buttons are translated, and Urdu text in a Contract shows as "?". It is emailed to the Business when sent and to both the Business and the Authorities of the area when accepted (the Demo sends nothing); if the PDF cannot be made the email goes without it. **Contract payment** (27 November 2026): an accepted Contract shows what was agreed (its price) and whether it is paid. An Authority of the Issue's area (or the whole city) marks it **Paid** once the Citizen has confirmed the Fix (the Issue is Resolved), once, with an optional cheque or transfer reference (up to 120 characters), after a confirm dialog; it cannot be undone. Civora records the payment and never moves money. Both sides see "Paid on (date)" and the reference; the PDF gains a Payment section (agreed price, paid or not, when, by whom, reference); the Business is emailed (the Demo sends nothing). Payments are not on the public timeline.

Everyone signs in with Google. Signing in alone only ever makes someone a Citizen. An Office has exactly one email, and an email belongs to at most one Office: setting a new email replaces the old one (24 November 2026). An Authority approved for an Area sees, sends Contracts, flags spam and manages Offices in that Area only; an Authority approved for the whole city (every Authority approved before 24 November 2026, and the Demo Authority) sees everything. Approving an Office registration creates the Office at its sector and makes the registering email its sign-in; the Office is told by email.

## 4. Rules

### Citizens and Reports
- Signing in is required to submit a Report. Viewing the map and Issue pages is public; Insights, screen and API, is for the Super Admin only (25 November 2026; Authorities keep their own area's figures on their Dashboard and Reports page, from a separate API).
- On first sign-in a Citizen enters a display name and a phone number in `+92 3xx xxxxxxx` format. The phone is required but not verified by SMS. Email comes from Google.
- A Report is a photo (required; photos only, no video), a location (phone GPS, adjustable by moving a map pin), an optional description, and the AI's reading.
- The AI suggests the **Category** and severity. The Citizen can change the Category before submitting.
- A Citizen can delete their own Report only while its Issue is still Open. Reports cannot be edited.

### Merging and priority (existing behaviour, kept)
- A new Report merges into an existing open Issue as a **Duplicate** when it is within 150 m and scores ≥ 0.6. Score with a photo: `0.45·distance + 0.30·category + 0.25·image similarity`; without: `0.6·distance + 0.4·category`. Related Categories (water leak / drainage, blocked footpath / accessibility) count as 0.6 of a category match.
- A Citizen who has already reported an Issue cannot report it again: they see "you've already reported this", and it does not count twice.
- A **Recurrence** is flagged when a new Issue has the same Category within 60 m of an Issue resolved in the last 180 days.
- Priority (0–100): `severity×15` + crowd `min(20, 8·log2(reports))` + age `min(10, 0.4·days)` + hazard bonus (road 6, accessibility 6, water 5, drainage 5, streetlight 3) + 4 if recurring. Resolved Issues score 0.

### Spam protection
1. Only signed-in Citizens with a completed profile can report.
2. At most 10 Reports per Citizen per day.
3. Photos the AI judges not to be a civic problem (selfies, memes, indoor objects) are refused with a message.
4. An Authority can put a **Spam flag** on a Report. A flagged Report is hidden, and its photo is no longer the Issue's cover (the same when a Citizen withdraws a Report): the first remaining Report's photo is shown instead. If it was the Issue's only Report, the Issue is removed. Three Spam flags cause a **Suspension**.

### Privacy
- A reporter's display name is visible to everyone. Email and phone are visible only to an Authority of the Issue's Area (or of the whole city) and to the Office the Issue is assigned to. (Changed 24 November 2026: names were hidden before.)
- Citizens are not shown severity levels, priority numbers or neglected sectors. Only "Critical" is shown, and only for an immediate danger that is still waiting. Authorities also see the priority number and the neglected list.

### Issue workflow

```
Open → Assigned → In progress → Fixed → Resolved
                                   └──→ Closed unconfirmed (7 days, no answer)
```

- **Assignment**: the Authority opens an Issue and sees the Offices of the Category's Department, nearest first. The Authority picks one and sends it a Contract; the Issue is Assigned when the Office accepts (section 3, Assignment by agreement).
- An Office can **send back** an Assigned Issue with a reason ("not our area", "not our department"). It returns to Open.
- The Office moves the Issue to In progress, then records a **Fix** with a required after-repair photo. The Issue becomes Fixed.
- Any one Citizen who reported the Issue can confirm the Fix (**Resolution** → Resolved) or reject it with a comment (**Rejection** → back to In progress, or to Open when the Office was revoked since). My jobs shows an Office only the Rejections of its own Fixes.
- With no answer 7 days after the Fix, the Issue becomes **Unconfirmed closure** (Closed unconfirmed), recorded separately from a Resolution.
- Every change is added to the Issue's public timeline.

### Categories and Departments

| Category | Department |
|---|---|
| Road damage / pothole | Roads |
| Blocked footpath | Roads |
| Garbage overflow | Sanitation |
| Broken streetlight | Electrical |
| Electrical hazard (other than streetlights) | Electrical |
| Water leak | Water & Sewerage |
| Blocked drain / flooding | Water & Sewerage |
| Accessibility barrier | Accessibility |
| Building / structural damage | Building Control |
| Other | General Maintenance |

The seed data includes 15–25 real Islamabad Offices (CDA, IESCO and others) at approximate locations.

### Email
Sent from a project Gmail account (app password). The Demo never sends email.
1. To the Office's staff when it is offered a Contract, or one is withdrawn; to the area's Authorities when it accepts or declines.
2. To every Citizen who reported an Issue when it is Fixed, asking them to confirm or reject.
3. To those Citizens when it is Resolved or closed unconfirmed.

The same updates show in the app on the Citizen's **My reports** page.

## 5. Screens

| Who | Screens |
|---|---|
| Public | City map (Issues and heatmap layers), Issue page (reporter names, before/after photos, timeline) |
| Citizen | Profile setup, Report a problem (phone-first: camera, GPS, map pin), My reports (with confirm/reject on Fixed Issues) |
| Authority | A sidebar workspace instead of the top bar: Dashboard (overview: counts, problems by category, what needs attention, busiest areas, Offices), Reports (priority queue with filters; Issue review with each Report's reporter email and phone, Spam flag, suggested Offices, Contract), Job requests, Contracts, Offices and staff management. No Insights (Super Admin only). No map. |
| Office | Contracts (accept or decline), My jobs (Start work, Mark fixed with after-photo, Send back) |
| Super Admin | Access requests (approve / decline) |
| Anyone | Request Authority access form (name, department, official email, phone) |

The Citizen screens are designed for phones first; staff screens are designed for laptops. Layout is confirmed with a throwaway clickable prototype before the real screens are built.

## 6. AI

- **Photo analysis**: Gemini first, then Groq, then the offline keyword guess as fallbacks. It produces Category, severity, a confidence, a summary, and whether the photo shows a civic problem at all.
- **Voice (Urdu or English)**: the Citizen taps the mic button, speaks (up to a minute) and taps again to stop; Gemini returns the English, plus the Urdu text when Urdu was spoken. The Citizen sees the text before submitting and can correct the English. The English becomes the Report's description (public, and what the photo analysis reads); the Urdu original is shown only to Authorities and the assigned Office, alongside the contact details. Without a Gemini key the mic says voice is off; there is no fallback provider.

## 7. Insights (existing, kept)
- Invisible-problems heatmap.
- Sectors: the percentage of reported problems fixed, and average days to fix. The neighbourhood health score is still computed by the API but shown nowhere (24 November 2026).
- Neglected sector (24 November 2026): the Offices in the sector have **spare workers** (recorded workers minus their Assigned and In progress Issues) while at least one Issue there has waited Open or Assigned for more than 7 days. A sector whose Offices recorded no workers falls back to the old test: ≥ 3 complaints, resolution rate < 35% and below 60% of the city rate. Each neglected sector shows its evidence (spare workers and the Issues waiting longest). Insights are shown to the Super Admin only; an Authority still sees the neglected flag on its Dashboard and Reports page.
- Predictive maintenance from recurring problems.
- Before vs after photos.
- **Office track record** (new): per Office, Issues assigned, Fixes, Rejections, Unconfirmed closures, and average days to fix.
  - "Issues assigned" counts the Issues an Office holds now; a sent-back Issue leaves it. A Fix or Rejection counts for the Office that made the Fix, even when the Issue has since gone to another Office (25 November 2026). Days to fix run from that Office's latest Assignment of the Issue to its latest Fix.
- Open severity load counts every Issue not yet Resolved or Closed unconfirmed (a Fix waiting for an answer still counts). Resolution rate counts only Resolutions; Unconfirmed closures are shown apart and count as neither open nor resolved.
- A new Report near an Issue that was Resolved or Closed unconfirmed in the last 180 days marks a recurrence.
- "Citizens who report most" shows names and Report counts. The Citizen Impact score is computed but not shown for now (24 November 2026).

## 8. Demo mode
The public site has **Demo accounts** (a Citizen, an Authority, three Businesses and a Super Admin) that anyone can switch between, all with made-up seeded people and data, under a visible "Demo" banner. The Demo shows one area, **G-9** (25 November 2026): the Demo Authority is approved for G-9 only and sees and acts only on its Reports and Businesses; a Roads, a Sanitation and an Electrical Business work there, each seeing only the jobs of its own Department in G-9 (two Open, one Assigned, one In progress, one Fixed, and a Contract waiting for an answer). Real Google sign-ins work on the same site at the same time, and real data never mixes with demo data, so the team can test the real flow live.
**Which data a visitor sees** (the Demo world and the real world never mix):
- Signed in as a Demo account: Demo data only. Signed in with a real Google account: real data only, and no Demo banner.
- Not signed in: Demo data while Demo mode is on (so judges land on a full map), real data when it is off.
- One exception (25 November 2026): while the real world has fewer than 20 Issues, the home page shows real Citizens and visitors the Demo Issues as **Example Issues** beside the real ones. Each is marked "Example", a note says they are made up and counted in the figures, and they cannot be opened. They appear nowhere else and never to officials.
- A Report, Issue or Access request takes the world of whoever creates it, except that an Access request from a visitor who is not signed in as a Demo account is always real. A real Report never merges into a Demo Issue.
- Super Admins only see and decide Access requests of their own world, so the Demo Super Admin can never grant a real Authority role. A real sign-in never receives a role from Demo rows, even with a matching email.
- The Demo account is chosen with the role switcher in the banner; the choice is a server-checked cookie that only works while Demo mode is on.

## 9. Language
English first. Every on-screen text goes through a translation file from day one; Urdu with right-to-left layout is added before the deadline.

## 10. Later (not in the 28 November build unless time is left)
- **MNA** scorecard per Constituency (each Issue already stores its Constituency from a sector lookup).
- Impact Score rule: Reports ending in a Resolution, a bonus for reporting first, minus points per Spam flag.
- SMS phone verification; email-and-password sign-in.
- Optional gender ("Prefer not to say") and other profile conveniences.
- Video Reports.
