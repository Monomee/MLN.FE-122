export interface Question {
  id: string; number: number; subjectId: string; topicId?: string; content: string;
  options: { key: string; text: string }[]; correctAnswers: string[]; explanation?: string;
}
export interface Subject { id: string; name: string; description: string; createdAt: number }
export type PracticeMode = 'sequential' | 'random' | 'wrong' | 'spaced' | 'starred';
export interface Settings {
  theme: 'light' | 'dark' | 'system'; groupSize: 20 | 50 | 100; reviewGap: number;
  autoAdvance: boolean; shuffleOptions: boolean; animations: boolean; examMinutes: number; intervals: number[];
}
export interface Progress {
  questionId: string; subjectId: string; starred: boolean; correct: number; wrong: number;
  streak: number; level: number; dueAt: number | null; lastAnsweredAt: number | null;
}
export interface Attempt {
  id: string; questionId: string; subjectId: string; sessionId: string; selected: string[];
  correct: boolean; at: number; durationMs: number; mode: PracticeMode | 'review' | 'exam';
}
export interface ReviewItem { questionId: string; dueStep: number; attempts: number }
export interface PracticeSession {
  id: string; subjectId: string; mode: PracticeMode; seed: string; questionIds: string[];
  optionOrder: Record<string, string[]>; position: number; selections: Record<string, string[]>;
  checked: Record<string, boolean>; queue: ReviewItem[]; step: number; reviewId: string | null;
  reviewSelected: string[]; reviewChecked: boolean; wrongIds: string[];
  groupSize: number; acknowledgedGroups: number[]; blockPending: boolean; finished: boolean;
  returnToSessionId: string | null;
  startedAt: number; lastActionAt: number;
}
export interface Exam {
  id: string; subjectId: string; title: string; questionIds: string[]; optionOrder: Record<string, string[]>;
  selections: Record<string, string[]>; flagged: string[]; position: number; seed: string;
  startedAt: number; deadline: number; submittedAt: number | null;
}
export interface StudyData {
  subjects: Subject[]; questions: Question[]; progress: Record<string, Progress>; attempts: Attempt[];
  practices: Record<string, PracticeSession>; activePracticeId: string | null;
  exams: Exam[]; activeExamId: string | null; settings: Settings;
}
export interface Backup { format: 'mln-study-backup'; version: 1; exportedAt: number; data: StudyData }
export const defaultSettings: Settings = {
  theme: 'system', groupSize: 50, reviewGap: 7, autoAdvance: false,
  shuffleOptions: false, animations: true, examMinutes: 30, intervals: [1, 3, 7, 14, 30],
};
export const emptyData = (): StudyData => ({ subjects: [], questions: [], progress: {}, attempts: [], practices: {}, activePracticeId: null, exams: [], activeExamId: null, settings: structuredClone(defaultSettings) });
