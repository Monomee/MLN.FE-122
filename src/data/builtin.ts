import original from '../../data/questions.json';
import { convertLegacy } from './importers';
import { emptyData } from '../domain/models';
export function builtinData() {
  const data = emptyData();
  data.subjects = [{id:'mln122',name:'Kinh tế chính trị Mác – Lênin',description:'MLN122 · Bộ câu hỏi gốc · 526 câu',createdAt:0}];
  data.questions = convertLegacy(original,'mln122');
  return data;
}
