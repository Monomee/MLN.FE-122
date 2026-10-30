import { useEffect } from 'react';
export function useQuizKeyboard(keys:string[],onSelect:(key:string)=>void,onEnter:()=>void,enabled=true) {
  useEffect(()=>{
    if(!enabled)return;
    const handler=(e:KeyboardEvent)=>{
      if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||document.querySelector('dialog[open]'))return;
      const el=e.target as HTMLElement;
      if(el.closest('input,textarea,select,[contenteditable="true"]'))return;
      if(e.key==='Enter') {if(el.closest('button,a'))return;e.preventDefault();onEnter();return;}
      const index=/^[1-9]$/.test(e.key)?Number(e.key)-1:-1;
      const key=index>=0?keys[index]:keys.find(k=>k.toLowerCase()===e.key.toLowerCase());
      if(key){e.preventDefault();onSelect(key);}
    };
    window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
  },[keys,onSelect,onEnter,enabled]);
}
