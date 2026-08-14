import { useEffect, useMemo, useState } from 'react';
import {
  createAnswerMap,
  flattenQuestions,
  formatClock,
  scoreSession,
  type AnswerMap,
  type TestSession,
} from './engine';
import { CalculatorIcon, CheckIcon, ChevronLeft, ChevronRight, CloseIcon, FlagIcon } from './icons';
import { Pill, Tag } from './ui';
import { cn } from '../lib/cn';

type Phase = 'intro' | 'running' | 'results' | 'review';

const DESMOS_SRC = 'https://www.desmos.com/calculator';

export function TestRunner({ session, onExit }: { session: TestSession; onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [answers, setAnswers] = useState<AnswerMap>(() => createAnswerMap(session));
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(session.totalSeconds);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [reviewModuleKey, setReviewModuleKey] = useState(session.modules[0]?.key ?? '');

  const questions = useMemo(() => flattenQuestions(session), [session]);
  const current = questions[index];
  const result = useMemo(() => scoreSession(session, answers), [session, answers]);

  useEffect(() => {
    if (phase !== 'running' || !session.timed) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          setPhase('results');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, session.timed]);

  function select(choiceId: string) {
    setAnswers((a) => ({ ...a, [current.id]: { ...a[current.id], choiceId } }));
  }

  function toggleFlag() {
    setAnswers((a) => ({
      ...a,
      [current.id]: { ...a[current.id], flagged: !a[current.id]?.flagged },
    }));
  }

  if (phase === 'intro') {
    return (
      <div className="mx-auto max-w-xl animate-fade-up py-10 text-center">
        <p className="uh-eyebrow mb-3">{session.mode} test</p>
        <h1 className="mb-4 uh-heading text-2xl font-semibold tracking-tight">{session.title}</h1>
        <p className="mb-8 text-sm leading-relaxed text-ink-soft">
          {questions.length} questions across {session.modules.length}{' '}
          {session.modules.length === 1 ? 'module' : 'modules'}.{' '}
          {session.timed
            ? 'The timer starts as soon as you begin and runs to the end of the test.'
            : 'This set is untimed — work at your own pace.'}{' '}
          You can flag questions and return to them from the navigator.
        </p>
        <div className="mb-8 grid grid-cols-3 gap-3">
          <IntroStat label="Questions" value={String(questions.length)} />
          <IntroStat label="Modules" value={String(session.modules.length)} />
          <IntroStat
            label="Time"
            value={session.timed ? formatClock(session.totalSeconds) : 'Untimed'}
          />
        </div>
        <div className="flex justify-center gap-3">
          <button type="button" className="uh-btn-ghost" onClick={onExit}>
            Cancel
          </button>
          <button type="button" className="uh-btn-accent" onClick={() => setPhase('running')}>
            Begin test
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'results') {
    return (
      <div className="mx-auto max-w-2xl animate-fade-up py-8">
        <div className="mb-6 rounded-card bg-ink p-8 text-canvas">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] opacity-70">
            {session.title}
          </p>
          <p className="mb-1 font-mono text-5xl leading-none">{result.projectedScore}</p>
          <p className="text-sm opacity-80">Projected score · illustrative only</p>

          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-canvas/20 pt-5">
            <ResultStat label="Correct" value={result.correct + ' / ' + result.total} />
            <ResultStat label="Attempted" value={String(result.attempted)} />
            <ResultStat label="Accuracy" value={result.accuracy + '%'} />
          </div>
        </div>

        <div className="mb-6 space-y-3">
          {result.perSection.map((s) => (
            <div key={s.sectionId} className="uh-card flex items-center justify-between p-4">
              <span className="text-sm text-ink">{s.label}</span>
              <span className="font-mono text-sm text-ink">
                {s.correct} / {s.total}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-between">
          <button type="button" className="uh-btn-ghost" onClick={onExit}>
            Back to tests
          </button>
          <button type="button" className="uh-btn-primary" onClick={() => setPhase('review')}>
            Review answers
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'review') {
    const activeModule =
      session.modules.find((m) => m.key === reviewModuleKey) ?? session.modules[0];
    return (
      <div className="mx-auto max-w-3xl animate-fade-up py-8">
        <header className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight text-ink">Review</h1>
          <button type="button" className="uh-btn-ghost" onClick={onExit}>
            Done
          </button>
        </header>

        <div className="mb-5 flex flex-wrap gap-2">
          {session.modules.map((m) => (
            <Pill
              key={m.key}
              active={m.key === activeModule.key}
              onClick={() => setReviewModuleKey(m.key)}
            >
              {m.label}
            </Pill>
          ))}
        </div>

        <ol className="space-y-4">
          {activeModule.questions.map((q, i) => {
            const given = answers[q.id]?.choiceId;
            const correct = given === q.correctChoiceId;
            return (
              <li key={q.id} className="uh-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-xs text-ink-faint">Question {i + 1}</span>
                  {given === null || given === undefined ? (
                    <Tag tone="neutral">Skipped</Tag>
                  ) : correct ? (
                    <Tag tone="good">Correct</Tag>
                  ) : (
                    <Tag tone="bad">Incorrect</Tag>
                  )}
                </div>
                {q.stimulus && (
                  <p className="mb-3 border-l-2 border-rule pl-3 text-sm leading-relaxed text-ink-soft">
                    {q.stimulus}
                  </p>
                )}
                <p className="mb-3 text-sm text-ink">{q.prompt}</p>
                <ul className="mb-3 space-y-1.5">
                  {q.choices.map((c) => (
                    <li
                      key={c.id}
                      className={cn(
                        'flex items-start gap-2 rounded-lg px-3 py-2 text-sm',
                        c.id === q.correctChoiceId
                          ? 'bg-ink/10 text-ink'
                          : c.id === given
                            ? 'bg-red-50 text-red-900'
                            : 'text-ink-soft',
                      )}
                    >
                      <span className="font-mono text-xs">{c.id}</span>
                      <span>{c.text}</span>
                    </li>
                  ))}
                </ul>
                <p className="border-t border-rule pt-3 text-sm leading-relaxed text-ink-soft">
                  {q.explanation}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  // phase === 'running'
  const answeredCount = questions.filter((q) => answers[q.id]?.choiceId).length;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-3">
        <div>
          <p className="uh-eyebrow">{session.title}</p>
          <p className="text-sm text-ink">
            Question {index + 1} of {questions.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {session.timed && (
            <span
              className={cn(
                'rounded-full px-3 py-1.5 font-mono text-sm',
                secondsLeft < 300 ? 'bg-accent text-white' : 'bg-ink text-canvas',
              )}
            >
              {formatClock(secondsLeft)}
            </span>
          )}
          {current.sectionId === 'math' && (
            <button
              type="button"
              className="uh-btn-ghost"
              onClick={() => setCalculatorOpen((o) => !o)}
              aria-pressed={calculatorOpen}
            >
              <CalculatorIcon width={14} height={14} />
              Calculator
            </button>
          )}
          <button type="button" className="uh-btn-ghost" onClick={onExit} aria-label="Exit test">
            <CloseIcon width={14} height={14} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 p-5 lg:flex-row">
        <main className="flex-1">
          <div className="uh-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <Tag tone="info">{current.difficulty}</Tag>
              <button
                type="button"
                onClick={toggleFlag}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors',
                  answers[current.id]?.flagged
                    ? 'bg-accent text-white'
                    : 'border border-rule text-ink-soft hover:border-ink hover:text-ink',
                )}
              >
                <FlagIcon width={13} height={13} />
                {answers[current.id]?.flagged ? 'Flagged' : 'Flag'}
              </button>
            </div>

            {current.stimulus && (
              <p className="mb-5 border-l-2 border-rule pl-4 text-sm leading-relaxed text-ink-soft">
                {current.stimulus}
              </p>
            )}

            <p className="mb-5 text-base leading-relaxed text-ink">{current.prompt}</p>

            <div className="space-y-2">
              {current.choices.map((c) => {
                const chosen = answers[current.id]?.choiceId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => select(c.id)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                      chosen
                        ? 'border-ink bg-ink text-canvas'
                        : 'border-rule text-ink hover:border-ink',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs',
                        chosen ? 'border-canvas' : 'border-rule',
                      )}
                    >
                      {c.id}
                    </span>
                    <span>{c.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {calculatorOpen && current.sectionId === 'math' && (
            <div className="mt-4 overflow-hidden rounded-card border border-rule">
              <iframe
                title="Desmos graphing calculator"
                src={DESMOS_SRC}
                className="h-96 w-full border-0"
              />
            </div>
          )}

          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              className="uh-btn-ghost"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
            >
              <ChevronLeft width={14} height={14} /> Previous
            </button>
            {index === questions.length - 1 ? (
              <button type="button" className="uh-btn-accent" onClick={() => setPhase('results')}>
                <CheckIcon width={14} height={14} /> Submit test
              </button>
            ) : (
              <button
                type="button"
                className="uh-btn-primary"
                onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
              >
                Next <ChevronRight width={14} height={14} />
              </button>
            )}
          </div>
        </main>

        <aside className="w-full lg:w-64">
          <div className="uh-card p-4">
            <p className="uh-eyebrow mb-1">Navigator</p>
            <p className="mb-4 text-xs text-ink-faint">
              {answeredCount} of {questions.length} answered
            </p>

            <div className="max-h-[28rem] space-y-4 overflow-auto">
              {session.modules.map((m) => {
                const offset = questions.findIndex((q) => q.id === m.questions[0]?.id);
                return (
                  <div key={m.key}>
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                      {m.label}
                    </p>
                    <div className="grid grid-cols-6 gap-1.5">
                      {m.questions.map((q, qi) => {
                        const globalIndex = offset + qi;
                        const state = answers[q.id];
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setIndex(globalIndex)}
                            aria-label={'Go to question ' + (globalIndex + 1)}
                            aria-current={globalIndex === index}
                            className={cn(
                              'aspect-square rounded font-mono text-[10px] transition-colors',
                              globalIndex === index
                                ? 'bg-ink text-canvas'
                                : state?.flagged
                                  ? 'bg-accent/20 text-accent'
                                  : state?.choiceId
                                    ? 'bg-ink/15 text-ink'
                                    : 'border border-rule text-ink-faint hover:border-ink',
                            )}
                          >
                            {globalIndex + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function IntroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="uh-card p-4">
      <p className="uh-eyebrow mb-1.5">{label}</p>
      <p className="font-mono text-lg text-ink">{value}</p>
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] opacity-70">{label}</p>
      <p className="font-mono text-xl">{value}</p>
    </div>
  );
}
