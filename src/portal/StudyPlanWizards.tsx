import { useMemo, useState } from 'react';
import { SECTIONS, STUDENT, TOPICS } from './data';
import { Pill } from './ui';
import { ChevronLeft, ChevronRight } from './icons';
import { cn } from '../lib/cn';

const REST_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOUR_OPTIONS = [1, 2, 3, 4];

interface PlanConfig {
  examDate: string;
  dailyHours: number;
  restDay: string;
  focusArea: string;
}

interface PlanRow {
  date: string;
  weekday: string;
  focus: string;
  hours: number;
  activity: string;
}

const STEPS = [
  { key: 'exam', label: 'Exam date' },
  { key: 'hours', label: 'Daily hours' },
  { key: 'rest', label: 'Rest day' },
  { key: 'focus', label: 'Focus area' },
  { key: 'generate', label: 'Generate' },
] as const;

const ACTIVITIES = [
  'Concept review',
  'Timed drill set',
  'Mixed practice',
  'Error log review',
  'Sectional practice',
];

function buildPlan(config: PlanConfig): PlanRow[] {
  const start = new Date();
  const end = new Date(config.examDate);
  if (Number.isNaN(end.getTime()) || end <= start) return [];

  const rows: PlanRow[] = [];
  const cursor = new Date(start);
  let i = 0;

  // Cap the table so a distant exam date does not produce an unreadable wall.
  const maxRows = 60;

  while (cursor <= end && rows.length < maxRows) {
    const weekday = cursor.toLocaleDateString('en-GB', { weekday: 'long' });
    if (weekday !== config.restDay) {
      const focusTopic =
        config.focusArea === 'balanced'
          ? TOPICS[i % TOPICS.length].label
          : (TOPICS.filter((t) => t.sectionId === config.focusArea)[
              i % TOPICS.filter((t) => t.sectionId === config.focusArea).length
            ]?.label ?? 'Mixed review');

      rows.push({
        date: cursor.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        weekday: weekday.slice(0, 3),
        focus: focusTopic,
        hours: config.dailyHours,
        activity: ACTIVITIES[i % ACTIVITIES.length],
      });
      i += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return rows;
}

export function StudyPlanWizard() {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<PlanConfig>({
    examDate: STUDENT.examDate,
    dailyHours: 2,
    restDay: 'Sunday',
    focusArea: 'balanced',
  });
  const [generated, setGenerated] = useState(false);

  const plan = useMemo(() => (generated ? buildPlan(config) : []), [generated, config]);

  const canAdvance = step < STEPS.length - 1;
  const totalHours = plan.reduce((t, r) => t + r.hours, 0);

  if (generated) {
    return (
      <div className="animate-fade-up">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="uh-eyebrow mb-1">Your plan</p>
            <p className="text-sm text-ink-soft">
              {plan.length} study days · {totalHours} hours · rest on {config.restDay}s
            </p>
          </div>
          <button
            type="button"
            className="uh-btn-ghost"
            onClick={() => {
              setGenerated(false);
              setStep(0);
            }}
          >
            Start over
          </button>
        </div>

        <div className="max-h-96 overflow-auto rounded-card border border-rule">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-ink text-canvas">
              <tr>
                <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.08em]">
                  Date
                </th>
                <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.08em]">
                  Day
                </th>
                <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.08em]">
                  Focus
                </th>
                <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.08em]">
                  Activity
                </th>
                <th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-[0.08em]">
                  Hrs
                </th>
              </tr>
            </thead>
            <tbody>
              {plan.map((row, idx) => (
                <tr key={row.date + idx} className="border-t border-rule bg-surface">
                  <td className="px-3 py-2 font-mono text-xs text-ink">{row.date}</td>
                  <td className="px-3 py-2 text-ink-faint">{row.weekday}</td>
                  <td className="px-3 py-2 text-ink">{row.focus}</td>
                  <td className="px-3 py-2 text-ink-soft">{row.activity}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-ink">{row.hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ol className="mb-6 flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li key={s.key}>
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.08em]',
                i === step
                  ? 'bg-ink text-canvas'
                  : i < step
                    ? 'bg-ink/10 text-ink'
                    : 'border border-rule text-ink-faint',
              )}
            >
              {i + 1}. {s.label}
            </span>
          </li>
        ))}
      </ol>

      <div className="min-h-32">
        {step === 0 && (
          <label className="block">
            <span className="mb-2 block text-sm text-ink-soft">When is your exam?</span>
            <input
              type="date"
              value={config.examDate}
              onChange={(e) => setConfig({ ...config, examDate: e.target.value })}
              className="rounded-lg border border-rule bg-surface px-3 py-2 font-mono text-sm text-ink"
            />
          </label>
        )}

        {step === 1 && (
          <div>
            <p className="mb-2 text-sm text-ink-soft">How many hours can you study each day?</p>
            <div className="flex flex-wrap gap-2">
              {HOUR_OPTIONS.map((h) => (
                <Pill
                  key={h}
                  active={config.dailyHours === h}
                  onClick={() => setConfig({ ...config, dailyHours: h })}
                >
                  {h} {h === 1 ? 'hour' : 'hours'}
                </Pill>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="mb-2 text-sm text-ink-soft">Pick a rest day.</p>
            <div className="flex flex-wrap gap-2">
              {REST_DAYS.map((d) => (
                <Pill
                  key={d}
                  active={config.restDay === d}
                  onClick={() => setConfig({ ...config, restDay: d })}
                >
                  {d.slice(0, 3)}
                </Pill>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="mb-2 text-sm text-ink-soft">What should the plan weight towards?</p>
            <div className="flex flex-wrap gap-2">
              <Pill
                active={config.focusArea === 'balanced'}
                onClick={() => setConfig({ ...config, focusArea: 'balanced' })}
              >
                Balanced
              </Pill>
              {SECTIONS.map((s) => (
                <Pill
                  key={s.id}
                  active={config.focusArea === s.id}
                  onClick={() => setConfig({ ...config, focusArea: s.id })}
                >
                  {s.label}
                </Pill>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <dl className="space-y-2 text-sm">
            <Summary label="Exam date" value={config.examDate} />
            <Summary label="Daily hours" value={String(config.dailyHours)} />
            <Summary label="Rest day" value={config.restDay} />
            <Summary
              label="Focus"
              value={
                config.focusArea === 'balanced'
                  ? 'Balanced'
                  : SECTIONS.find((s) => s.id === config.focusArea)?.label ?? 'Balanced'
              }
            />
          </dl>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-rule pt-4">
        <button
          type="button"
          className="uh-btn-ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <ChevronLeft width={14} height={14} /> Back
        </button>
        {canAdvance ? (
          <button type="button" className="uh-btn-primary" onClick={() => setStep((s) => s + 1)}>
            Next <ChevronRight width={14} height={14} />
          </button>
        ) : (
          <button type="button" className="uh-btn-accent" onClick={() => setGenerated(true)}>
            Generate plan
          </button>
        )}
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-rule pb-2">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="font-mono text-ink">{value}</dd>
    </div>
  );
}
