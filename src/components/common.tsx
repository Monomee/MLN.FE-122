import { Component, useEffect, useRef, useState, type ReactNode, type ErrorInfo } from 'react';
import { AlertCircle, ArrowRight, Inbox, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PageHeading({eyebrow,title,description,action}:{eyebrow?:string;title:string;description:string;action?:ReactNode}) {
  return <div className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1><p className="muted">{description}</p></div>{action}</div>;
}
export function Empty({title,children}:{title:string;children?:ReactNode}) {return <div className="empty"><Inbox size={34}/><h3>{title}</h3>{children && <p className="muted">{children}</p>}</div>;}
export function Notice({children}:{children:ReactNode}) {return <div className="notice" role="alert"><AlertCircle size={18}/><span>{children}</span></div>;}
export function ProgressBar({value,label}:{value:number;label:string}) {return <div className="progress-track" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}><div style={{width:`${Math.min(100,Math.max(0,value))}%`}}/></div>;}
export function SectionTitle({title,to,children}:{title:string;to?:string;children?:ReactNode}) {return <div className="section-title"><h2>{title}</h2>{to ? <Link className="text-link" to={to}>Xem tất cả <ArrowRight size={15}/></Link>:children}</div>;}
export function useAction() {
  const [error,setError]=useState('');
  const run=(fn:()=>unknown)=>{setError('');try{const result=fn();if(result instanceof Promise) result.catch(e=>setError(e instanceof Error?e.message:String(e)));}catch(e){setError(e instanceof Error?e.message:String(e));}};
  return {error,run,setError};
}
export class ErrorBoundary extends Component<{children:ReactNode},{error:string}> {
  state={error:''};
  static getDerivedStateFromError(error: Error) {return {error:error.message};}
  componentDidCatch(error: Error, info: ErrorInfo) {console.error(error,info);}
  render(){return this.state.error?<main className="fatal"><h1>Không thể mở trang này</h1><Notice>{this.state.error}</Notice><button onClick={()=>location.reload()}>Tải lại trang</button></main>:this.props.children;}
}
export function Modal({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const el=ref.current;el?.showModal();return()=>el?.close();},[]);
  return <dialog ref={ref} className="modal" aria-label={title} onCancel={e=>{e.preventDefault();onClose();}}><div className="modal-heading"><h2>{title}</h2><button className="icon-button" aria-label="Đóng hộp thoại" onClick={onClose}><X size={20}/></button></div>{children}</dialog>;
}
export function downloadJson(value:unknown,name:string) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function readFile(file:File) {if(file.size>20*1024*1024)throw new Error('File tối đa 20 MB.');return file.text();}
