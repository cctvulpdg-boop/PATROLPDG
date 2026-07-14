
import React, { useState, useMemo } from 'react';
import { ReportData, ULPName } from '../types';

interface DashboardProps {
  reports: ReportData[];
}

export const Dashboard: React.FC<DashboardProps> = ({ reports }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 1. Filter laporan berdasarkan tanggal
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const reportDate = new Date(r.timestamp).toISOString().split('T')[0];
      const startMatch = !startDate || reportDate >= startDate;
      const endMatch = !endDate || reportDate <= endDate;
      return startMatch && endMatch;
    });
  }, [reports, startDate, endDate]);

  // 2. Hitung statistik per ULP
  const statsPerULP = useMemo(() => {
    const stats: Record<string, number> = {};
    Object.values(ULPName).forEach(name => {
      stats[name] = filteredReports.filter(r => r.ulp === name).length;
    });
    return stats;
  }, [filteredReports]);

  // 3. Hitung statistik per Penyulang
  const statsPerPenyulang = useMemo(() => {
    const pMap: Record<string, { name: string, ulp: string, count: number }> = {};
    
    filteredReports.forEach(r => {
      const key = `${r.ulp}-${r.penyulang}`;
      if (!pMap[key]) {
        pMap[key] = { name: r.penyulang, ulp: r.ulp, count: 0 };
      }
      pMap[key].count++;
    });

    return Object.values(pMap).sort((a, b) => b.count - a.count);
  }, [filteredReports]);

  const totalUP3 = filteredReports.length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header & Filter Area */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Dashboard Monitoring</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Realisasi Yandal Patrol • Unit Layanan Padang</p>
        </div>
        
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Dari Tanggal</label>
            <input 
              type="date" 
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Sampai Tanggal</label>
            <input 
              type="date" 
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 font-black rounded-xl text-[10px] uppercase tracking-widest transition-all"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Main Scorecard UP3 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-4 bg-gradient-to-br from-primary to-cyan-900 p-8 rounded-[2rem] shadow-xl shadow-cyan-100 text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 transform group-hover:scale-110 transition-transform duration-700">
            <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <div className="relative z-10 text-center md:text-left">
            <h3 className="text-sm font-black uppercase tracking-[0.4em] text-cyan-200 mb-2">Total Realisasi UP3</h3>
            <div className="flex items-baseline justify-center md:justify-start gap-3">
              <span className="text-7xl font-black tracking-tighter">{totalUP3}</span>
              <span className="text-xl font-bold text-cyan-300 uppercase tracking-widest">Laporan</span>
            </div>
          </div>
          <div className="relative z-10 grid grid-cols-2 gap-4 w-full md:w-auto">
             <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
                <p className="text-[10px] font-black text-cyan-100 uppercase mb-1">Status Sistem</p>
                <p className="text-sm font-bold">Terhubung</p>
             </div>
             <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
                <p className="text-[10px] font-black text-cyan-100 uppercase mb-1">Periode</p>
                <p className="text-sm font-bold">{startDate && endDate ? 'Filter Aktif' : 'Semua Waktu'}</p>
             </div>
          </div>
        </div>

        {/* Individual ULP Scorecards */}
        {Object.values(ULPName).map((name) => (
          <div key={name} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-slate-50 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-slate-800 tracking-tight">{statsPerULP[name]}</span>
              </div>
            </div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{name}</h4>
          </div>
        ))}
      </div>

      {/* Penyulang Realization Table */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Realisasi Per Penyulang</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Daftar peringkat realisasi terbanyak</p>
          </div>
          <div className="px-4 py-1.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100 text-[10px] font-black uppercase tracking-widest">
            {statsPerPenyulang.length} Penyulang Aktif
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-4 font-black tracking-widest w-20">Rank</th>
                <th className="px-8 py-4 font-black tracking-widest">Nama Penyulang</th>
                <th className="px-8 py-4 font-black tracking-widest">Unit Layanan (ULP)</th>
                <th className="px-8 py-4 font-black tracking-widest text-center w-48">Total Realisasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {statsPerPenyulang.length > 0 ? (
                statsPerPenyulang.map((item, index) => (
                  <tr key={`${item.ulp}-${item.name}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                        index === 0 ? 'bg-amber-100 text-amber-700' : 
                        index === 1 ? 'bg-slate-100 text-slate-500' : 
                        index === 2 ? 'bg-orange-50 text-orange-700' : 'text-slate-400'
                      }`}>
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-8 py-5 font-black text-slate-800 uppercase tracking-tight">
                      {item.name}
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-cyan-50 text-cyan-700 rounded-lg text-[10px] font-black uppercase border border-cyan-100">
                        {item.ulp}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="inline-flex items-center gap-2">
                        <span className="text-lg font-black text-primary">{item.count}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Laporan</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="w-12 h-12 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Tidak ada data untuk periode ini</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {statsPerPenyulang.length > 0 && (
          <div className="p-6 bg-slate-50 border-t border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center italic">
              * Data realisasi dihitung berdasarkan laporan yang masuk dalam rentang tanggal filter yang dipilih.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
