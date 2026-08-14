/**
 * Mock data layer for the Edvexa Student Portal (SAT track).
 * Every export here is a stand-in for a future API response. When the
 * portal is wired to the Edvexa backend, replace the bodies — not the shapes.
 */

export type SectionId = 'rw' | 'math';

export interface Section {
  id: SectionId;
  label: string;
  shortLabel: string;
  /** Digital SAT: 2 modules per section. */
  modules: number;
  /** Questions per module. */
  questionsPerModule: number;
}

export const SECTIONS: Section[] = [
  { id: 'rw', label: 'Reading & Writing', shortLabel: 'R&W', modules: 2, questionsPerModule: 27 },
  { id: 'math', label: 'Math', shortLabel: 'Math', modules: 2, questionsPerModule: 22 },
];

export const SECTION_BY_ID: Record<SectionId, Section> = {
  rw: SECTIONS[0],
  math: SECTIONS[1],
};

/** Digital SAT full-length test = (2 x 27) + (2 x 22) = 98 questions. */
export const FULL_TEST_QUESTION_COUNT = SECTIONS.reduce(
  (total, s) => total + s.modules * s.questionsPerModule,
  0,
);

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Topic {
  id: string;
  sectionId: SectionId;
  label: string;
  /** Mastery as a percentage, 0–100. */
  mastery: number;
}

export const TOPICS: Topic[] = [
  { id: 'rw-info-ideas', sectionId: 'rw', label: 'Information & Ideas', mastery: 72 },
  { id: 'rw-craft-structure', sectionId: 'rw', label: 'Craft & Structure', mastery: 64 },
  { id: 'rw-expression', sectionId: 'rw', label: 'Expression of Ideas', mastery: 81 },
  { id: 'rw-conventions', sectionId: 'rw', label: 'Standard English Conventions', mastery: 58 },
  { id: 'math-algebra', sectionId: 'math', label: 'Algebra', mastery: 77 },
  { id: 'math-advanced', sectionId: 'math', label: 'Advanced Math', mastery: 51 },
  { id: 'math-psada', sectionId: 'math', label: 'Problem-Solving & Data Analysis', mastery: 69 },
  { id: 'math-geo-trig', sectionId: 'math', label: 'Geometry & Trigonometry', mastery: 46 },
];

export interface Choice {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface Question {
  id: string;
  sectionId: SectionId;
  topicId: string;
  difficulty: Difficulty;
  stimulus?: string;
  prompt: string;
  choices: Choice[];
  correctChoiceId: Choice['id'];
  explanation: string;
  /** Whether the student has already seen this question in a past attempt. */
  used: boolean;
}

const RW_STIMULUS =
  'Marine biologists studying kelp forests off the California coast recorded a sharp decline in canopy cover between 2014 and 2019. The team attributed the loss primarily to a marine heatwave that coincided with a collapse in the sunflower sea star population, a key predator of purple sea urchins.';

const RW_STIMULUS_2 =
  'The novelist described her drafting process as deliberately wasteful: she would write three versions of a chapter, discard two, and keep only the sentences that surprised her.';

/** A small, deterministic pool. Real pools come from the AI question-bank pipeline. */
export const QUESTIONS: Question[] = [
  {
    id: 'q-rw-001',
    sectionId: 'rw',
    topicId: 'rw-info-ideas',
    difficulty: 'medium',
    stimulus: RW_STIMULUS,
    prompt: 'Which choice best states the main idea of the text?',
    choices: [
      { id: 'A', text: 'Purple sea urchins are the primary threat to kelp forests worldwide.' },
      {
        id: 'B',
        text: 'Kelp canopy loss followed a heatwave and the decline of a key urchin predator.',
      },
      { id: 'C', text: 'Marine biologists disagree about the causes of kelp forest decline.' },
      { id: 'D', text: 'Sunflower sea stars recovered once canopy cover stabilised.' },
    ],
    correctChoiceId: 'B',
    explanation:
      'The text names two coinciding causes — the marine heatwave and the sea star collapse — as the drivers of canopy loss. Choice B captures both without overstating either.',
    used: false,
  },
  {
    id: 'q-rw-002',
    sectionId: 'rw',
    topicId: 'rw-craft-structure',
    difficulty: 'hard',
    stimulus: RW_STIMULUS_2,
    prompt: 'As used in the text, "wasteful" most nearly means',
    choices: [
      { id: 'A', text: 'careless' },
      { id: 'B', text: 'extravagant' },
      { id: 'C', text: 'generative' },
      { id: 'D', text: 'discarding' },
    ],
    correctChoiceId: 'D',
    explanation:
      'The word is glossed by the sentence that follows: she throws away two of three drafts. "Discarding" matches that behaviour; "careless" adds a negative judgement the text does not support.',
    used: true,
  },
  {
    id: 'q-rw-003',
    sectionId: 'rw',
    topicId: 'rw-conventions',
    difficulty: 'easy',
    prompt:
      'Which choice completes the text so that it conforms to the conventions of Standard English? The committee released its findings, ______ were widely reported.',
    choices: [
      { id: 'A', text: 'which' },
      { id: 'B', text: 'that' },
      { id: 'C', text: 'they' },
      { id: 'D', text: 'and' },
    ],
    correctChoiceId: 'A',
    explanation:
      'A non-restrictive clause following a comma requires "which". "That" cannot follow a comma in this construction, and "they" would create a comma splice.',
    used: false,
  },
  {
    id: 'q-rw-004',
    sectionId: 'rw',
    topicId: 'rw-expression',
    difficulty: 'medium',
    prompt:
      'The student wants to emphasise the scale of the survey. Which choice best accomplishes this goal?',
    choices: [
      { id: 'A', text: 'The survey was conducted over several months.' },
      { id: 'B', text: 'The survey reached 42,000 households across nine provinces.' },
      { id: 'C', text: 'The survey used a standard questionnaire.' },
      { id: 'D', text: 'The survey was carefully designed by researchers.' },
    ],
    correctChoiceId: 'B',
    explanation:
      'Only choice B supplies magnitude — a count of households and a geographic spread. The others describe duration, method, and design.',
    used: false,
  },
  {
    id: 'q-math-001',
    sectionId: 'math',
    topicId: 'math-algebra',
    difficulty: 'easy',
    prompt: 'If 3x + 7 = 22, what is the value of 6x + 5?',
    choices: [
      { id: 'A', text: '15' },
      { id: 'B', text: '25' },
      { id: 'C', text: '35' },
      { id: 'D', text: '40' },
    ],
    correctChoiceId: 'C',
    explanation: 'From 3x + 7 = 22, 3x = 15 so x = 5. Then 6x + 5 = 30 + 5 = 35.',
    used: false,
  },
  {
    id: 'q-math-002',
    sectionId: 'math',
    topicId: 'math-advanced',
    difficulty: 'hard',
    prompt:
      'The function f is defined by f(x) = 2x² − 8x + 5. What is the x-coordinate of the vertex of the graph of f?',
    choices: [
      { id: 'A', text: '−2' },
      { id: 'B', text: '1' },
      { id: 'C', text: '2' },
      { id: 'D', text: '4' },
    ],
    correctChoiceId: 'C',
    explanation:
      'The vertex sits at x = −b / 2a. With a = 2 and b = −8, x = 8 / 4 = 2.',
    used: true,
  },
  {
    id: 'q-math-003',
    sectionId: 'math',
    topicId: 'math-psada',
    difficulty: 'medium',
    prompt:
      'A shop sold 240 items in March and 300 in April. What was the percent increase from March to April?',
    choices: [
      { id: 'A', text: '20%' },
      { id: 'B', text: '25%' },
      { id: 'C', text: '30%' },
      { id: 'D', text: '60%' },
    ],
    correctChoiceId: 'B',
    explanation: 'The increase is 60 items on a base of 240. 60 / 240 = 0.25, so 25%.',
    used: false,
  },
  {
    id: 'q-math-004',
    sectionId: 'math',
    topicId: 'math-geo-trig',
    difficulty: 'medium',
    prompt:
      'In right triangle ABC, angle B measures 90°. If AB = 6 and BC = 8, what is the length of AC?',
    choices: [
      { id: 'A', text: '10' },
      { id: 'B', text: '12' },
      { id: 'C', text: '14' },
      { id: 'D', text: '48' },
    ],
    correctChoiceId: 'A',
    explanation: 'By the Pythagorean theorem, AC² = 6² + 8² = 36 + 64 = 100, so AC = 10.',
    used: false,
  },
];

export type HomeworkStatus = 'pending' | 'submitted' | 'graded' | 'overdue';

export interface HomeworkItem {
  id: string;
  title: string;
  sectionId: SectionId;
  assignedBy: string;
  dueDate: string; // ISO date
  status: HomeworkStatus;
  questionCount: number;
  scorePercent?: number;
}

export const HOMEWORK: HomeworkItem[] = [
  {
    id: 'hw-001',
    title: 'Linear equations drill set',
    sectionId: 'math',
    assignedBy: 'Ms. Aparna Rao',
    dueDate: '2026-08-12',
    status: 'pending',
    questionCount: 20,
  },
  {
    id: 'hw-002',
    title: 'Inference questions — paired passages',
    sectionId: 'rw',
    assignedBy: 'Mr. Daniel Okoro',
    dueDate: '2026-08-09',
    status: 'overdue',
    questionCount: 15,
  },
  {
    id: 'hw-003',
    title: 'Punctuation and boundaries',
    sectionId: 'rw',
    assignedBy: 'Mr. Daniel Okoro',
    dueDate: '2026-08-06',
    status: 'graded',
    questionCount: 18,
    scorePercent: 83,
  },
  {
    id: 'hw-004',
    title: 'Circles and arc length',
    sectionId: 'math',
    assignedBy: 'Ms. Aparna Rao',
    dueDate: '2026-08-14',
    status: 'submitted',
    questionCount: 12,
  },
  {
    id: 'hw-005',
    title: 'Data interpretation — tables and graphs',
    sectionId: 'math',
    assignedBy: 'Ms. Aparna Rao',
    dueDate: '2026-08-18',
    status: 'pending',
    questionCount: 16,
  },
];

export interface CalendarEvent {
  id: string;
  date: string; // ISO date
  title: string;
  kind: 'class' | 'test' | 'deadline';
}

export const CALENDAR_EVENTS: CalendarEvent[] = [
  { id: 'ev-1', date: '2026-08-11', title: 'Math module 2 class', kind: 'class' },
  { id: 'ev-2', date: '2026-08-12', title: 'Linear equations due', kind: 'deadline' },
  { id: 'ev-3', date: '2026-08-15', title: 'Full-length practice test 4', kind: 'test' },
  { id: 'ev-4', date: '2026-08-19', title: 'R&W sectional', kind: 'test' },
  { id: 'ev-5', date: '2026-08-22', title: 'Grammar workshop', kind: 'class' },
  { id: 'ev-6', date: '2026-08-27', title: 'Diagnostic review session', kind: 'class' },
];

export interface TestAttempt {
  id: string;
  label: string;
  date: string;
  scaledScore: number;
  rwScore: number;
  mathScore: number;
}

export const PAST_ATTEMPTS: TestAttempt[] = [
  { id: 'at-1', label: 'Diagnostic', date: '2026-06-14', scaledScore: 1120, rwScore: 570, mathScore: 550 },
  { id: 'at-2', label: 'Practice test 1', date: '2026-07-02', scaledScore: 1200, rwScore: 600, mathScore: 600 },
  { id: 'at-3', label: 'Practice test 2', date: '2026-07-19', scaledScore: 1260, rwScore: 630, mathScore: 630 },
  { id: 'at-4', label: 'Practice test 3', date: '2026-08-02', scaledScore: 1310, rwScore: 650, mathScore: 660 },
];

export interface Message {
  id: string;
  from: string;
  role: string;
  preview: string;
  time: string;
  unread: boolean;
}

export const MESSAGES: Message[] = [
  {
    id: 'm-1',
    from: 'Aparna Rao',
    role: 'Math trainer',
    preview: 'Your last sectional showed real movement on Advanced Math. Keep the same pace this week.',
    time: '2h ago',
    unread: true,
  },
  {
    id: 'm-2',
    from: 'Daniel Okoro',
    role: 'R&W trainer',
    preview: 'I have re-opened the inference set until Wednesday. Submit before then.',
    time: 'Yesterday',
    unread: true,
  },
  {
    id: 'm-3',
    from: 'Priya Menon',
    role: 'Counsellor',
    preview: 'Shortlist call moved to Thursday 4pm. Bring your target university list.',
    time: '3 days ago',
    unread: false,
  },
  {
    id: 'm-4',
    from: 'Edvexa Admin',
    role: 'Administration',
    preview: 'August fee receipt is available in your documents.',
    time: '5 days ago',
    unread: false,
  },
];

export const STUDENT = {
  name: 'Karthik Menon',
  initials: 'KM',
  batch: 'SAT Aug 2026 — Evening',
  targetScore: 1500,
  currentScore: 1310,
  examDate: '2026-10-03',
};
