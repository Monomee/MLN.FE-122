import type { StudyData } from './models';
export function localDay(at: number) {
  const d=new Date(at);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function activity(data: StudyData, days: number, now=Date.now()) {
  const result=Array.from({length:days},(_,i)=>{
    const day=new Date(now);day.setDate(day.getDate()-(days-1-i));
    return {day:localDay(day.getTime()),label:`${day.getDate()}/${day.getMonth()+1}`,correct:0,wrong:0,total:0};
  });
  const buckets=new Map(result.map(d=>[d.day,d]));
  for(const a of data.attempts) {const b=buckets.get(localDay(a.at));if(b) {b.total++;if(a.correct) b.correct++;else b.wrong++;}}
  return result;
}
export function metrics(data: StudyData, subjectId?: string, now=Date.now()) {
  const questions=data.questions.filter(q=>!subjectId || q.subjectId===subjectId);
  const attempts=data.attempts.filter(a=>!subjectId || a.subjectId===subjectId);
  const progress=questions.map(q=>data.progress[q.id]).filter(p=>p !== undefined);
  const learned=progress.filter(p=>p.correct+p.wrong>0).length;
  const correct=attempts.filter(a=>a.correct).length;
  const days=new Set(attempts.map(a=>localDay(a.at)));
  let streak=0;const cursor=new Date(now);
  if(!days.has(localDay(cursor.getTime()))) cursor.setDate(cursor.getDate()-1);
  while(days.has(localDay(cursor.getTime()))) {streak++;cursor.setDate(cursor.getDate()-1);}
  return {total:questions.length,learned,unseen:questions.length-learned,accuracy:attempts.length ? Math.round(correct/attempts.length*100) : 0,correct,wrong:attempts.length-correct,attempts:attempts.length,due:progress.filter(p=>p.dueAt !== null && p.dueAt<=now).length,wrongQuestions:progress.filter(p=>p.wrong>0 && p.streak===0).length,starred:progress.filter(p=>p.starred).length,mastered:progress.filter(p=>p.level>=3).length,frequent:progress.filter(p=>p.wrong>=2 && p.wrong>p.correct).length,minutes:Math.floor(attempts.reduce((sum,a)=>sum+a.durationMs,0)/60000),streak};
}
export function weakTopics(data: StudyData) {
  const questions=new Map(data.questions.map(q=>[q.id,q]));
  const map=new Map<string,{name:string;total:number;wrong:number}>();
  for(const a of data.attempts) {
    const q=questions.get(a.questionId)!;
    const name=(data.subjects.find(s=>s.id===q.subjectId)?.name ?? '')+' · '+(q.topicId ?? 'Chưa phân chủ đề');
    const item=map.get(name) ?? {name,total:0,wrong:0};item.total++;if(!a.correct)item.wrong++;map.set(name,item);
  }
  return [...map.values()].map(x=>({...x,rate:Math.round(x.wrong/x.total*100)})).sort((a,b)=>b.rate-a.rate);
}
