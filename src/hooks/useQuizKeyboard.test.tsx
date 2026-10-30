import { render, screen, fireEvent } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { useQuizKeyboard } from './useQuizKeyboard';
function Harness({select,enter}:{select:(key:string)=>void;enter:()=>void}) {
  useQuizKeyboard(['A','B','E'],select,enter);
  return <><input aria-label="Nhập nội dung"/><button>Nút thao tác</button></>;
}
it('keyboard shortcuts select by displayed number or original key and Enter checks',()=>{
  const select=vi.fn(),enter=vi.fn();render(<Harness select={select} enter={enter}/>);
  fireEvent.keyDown(document.body,{key:'3'});fireEvent.keyDown(document.body,{key:'a'});fireEvent.keyDown(document.body,{key:'Enter'});
  expect(select.mock.calls).toEqual([['E'],['A']]);expect(enter).toHaveBeenCalledOnce();
});
it('typing, modified shortcuts and Enter on a focused button do not trigger quiz actions',()=>{
  const select=vi.fn(),enter=vi.fn();render(<Harness select={select} enter={enter}/>);
  const input=screen.getByRole('textbox');
  for(const key of ['a','1','Enter'])fireEvent.keyDown(input,{key});
  fireEvent.keyDown(document.body,{key:'a',ctrlKey:true});fireEvent.keyDown(document.body,{key:'a',metaKey:true});
  fireEvent.keyDown(screen.getByRole('button'),{key:'Enter'});
  expect(select).not.toHaveBeenCalled();expect(enter).not.toHaveBeenCalled();
});
