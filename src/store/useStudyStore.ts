import { create } from 'zustand';
import type { PracticeMode, Question, Settings, StudyData, Subject } from '../domain/models';
import { emptyData } from '../domain/models';
import { activeQuestionId, answerPractice, createExam, createPractice, grade, isExpired, nextPractice, updateProgress } from '../domain/learning';
import { Repository } from '../db/database';
import { parseBackup, resetSubject } from '../domain/backup';
import { builtinData } from '../data/builtin';
import { ensure, validateQuestions, validateStudyData } from '../data/validation';

const repository=new Repository();
let writeChain: Promise<void> = Promise.resolve();
let revision=0;
let bootPromise: Promise<void> | null = null;
interface Store {
  data: StudyData; ready: boolean; restoring: boolean; status: 'loading' | 'saving' | 'saved' | 'error'; error: string | null;
  initialize: () => Promise<void>;
  change: (fn: (draft: StudyData) => void) => void;
  flush: () => Promise<void>;
  startPractice: (ids: string[], mode: PracticeMode, seed?: string) => string;
  practiceSelect: (key: string) => void; practiceCheck: () => void; practiceNext: () => void;
  practicePrevious: () => void; practiceBlock: (action: 'continue' | 'repeat' | 'wrong') => void;
  star: (id: string) => void;
  startExam: (questions: Question[], count: number, minutes: number, seed: string, mixQ: boolean, mixA: boolean) => string;
  examSelect: (examId: string, key: string) => void; submitExam: (examId: string, now?: number) => void;
  updateSettings: (settings: Settings) => void;
  importQuestions: (subject: Subject, questions: Question[]) => void;
  restore: (source: string) => Promise<void>;
  reset: (subjectId?: string) => void;
}
function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Không thể lưu dữ liệu trên trình duyệt.'; }
function recordAnswer(d: StudyData, q: Question, selected: string[], sessionId: string, mode: 'exam' | 'review' | PracticeMode, durationMs: number, at: number) {
  const correct=grade(q,selected);
  d.attempts.push({id:crypto.randomUUID(),questionId:q.id,subjectId:q.subjectId,sessionId,selected:[...selected],correct,at,durationMs,mode});
  d.progress[q.id]=updateProgress(d.progress[q.id],q,correct,at,d.settings.intervals);
  return correct;
}
function select(current: string[], key: string, q: Question) {
  ensure(q.options.some(o=>o.key === key),'Lựa chọn không tồn tại.');
  return q.correctAnswers.length === 1 ? [key] : current.includes(key) ? current.filter(k=>k !== key) : [...current,key];
}
export const useStudyStore=create<Store>((set,get)=>({
  data:emptyData(),ready:false,restoring:false,status:'loading',error:null,
  initialize:()=> {
    if(bootPromise) return bootPromise;
    bootPromise=(async()=>{
      try {
        const doc=await repository.read();
        const data=doc?.data ?? builtinData();
        revision=doc?.revision ?? 0;
        if(!doc) revision=await repository.write(data,revision);
        set({data,ready:true,status:'saved',error:null});
        for(const e of data.exams) if(isExpired(e)) get().submitExam(e.id);
      } catch(error) { set({status:'error',error:errorMessage(error)}); }
    })();
    return bootPromise;
  },
  change:fn=>{
    ensure(!get().restoring,'Đang khôi phục dữ liệu, vui lòng chờ.');
    if(get().status === 'error') throw new Error('Dữ liệu chưa được lưu. Hãy xuất bản sao hiện tại rồi tải lại trang.');
    const data=structuredClone(get().data);
    fn(data); validateStudyData(data);
    set({data,status:'saving'});
    writeChain=writeChain.then(async()=>{
      if(get().status === 'error') return;
      try { revision=await repository.write(data,revision); if(get().data === data) set({status:'saved'}); }
      catch(error) { set({status:'error',error:errorMessage(error)}); }
    });
  },
  flush:async()=>{ await writeChain; if(get().status === 'error') throw new Error(get().error ?? 'Lưu dữ liệu thất bại.'); },
  startPractice:(ids,mode,seed=crypto.randomUUID())=>{
    const map=new Map(get().data.questions.map(q=>[q.id,q]));
    const questions=ids.map(id=>{const q=map.get(id);ensure(q,'Câu hỏi không tồn tại.');return q;});
    const session=createPractice(questions,mode,seed,get().data.settings);
    get().change(d=>{d.practices[session.id]=session;d.activePracticeId=session.id;});
    return session.id;
  },
  practiceSelect:key=>get().change(d=>{
    const s=d.practices[d.activePracticeId ?? '']; if(!s || s.finished || s.blockPending) return;
    const q=d.questions.find(q=>q.id === activeQuestionId(s))!;
    if(s.reviewId) {if(!s.reviewChecked) s.reviewSelected=select(s.reviewSelected,key,q);}
    else if(!s.checked[q.id]) s.selections[q.id]=select(s.selections[q.id] ?? [],key,q);
  }),
  practiceCheck:()=>get().change(d=>{
    const s=d.practices[d.activePracticeId ?? '']; if(!s || s.finished || s.blockPending) return;
    const id=activeQuestionId(s); if(s.reviewId ? s.reviewChecked : s.checked[id]) return;
    const selected=s.reviewId ? s.reviewSelected : s.selections[id] ?? [];
    ensure(selected.length,'Hãy chọn ít nhất một đáp án.');
    const q=d.questions.find(q=>q.id === id)!; const now=Date.now();
    const correct=recordAnswer(d,q,selected,s.id,s.reviewId ? 'review' : s.mode,Math.max(0,Math.min(now-s.lastActionAt,300000)),now);
    d.practices[s.id]=answerPractice(s,q,correct,d.settings.reviewGap,now);
  }),
  practiceNext:()=>get().change(d=>{const s=d.practices[d.activePracticeId ?? ''];if(s) d.practices[s.id]=nextPractice(s);}),
  practicePrevious:()=>get().change(d=>{const s=d.practices[d.activePracticeId ?? ''];if(s && !s.reviewId && !s.blockPending && !s.finished) {s.position=Math.max(0,s.position-1);s.lastActionAt=Date.now();}}),
  practiceBlock:action=>get().change(d=>{
    const s=d.practices[d.activePracticeId ?? ''];if(!s?.blockPending) return;
    const boundary=s.position+1;const start=boundary-s.groupSize;
    s.blockPending=false;
    if(action === 'repeat') {
      for(const id of s.questionIds.slice(start,boundary)) {delete s.checked[id];delete s.selections[id];}
      s.position=start;s.lastActionAt=Date.now();return;
    }
    s.acknowledgedGroups.push(boundary);d.practices[s.id]=nextPractice(s);
    if(action === 'wrong') {
      const ids=s.questionIds.slice(start,boundary).filter(id=>s.wrongIds.includes(id));
      if(ids.length) {const session=createPractice(ids.map(id=>d.questions.find(q=>q.id===id)!),'wrong',crypto.randomUUID(),d.settings);session.returnToSessionId=s.id;d.practices[session.id]=session;d.activePracticeId=session.id;}
    }
  }),
  star:id=>get().change(d=>{
    const q=d.questions.find(q=>q.id === id);ensure(q,'Câu hỏi không tồn tại.');
    const p=d.progress[id] ?? {questionId:id,subjectId:q.subjectId,starred:false,correct:0,wrong:0,streak:0,level:0,dueAt:null,lastAnsweredAt:null};
    d.progress[id]={...p,starred:!p.starred};
  }),
  startExam:(questions,count,minutes,seed,mixQ,mixA)=>{
    const e=createExam(questions,count,minutes,seed,mixQ,mixA);
    ensure(!get().data.exams.some(e=>e.submittedAt === null),'Bạn đang có một bài thi chưa nộp. Hãy tiếp tục hoặc nộp bài đó trước.');
    get().change(d=>{d.exams.push(e);d.activeExamId=e.id;});return e.id;
  },
  examSelect:(examId,key)=>{
    const existing=get().data.exams.find(e=>e.id === examId);if(!existing || existing.submittedAt !== null) return;
    if(isExpired(existing)) {get().submitExam(examId);return;}
    get().change(d=>{const e=d.exams.find(e=>e.id===examId)!;const id=e.questionIds[e.position];const q=d.questions.find(q=>q.id===id)!;e.selections[id]=select(e.selections[id] ?? [],key,q);});
  },
  submitExam:(examId,now=Date.now())=>get().change(d=>{
    const e=d.exams.find(e=>e.id===examId);if(!e || e.submittedAt !== null) return;
    e.submittedAt=Math.max(e.startedAt,Math.min(now,e.deadline));
    const duration=(e.submittedAt-e.startedAt)/e.questionIds.length;
    for(const id of e.questionIds) recordAnswer(d,d.questions.find(q=>q.id === id)!,e.selections[id] ?? [],e.id,'exam',duration,e.submittedAt);
  }),
  updateSettings:settings=>get().change(d=>{d.settings=settings;}),
  importQuestions:(subject,questions)=>{
    validateQuestions(questions);
    ensure(!get().data.subjects.some(s=>s.id===subject.id),'ID môn đã tồn tại. Hãy dùng ID môn mới; không tự động ghi đè.');
    ensure(!questions.some(q=>get().data.questions.some(old=>old.id===q.id)),'Có ID câu hỏi đã tồn tại. Không ghi đè dữ liệu.');
    get().change(d=>{d.subjects.push(subject);d.questions.push(...questions);});
  },
  restore:async source=>{
    ensure(!get().restoring,'Đang khôi phục dữ liệu, vui lòng chờ.');
    const backup=parseBackup(source);set({restoring:true});
    try {await get().flush();set({status:'saving'});const nextRevision=await repository.write(backup.data,revision);revision=nextRevision;set({data:backup.data,status:'saved',error:null});}
    catch(error) {set({error:errorMessage(error),status:'error'});throw error;}
    finally {set({restoring:false});}
    for(const e of backup.data.exams) if(isExpired(e)) get().submitExam(e.id);
  },
  reset:subjectId=>get().change(d=>Object.assign(d,resetSubject(d,subjectId))),
}));

export function practiceCandidates(data: StudyData, subjectId: string, filter: string, topic = '') {
  return data.questions.filter(q=>q.subjectId === subjectId && (!topic || q.topicId === topic)).filter(q=>{
    const p=data.progress[q.id];
    if(filter==='unseen') return !p?.lastAnsweredAt;
    if(filter==='wrong') return (p?.wrong ?? 0)>0;
    if(filter==='starred') return p?.starred;
    if(filter==='spaced') return p?.dueAt !== null && p?.dueAt !== undefined && p.dueAt <= Date.now();
    return true;
  });
}
