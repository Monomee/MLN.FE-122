import type { Exam, PracticeMode, PracticeSession, Progress, Question, ReviewItem, Settings } from './models';

export function grade(question: Question, selected: string[]): boolean {
  return selected.length > 0 && new Set(selected).size === selected.length &&
    selected.length === question.correctAnswers.length && selected.every(key =>
      question.options.some(option => option.key === key) && question.correctAnswers.includes(key));
}

export function shuffle<T>(items: readonly T[], seed: string): T[] {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) state = Math.imul(state ^ seed.charCodeAt(i), 16777619);
  const random = () => {
    state += 0x6D2B79F5;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function examResult(questions: Question[], selections: Record<string, string[]>) {
  let correct = 0, blank = 0;
  for (const q of questions) {
    const selected = selections[q.id] ?? [];
    if (!selected.length) blank++;
    else if (grade(q, selected)) correct++;
  }
  const total = questions.length;
  return { correct, wrong: total - correct - blank, blank, total, accuracy: total ? correct / total * 100 : 0, score: total ? correct / total * 10 : 0 };
}
export const isExpired = (exam: Pick<Exam, 'deadline' | 'submittedAt'>, now = Date.now()) => exam.submittedAt === null && now >= exam.deadline;

export function scheduleReview(queue: ReviewItem[], questionId: string, step: number, gap: number): ReviewItem[] {
  const previous = queue.find(item => item.questionId === questionId);
  return [...queue.filter(item => item.questionId !== questionId), { questionId, dueStep: step + gap, attempts: (previous?.attempts ?? 0) + 1 }]
    .sort((a, b) => a.dueStep - b.dueStep);
}
export const dueReviews = (queue: ReviewItem[], step: number) => queue.filter(item => item.dueStep <= step);

export function updateProgress(previous: Progress | undefined, question: Question, correct: boolean, now: number, intervals: number[]): Progress {
  const level = correct ? Math.min((previous?.level ?? 0) + 1, intervals.length) : 0;
  return {
    questionId: question.id, subjectId: question.subjectId, starred: previous?.starred ?? false,
    correct: (previous?.correct ?? 0) + Number(correct), wrong: (previous?.wrong ?? 0) + Number(!correct),
    streak: correct ? (previous?.streak ?? 0) + 1 : 0, level,
    dueAt: now + intervals[Math.max(0, level - 1)] * 86400000, lastAnsweredAt: now,
  };
}

export function optionOrder(questions: Question[], seed: string, mix: boolean): Record<string, string[]> {
  return Object.fromEntries(questions.map(q => [q.id, (mix ? shuffle(q.options, seed + ':' + q.id) : q.options).map(o => o.key)]));
}
export function createPractice(questions: Question[], mode: PracticeMode, seed: string, settings: Settings, now = Date.now()): PracticeSession {
  if (!questions.length) throw new Error('Không có câu hỏi phù hợp với bộ lọc.');
  if (questions.some(q => q.subjectId !== questions[0].subjectId)) throw new Error('Một phiên chỉ học một môn.');
  return {
    id: crypto.randomUUID(), subjectId: questions[0].subjectId, mode, seed,
    questionIds: (mode === 'random' ? shuffle(questions, seed) : questions).map(q => q.id),
    optionOrder: optionOrder(questions, seed, settings.shuffleOptions), position: 0, selections: {}, checked: {},
    queue: [], step: 0, reviewId: null, reviewSelected: [], reviewChecked: false, wrongIds: [],
    groupSize: settings.groupSize, acknowledgedGroups: [], blockPending: false, finished: false,
    returnToSessionId: null,
    startedAt: now, lastActionAt: now,
  };
}
export const activeQuestionId = (session: PracticeSession) => session.reviewId ?? session.questionIds[session.position];
export function answerPractice(session: PracticeSession, question: Question, correct: boolean, gap: number, now: number): PracticeSession {
  const s = structuredClone(session);
  if (s.reviewId ? s.reviewChecked : s.checked[question.id]) return s;
  if (s.reviewId) s.reviewChecked = true;
  else { s.checked[question.id] = true; s.step++; }
  s.lastActionAt = now;
  if (!correct) {
    s.queue = scheduleReview(s.queue, question.id, s.step, gap);
    if (!s.wrongIds.includes(question.id)) s.wrongIds.push(question.id);
  } else s.queue = s.queue.filter(item => item.questionId !== question.id);
  return s;
}
export function nextPractice(session: PracticeSession, now = Date.now()): PracticeSession {
  const s = structuredClone(session);
  if (s.finished || s.blockPending) return s;
  if (s.reviewId) {
    if (!s.reviewChecked) return s;
    s.reviewId = null; s.reviewSelected = []; s.reviewChecked = false;
  } else {
    if (!s.checked[s.questionIds[s.position]]) return s;
    const next = s.position + 1;
    if (next % s.groupSize === 0 && next < s.questionIds.length && !s.acknowledgedGroups.includes(next)) {
      s.blockPending = true; return s;
    }
    s.position = next;
  }
  const end = s.position >= s.questionIds.length;
  const due = (end ? s.queue : dueReviews(s.queue, s.step))[0];
  if (due) s.reviewId = due.questionId;
  else if (end) { s.finished = true; s.position = s.questionIds.length - 1; }
  s.lastActionAt = now;
  return s;
}

export function createExam(questions: Question[], count: number, minutes: number, seed: string, mixQuestions: boolean, mixOptions: boolean, now = Date.now()): Exam {
  if (!Number.isInteger(count) || count < 1 || count > questions.length) throw new Error(`Số câu phải từ 1 đến ${questions.length}.`);
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) throw new Error('Thời gian phải từ 1 đến 1440 phút.');
  const chosen = (mixQuestions ? shuffle(questions, seed) : questions).slice(0, count);
  return { id: crypto.randomUUID(), subjectId: chosen[0].subjectId, title: `Đề thi ${count} câu`, questionIds: chosen.map(q => q.id), optionOrder: optionOrder(chosen, seed, mixOptions), selections: {}, flagged: [], position: 0, seed, startedAt: now, deadline: now + minutes * 60000, submittedAt: null };
}
