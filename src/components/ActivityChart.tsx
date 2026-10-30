import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { activity } from '../domain/analytics';
import { useStudyStore } from '../store/useStudyStore';
export default function ActivityChart({days=7}:{days?:number}) {
  const data=useStudyStore(s=>s.data);
  const rows=activity(data,days);
  return <div className="chart-wrap" role="img" aria-label={`Hoạt động ${days} ngày: ${rows.reduce((n,r)=>n+r.total,0)} lượt trả lời`}><ResponsiveContainer width="100%" height={230} minWidth={0}>
    <AreaChart data={rows} margin={{left:-25,right:12,top:16,bottom:0}}><defs><linearGradient id="activity-green" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#159575" stopOpacity={0.2}/><stop offset="100%" stopColor="#159575" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="4 5" vertical={false} stroke="var(--border)"/><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{fill:'var(--muted)',fontSize:11}} minTickGap={24}/><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{fill:'var(--muted)',fontSize:11}}/><Tooltip contentStyle={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10}}/><Area name="Lượt trả lời" type="monotone" dataKey="total" stroke="#159575" strokeWidth={2.5} fill="url(#activity-green)" isAnimationActive={data.settings.animations}/></AreaChart>
  </ResponsiveContainer></div>;
}
