import type { Question } from '../domain/models';
import { ensure, identifier, object, validateQuestions } from './validation';

export function convertLegacy(input: unknown, subjectId: string): Question[] {
  ensure(identifier(subjectId) && Array.isArray(input), 'Dữ liệu nguồn hoặc ID môn không hợp lệ.');
  const result = input.map((row: unknown, i) => {
    ensure(object(row), `Câu ${i+1}: dữ liệu không hợp lệ.`);
    ensure((typeof row.id === 'number' && Number.isSafeInteger(row.id)) || identifier(row.id), `Câu ${i+1}: thiếu ID nguồn.`);
    ensure(row.notes === undefined || (Array.isArray(row.notes) && row.notes.every(n => typeof n === 'string')), `Câu ${i+1}: ghi chú không hợp lệ.`);
    return { id: `${subjectId}:${row.id}`, number: i+1, subjectId, content: row.question, options: row.options, correctAnswers: row.answer, explanation: (row.notes as string[] | undefined)?.join('\n') ?? '' };
  });
  validateQuestions(result); return result;
}

export function parseTxt(source: string, subjectId: string): Question[] {
  const blocks = source.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim().split(/\n\s*\n/);
  const result = blocks.map((block,i) => {
    const lines = block.split('\n');
    const heading = /^Câu\s+(\d+)\s*:\s*(.+)$/iu.exec(lines[0]);
    ensure(heading, `Khối ${i+1}: cần dòng "Câu 1: Nội dung".`);
    const q: Question = { id: `${subjectId}:${heading[1]}`, number: Number(heading[1]), subjectId, content: heading[2], options: [], correctAnswers: [] };
    let answerSeen = false;
    for(const line of lines.slice(1)) {
      const answer = /^Đáp án:\s*(.+)$/iu.exec(line);
      const topic = /^Chủ đề:\s*(.+)$/iu.exec(line);
      const explanation = /^Giải thích:\s*(.*)$/iu.exec(line);
      const option = /^([\p{L}\p{N}_-]+)\.\s+(.+)$/u.exec(line);
      if(answer) { ensure(!answerSeen, `Câu ${q.number}: có nhiều dòng đáp án.`); answerSeen = true; q.correctAnswers = answer[1].split(',').map(k=>k.trim()); }
      else if(topic) { ensure(!q.topicId, `Câu ${q.number}: chủ đề trùng.`); q.topicId = topic[1]; }
      else if(explanation) { ensure(q.explanation === undefined, `Câu ${q.number}: giải thích trùng.`); q.explanation = explanation[1]; }
      else if(option) q.options.push({key:option[1],text:option[2]});
      else throw new Error(`Câu ${q.number}: dòng không nhận diện được: ${line}`);
    }
    return q;
  });
  validateQuestions(result); return result;
}

export function parseQuestions(source: string, format: 'json' | 'txt', subjectId: string): Question[] {
  ensure(identifier(subjectId), 'ID môn học không hợp lệ.');
  if(format === 'txt') return parseTxt(source,subjectId);
  let parsed: unknown;
  try { parsed = JSON.parse(source.replace(/^\uFEFF/,'')); } catch { throw new Error('File JSON không đúng cú pháp.'); }
  ensure(Array.isArray(parsed), 'JSON phải chứa một mảng câu hỏi.');
  if(parsed.length && object(parsed[0]) && Object.hasOwn(parsed[0],'question')) return convertLegacy(parsed,subjectId);
  validateQuestions(parsed);
  ensure(parsed.every(q=>q.subjectId === subjectId), 'subjectId trong JSON phải trùng ID môn đã nhập.');
  return parsed;
}
