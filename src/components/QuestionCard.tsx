import { Check, Circle, Square, Star, X } from 'lucide-react';
import type { Question } from '../domain/models';
import { grade } from '../domain/learning';
export function QuestionCard({question,selected,checked=false,order,starred=false,onSelect,onStar,disabled=false}:{question:Question;selected:string[];checked?:boolean;order?:string[];starred?:boolean;onSelect?:(key:string)=>void;onStar?:()=>void;disabled?:boolean}) {
  const multi=question.correctAnswers.length>1;
  const options=(order ?? question.options.map(o=>o.key)).map(key=>question.options.find(o=>o.key===key)!);
  const correct=checked&&grade(question,selected);
  return <section className="card question-card" aria-label={`Câu hỏi ${question.number}`}>
    <div className="question-meta"><span className="tag">Câu {question.number}</span>{question.topicId&&<span className="muted">{question.topicId}</span>}{onStar&&<button className={`icon-button star-button ${starred?'starred':''}`} onClick={onStar} aria-label={starred?'Bỏ đánh dấu sao':'Đánh dấu sao'} aria-pressed={starred}><Star size={21} fill={starred?'currentColor':'none'}/></button>}</div>
    <h2 className="question-content">{question.content}</h2>
    <p className="answer-hint">{multi?'Chọn tất cả đáp án đúng':'Chọn một đáp án đúng'} <span>· {question.options.length} lựa chọn</span></p>
    <div className="options" role="group" aria-label="Các lựa chọn">
      {options.map((op,i)=>{const chosen=selected.includes(op.key), right=checked&&question.correctAnswers.includes(op.key),wrong=checked&&chosen&&!right;
        return <button key={op.key} className={`option ${chosen?'selected':''} ${right?'correct':''} ${wrong?'incorrect':''}`} aria-pressed={chosen} disabled={disabled||checked||!onSelect} onClick={()=>onSelect?.(op.key)}>
          <span className="option-key">{op.key}</span>{' '}<span className="option-text">{op.text}</span><span className="option-symbol" aria-hidden="true">{right?<Check size={20}/>:wrong?<X size={20}/>:multi?<Square size={18}/>:<Circle size={18} fill={chosen?'currentColor':'none'}/>}</span>{' '}<span className="sr-only">{right?' · Đáp án đúng':wrong?' · Đã chọn sai':''} · Phím {i+1}</span>
        </button>;
      })}
    </div>
    {checked&&<div className={`answer-feedback ${correct?'success':'failure'}`} role="status"><strong>{correct?'Chính xác! Tiếp tục phát huy nhé.':selected.length?'Chưa chính xác. Cùng ghi nhớ đáp án nhé.':'Bạn đã bỏ trống câu này.'}</strong><p>Đáp án đúng: {question.correctAnswers.join(', ')}</p>{question.explanation&&<p className="explanation">{question.explanation}</p>}</div>}
  </section>;
}
