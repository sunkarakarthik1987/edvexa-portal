import { useMemo, useState } from 'react';
import {
  FULL_TEST_QUESTION_COUNT,
  HOMEWORK,
  MESSAGES,
  PAST_ATTEMPTS,
  SECTIONS,
  STUDENT,
  TOPICS,
  type HomeworkStatus,
  type SectionId,
} from './data';
import { buildBankSet, buildFullTest, buildSectional, type PoolFilter, type TestSession } from './engine';
import { Calendar } from './Calendar';
import { StudyPlanWizard } from './StudyPlanWizards';
import { Avatar, Card, CardHeader, EmptyState, Pill, Progress, Stat, Tag } from './ui';

const STATUS_TONE: Record<HomeworkStatus, 'neutral' | 'good' | 'warn' | 'bad' | 'info'> = {
  pending: 'warn',
  submitted: 'info',
  graded: 'good',
  overdue: 'bad',
};

/* ---------------------------------------------------------------- Dashboard */

export function DashboardScreen() {
  const pending = HOMEWORK.filter((h) => h.status === 'pending' || h.status === 'overdue').length;
  const daysToExam = Math.max(
    0,
    Math.ceil((new Date(STUDENT.examDate).getTime() - Date.now()) / 86_400_000),
  );

  return (
    <div className="space-y-5">
      <div>
        <p className="uh-eyebrow mb-1">{STUDENT.batch}</p>
        <h1 className="uh-heading text-2xl font-semibold tracking-tight">
          Good to see you, {STUDENT.name.split(' ')[0]}.
        </h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Latest score" value={STUDENT.currentScore} hint="Practice test 3" />
        <Stat label="Target" value={STUDENT.targetScore} hint={STUDENT.targetScore - STUDENT.currentScore + ' points to go'} />
        <Stat label="Days to exam" value={daysToExam} hint={STUDENT.examDate} />
        <Stat label="Homework due" value={pending} hint="Pending or overdue" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader eyebrow="By topic" title="Where you stand" />
          <div className="grid gap-4 sm:grid-cols-2">
            {TOPICS.map((t) => (
              <Progress key={t.id} label={t.label} value={t.mastery} />
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="This month" title="Schedule" />
          <Calendar />
        </Card>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Study plan */

export function StudyPlanScreen() {
  return (
    <div className="space-y-5">
      <div>
        <p className="uh-eyebrow mb-1">Study plan</p>
        <h1 className="uh-heading text-2xl font-semibold tracking-tight">Build your plan</h1>
      </div>
      <Card>
        <StudyPlanWizard />
      </Card>
    </div>
  );
}

/* ----------------------------------------------------------------- Homework */

export function HomeworkScreen() {
  const [filter, setFilter] = useState<'all' | HomeworkStatus>('all');
  const filtered = useMemo(
    () => (filter === 'all' ? HOMEWORK : HOMEWORK.filter((h) => h.status === filter)),
    [filter],
  );

  return (
    <div className="space-y-5">
      <div>
        <p className="uh-eyebrow mb-1">Assignments</p>
        <h1 className="uh-heading text-2xl font-semibold tracking-tight">Homework</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'submitted', 'graded', 'overdue'] as const).map((f) => (
          <Pill key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f}
          </Pill>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nothing here" hint="No assignments match this filter." />
      ) : (
        <ul className="space-y-3">
          {filtered.map((h) => (
            <li key={h.id} className="uh-card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium text-ink">{h.title}</p>
                <p className="mt-1 text-xs text-ink-faint">
                  {h.assignedBy} · {h.questionCount} questions · due {h.dueDate}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {h.scorePercent !== undefined && (
                  <span className="font-mono text-sm text-ink">{h.scorePercent}%</span>
                )}
                <Tag tone={STATUS_TONE[h.status]}>{h.status}</Tag>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- Tests */

export function TestsScreen({ onStart }: { onStart: (s: TestSession) => void }) {
  const [sectionFilter, setSectionFilter] = useState<SectionId | 'all'>('all');
  const visibleSections = SECTIONS.filter((s) => sectionFilter === 'all' || s.id === sectionFilter);

  return (
    <div className="space-y-5">
      <div>
        <p className="uh-eyebrow mb-1">Practice</p>
        <h1 className="uh-heading text-2xl font-semibold tracking-tight">Tests</h1>
      </div>

      <Card>
        <CardHeader eyebrow="Full length" title="Digital SAT practice test" />
        <p className="mb-4 text-sm leading-relaxed text-ink-soft">
          Two Reading &amp; Writing modules of {SECTIONS[0].questionsPerModule} questions, then two
          Math modules of {SECTIONS[1].questionsPerModule}. {FULL_TEST_QUESTION_COUNT} questions in
          total, timed end to end.
        </p>
        <button type="button" className="uh-btn-accent" onClick={() => onStart(buildFullTest())}>
          Start full test
        </button>
      </Card>

      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="uh-eyebrow mr-1">Sectionals</span>
          <Pill active={sectionFilter === 'all'} onClick={() => setSectionFilter('all')}>
            All
          </Pill>
          {SECTIONS.map((s) => (
            <Pill
              key={s.id}
              active={sectionFilter === s.id}
              onClick={() => setSectionFilter(s.id)}
            >
              {s.shortLabel}
            </Pill>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {visibleSections.map((s) => (
            <div key={s.id} className="uh-card p-5">
              <p className="uh-eyebrow mb-1">{s.shortLabel}</p>
              <h3 className="mb-2 font-medium text-ink">{s.label} sectional</h3>
              <p className="mb-4 text-xs text-ink-faint">
                {s.modules} modules · {s.modules * s.questionsPerModule} questions
              </p>
              <button
                type="button"
                className="uh-btn-primary"
                onClick={() => onStart(buildSectional(s.id))}
              >
                Start sectional
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Question bank */

export function QuestionBankScreen({ onStart }: { onStart: (s: TestSession) => void }) {
  const [selected, setSelected] = useState<SectionId[]>(['rw', 'math']);
  const [count, setCount] = useState(20);
  const [pool, setPool] = useState<PoolFilter>('unused');
  const [timed, setTimed] = useState(true);

  function toggleSection(id: SectionId) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="uh-eyebrow mb-1">Custom practice</p>
        <h1 className="uh-heading text-2xl font-semibold tracking-tight">Question bank</h1>
      </div>

      <Card>
        <CardHeader eyebrow="Step 1" title="Choose sections" />
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <Pill key={s.id} active={selected.includes(s.id)} onClick={() => toggleSection(s.id)}>
              {s.label}
            </Pill>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader eyebrow="Step 2" title="Pool" />
        <div className="flex flex-wrap gap-2">
          {(['unused', 'used', 'both'] as const).map((p) => (
            <Pill key={p} active={pool === p} onClick={() => setPool(p)}>
              {p}
            </Pill>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader eyebrow="Step 3" title="Length and timing" />
        <label className="mb-4 block">
          <span className="mb-2 block text-sm text-ink-soft">
            Questions: <span className="font-mono text-ink">{count}</span>
          </span>
          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full accent-[#173600]"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Pill active={timed} onClick={() => setTimed(true)}>
            Timed
          </Pill>
          <Pill active={!timed} onClick={() => setTimed(false)}>
            Untimed
          </Pill>
        </div>
      </Card>

      <button
        type="button"
        className="uh-btn-accent"
        disabled={selected.length === 0}
        onClick={() => onStart(buildBankSet(selected, count, pool, timed))}
      >
        Start practice set
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ Results */

export function ResultsScreen() {
  const best = Math.max(...PAST_ATTEMPTS.map((a) => a.scaledScore));

  return (
    <div className="space-y-5">
      <div>
        <p className="uh-eyebrow mb-1">Progress</p>
        <h1 className="uh-heading text-2xl font-semibold tracking-tight">Results</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Best score" value={best} />
        <Stat label="Attempts" value={PAST_ATTEMPTS.length} />
        <Stat
          label="Gain"
          value={'+' + (best - PAST_ATTEMPTS[0].scaledScore)}
          hint="Since diagnostic"
        />
      </div>

      <Card>
        <CardHeader eyebrow="History" title="Every attempt" />
        <div className="overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-rule">
                <th className="py-2 text-left font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                  Test
                </th>
                <th className="py-2 text-left font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                  Date
                </th>
                <th className="py-2 text-right font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                  R&amp;W
                </th>
                <th className="py-2 text-right font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                  Math
                </th>
                <th className="py-2 text-right font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {PAST_ATTEMPTS.map((a) => (
                <tr key={a.id} className="border-b border-rule/60">
                  <td className="py-2.5 text-ink">{a.label}</td>
                  <td className="py-2.5 font-mono text-xs text-ink-faint">{a.date}</td>
                  <td className="py-2.5 text-right font-mono text-ink-soft">{a.rwScore}</td>
                  <td className="py-2.5 text-right font-mono text-ink-soft">{a.mathScore}</td>
                  <td className="py-2.5 text-right font-mono text-ink">{a.scaledScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ----------------------------------------------------------------- Messages */

export function MessagesScreen() {
  const [activeId, setActiveId] = useState(MESSAGES[0].id);
  const active = MESSAGES.find((m) => m.id === activeId)!;

  return (
    <div className="space-y-5">
      <div>
        <p className="uh-eyebrow mb-1">Inbox</p>
        <h1 className="uh-heading text-2xl font-semibold tracking-tight">Messages</h1>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <ul className="space-y-2 lg:col-span-1">
          {MESSAGES.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setActiveId(m.id)}
                className={
                  'flex w-full items-start gap-3 rounded-card border p-3 text-left transition-colors ' +
                  (m.id === activeId
                    ? 'border-ink bg-ink/5'
                    : 'border-rule bg-surface hover:border-ink')
                }
              >
                <Avatar name={m.from} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-ink">{m.from}</span>
                    <span className="shrink-0 font-mono text-[10px] text-ink-faint">{m.time}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-ink-faint">{m.preview}</span>
                </span>
                {m.unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />}
              </button>
            </li>
          ))}
        </ul>

        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center gap-3 border-b border-rule pb-4">
            <Avatar name={active.from} size={44} />
            <div>
              <p className="font-medium text-ink">{active.from}</p>
              <p className="text-xs text-ink-faint">{active.role}</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-ink-soft">{active.preview}</p>
        </Card>
      </div>
    </div>
  );
}
