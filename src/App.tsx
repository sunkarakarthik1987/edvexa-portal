import { useState } from 'react';
import type { TestSession } from './portal/engine';
import { TestRunner } from './portal/TestRunner';
import { STUDENT } from './portal/data';
import {
  BankIcon,
  DashboardIcon,
  HomeworkIcon,
  MessagesIcon,
  PlanIcon,
  ResultsIcon,
  TestIcon,
} from './portal/icons';
import {
  DashboardScreen,
  HomeworkScreen,
  MessagesScreen,
  QuestionBankScreen,
  ResultsScreen,
  StudyPlanScreen,
  TestsScreen,
} from './portal/screens';
import { Avatar } from './portal/ui';
import { cn } from './lib/cn';

type ScreenKey =
  | 'dashboard'
  | 'plan'
  | 'homework'
  | 'tests'
  | 'bank'
  | 'results'
  | 'messages';

const NAV: Array<{ key: ScreenKey; label: string; Icon: typeof DashboardIcon }> = [
  { key: 'dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { key: 'plan', label: 'Study plan', Icon: PlanIcon },
  { key: 'homework', label: 'Homework', Icon: HomeworkIcon },
  { key: 'tests', label: 'Tests', Icon: TestIcon },
  { key: 'bank', label: 'Question bank', Icon: BankIcon },
  { key: 'results', label: 'Results', Icon: ResultsIcon },
  { key: 'messages', label: 'Messages', Icon: MessagesIcon },
];

export default function App() {
  const [screen, setScreen] = useState<ScreenKey>('dashboard');
  const [session, setSession] = useState<TestSession | null>(null);

  if (session) {
    return <TestRunner session={session} onExit={() => setSession(null)} />;
  }

  return (
    <div className="flex min-h-screen">
      <nav className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-ink/10 bg-surface/30 px-3 py-5 backdrop-blur-xl md:flex">
        <div className="mb-8 px-2">
          <p className="uh-heading font-mono text-sm uppercase tracking-[0.18em]">Edvexa</p>
          <p className="mt-0.5 text-[11px] text-ink-faint">Student portal</p>
        </div>

        <ul className="flex-1 space-y-1">
          {NAV.map(({ key, label, Icon }) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => setScreen(key)}
                aria-current={screen === key ? 'page' : undefined}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-300',
                  screen === key
                    ? 'bg-ink text-canvas shadow-glow'
                    : 'text-ink-soft hover:bg-white/5 hover:text-ink',
                )}
              >
                <Icon />
                {label}
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2.5 border-t border-ink/10 px-2 pt-4">
          <Avatar name={STUDENT.name} size={32} />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-ink">{STUDENT.name}</p>
            <p className="truncate text-[10px] text-ink-faint">{STUDENT.batch}</p>
          </div>
        </div>
      </nav>

      {/* Mobile nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 flex overflow-x-auto border-t border-ink/10 bg-surface/70 px-2 py-2 backdrop-blur-xl md:hidden">
        {NAV.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setScreen(key)}
            aria-current={screen === key ? 'page' : undefined}
            className={cn(
              'flex min-w-16 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[9px] transition-colors duration-300',
              screen === key ? 'text-ink' : 'text-ink-faint',
            )}
          >
            <Icon width={18} height={18} />
            {label}
          </button>
        ))}
      </nav>

      <main className="flex-1 px-5 pb-24 pt-6 md:px-8 md:pb-8">
        {screen === 'dashboard' && <DashboardScreen />}
        {screen === 'plan' && <StudyPlanScreen />}
        {screen === 'homework' && <HomeworkScreen />}
        {screen === 'tests' && <TestsScreen onStart={setSession} />}
        {screen === 'bank' && <QuestionBankScreen onStart={setSession} />}
        {screen === 'results' && <ResultsScreen />}
        {screen === 'messages' && <MessagesScreen />}
      </main>
    </div>
  );
}
