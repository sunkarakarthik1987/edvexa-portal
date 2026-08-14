# Test-Prep Student Portal
## Implementation Specification (Claude Code handoff)

> **Spec version:** 1.0
> **Bounded context:** `test-prep`
> **Schema namespace:** `test_prep.*`
> **Track scope for v1:** Digital SAT only
> **Status:** Ready for implementation

---

## How to use this document

Every feature below has a data model, an API surface, business rules, and acceptance
criteria. Build in the order given under **Build sequence**. Do not start a feature
until its stated dependency is merged.

Features are referenced by slug (`study-plan`, `test-engine`) throughout. There is no
numbering — the slugs are the stable identifiers, and they should match directory names
in the source tree.

### Placeholders to resolve before coding

| Token | Meaning | Action |
|---|---|---|
| `{{APP_NAME}}` | Product/brand name | **Not finalised.** Read from a single `config/brand.ts` constant. Never hardcode. |
| `{{DB}}` | Database | Assumed PostgreSQL 15+. Adjust the DDL if different. |

### Stated assumptions — correct these before build if wrong

1. **Architecture:** modular monolith. This is one bounded context with its own schema
   namespace. It communicates with other contexts only through the events listed under
   **Cross-context contracts** — no direct cross-context table reads.
2. **Multi-tenancy:** shared database, shared schema, `tenant_id` discriminator on every
   table, enforced by Row-Level Security. Not by application `WHERE` clauses alone.
3. **Frontend:** Vite + React + TypeScript + Tailwind. A prototype source tree already
   exists with the design system, calendar, test engine, study plan wizard, homework
   tracker, question bank, and messaging screens. Treat that as the starting point, not
   a throwaway.
4. **Auth and RBAC:** provided by the tenant-administration context. This context
   consumes roles, it does not define them.
5. **Design system:** background `#FDFBD4`, brand green `#173600`, accent `#C05800`,
   IBM Plex Mono for monospace, Helvetica Neue for body. See **Accessibility** for the
   contrast constraint on the accent colour.

---

## Scope boundary

### In scope

The student-facing experience of exam preparation: schedule, attendance, materials,
homework, practice, full-length mock tests, score history, and trainer communication.

### Out of scope — owned by other contexts

| Concern | Owning context | Note |
|---|---|---|
| Question authoring, AI question generation, review and approval | `assessment` | This context **reads** approved questions; it never authors them |
| Item difficulty calibration, psychometrics | `assessment` | Frozen for v1 regardless |
| Trainer and counsellor HR records | `hrms` | Reference `staff_id` only |
| Fee payment, invoicing, ledger | `finance` | No payment surface in the student portal for v1 |
| University shortlisting, applications, visa | `study-abroad` | Separate portal context; see the score-target contract below |
| Lead capture, marketing automation | `crm` | |
| Tenant provisioning, white-label theming, RBAC definition | `tenant-admin` | |

> **Rule for the implementer:** if a requirement below appears to need a table from
> another context, add an event or a read-model instead of reaching across the boundary.
> Raise it rather than coupling.

---

## Roles

| Role key | Scope |
|---|---|
| `student` | Own record only |
| `trainer` | Assigned batches — attendance, homework grading, materials, messaging |
| `academic_head` | All batches in branch — schedule, mock scheduling, score analytics |
| `content_admin` | Materials library, mock test assembly |
| `branch_admin` | Enrolment, batch composition, reporting |

The trainer-facing surface is not optional. Every student-facing feature below implies a
back-office action that must exist for it to function — the minimum back-office is
listed with each feature. This was the single largest gap in the original scope document.

---

## Feature index

| Slug | Feature | Priority | Depends on |
|---|---|:---:|---|
| `enrolment` | Student, batch, and enrolment records | P0 | — |
| `timetable` | Daily and weekly batch schedule | P0 | `enrolment` |
| `attendance` | Attendance record and leave requests | P0 | `timetable` |
| `materials` | Study material library by test section | P0 | `enrolment` |
| `homework` | Assignment list, submission, grading | P0 | `enrolment` |
| `question-bank` | Filtered practice pool and practice runner | P0 | `assessment` events |
| `test-engine` | Full-length and sectional mock delivery | P0 | `question-bank` |
| `scoring` | Score computation, history, section breakdown | P0 | `test-engine` |
| `review` | Per-question review after a test | P0 | `test-engine` |
| `dashboard` | Home overview | P1 | most of the above |
| `study-plan` | Wizard-generated dated study plan | P1 | `enrolment` |
| `calendar` | Month view of sessions, homework, tests | P1 | `timetable`, `homework` |
| `messages` | Student ↔ trainer threads | P1 | `enrolment` |
| `report-card` | Downloadable progress report | P2 | `scoring` |
| `profile` | Profile, contacts, notification preferences | P2 | — |
| `diagnostic` | Onboarding diagnostic that sets baseline and target | P2 | `test-engine` |

---

## Core domain model

All tables live in schema `test_prep`. Every table carries:

```sql
tenant_id      uuid        NOT NULL REFERENCES core.tenants(id),
id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
created_at     timestamptz NOT NULL DEFAULT now(),
updated_at     timestamptz NOT NULL DEFAULT now(),
created_by     uuid        NULL,
deleted_at     timestamptz NULL
```

Referred to below as `<STANDARD_COLUMNS>`.

### Row-level security template — apply to every table

```sql
ALTER TABLE test_prep.<table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON test_prep.<table>
  USING (tenant_id = current_setting('app.tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
```

Every request sets `app.tenant_id` in the transaction before any query. Add an
integration test per table asserting that a query without the setting returns zero rows.

### Entity overview

```
student_enrolment ──N:1──> batch ──1:N──> session
        │                                    │
        │                                    └──1:N──> attendance_record
        ├──1:N──> leave_request
        ├──1:N──> homework_submission <──N:1── homework_assignment
        ├──1:N──> test_attempt ──1:N──> attempt_module ──1:N──> attempt_response
        │              └──1:1──> attempt_score
        ├──1:N──> practice_session ──1:N──> practice_response
        ├──1:1──> study_plan ──1:N──> study_plan_day
        ├──1:N──> score_target
        └──1:N──> message_thread ──1:N──> message

test_definition ──1:N──> test_section ──1:N──> test_module_blueprint
question_ref (read-model, mirrored from assessment context)
material ──N:1──> material_folder
```

---

## `enrolment` — student, batch, and enrolment records

### Tables

```sql
-- batch
<STANDARD_COLUMNS>
name                text NOT NULL,           -- 'SAT Nov 2026 — Evening'
track_code          text NOT NULL,           -- 'SAT' for v1; IELTS/GRE later
branch_id           uuid NULL,
primary_trainer_id  uuid NULL,
starts_on           date NOT NULL,
ends_on             date NULL,
target_exam_date    date NULL,
delivery_mode       text NOT NULL,           -- live | recorded | blended | self_study
capacity            integer NULL,
status              text NOT NULL DEFAULT 'active'  -- planned | active | completed | cancelled

-- student_enrolment
<STANDARD_COLUMNS>
core_person_id      uuid NOT NULL,           -- shared student identity, see note
batch_id            uuid NOT NULL REFERENCES test_prep.batch(id),
enrolled_on         date NOT NULL,
status              text NOT NULL DEFAULT 'active',  -- active | paused | completed | dropped
exam_date           date NULL,               -- student's own booked exam, may differ from batch
baseline_score      integer NULL,            -- from diagnostic
target_score        integer NULL,
UNIQUE (tenant_id, core_person_id, batch_id)
```

> **`core_person_id` is load-bearing.** A student who takes SAT coaching and later enters
> the study-abroad funnel must resolve to one `core.persons` row. This is the join key
> that makes the unified student journey and cross-vertical conversion possible. Never
> create a portal-local student identity.

### Minimum back-office
Batch creation, trainer assignment, student enrolment, and exam-date entry.

### Acceptance criteria
- [ ] A student enrolled in two batches sees both, with a clear active-batch switcher.
- [ ] Dropping a student preserves all historical attempts and scores.
- [ ] A query without `app.tenant_id` set returns zero rows.

---

## `timetable` — daily and weekly schedule

### Tables

```sql
-- session
<STANDARD_COLUMNS>
batch_id            uuid NOT NULL REFERENCES test_prep.batch(id),
title               text NOT NULL,
topic               text NULL,
section_code        text NULL,               -- 'RW' | 'MATH' | 'MIXED'
starts_at           timestamptz NOT NULL,
ends_at             timestamptz NOT NULL,
delivery_mode       text NOT NULL,           -- live_online | live_offline | recorded
trainer_id          uuid NULL,
room                text NULL,
join_url            text NULL,
recording_url       text NULL,
material_ids        uuid[] NOT NULL DEFAULT '{}',
status              text NOT NULL DEFAULT 'scheduled'  -- scheduled | held | cancelled
```

### Behaviour
- Daily and weekly views. Week view is the default on desktop, day view on mobile.
- Past sessions expose the recording and the materials shared in that session — this is
  the "classes → past class → recorded video plus shared materials" flow.
- **Offline caching is read-only by design.** Cache the next 14 days of sessions and
  material metadata via a service worker. No offline writes; sync complexity is not
  worth it in v1. State this in the scope document explicitly.
- All times stored UTC, rendered in the tenant's timezone. Never render a bare `DD/MM`
  date — use explicit month names.

### Minimum back-office
Session creation, recurring-session generation, cancellation with student notification,
recording URL attachment.

### Acceptance criteria
- [ ] Cancelling a session notifies enrolled students and greys the slot rather than deleting it.
- [ ] Timetable renders correctly for a student whose device timezone differs from the tenant's.
- [ ] Cached timetable is readable with the network disabled.

---

## `attendance` — record and leave requests

### Tables

```sql
-- attendance_record
<STANDARD_COLUMNS>
session_id          uuid NOT NULL REFERENCES test_prep.session(id),
enrolment_id        uuid NOT NULL REFERENCES test_prep.student_enrolment(id),
status              text NOT NULL,           -- present | absent | late | excused
marked_by           uuid NULL,
marked_at           timestamptz NULL,
minutes_attended    integer NULL,            -- from live-class join/leave where available
note                text NULL,
UNIQUE (tenant_id, session_id, enrolment_id)

-- leave_request
<STANDARD_COLUMNS>
enrolment_id        uuid NOT NULL REFERENCES test_prep.student_enrolment(id),
from_date           date NOT NULL,
to_date             date NOT NULL,
reason              text NOT NULL,
status              text NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | cancelled
decided_by          uuid NULL,
decided_at          timestamptz NULL,
decision_note       text NULL
```

### Behaviour
- Attendance percentage computed over held sessions only. Cancelled sessions never count
  against a student.
- An approved leave request retroactively sets overlapping `absent` records to `excused`.
  Excused absences are excluded from the percentage denominator.
- Show the percentage with the raw fraction next to it (`87% · 27 of 31`). A bare
  percentage invites disputes.

### Minimum back-office
Per-session attendance marking (bulk mark-all-present with exceptions), leave approval queue.

### Acceptance criteria
- [ ] Approving leave recalculates the attendance percentage in the same transaction.
- [ ] A student cannot approve their own leave request or edit an attendance record.
- [ ] Cancelled sessions are excluded from both numerator and denominator.

---

## `materials` — study material library

### Tables

```sql
-- material_folder
<STANDARD_COLUMNS>
parent_id           uuid NULL REFERENCES test_prep.material_folder(id),
name                text NOT NULL,
section_code        text NULL,               -- 'RW' | 'MATH'
sequence            integer NOT NULL DEFAULT 0

-- material
<STANDARD_COLUMNS>
folder_id           uuid NULL REFERENCES test_prep.material_folder(id),
batch_ids           uuid[] NOT NULL DEFAULT '{}',   -- empty = all batches on the track
title               text NOT NULL,
description         text NULL,
kind                text NOT NULL,           -- pdf | video | link | slide_deck | worksheet
storage_key         text NULL,               -- object store; never a public URL
external_url        text NULL,
duration_seconds    integer NULL,
is_downloadable     boolean NOT NULL DEFAULT true,
published_at        timestamptz NULL,
sequence            integer NOT NULL DEFAULT 0
```

### Behaviour
- Organised by test section (Reading & Writing, Math) then topic folder.
- Unpublished materials are invisible to students, full stop — filter server-side, not
  in the UI.
- Downloads served through short-TTL signed URLs, per-tenant key prefix. Access logged.
- Cache last-opened materials for offline reading where `kind = 'pdf'`.
- Track `material_view` events — they feed the dashboard's continue-learning widget.

### Minimum back-office
Folder management, upload, publish/unpublish, batch targeting, ordering.

### Acceptance criteria
- [ ] An unpublished material is not retrievable by direct ID.
- [ ] Signed URLs expire and are not written to logs in plaintext.
- [ ] A material scoped to one batch is invisible to students in other batches.

---

## `homework` — assignments, submission, grading

### Tables

```sql
-- homework_assignment
<STANDARD_COLUMNS>
batch_id            uuid NOT NULL REFERENCES test_prep.batch(id),
title               text NOT NULL,
instructions        text NULL,
section_code        text NULL,
kind                text NOT NULL,           -- question_set | file_upload | reading | material_review
question_ids        uuid[] NOT NULL DEFAULT '{}',
attachment_ids      uuid[] NOT NULL DEFAULT '{}',
assigned_on         date NOT NULL,
due_on              date NOT NULL,
max_score           numeric(6,2) NULL,
allows_late         boolean NOT NULL DEFAULT true,
created_by_staff_id uuid NOT NULL

-- homework_submission
<STANDARD_COLUMNS>
assignment_id       uuid NOT NULL REFERENCES test_prep.homework_assignment(id),
enrolment_id        uuid NOT NULL REFERENCES test_prep.student_enrolment(id),
status              text NOT NULL DEFAULT 'not_started',
submitted_at        timestamptz NULL,
is_late             boolean NOT NULL DEFAULT false,
response_payload    jsonb NULL,              -- question_set answers
file_ids            uuid[] NOT NULL DEFAULT '{}',
auto_score          numeric(6,2) NULL,
manual_score        numeric(6,2) NULL,
final_score         numeric(6,2) NULL,
trainer_feedback    text NULL,
graded_by           uuid NULL,
graded_at           timestamptz NULL,
UNIQUE (tenant_id, assignment_id, enrolment_id)
```

**`status` enum:** `not_started` → `in_progress` → `submitted` → `graded` | `overdue`.

### Behaviour
- **Filter buttons must actually filter.** The prototype has non-functional filter
  buttons — this is a known defect. Filters: All / Pending / Submitted / Graded /
  Overdue, plus section. Filter state lives in the URL query string so it survives
  refresh and can be shared.
- `question_set` assignments auto-score objective items on submission; `file_upload`
  requires manual grading.
- Overdue is derived at read time from `due_on < now() AND submitted_at IS NULL` — do not
  rely on a scheduled job to flip the status, or the UI lies between job runs.

### Minimum back-office
Assignment creation, batch targeting, a grading queue with per-student feedback, and bulk
score entry.

### Acceptance criteria
- [ ] Every filter button changes the result set and updates the URL.
- [ ] A late submission is flagged but still accepted when `allows_late` is true.
- [ ] Trainer feedback is visible to the student and appears in the score history.
- [ ] Auto-scored and manually-scored components combine into `final_score` deterministically.

---

## `question-bank` — practice pool and practice runner

### Read-model from the assessment context

```sql
-- question_ref: mirrored projection, populated by assessment events. Read-only here.
<STANDARD_COLUMNS>
assessment_question_id uuid NOT NULL,
track_code          text NOT NULL,           -- 'SAT'
section_code        text NOT NULL,           -- 'RW' | 'MATH'
domain              text NOT NULL,           -- 'Information and Ideas', 'Algebra', ...
skill               text NULL,
difficulty          text NOT NULL,           -- easy | medium | hard
question_type       text NOT NULL,           -- mcq | spr (student-produced response)
requires_calculator boolean NOT NULL DEFAULT false,
is_active           boolean NOT NULL DEFAULT true,
UNIQUE (tenant_id, assessment_question_id)
```

Question **content** (stem, options, rationale) is fetched from the assessment context at
render time. Only metadata needed for filtering is mirrored — mirroring content would
create a stale-copy problem.

### Tables

```sql
-- practice_session
<STANDARD_COLUMNS>
enrolment_id        uuid NOT NULL REFERENCES test_prep.student_enrolment(id),
mode                text NOT NULL,           -- untimed | test_mode
pool_filter         jsonb NOT NULL,          -- the filter that produced this set
question_ids        uuid[] NOT NULL,
requested_count     integer NOT NULL,
seconds_per_question integer NULL,           -- test_mode only
started_at          timestamptz NOT NULL,
completed_at        timestamptz NULL,
correct_count       integer NULL,
status              text NOT NULL DEFAULT 'in_progress'  -- in_progress | completed | abandoned

-- practice_response
<STANDARD_COLUMNS>
practice_session_id uuid NOT NULL REFERENCES test_prep.practice_session(id),
question_id         uuid NOT NULL,
sequence            integer NOT NULL,
selected_option     text NULL,
entered_value       text NULL,               -- SPR answers
is_correct          boolean NULL,
seconds_spent       integer NOT NULL DEFAULT 0,
is_flagged          boolean NOT NULL DEFAULT false,
crossed_out_options text[] NOT NULL DEFAULT '{}'
```

### Behaviour

- **Pool state control:** Unused / Used / Both segmented control. "Used" means the
  student has answered that question in any prior practice session or mock. Compute from
  a `question_exposure` index keyed on `(enrolment_id, question_id)` — do not scan
  responses at query time.
- **Filters:** section, domain, skill, difficulty, and pool state. All combinable. Show
  the live matching count before the student starts, so an over-narrow filter is visible
  rather than producing an empty session.
- **Question-count selector** with a hard cap at the pool size.
- **Test mode** applies a per-question timer. See the timing note under `test-engine` —
  the current flat 75 seconds is not exam-accurate and should be section-derived.
- **Practice runner screen and results screen are missing in the prototype.** "Start
  practice" currently goes nowhere. Building these is completing an existing promise,
  not new scope.

### Acceptance criteria
- [ ] Selecting "Unused" never returns a question the student has already seen.
- [ ] Matching count updates as filters change, before session start.
- [ ] Requesting more questions than the pool holds is clamped with a visible message.
- [ ] Abandoning mid-session preserves responses; resuming continues from the same index.
- [ ] Flag and cross-out state persist across a page refresh.

---

## `test-engine` — full-length and sectional mock delivery

### Digital SAT structure — the authoritative reference

| Section | Modules | Questions per module | Time per module | Calculator |
|---|:---:|:---:|:---:|---|
| Reading & Writing | 2 | 27 | 32 min | n/a |
| Math | 2 | 22 | 35 min | Allowed throughout |

Total 98 questions across 134 minutes, plus a 10-minute break between sections.
Scored 400–1600, each section 200–800.

> **Timing defect to fix.** The prototype uses a flat 75 seconds per question. That gives
> Reading & Writing 33.75 minutes against a real 32, and Math 27.5 minutes against a real
> 35 — Math is under-timed by roughly 7.5 minutes per module, which materially distorts
> pacing practice. Store time as **minutes per module on the blueprint**, not as seconds
> per question. Keep a per-question figure only as a practice-mode convenience.

### Tables

```sql
-- test_definition
<STANDARD_COLUMNS>
track_code          text NOT NULL,
name                text NOT NULL,
kind                text NOT NULL,           -- full_length | sectional | diagnostic
is_published        boolean NOT NULL DEFAULT false,
scoring_table_id    uuid NULL

-- test_module_blueprint
<STANDARD_COLUMNS>
test_definition_id  uuid NOT NULL REFERENCES test_prep.test_definition(id),
section_code        text NOT NULL,
module_index        integer NOT NULL,        -- 1 or 2
question_count      integer NOT NULL,
time_limit_minutes  integer NOT NULL,
allows_calculator   boolean NOT NULL DEFAULT false,
question_ids        uuid[] NOT NULL,
UNIQUE (tenant_id, test_definition_id, section_code, module_index)

-- test_attempt
<STANDARD_COLUMNS>
enrolment_id        uuid NOT NULL REFERENCES test_prep.student_enrolment(id),
test_definition_id  uuid NOT NULL REFERENCES test_prep.test_definition(id),
kind                text NOT NULL,           -- full_length | sectional | diagnostic
scheduled_for       timestamptz NULL,
started_at          timestamptz NULL,
submitted_at        timestamptz NULL,
status              text NOT NULL DEFAULT 'not_started',
current_module_id   uuid NULL,
server_deadline_at  timestamptz NULL

-- attempt_module
<STANDARD_COLUMNS>
attempt_id          uuid NOT NULL REFERENCES test_prep.test_attempt(id),
blueprint_id        uuid NOT NULL REFERENCES test_prep.test_module_blueprint(id),
section_code        text NOT NULL,
module_index        integer NOT NULL,
started_at          timestamptz NULL,
expires_at          timestamptz NULL,        -- server-authoritative
submitted_at        timestamptz NULL,
raw_correct         integer NULL

-- attempt_response
<STANDARD_COLUMNS>
attempt_module_id   uuid NOT NULL REFERENCES test_prep.attempt_module(id),
question_id         uuid NOT NULL,
sequence            integer NOT NULL,
selected_option     text NULL,
entered_value       text NULL,
is_correct          boolean NULL,
seconds_spent       integer NOT NULL DEFAULT 0,
is_flagged          boolean NOT NULL DEFAULT false,
crossed_out_options text[] NOT NULL DEFAULT '{}',
answer_changed_count integer NOT NULL DEFAULT 0
```

**`test_attempt.status` enum:** `not_started` → `in_progress` → `submitted` → `scored`,
plus `abandoned` and `expired`.

### Behaviour

- **The timer is server-authoritative.** `attempt_module.expires_at` is set server-side
  on module start. The client displays a countdown but the server rejects any response
  arriving after expiry. A client-only timer is trivially bypassed and makes every score
  untrustworthy.
- **Module-segmented navigator** — question grid for the current module only, with
  answered / unanswered / flagged states. A student cannot return to a submitted module.
- **Sectional tests use section-pure pools.** A Math sectional draws only Math questions.
  This is enforced at blueprint assembly, not at render.
- **Sectional filter buttons must work** — same defect class as the homework filters.
- **Desmos Graphing Calculator** embedded on Math modules only, in a sandboxed iframe.
  Load lazily; do not block module start on the iframe.
- **Autosave every response and every 15 seconds.** A dropped connection mid-mock must
  not lose an attempt. On reconnect, reconcile against server state and let the server
  win on timing.
- Break screen between sections on full-length attempts, with its own countdown.
- Tools students expect and will complain about missing: answer cross-out, question flag,
  and a highlighter on Reading & Writing passages.

### The adaptive question — decide before building

The real Digital SAT is **multistage adaptive**: performance on module one determines
whether module two is the easier or harder form, and the scoring table differs by form.
Your v1 freeze excludes adaptive testing.

You cannot have both exam fidelity and the freeze. Pick explicitly:

- **Option A — linear v1.** Both modules are fixed. Simpler, ships faster. Scores are
  approximate and you must label them "practice estimate," because a linear test cannot
  produce a real Digital SAT score.
- **Option B — two-form multistage.** Author an easy and a hard second module per
  section, route on module-one raw score, and use form-specific scoring tables. This is
  roughly two to three weeks of additional work and requires double the second-module
  content. It is what serious SAT prep competitors do.

My recommendation is Option A for v1 with the scoring caveat displayed, and Option B as
the first post-v1 upgrade. But make it a recorded decision, not a default.

### Acceptance criteria
- [ ] A response submitted after `expires_at` is rejected server-side with a clear error.
- [ ] Killing the browser mid-module and reopening resumes at the correct question with the correct remaining time.
- [ ] A submitted module cannot be re-entered by URL manipulation.
- [ ] A Math sectional contains zero Reading & Writing questions.
- [ ] Desmos loads only on Math modules and its failure does not block the test.
- [ ] Flag, cross-out, and highlight state survive a refresh.

---

## `scoring` — score computation and history

### Tables

```sql
-- scoring_table: raw-to-scaled conversion per test form
<STANDARD_COLUMNS>
test_definition_id  uuid NOT NULL,
section_code        text NOT NULL,
form_variant        text NOT NULL DEFAULT 'standard',
raw_to_scaled       jsonb NOT NULL           -- {"0": 200, "1": 210, ...}

-- attempt_score
<STANDARD_COLUMNS>
attempt_id          uuid NOT NULL REFERENCES test_prep.test_attempt(id),
rw_raw              integer NULL,
rw_scaled           integer NULL,            -- 200..800
math_raw            integer NULL,
math_scaled         integer NULL,
total_scaled        integer NULL,            -- 400..1600
is_estimate         boolean NOT NULL DEFAULT true,
domain_breakdown    jsonb NOT NULL DEFAULT '{}',
computed_at         timestamptz NOT NULL,
UNIQUE (tenant_id, attempt_id)

-- score_target
<STANDARD_COLUMNS>
enrolment_id        uuid NOT NULL REFERENCES test_prep.student_enrolment(id),
total_target        integer NOT NULL,
rw_target           integer NULL,
math_target         integer NULL,
derived_from        text NOT NULL,           -- manual | diagnostic | shortlist
source_ref          uuid NULL,
set_at              timestamptz NOT NULL
```

### Behaviour
- Scaled scores come from a stored conversion table, never a formula. Conversion tables
  are data, so adding a new test form is a config task.
- `is_estimate = true` whenever the test is linear (see the adaptive decision above) or
  the conversion table is a generic rather than a form-specific one. Surface that label
  in the UI. Students and parents treat these numbers as real; an unlabelled estimate is
  a support ticket waiting to happen.
- **Score history is the emotional centre of the product.** Build the trend chart
  properly: total over time with the target as a horizontal reference line, section
  toggles, and each point clickable through to that attempt's review.
- Domain breakdown per attempt — accuracy by domain and skill, which is what actually
  drives what a student should practise next.

### The predicted-score defect
The prototype shows a static AI predicted score of 1440. Either wire it to real logic or
remove it. A hardcoded prediction will be spotted by the first trainer who looks, and it
undermines confidence in every other number on the screen. If you keep it, the minimum
honest implementation is a linear regression over the last three attempts, clamped to
±100 of the most recent score, labelled "projection based on your recent trend."

### Acceptance criteria
- [ ] Scaled score matches the stored conversion table exactly for a known raw score.
- [ ] `is_estimate` is true and visibly labelled for every linear-form attempt.
- [ ] Trend chart renders correctly with one attempt, and with fifty.
- [ ] Clicking a point on the trend opens that attempt's review.

---

## `review` — per-question review

### Behaviour
- Module pill tabs across the top; question list below with correct / incorrect / skipped
  status.
- Per question: the stem, the student's answer, the correct answer, the rationale from
  the assessment context, time spent, and how that compares to the cohort median.
- Filters: incorrect only, flagged only, slowest ten.
- "Practise more like this" creates a `practice_session` filtered to that domain and
  difficulty. This is the loop that turns review into study, and it is the single
  highest-value link in the whole portal.
- Rationale visibility is configurable per tenant — some institutes withhold rationales
  until a trainer has debriefed the mock.

### Acceptance criteria
- [ ] Review is unavailable until the attempt is scored.
- [ ] Rationale respects the tenant visibility setting.
- [ ] "Practise more like this" produces a session with the correct filter applied.

---

## `study-plan` — wizard-generated dated plan

### Tables

```sql
-- study_plan
<STANDARD_COLUMNS>
enrolment_id        uuid NOT NULL REFERENCES test_prep.student_enrolment(id),
exam_date           date NOT NULL,
daily_hours         numeric(3,1) NOT NULL,
rest_day            integer NULL,            -- 0=Sunday .. 6=Saturday
focus_area          text NOT NULL,           -- rw | math | balanced | weakest
generated_at        timestamptz NOT NULL,
generation_method   text NOT NULL,           -- rules | ai_assisted
is_active           boolean NOT NULL DEFAULT true

-- study_plan_day
<STANDARD_COLUMNS>
study_plan_id       uuid NOT NULL REFERENCES test_prep.study_plan(id),
plan_date           date NOT NULL,
is_rest_day         boolean NOT NULL DEFAULT false,
blocks              jsonb NOT NULL DEFAULT '[]',   -- [{minutes, section, domain, activity, material_id}]
planned_minutes     integer NOT NULL DEFAULT 0,
completed_minutes   integer NOT NULL DEFAULT 0,
status              text NOT NULL DEFAULT 'pending'  -- pending | partial | done | missed
```

### Behaviour
- Five-step wizard: exam date → daily hours → rest day → focus area → generate.
- Row count derives from days-until-exam. Generation must handle the edge cases the
  prototype does not: exam date in the past, exam date tomorrow, exam date 400 days out.
  Cap plan length at 180 days and warn beyond that.
- `focus_area = 'weakest'` reads the domain breakdown from the most recent scored attempt
  and weights blocks accordingly. This is the version worth building — the others are
  fallbacks for students with no attempt history.
- Plan days link to real objects: a material, a practice filter, a scheduled mock. A plan
  of unlinked text is a to-do list, not a study plan.
- Regenerating archives the previous plan rather than deleting it.

### Freeze conflict — must be resolved
Your v1 feature freeze bans AI study planners outright. This feature exists in the
prototype. Two clean resolutions:

1. Ship it as **rules-based** generation (`generation_method = 'rules'`). Deterministic
   weighting by focus area and days remaining. No model call. This satisfies the freeze
   and is honestly about as good for a first version.
2. Amend the freeze through your change-proposal process and keep AI generation.

Do not leave it unresolved with an AI feature quietly shipping against a document that
forbids it — that is how a freeze stops meaning anything.

### Acceptance criteria
- [ ] Exam date in the past is rejected at step one with a clear message.
- [ ] Rest days contain no blocks and are visually distinct.
- [ ] Every generated block links to a real material, practice filter, or scheduled test.
- [ ] Regeneration preserves the prior plan as inactive.

---

## `calendar` — month view

### Behaviour
- **The prototype calendar is hardcoded and must be rebuilt.** It loops days one to
  thirty unconditionally and marks day twenty-four as today. That breaks on 31-day
  months, on February, and on every day that is not the twenty-fourth.
- Correct implementation: dynamic month length, real leap-year handling, real today
  marker, working previous/next month navigation.
- Event types on the grid: class session, homework due, scheduled mock, study plan day.
- **Legend colours must be distinct.** Session and Due currently both use `#C05800`,
  which makes the legend meaningless. Assign each event type its own colour and verify
  each against the cream background for contrast.
- Clicking a day opens that day's detail; clicking an event navigates to the object.

### Acceptance criteria
- [ ] February 2028 renders 29 days; April renders 30; January renders 31.
- [ ] Today's marker is correct on any system date.
- [ ] Month navigation crosses year boundaries correctly.
- [ ] No two event types share a colour.

---

## `dashboard` — home overview

Widgets, in priority order: next class with join link, next scheduled mock with
countdown, latest mock score with delta from previous, progress toward target, pending
homework count with nearest deadline, today's study plan blocks, continue-learning
(last material opened), and recent notifications.

Every widget needs a designed empty state. Currently every screen assumes data exists,
so a day-one student sees a broken-looking page. An empty state should offer the action
that fills it — "No mock scores yet. Take the diagnostic to set your baseline."

### Acceptance criteria
- [ ] A newly enrolled student with zero data sees a coherent, actionable page.
- [ ] Score delta shows correctly for a student with exactly one attempt.

---

## `messages` — student ↔ trainer threads

### Tables

```sql
-- message_thread
<STANDARD_COLUMNS>
subject             text NULL,
enrolment_id        uuid NOT NULL REFERENCES test_prep.student_enrolment(id),
staff_id            uuid NOT NULL,
context_type        text NULL,               -- homework | attempt | session | general
context_ref         uuid NULL,
last_message_at     timestamptz NOT NULL,
student_unread      integer NOT NULL DEFAULT 0,
staff_unread        integer NOT NULL DEFAULT 0,
status              text NOT NULL DEFAULT 'open'

-- message
<STANDARD_COLUMNS>
thread_id           uuid NOT NULL REFERENCES test_prep.message_thread(id),
sender_type         text NOT NULL,           -- student | staff | system
sender_id           uuid NOT NULL,
body                text NOT NULL,
attachment_ids      uuid[] NOT NULL DEFAULT '{}',
read_at             timestamptz NULL
```

### Behaviour
- One-to-one student ↔ trainer threads only for v1. No group chats, no student-to-student.
- Threads can be anchored to a homework submission or a test attempt, which is what makes
  this useful rather than a generic inbox.
- Coloured initials avatars, as built in the prototype.
- Unread counts maintained on the thread row, not computed by scanning messages.
- Email notification on new message when the recipient has been offline for more than
  fifteen minutes.

### Acceptance criteria
- [ ] A student can only see threads where they are the enrolled participant.
- [ ] Unread count zeroes on thread open and stays correct across devices.
- [ ] Attachments respect the same signed-URL rules as materials.

---

## `report-card` — downloadable progress report

Generates a formatted PDF: attendance summary, homework completion rate, mock score
history with the trend chart, section and domain breakdown, trainer comments, and
progress against target.

> This is heavier than it looks. It implies a template system, a rendering pipeline, and
> an admin surface for configuring what appears. It sits quietly in a feature list next to
> one-line items but it is a chunk of work, not a checkbox. Budget accordingly.

White-label: header, logo, colours, and footer come from tenant branding config.

### Acceptance criteria
- [ ] PDF renders correctly for a student with no mock attempts.
- [ ] Tenant branding is applied; no `{{APP_NAME}}` string appears anywhere.
- [ ] Generation is async with a download-ready notification for large date ranges.

---

## `profile` — profile, contacts, preferences

Profile details, emergency contacts, exam date and target score, notification preferences
(in-app and email only — there is no mobile app in v1, so no push), and password or
session management.

### Acceptance criteria
- [ ] Changing the exam date offers to regenerate the study plan rather than silently invalidating it.
- [ ] Notification preferences are respected by every sender in the context.

---

## `diagnostic` — onboarding baseline

A first-run flow: welcome, diagnostic test (shortened form — one module per section is
sufficient), score reveal, target-setting, and study plan generation.

Sets `student_enrolment.baseline_score` and creates the first `score_target`. Currently
the prototype displays a baseline of 1180 with no flow that could have produced it.

This is new scope relative to the freeze and should go through your change-proposal
process, but it is the highest-value new item on the list — it is the moment a student
decides whether the product is worth using.

---

## Cross-context contracts

No direct table reads across contexts. All interaction is by named event.

### Consumed

| Event | From | Effect |
|---|---|---|
| `assessment.question.published` | assessment | Upsert `question_ref` projection |
| `assessment.question.retired` | assessment | Set `question_ref.is_active = false` |
| `crm.enrolment.confirmed` | crm | Create `student_enrolment` |
| `core.person.merged` | core | Re-key enrolments and journey events |

### Published

| Event | Payload | Consumed by |
|---|---|---|
| `testprep.attempt.completed` | `core_person_id`, `test_code`, `total_scaled`, subscores, `is_estimate`, `completed_at` | **study-abroad** (writes a mock score, triggers eligibility recompute and cross-vertical conversion evaluation) |
| `testprep.score.improved` | `core_person_id`, delta, new total | study-abroad, crm |
| `testprep.attendance.low` | `enrolment_id`, percentage | crm, trainer alerts |
| `testprep.homework.overdue` | `enrolment_id`, count | trainer alerts |
| `testprep.course.completed` | `core_person_id`, `batch_id` | crm, study-abroad |

### Consumed from study-abroad

| Event | Effect |
|---|---|
| `studyabroad.test_target.set` | Create or update `score_target` with `derived_from = 'shortlist'` |

> This last one is the hybrid loop closing. The counsellor shortlists universities, the
> platform derives the score a student needs, and the coaching side receives that target
> and teaches to it. Neither vertical can do this alone. Build it.

---

## Non-functional requirements

### Multi-tenancy
- RLS on every table, with a per-table isolation test.
- No endpoint accepts `tenant_id` from the client; it comes from the session.
- Tenant-configurable: rationale visibility, scoring tables, attendance rules, notification
  defaults, report-card template.

### White-labelling
No brand string anywhere in this context. Logos, colours, sender names, and email
templates resolve from tenant config.

### Accessibility
- `#C05800` on `#FDFBD4` measures 4.29:1 — it **fails WCAG AA for body text**, which
  requires 4.5:1. Use `#8F4200` (6.75:1) for accent text, and reserve `#C05800` for fills,
  borders, and large headings. Split these into `--accent-fill` and `--accent-text` tokens.
- `#173600` on `#FDFBD4` measures 12.7:1 — that is your workhorse for body copy.
- The test engine must be fully keyboard-navigable. Timed tests with mouse-only
  interaction exclude students who need assistive technology.

### Localisation
- All strings via i18n keys; no literals in components.
- RTL layout is first-class — use logical CSS properties (`margin-inline-start`), not
  `margin-left`.
- Hijri calendar display option alongside Gregorian.
- Never render a bare numeric date; use explicit month names in student-facing output.

### Responsive
The prototype is desktop-only — fixed `repeat(4, 1fr)` grids and a 248px sidebar. Add
breakpoints. Test-prep students study on phones; this is not optional beyond v1, and the
test engine in particular needs a deliberate mobile layout rather than a scaled-down one.

### Performance
- Dashboard p95 under 1 second.
- Question bank filter count under 300 ms at 20,000 questions.
- Test engine question transition under 100 ms — any perceptible lag during a timed test
  reads as the product stealing time.

### Testing
- Unit: score conversion, attendance percentage with excused absences, study plan day
  generation across month and year boundaries, pool filtering.
- Integration: full attempt lifecycle including expiry and resume; tenant isolation per
  table; event idempotency.
- Load: fifty concurrent students starting a full-length mock in the same minute — this
  is the real usage pattern and it will find your timer bugs.

---

## Build sequence

Merge each phase before starting the next.

**Foundation** — schema, standard columns, RLS policies, isolation test harness;
`enrolment`; `question_ref` projection and the assessment event consumer.

**Daily loop** — `timetable`; `attendance`; `materials`; `homework` with working filters.

**Practice core** — `question-bank` with pool state and the practice runner; results
screen.

**Test core** — `test-engine` with server-authoritative timing, autosave, and resume;
`scoring` with conversion tables; `review` with the practise-more loop.

**Orientation** — `dashboard` with real empty states; `calendar` rebuilt dynamically;
`study-plan`.

**Communication and output** — `messages`; `report-card`; `profile`.

**Onboarding** — `diagnostic`.

> **Why this order.** The practice and test loop is the product. Everything else is
> scaffolding around it. The prototype currently has the scaffolding and a partially wired
> core, which is why "Start practice" and "Start test" lead nowhere — those dead ends are
> the most important thing to fix, and they come before polish.

---

## Known defects in the existing prototype

Carry these into the work as fixes, not new features:

- Calendar is hardcoded: fixed 30-day loop, static today marker on day 24.
- Calendar legend uses `#C05800` for both Session and Due.
- Homework filter buttons do not filter.
- Sectional filter buttons do not filter.
- "Start practice" in the question bank navigates nowhere.
- "Start test" and "Review" on mocks navigate nowhere.
- AI predicted score is a static 1440.
- Flat 75-second-per-question timer is not exam-accurate, especially for Math.
- No empty states on any screen.
- Fixed-width layout; no responsive breakpoints.
- Counsellor name appears in three forms across screens — pick one canonical form.

---

## Open decisions

Resolve before the Test core phase:

1. **Brand name** — still unresolved. Blocks no code, but decide before any user-facing
   string is written.
2. **Adaptive vs linear** — see the decision under `test-engine`. This one changes the
   data model, so decide it early rather than retrofitting.
3. **Study plan AI vs rules** — freeze conflict. Rules-based satisfies the freeze; AI
   requires a change proposal.
4. **Scope document reconciliation** — the freeze describes a generic school dashboard;
   the build is a Digital SAT portal. Amend the document to match the build, or the
   freeze stops functioning as a control.
5. **Question content volume** — a Digital SAT portal needs several hundred calibrated
   questions per section to be credible. AI generation with human review is the plan, but
   the review throughput is the real constraint and it is a staffing question, not an
   engineering one.
6. **Multi-track timing** — v1 is SAT only, but `track_code` exists throughout. Confirm
   IELTS and GRE are genuinely post-v1 so nobody builds speculative abstraction now.

---

*Spec 1.0 — Test-Prep student portal. All discussed features specified explicitly. No
placeholder or summarised content.*
