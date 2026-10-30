import { it, expect } from 'vitest';
import raw from '../../data/questions.json';
import { parseQuestions, convertLegacy, parseTxt } from './importers';
it('converts all 526 original questions without changing text, order, options or answers', () => {
  const result = convertLegacy(raw,'mln122'); expect(result).toHaveLength(526);
  result.forEach((q,i) => { expect(q.id).toBe(`mln122:${raw[i].id}`); expect(q.number).toBe(i+1); expect(q.content).toBe(raw[i].question); expect(q.options).toEqual(raw[i].options); expect(q.correctAnswers).toEqual(raw[i].answer); expect(q.explanation).toBe(raw[i].notes.join('\n')); });
});
it('rejects missing/unknown answers, duplicate IDs and duplicate option keys', () => {
  for(const rows of [[{...raw[0],answer:[]}],[{...raw[0],answer:['Z']}],[raw[0],raw[0]],[{...raw[0],options:[raw[0].options[0],raw[0].options[0]]}]]) expect(()=>convertLegacy(rows,'s')).toThrow();
});
it('parses normalized JSON and refuses to guess answers', () => {
  const q=convertLegacy([raw[0]],'s')[0]; expect(parseQuestions(JSON.stringify([q]),'json','s')).toEqual([q]);
  expect(()=>parseQuestions(JSON.stringify([{...q,correctAnswers:undefined}]),'json','s')).toThrow();
});
it('parses documented TXT with arbitrary options and explicit answer keys', () => {
  const rows = parseTxt('Câu 1: Nội dung\nA. Một\nB. Hai\nE. Năm\nĐáp án: A,E\nChủ đề: topic\nGiải thích: Ghi chú','s');
  expect(rows[0].correctAnswers).toEqual(['A','E']); expect(rows[0].topicId).toBe('topic'); expect(rows[0].options).toHaveLength(3);
  expect(()=>parseTxt('Câu 1: Mơ hồ\nA. Một\nB. Hai','s')).toThrow();
});
it('rejects prototype property IDs that would collide with stored selections',()=>{
  const q=convertLegacy([raw[0]],'s')[0];
  for(const id of ['toString','valueOf','__proto__','constructor'])expect(()=>parseQuestions(JSON.stringify([{...q,id}]),'json','s')).toThrow();
});
