import type { Question, StudyData } from '../domain/models';
import { grade } from '../domain/learning';

export function ensure(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
export const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
export const identifier = (value: unknown): value is string => text(value) && value !== 'prototype' && !Object.hasOwn(Object.prototype,value);
export const integer = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
const timestamp = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const unique = (values: unknown[]) => new Set(values).size === values.length;
const stringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(identifier) && unique(value);

export function validateQuestions(value: unknown): asserts value is Question[] {
  ensure(Array.isArray(value) && value.length > 0, 'Bộ câu hỏi phải là một mảng không rỗng.');
  const ids = new Set<string>();
  value.forEach((q: unknown, i) => {
    const label = `Câu ${i + 1}`;
    ensure(object(q), `${label}: dữ liệu không phải object.`);
    ensure(identifier(q.id) && !ids.has(q.id), `${label}: ID thiếu hoặc trùng.`); ids.add(q.id);
    ensure(integer(q.number) && q.number > 0 && identifier(q.subjectId) && text(q.content), `${label}: thiếu số thứ tự, môn hoặc nội dung.`);
    ensure(q.topicId === undefined || text(q.topicId), `${label}: chủ đề không hợp lệ.`);
    ensure(q.explanation === undefined || typeof q.explanation === 'string', `${label}: ghi chú không hợp lệ.`);
    ensure(Array.isArray(q.options) && q.options.length >= 2, `${label}: cần ít nhất hai lựa chọn.`);
    const keys: string[] = [];
    q.options.forEach((op: unknown) => { ensure(object(op) && identifier(op.key) && text(op.text), `${label}: lựa chọn thiếu khóa hoặc nội dung.`); keys.push(op.key); });
    ensure(unique(keys), `${label}: khóa lựa chọn trùng.`);
    ensure(stringArray(q.correctAnswers) && q.correctAnswers.length > 0 && q.correctAnswers.every(k => keys.includes(k)), `${label}: thiếu đáp án hoặc đáp án không tồn tại trong lựa chọn.`);
  });
}

export function validateStudyData(value: unknown): asserts value is StudyData {
  ensure(object(value), 'Backup thiếu dữ liệu.');
  const d = value;
  ensure(Array.isArray(d.subjects), 'Danh sách môn không hợp lệ.');
  const subjectIds = new Set<string>();
  for (const s of d.subjects) { ensure(object(s) && identifier(s.id) && text(s.name) && typeof s.description === 'string' && timestamp(s.createdAt) && !subjectIds.has(s.id), 'Môn học thiếu thông tin hoặc trùng ID.'); subjectIds.add(s.id); }
  ensure(Array.isArray(d.questions), 'Danh sách câu hỏi không hợp lệ.');
  if(d.questions.length) validateQuestions(d.questions);
  const questions = d.questions as Question[];
  const map = new Map(questions.map(q => [q.id, q]));
  ensure(questions.every(q => subjectIds.has(q.subjectId)), 'Câu hỏi tham chiếu môn không tồn tại.');
  ensure(object(d.settings), 'Thiếu cài đặt.');
  const st = d.settings;
  ensure(typeof st.theme === 'string' && ['light','dark','system'].includes(st.theme) && integer(st.groupSize) && [20,50,100].includes(st.groupSize), 'Theme hoặc nhóm học không hợp lệ.');
  ensure(integer(st.reviewGap) && st.reviewGap >= 1 && st.reviewGap <= 1000, 'Khoảng ôn phải từ 1 đến 1000 câu.');
  ensure(['autoAdvance','shuffleOptions','animations'].every(k => typeof st[k] === 'boolean'), 'Tùy chọn phải là boolean.');
  ensure(typeof st.examMinutes === 'number' && st.examMinutes >= 1 && st.examMinutes <= 1440 && Number.isFinite(st.examMinutes), 'Thời gian thi không hợp lệ.');
  ensure(Array.isArray(st.intervals) && st.intervals.length === 5 && st.intervals.every((v: unknown, i: number, a: unknown[]) => integer(v) && v >= 1 && v <= 3650 && (i === 0 || v > Number(a[i-1]))), 'Cần 5 mốc ngày tăng dần từ 1 đến 3650.');
  ensure(object(d.progress), 'Tiến trình không hợp lệ.');
  for(const [id,p] of Object.entries(d.progress)) {
    ensure(object(p) && id === p.questionId && map.get(id)?.subjectId === p.subjectId, 'Tiến trình tham chiếu câu không tồn tại.');
    ensure(typeof p.starred === 'boolean' && [p.correct,p.wrong,p.streak,p.level].every(integer) && Number(p.level) <= 5, 'Kết quả học không hợp lệ.');
    ensure((p.dueAt === null || timestamp(p.dueAt)) && (p.lastAnsweredAt === null || timestamp(p.lastAnsweredAt)), 'Lịch ôn không hợp lệ.');
  }
  const selections = (v: unknown, ids: string[]) => {
    ensure(object(v), 'Lựa chọn không hợp lệ.');
    for(const [id, selected] of Object.entries(v)) ensure(ids.includes(id) && stringArray(selected) && selected.every(k => map.get(id)!.options.some(o => o.key === k)), 'Lựa chọn tham chiếu câu hoặc đáp án không tồn tại.');
  };
  const order = (v: unknown, ids: string[]) => {
    ensure(object(v) && Object.keys(v).length === ids.length, 'Thứ tự đáp án thiếu câu hỏi.');
    for(const id of ids) { const keys = v[id]; ensure(stringArray(keys) && keys.length === map.get(id)!.options.length && keys.every(k => map.get(id)!.options.some(o => o.key === k)), 'Thứ tự đáp án bị lỗi.'); }
  };
  const sessionBase = (s: Record<string, unknown>) => {
    ensure(identifier(s.id) && identifier(s.subjectId) && subjectIds.has(s.subjectId) && text(s.seed), 'Phiên học thiếu định danh.');
    ensure(stringArray(s.questionIds) && s.questionIds.length > 0 && s.questionIds.every(id => map.get(id)?.subjectId === s.subjectId), 'Phiên tham chiếu câu không tồn tại.');
    ensure(integer(s.position) && s.position <= s.questionIds.length, 'Vị trí học không hợp lệ.');
    ensure(timestamp(s.startedAt), 'Thời điểm bắt đầu không hợp lệ.');
    selections(s.selections,s.questionIds); order(s.optionOrder,s.questionIds);
  };
  ensure(object(d.practices), 'Danh sách phiên luyện tập không hợp lệ.');
  for(const [id,s] of Object.entries(d.practices)) {
    ensure(object(s) && id === s.id, 'ID phiên luyện tập không hợp lệ.'); sessionBase(s);
    const ids = s.questionIds as string[];
    ensure(typeof s.mode === 'string' && ['sequential','random','wrong','spaced','starred'].includes(s.mode), 'Chế độ học không hợp lệ.');
    ensure(object(s.checked) && Object.entries(s.checked).every(([k,v]) => ids.includes(k) && typeof v === 'boolean'), 'Trạng thái kiểm tra không hợp lệ.');
    ensure(Object.entries(s.checked).every(([k,v]) => !v || (s.selections as Record<string,string[]>)[k]?.length), 'Câu đã kiểm tra thiếu lựa chọn.');
    ensure(Array.isArray(s.queue) && unique(s.queue.map(x => object(x) ? x.questionId : null)) && s.queue.every(x => object(x) && identifier(x.questionId) && ids.includes(x.questionId) && integer(x.dueStep) && integer(x.attempts) && x.attempts > 0), 'Hàng chờ ôn bị lỗi hoặc trùng.');
    ensure(integer(s.step) && integer(s.groupSize) && [20,50,100].includes(s.groupSize) && timestamp(s.lastActionAt), 'Bộ đếm phiên không hợp lệ.');
    ensure(Array.isArray(s.acknowledgedGroups) && unique(s.acknowledgedGroups) && s.acknowledgedGroups.every(x => integer(x) && x > 0 && x < ids.length), 'Nhóm đã học không hợp lệ.');
    ensure(stringArray(s.wrongIds) && s.wrongIds.every(id => ids.includes(id)), 'Danh sách sai không hợp lệ.');
    ensure((s.reviewId === null || (identifier(s.reviewId) && ids.includes(s.reviewId))) && typeof s.reviewChecked === 'boolean' && typeof s.finished === 'boolean' && typeof s.blockPending === 'boolean', 'Trạng thái ôn không hợp lệ.');
    ensure(stringArray(s.reviewSelected), 'Lựa chọn ôn không hợp lệ.');
    if(s.reviewId) selections({[String(s.reviewId)]:s.reviewSelected},ids);
    ensure(!s.reviewChecked || (s.reviewId !== null && s.reviewSelected.length > 0), 'Câu ôn đã kiểm tra thiếu lựa chọn.');
    ensure(Number(s.position) < ids.length || s.reviewId !== null, 'Phiên hết câu thiếu lượt ôn.');
    const parent = identifier(s.returnToSessionId) ? d.practices[s.returnToSessionId] : null;
    ensure(s.returnToSessionId === null || (s.returnToSessionId !== id && object(parent) && parent.subjectId === s.subjectId), 'Phiên học quay lại không tồn tại.');
  }
  ensure(d.activePracticeId === null || (typeof d.activePracticeId === 'string' && Object.hasOwn(d.practices,d.activePracticeId)), 'Phiên học đang mở không tồn tại.');
  ensure(Array.isArray(d.exams), 'Lịch sử thi không hợp lệ.');
  const examIds = new Set<string>();
  for(const e of d.exams) {
    ensure(object(e), 'Đề thi không hợp lệ.'); sessionBase(e);
    ensure(Number(e.position) < (e.questionIds as string[]).length, 'Vị trí đề thi không hợp lệ.');
    ensure(!examIds.has(String(e.id)) && text(e.title) && timestamp(e.deadline) && e.deadline > Number(e.startedAt), 'Đề thi trùng hoặc deadline không hợp lệ.'); examIds.add(String(e.id));
    ensure(e.submittedAt === null || (timestamp(e.submittedAt) && e.submittedAt >= Number(e.startedAt) && e.submittedAt <= e.deadline), 'Thời điểm nộp không hợp lệ.');
    ensure(stringArray(e.flagged) && e.flagged.every(id => (e.questionIds as string[]).includes(id)), 'Câu đánh dấu xem lại không hợp lệ.');
  }
  ensure(d.activeExamId === null || (identifier(d.activeExamId) && examIds.has(d.activeExamId)), 'Bài thi đang mở không tồn tại.');
  ensure(Array.isArray(d.attempts), 'Lịch sử trả lời không hợp lệ.');
  const attemptIds = new Set<string>();
  for(const a of d.attempts) {
    ensure(object(a) && identifier(a.id) && !attemptIds.has(a.id), 'Lượt trả lời thiếu ID hoặc trùng.'); attemptIds.add(a.id);
    ensure(identifier(a.questionId) && identifier(a.subjectId), 'Định danh lượt trả lời phải là chuỗi.');
    const q = map.get(a.questionId);
    ensure(q && q.subjectId === a.subjectId && typeof a.correct === 'boolean' && timestamp(a.at) && timestamp(a.durationMs) && identifier(a.sessionId), 'Lịch sử trả lời hỏng.');
    selections({[q.id]:a.selected},[q.id]);
    ensure(typeof a.mode === 'string' && ['sequential','random','wrong','spaced','starred','review','exam'].includes(a.mode) && a.correct === grade(q,a.selected as string[]), 'Kết quả trả lời không khớp đáp án.');
  }
}
