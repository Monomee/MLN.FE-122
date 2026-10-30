import { it, expect } from 'vitest';
import { useStudyStore } from './useStudyStore';
it('auto submits expired exams once, preserving the deadline and every answer',async()=>{
  const store=useStudyStore.getState();await store.initialize();
  const q=useStudyStore.getState().data.questions[0];
  const id=store.startExam([q],1,1,'test',false,false);
  store.change(d=>{const e=d.exams.find(e=>e.id===id)!;e.selections[q.id]=[...q.correctAnswers];e.startedAt=1000;e.deadline=61000;});
  store.submitExam(id,62000);store.submitExam(id,70000);await store.flush();
  const data=useStudyStore.getState().data;expect(data.exams.find(e=>e.id===id)?.submittedAt).toBe(61000);
  expect(data.attempts.filter(a=>a.sessionId===id)).toHaveLength(1);expect(data.attempts.find(a=>a.sessionId===id)?.correct).toBe(true);
});
