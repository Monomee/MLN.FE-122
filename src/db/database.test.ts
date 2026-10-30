import { afterEach, beforeEach, it, expect } from 'vitest';
import Dexie from 'dexie';
import { StudyDatabase, Repository, makeBackup, parseBackup, resetSubject } from './database';
import { emptyData } from '../domain/models';
import { convertLegacy } from '../data/importers';
import raw from '../../data/questions.json';
let repo: Repository;
beforeEach(async () => { const db = new StudyDatabase(`test-${crypto.randomUUID()}`); repo = new Repository(db); });
afterEach(async()=>{await repo.db.delete();});
function fixture() {
  const d=emptyData(); d.subjects=[{id:'s',name:'Môn 1',description:'',createdAt:0},{id:'t',name:'Môn 2',description:'',createdAt:0}];
  d.questions=[...convertLegacy([raw[0]],'s'),...convertLegacy([raw[1]],'t')]; return d;
}
it('saves and restores selections, seeded order and settings',async()=>{
  const d=fixture(); d.settings.theme='dark';
  const {createPractice}=await import('../domain/learning');
  const s=createPractice(d.questions.filter(q=>q.subjectId==='s'),'random','seed',d.settings,100);
  s.selections[s.questionIds[0]]=['A']; d.practices[s.id]=s; d.activePracticeId=s.id;
  await repo.write(d,0); const loaded=await repo.read(); expect(loaded?.data).toEqual(d); expect(loaded?.revision).toBe(1);
});
it('roundtrips a versioned backup',()=>{const d=fixture();expect(parseBackup(JSON.stringify(makeBackup(d))).data).toEqual(d);});
it('invalid backup leaves the current database intact',async()=>{
  const d=fixture(); await repo.write(d,0);
  for(const bad of [{format:'mln-study-backup',version:9,data:d},{...makeBackup(d),data:{...d,questions:[{id:'bad'}]}},{...makeBackup(d),data:{...d,activeExamId:'missing'}}]) {
    await expect(repo.restore(JSON.stringify(bad),1)).rejects.toThrow(); expect((await repo.read())?.data).toEqual(d);
  }
});
it('refuses concurrent writes instead of silently losing another tab progress',async()=>{
  const d=fixture();await repo.write(d,0);await expect(repo.write(d,0)).rejects.toThrow(/tab/i);expect((await repo.read())?.revision).toBe(1);
});
it('resets a single subject without touching another subject or its questions',()=>{
  const d=fixture(); for(const q of d.questions) d.progress[q.id]={questionId:q.id,subjectId:q.subjectId,starred:true,correct:1,wrong:1,streak:1,level:1,dueAt:100,lastAnsweredAt:1};
  const result=resetSubject(d,'s');expect(result.progress['s:1']).toBeUndefined();expect(result.progress['t:2']).toEqual(d.progress['t:2']);expect(result.questions).toEqual(d.questions);
});
it('migrates a v1 database without losing the snapshot and adds revision protection',async()=>{
  const name=repo.db.name,old=new Dexie(name);old.version(1).stores({documents:'key'});
  const d=fixture();await old.table('documents').put({key:'study',data:d});old.close();
  const loaded=await repo.read();expect(loaded?.data).toEqual(d);expect(loaded?.revision).toBe(0);
  expect(await repo.write(d,0)).toBe(1);
});
