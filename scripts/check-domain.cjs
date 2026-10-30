/* Standalone domain checks also run when browser/test dependencies are unavailable. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');
let ts;
try { ts = require('typescript'); } catch { ts = require('../.tooling/package/lib/typescript.js'); }
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename,'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } });
  module._compile(result.outputText, filename);
};
const { grade, shuffle, examResult, isExpired, scheduleReview, dueReviews, updateProgress, createPractice, answerPractice, nextPractice } = require('../src/domain/learning.ts');
const { convertLegacy, parseQuestions, parseTxt } = require('../src/data/importers.ts');
const { validateStudyData } = require('../src/data/validation.ts');
const { builtinData } = require('../src/data/builtin.ts');
const { metrics, activity } = require('../src/domain/analytics.ts');
const { makeBackup, parseBackup, resetSubject } = require('../src/domain/backup.ts');
const { defaultSettings } = require('../src/domain/models.ts');
const raw = require('../data/questions.json');
const q = convertLegacy([raw[0]],'mln122')[0];

test('converts every original question without changing content, order, options, notes or correct keys',()=>{
  const all=convertLegacy(raw,'mln122');assert.equal(all.length,526);
  all.forEach((x,i)=>{assert.equal(x.id,`mln122:${raw[i].id}`);assert.equal(x.number,i+1);assert.equal(x.content,raw[i].question);assert.deepEqual(x.options,raw[i].options);assert.deepEqual(x.correctAnswers,raw[i].answer);assert.equal(x.explanation,raw[i].notes.join('\n'));});
  const hash=require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../data/questions.json'))).digest('hex');assert.equal(hash,'5cc9066db0d529086f2890e639adb6580240eec1c215ed72b5f4ec4b4d069f60');
});
test('single answer grading and empty response',()=>{assert.equal(grade(q,['D']),true);assert.equal(grade(q,['A']),false);assert.equal(grade(q,[]),false);});
test('multiple answers require exact complete set',()=>{const multi={...q,correctAnswers:['A','C']};assert.equal(grade(multi,['C','A']),true);assert.equal(grade(multi,['A']),false);assert.equal(grade(multi,['A','C','B']),false);assert.equal(grade(multi,['A','A']),false);});
test('answer order shuffle preserves stable keys and correctness',()=>{assert.equal(grade({...q,options:shuffle(q.options,'a')},q.correctAnswers),true);});
test('seeded shuffle reproduces order without losing items or changing its input',()=>{const ids=Array.from({length:100},(_,i)=>i);assert.deepEqual(shuffle(ids,'a'),shuffle(ids,'a'));assert.notDeepEqual(shuffle(ids,'a'),shuffle(ids,'b'));assert.deepEqual(shuffle(ids,'a').sort((a,b)=>a-b),ids);});
test('exam scoring distinguishes incorrect and blank questions',()=>{const r=examResult([q,{...q,id:'b'},{...q,id:'c'}],{[q.id]:['D'],b:['A']});assert.equal(r.correct,1);assert.equal(r.wrong,1);assert.equal(r.blank,1);assert.equal(r.total,3);assert.ok(Math.abs(r.accuracy-100/3)<1e-10);assert.ok(Math.abs(r.score-10/3)<1e-10);});
test('deadline expires exactly and submitted exams do not expire again',()=>{assert.equal(isExpired({deadline:100,submittedAt:null},99),false);assert.equal(isExpired({deadline:100,submittedAt:null},100),true);assert.equal(isExpired({deadline:100,submittedAt:100},200),false);});
test('session review reschedules without duplicate entries',()=>{let queue=scheduleReview([],q.id,1,7);assert.equal(dueReviews(queue,7).length,0);assert.equal(dueReviews(queue,8).length,1);queue=scheduleReview(queue,q.id,9,7);assert.deepEqual(queue,[{questionId:q.id,dueStep:16,attempts:2}]);});
test('failed question appears after seven intervening completed questions',()=>{
  const questions=Array.from({length:10},(_,i)=>({...q,id:`s:${i}`,number:i+1,subjectId:'s'}));let s=createPractice(questions,'sequential','seed',defaultSettings,0);
  s=answerPractice({...s,selections:{[questions[0].id]:['A']}},questions[0],false,7,1);s=nextPractice(s,1);
  for(let i=1;i<=7;i++){assert.equal(s.reviewId,null);s=answerPractice({...s,selections:{...s.selections,[questions[i].id]:['D']}},questions[i],true,7,i+1);s=nextPractice(s,i+1);}
  assert.equal(s.reviewId,questions[0].id);assert.equal(s.position,8);
  s=answerPractice({...s,reviewSelected:['D']},questions[0],true,7,20);s=nextPractice(s,20);assert.equal(s.reviewId,null);assert.equal(s.position,8);assert.equal(s.queue.length,0);
});
test('pending review at end is preserved and session finishes after a correct review',()=>{
  let s=createPractice([q],'sequential','end',defaultSettings,0);s=answerPractice({...s,selections:{[q.id]:['A']}},q,false,7,1);s=nextPractice(s,2);assert.equal(s.reviewId,q.id);
  const d=builtinData();d.practices[s.id]=s;d.activePracticeId=s.id;validateStudyData(d);
  s=answerPractice({...s,reviewSelected:['D']},q,true,7,3);s=nextPractice(s,4);assert.equal(s.finished,true);assert.equal(s.queue.length,0);
});
test('group boundary waits for a decision and keeps selections',()=>{const questions=Array.from({length:21},(_,i)=>({...q,id:`s:${i}`,subjectId:'s'}));let s=createPractice(questions,'sequential','block',{...defaultSettings,groupSize:20},0);for(let i=0;i<20;i++){s=answerPractice({...s,selections:{...s.selections,[questions[i].id]:['D']}},questions[i],true,7,i);s=nextPractice(s,i);}assert.equal(s.blockPending,true);assert.equal(s.position,19);assert.equal(Object.keys(s.checked).length,20);});
test('day-based repetition uses configured intervals independently',()=>{let p=updateProgress(undefined,q,true,1000,[1,3,7,14,30]);assert.equal(p.level,1);assert.equal(p.dueAt,86401000);p=updateProgress(p,q,true,2000,[1,3,7,14,30]);assert.equal(p.dueAt,3*86400000+2000);p=updateProgress(p,q,false,3000,[1,3,7,14,30]);assert.equal(p.level,0);assert.equal(p.dueAt,86403000);});
test('JSON and TXT import only explicit valid answers',()=>{assert.deepEqual(parseQuestions(JSON.stringify([q]),'json','mln122'),[q]);const rows=parseTxt('Câu 1: Nội dung\nA. Một\nB. Hai\nE. Năm\nĐáp án: A,E\nChủ đề: Chủ đề','s');assert.deepEqual(rows[0].correctAnswers,['A','E']);assert.equal(rows[0].options.length,3);assert.throws(()=>parseTxt('Câu 1: Mơ hồ\nA. Một\nB. Hai','s'));});
test('rejects missing answers, unknown answer keys, duplicate IDs and duplicate options',()=>{for(const rows of [[{...raw[0],answer:[]}],[{...raw[0],answer:['Z']}],[raw[0],raw[0]],[{...raw[0],options:[raw[0].options[0],raw[0].options[0]]}]])assert.throws(()=>convertLegacy(rows,'s'));});
test('validates a complete snapshot and its serialized restoration',()=>{const data=builtinData();const s=createPractice(data.questions,'random','restore',defaultSettings,1000);s.selections[s.questionIds[0]]=['A'];data.practices[s.id]=s;data.activePracticeId=s.id;const restored=JSON.parse(JSON.stringify(data));validateStudyData(restored);assert.deepEqual(restored,data);});
test('invalid references, option orders, review duplicates and settings are rejected',()=>{
  const data=builtinData();let invalid=structuredClone(data);invalid.activeExamId='missing';assert.throws(()=>validateStudyData(invalid));invalid=structuredClone(data);invalid.settings.intervals=[1,1,2,3,4];assert.throws(()=>validateStudyData(invalid));
  const s=createPractice(data.questions,'sequential','x',defaultSettings,1);data.practices[s.id]=s;invalid=structuredClone(data);invalid.practices[s.id].optionOrder[q.id]=['Z'];assert.throws(()=>validateStudyData(invalid));invalid=structuredClone(data);invalid.practices[s.id].queue=[{questionId:q.id,dueStep:8,attempts:1},{questionId:q.id,dueStep:9,attempts:1}];assert.throws(()=>validateStudyData(invalid));
});
test('analytics records unique questions, all attempts, local study days and elapsed study time',()=>{const data=builtinData(),now=new Date(2026,9,30,12).getTime();data.progress[q.id]=updateProgress(undefined,q,true,now,defaultSettings.intervals);data.attempts=[0,1,2].map((day,i)=>({id:String(i),questionId:q.id,subjectId:q.subjectId,sessionId:'s',selected:i===1?['A']:['D'],correct:i!==1,at:now-day*86400000,durationMs:60000,mode:'sequential'}));const m=metrics(data,undefined,now);assert.equal(m.learned,1);assert.equal(m.attempts,3);assert.equal(m.streak,3);assert.equal(m.minutes,3);assert.equal(activity(data,7,now).reduce((n,r)=>n+r.total,0),3);});
test('backwards navigation cannot advance the review clock without new answers',()=>{
  const questions=Array.from({length:10},(_,i)=>({...q,id:`s:${i}`,number:i+1,subjectId:'s'}));let s=createPractice(questions,'sequential','prev',defaultSettings,0);
  for(let i=0;i<2;i++){s=answerPractice({...s,selections:{...s.selections,[questions[i].id]:i===0?['A']:['D']}},questions[i],i!==0,7,i);s=nextPractice(s,i);}
  for(let i=0;i<10;i++)s=nextPractice({...s,position:1},10+i);
  assert.equal(s.reviewId,null);assert.equal(s.step,2);
});
test('schema rejects coerced types rather than accepting malformed backup fields',()=>{
  for(const [key,value] of [['groupSize','50'],['theme',{toString:()=> 'dark'}]]){const d=builtinData();d.settings[key]=value;assert.throws(()=>validateStudyData(d));}
  const d=builtinData();d.subjects.push({id:'s',name:'S',description:'',createdAt:0});d.questions.push({...q,id:'123',subjectId:'s'});const s=createPractice([d.questions.at(-1)],'sequential','types',defaultSettings,0);d.practices[s.id]=s;s.reviewId=123;assert.throws(()=>validateStudyData(d));
});
test('versioned backup roundtrip preserves all data and rejects unsupported versions before mutation',()=>{const d=builtinData();assert.deepEqual(parseBackup(JSON.stringify(makeBackup(d))).data,d);assert.throws(()=>parseBackup(JSON.stringify({...makeBackup(d),version:2})));assert.equal(d.questions.length,526);});
test('resetting one subject leaves the other subject data intact',()=>{const d=builtinData();d.subjects.push({id:'other',name:'Other',description:'',createdAt:0});const other={...q,id:'other:1',subjectId:'other'};d.questions.push(other);d.progress[q.id]=updateProgress(undefined,q,false,1000,defaultSettings.intervals);d.progress[other.id]=updateProgress(undefined,other,true,1000,defaultSettings.intervals);const reset=resetSubject(d,'mln122');assert.equal(reset.progress[q.id],undefined);assert.deepEqual(reset.progress[other.id],d.progress[other.id]);assert.equal(reset.questions.length,527);assert.ok(d.progress[q.id]);});
test('rejects reserved object property IDs at the import boundary',()=>{for(const id of ['toString','valueOf','__proto__','constructor','__defineGetter__'])assert.throws(()=>parseQuestions(JSON.stringify([{...q,id}]),'json','mln122'));});
