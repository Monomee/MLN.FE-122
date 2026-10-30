import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, HashRouter, Link, Route, Routes } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import Layout from '../components/Layout';
import { Empty, Notice } from '../components/common';
import { useStudyStore } from '../store/useStudyStore';
import { isExpired } from '../domain/learning';
const Dashboard=lazy(()=>import('../features/dashboard/Dashboard'));
const Subjects=lazy(()=>import('../features/subjects/Subjects'));
const Practice=lazy(()=>import('../features/practice/Practice'));
const Review=lazy(()=>import('../features/review/Review'));
const Exam=lazy(()=>import('../features/exam/Exam'));
const Statistics=lazy(()=>import('../features/statistics/Statistics'));
const QuestionBank=lazy(()=>import('../features/question-bank/QuestionBank'));
const Settings=lazy(()=>import('../features/settings/Settings'));
export default function App() {
  const Router = import.meta.env.VITE_GITHUB_PAGES === 'true' ? HashRouter : BrowserRouter;
  const ready=useStudyStore(s=>s.ready),error=useStudyStore(s=>s.error),initialize=useStudyStore(s=>s.initialize);
  useEffect(()=>{void initialize();},[initialize]);
  useEffect(()=>{
    if(!ready)return;
    const tick=()=>{
      const store=useStudyStore.getState();if(store.status==='error'||store.restoring)return;
      for(const exam of store.data.exams) if(isExpired(exam)) store.submitExam(exam.id);
    };
    tick();const timer=setInterval(tick,1000);window.addEventListener('focus',tick);document.addEventListener('visibilitychange',tick);
    return()=>{clearInterval(timer);window.removeEventListener('focus',tick);document.removeEventListener('visibilitychange',tick);};
  },[ready]);
  if(!ready) return <main className="loading-screen"><Leaf size={38}/><h1>học mỗi ngày</h1>{error?<><Notice>{error}</Notice><p>Không tự xóa dữ liệu khi khởi động lỗi. Kiểm tra quyền lưu trữ hoặc đóng tab cũ rồi tải lại.</p><button className="button" onClick={()=>location.reload()}>Thử lại</button></>:<p role="status">Đang mở không gian học tập của bạn…</p>}</main>;
  return <Router><Suspense fallback={<div className="route-loading" role="status">Đang tải trang…</div>}><Routes><Route element={<Layout/>}><Route index element={<Dashboard/>}/><Route path="subjects" element={<Subjects/>}/><Route path="subjects/:subjectId" element={<Subjects/>}/><Route path="practice" element={<Practice/>}/><Route path="review" element={<Review/>}/><Route path="exam" element={<Exam/>}/><Route path="exam/:examId" element={<Exam/>}/><Route path="statistics" element={<Statistics/>}/><Route path="questions" element={<QuestionBank/>}/><Route path="settings" element={<Settings/>}/><Route path="*" element={<Empty title="Trang này không tồn tại"><Link to="/">Quay về tổng quan</Link></Empty>}/></Route></Routes></Suspense></Router>;
}
