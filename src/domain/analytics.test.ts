import { it, expect } from 'vitest';
import { activity, localDay, metrics } from './analytics';
import { emptyData } from './models';
it('counts unique learned questions, individual answers and consecutive local study days',()=>{
  const data=emptyData();const now=new Date(2026,9,30,12).getTime();
  data.attempts=[0,1,2].map((day,i)=>({id:String(i),questionId:'s:1',subjectId:'s',sessionId:'s',selected:['A'],correct:i!==1,at:now-day*86400000,durationMs:60000,mode:'sequential'}));
  const m=metrics(data,undefined,now);expect(m.attempts).toBe(3);expect(m.correct).toBe(2);expect(m.streak).toBe(3);expect(m.minutes).toBe(3);
  const rows=activity(data,7,now);expect(rows).toHaveLength(7);expect(rows.at(-1)?.day).toBe(localDay(now));expect(rows.reduce((n,r)=>n+r.total,0)).toBe(3);
});
