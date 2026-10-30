import type { Backup, StudyData } from './models';
import { ensure, object, validateStudyData } from '../data/validation';

export function makeBackup(data: StudyData): Backup {
  validateStudyData(data);
  return {format:'mln-study-backup',version:1,exportedAt:Date.now(),data:structuredClone(data)};
}
export function parseBackup(source: string): Backup {
  let backup: unknown;
  try { backup=JSON.parse(source); } catch { throw new Error('Backup không phải JSON hợp lệ.'); }
  ensure(object(backup) && backup.format === 'mln-study-backup' && backup.version === 1 && typeof backup.exportedAt === 'number' && Number.isFinite(backup.exportedAt) && backup.exportedAt>=0, 'Không hỗ trợ định dạng hoặc version backup này.');
  validateStudyData(backup.data);
  return backup as unknown as Backup;
}
export function resetSubject(data: StudyData, subjectId?: string): StudyData {
  const d=structuredClone(data);
  d.progress=Object.fromEntries(Object.entries(d.progress).filter(([,p])=>subjectId && p.subjectId !== subjectId));
  d.attempts=d.attempts.filter(a=>subjectId && a.subjectId !== subjectId);
  d.practices=Object.fromEntries(Object.entries(d.practices).filter(([,s])=>subjectId && s.subjectId !== subjectId));
  d.exams=d.exams.filter(e=>subjectId && e.subjectId !== subjectId);
  if(d.activePracticeId && !d.practices[d.activePracticeId]) d.activePracticeId=null;
  if(d.activeExamId && !d.exams.some(e=>e.id === d.activeExamId)) d.activeExamId=null;
  return d;
}
