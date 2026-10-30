import { render, screen, fireEvent } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { QuestionCard } from './QuestionCard';
import type { Question } from '../domain/models';
const question:Question={id:'s:1',subjectId:'s',number:1,content:'Câu hỏi thực hành',options:[{key:'A',text:'Một'},{key:'B',text:'Hai'},{key:'E',text:'Năm'}],correctAnswers:['A','E']};
it('renders every option including E and reports selected states accessibly',()=>{
  const onSelect=vi.fn();render(<QuestionCard question={question} selected={['E']} onSelect={onSelect}/>);
  expect(screen.getByText('Chọn tất cả đáp án đúng')).toBeInTheDocument();
  const option=screen.getByRole('button',{name:/E Năm/});expect(option).toHaveAttribute('aria-pressed','true');fireEvent.click(option);expect(onSelect).toHaveBeenCalledWith('E');
});
it('does not reveal correct answers before checking and locks answers after checking',()=>{
  const {rerender}=render(<QuestionCard question={question} selected={['A']} onSelect={()=>{}}/>);
  expect(screen.queryByText(/Đáp án đúng:/)).not.toBeInTheDocument();
  rerender(<QuestionCard question={question} selected={['A']} checked onSelect={()=>{}}/>);
  expect(screen.getByText('Đáp án đúng: A, E')).toBeInTheDocument();expect(screen.getByText(/Chưa chính xác/)).toBeInTheDocument();
  screen.getAllByRole('button').forEach(button=>expect(button).toBeDisabled());
});
