import {
  QUESTIONS,
  SECTIONS,
  SECTION_BY_ID,
  type Question,
  type SectionId,
} from './data';

export type TestMode = 'full' | 'sectional' | 'bank';
export type PoolFilter = 'unused' | 'used' | 'both';

/** Seconds allotted per question in timed practice mode. */
export const SECONDS_PER_QUESTION = 75;

export interface ModuleSpec {
  key: string;
  sectionId: SectionId;
  /** 1-based module number within its section. */
  moduleNumber: number;
  label: string;
  questions: Question[];
}

export interface TestSession {
  mode: TestMode;
  title: string;
  modules: ModuleSpec[];
  timed: boolean;
  totalSeconds: number;
}

export interface AnswerMap {
  [questionId: string]: {
    choiceId: string | null;
    flagged: boolean;
  };
}

/**
 * Repeat a pool until it reaches the requested length. The mock bank is small,
 * so cycling keeps question counts faithful to the real Digital SAT shape
 * without inventing content that would not survive review.
 */
function fill(pool: Question[], count: number, keyPrefix: string): Question[] {
  if (pool.length === 0) return [];
  const out: Question[] = [];
  for (let i = 0; i < count; i += 1) {
    const source = pool[i % pool.length];
    out.push({ ...source, id: keyPrefix + '-' + (i + 1) + '-' + source.id });
  }
  return out;
}

function poolFor(sectionId: SectionId, filter: PoolFilter = 'both'): Question[] {
  return QUESTIONS.filter((q) => {
    if (q.sectionId !== sectionId) return false;
    if (filter === 'unused') return !q.used;
    if (filter === 'used') return q.used;
    return true;
  });
}

/** Full-length Digital SAT: R&W modules 1–2, then Math modules 1–2. */
export function buildFullTest(): TestSession {
  const modules: ModuleSpec[] = [];
  for (const section of SECTIONS) {
    for (let m = 1; m <= section.modules; m += 1) {
      const key = section.id + '-m' + m;
      modules.push({
        key,
        sectionId: section.id,
        moduleNumber: m,
        label: section.shortLabel + ' — Module ' + m,
        questions: fill(poolFor(section.id), section.questionsPerModule, key),
      });
    }
  }
  return {
    mode: 'full',
    title: 'Full-length practice test',
    modules,
    timed: true,
    totalSeconds: modules.reduce((t, m) => t + m.questions.length, 0) * SECONDS_PER_QUESTION,
  };
}

/** Sectional: one section only, both of its modules, pure to that section. */
export function buildSectional(sectionId: SectionId): TestSession {
  const section = SECTION_BY_ID[sectionId];
  const modules: ModuleSpec[] = [];
  for (let m = 1; m <= section.modules; m += 1) {
    const key = section.id + '-sec-m' + m;
    modules.push({
      key,
      sectionId,
      moduleNumber: m,
      label: section.shortLabel + ' — Module ' + m,
      questions: fill(poolFor(sectionId), section.questionsPerModule, key),
    });
  }
  return {
    mode: 'sectional',
    title: section.label + ' sectional',
    modules,
    timed: true,
    totalSeconds: modules.reduce((t, m) => t + m.questions.length, 0) * SECONDS_PER_QUESTION,
  };
}

/** Question bank: a custom-length practice set drawn from chosen sections. */
export function buildBankSet(
  sectionIds: SectionId[],
  count: number,
  filter: PoolFilter,
  timed: boolean,
): TestSession {
  const pool = sectionIds.flatMap((id) => poolFor(id, filter));
  const key = 'bank';
  const questions = fill(pool, count, key);
  return {
    mode: 'bank',
    title: 'Question bank practice',
    modules: [{ key, sectionId: sectionIds[0] ?? 'rw', moduleNumber: 1, label: 'Practice set', questions }],
    timed,
    totalSeconds: questions.length * SECONDS_PER_QUESTION,
  };
}

export function flattenQuestions(session: TestSession): Question[] {
  return session.modules.flatMap((m) => m.questions);
}

export function createAnswerMap(session: TestSession): AnswerMap {
  const map: AnswerMap = {};
  for (const q of flattenQuestions(session)) {
    map[q.id] = { choiceId: null, flagged: false };
  }
  return map;
}

export interface SessionResult {
  total: number;
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  perSection: Array<{ sectionId: SectionId; label: string; correct: number; total: number }>;
  /** Rough 400–1600 projection; illustrative only, not a College Board scale. */
  projectedScore: number;
}

export function scoreSession(session: TestSession, answers: AnswerMap): SessionResult {
  const questions = flattenQuestions(session);
  let correct = 0;
  let attempted = 0;
  const bySection = new Map<SectionId, { correct: number; total: number }>();

  for (const q of questions) {
    const entry = bySection.get(q.sectionId) ?? { correct: 0, total: 0 };
    entry.total += 1;
    const answer = answers[q.id];
    if (answer?.choiceId) {
      attempted += 1;
      if (answer.choiceId === q.correctChoiceId) {
        correct += 1;
        entry.correct += 1;
      }
    }
    bySection.set(q.sectionId, entry);
  }

  const total = questions.length;
  const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);

  return {
    total,
    attempted,
    correct,
    incorrect: attempted - correct,
    accuracy,
    perSection: [...bySection.entries()].map(([sectionId, v]) => ({
      sectionId,
      label: SECTION_BY_ID[sectionId].label,
      correct: v.correct,
      total: v.total,
    })),
    projectedScore: Math.round((400 + (accuracy / 100) * 1200) / 10) * 10,
  };
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
