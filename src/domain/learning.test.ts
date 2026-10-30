import { describe, it, expect } from 'vitest';
import { grade, shuffle, examResult, isExpired, scheduleReview, dueReviews, updateProgress, createPractice, answerPractice, nextPractice } from './learning';
import type { Question } from './models';
import { defaultSettings } from './models';
const q: Question = { id: 's:1', number: 1, subjectId: 's', content: 'Q', options: ['A','B','C','D','E'].map(key => ({ key, text: key })), correctAnswers: ['A'] };
describe('shared grading', () => {
  it('grades a single answer', () => { expect(grade(q, ['A'])).toBe(true); expect(grade(q, ['B'])).toBe(false); });
  it('requires all multi answers, independent of order', () => expect(grade({ ...q, correctAnswers: ['A','C'] }, ['C','A'])).toBe(true));
  it('rejects partial answers', () => expect(grade({ ...q, correctAnswers: ['A','C'] }, ['A'])).toBe(false));
  it('rejects extra, duplicate or unknown answers', () => { for (const a of [['A','B'], ['A','A'], ['Z'], []]) expect(grade(q,a)).toBe(false); });
  it('keeps correct keys when options shuffle', () => expect(grade({ ...q, options: shuffle(q.options, 'seed') }, ['A'])).toBe(true));
  it('does not conflate multi-character keys', () => expect(grade({ ...q, correctAnswers: ['AB','C'] }, ['A','BC'])).toBe(false));
});
it('seeded shuffle restores exactly without mutating input', () => {
  const ids = Array.from({length: 40}, (_, i) => i);
  expect(shuffle(ids,'one')).toEqual(shuffle(ids,'one'));
  expect(shuffle(ids,'one')).not.toEqual(shuffle(ids,'two'));
  expect([...shuffle(ids,'one')].sort((a,b)=>a-b)).toEqual(ids);
});
it('scores an exam with wrong and blank answers', () => {
  const questions = [q, {...q,id:'s:2'}, {...q,id:'s:3'}];
  const result=examResult(questions, {'s:1':['A'], 's:2':['B']});
  expect(result).toMatchObject({correct:1,wrong:1,blank:1,total:3});expect(result.accuracy).toBeCloseTo(100/3);expect(result.score).toBeCloseTo(10/3);
});
it('expires at the saved deadline even after a reload', () => { expect(isExpired({deadline: 1000, submittedAt: null},999)).toBe(false); expect(isExpired({deadline:1000,submittedAt:null},1000)).toBe(true); expect(isExpired({deadline:1000,submittedAt:1000},2000)).toBe(false); });
it('schedules after N intervening questions and never duplicates', () => {
  let queue = scheduleReview([],q.id,1,7);
  expect(dueReviews(queue,7)).toEqual([]);
  expect(dueReviews(queue,8).map(x=>x.questionId)).toEqual([q.id]);
  queue = scheduleReview(queue,q.id,9,7);
  expect(queue).toHaveLength(1); expect(queue[0]).toEqual({questionId:q.id,dueStep:16,attempts:2});
});
it('keeps day-based repetition separate and resets a failed level', () => {
  const p = updateProgress(undefined,q,true,1000,defaultSettings.intervals);
  expect(p.level).toBe(1); expect(p.dueAt).toBe(86401000);
  const failed = updateProgress(p,q,false,2000,defaultSettings.intervals);
  expect(failed.level).toBe(0); expect(failed.wrong).toBe(1); expect(failed.dueAt).toBe(86402000);
});
it('inserts a failed question after 7 completed intervening questions', () => {
  const questions = Array.from({length:10},(_,i)=>({...q,id:`s:${i+1}`,number:i+1}));
  let session = createPractice(questions,'sequential','seed',defaultSettings,0);
  session = answerPractice({...session,selections:{[q.id]:['B']}},questions[0],false,7,100);
  session = nextPractice(session,100);
  for(let i=1;i<=7;i++) {
    expect(session.reviewId).toBeNull();
    session = answerPractice({...session,selections:{...session.selections,[questions[i].id]:['A']}},questions[i],true,7,100+i);
    session = nextPractice(session,100+i);
  }
  expect(session.reviewId).toBe(q.id); expect(session.position).toBe(8);
});
it('does not count navigation over already checked questions as new study answers',()=>{
  const questions=Array.from({length:10},(_,i)=>({...q,id:`s:${i+1}`,number:i+1}));let s=createPractice(questions,'sequential','prev',defaultSettings,0);
  for(let i=0;i<2;i++){s=answerPractice({...s,selections:{...s.selections,[questions[i].id]:i===0?['B']:['A']}},questions[i],i!==0,7,i);s=nextPractice(s,i);}
  for(let i=0;i<10;i++)s=nextPractice({...s,position:1},10+i);
  expect(s.reviewId).toBeNull();expect(s.step).toBe(2);
});
