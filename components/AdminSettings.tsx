
import React, { useState } from 'react';
import { ULPName, ULPData } from '../types';

interface AdminSettingsProps {
  masterData: Record<string, ULPData>;
  onAddPetugas: (ulp: ULPName, names: string[]) => void;
  onDeletePetugas: (ulp: ULPName, name: string) => void;
  onAddPenyulang: (ulp: ULPName, names: string[]) => void;
  onDeletePenyulang: (ulp: ULPName, name: string) => void;
  onAddKeypoint: (ulp: ULPName, penyulang: string, keypoints: string[]) => void;
  onDeleteKeypoint: (ulp: ULPName, penyulang: string, keypoint: string) => void;
  onInitDefault?: () => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ 
  masterData, 
  onAddPetugas, 
  onDeletePetugas, 
  onAddPenyulang,
  onDeletePenyulang,
  onAddKeypoint,
  onDeleteKeypoint,
  onInitDefault
}) => {
  const [selectedUlp, setSelectedUlp] = useState<ULPName | ''>('');
  const [newPetugas, setNewPetugas] = useState('');
  const [newPenyulang, setNewPenyulang] = useState('');
  
  const [activePenyulangForKeypoints, setActivePenyulangForKeypoints] = useState('');
  const [newKeypoint, setNewKeypoint] = useState('');

  const handleAddPetugasSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUlp && newPetugas.trim()) {
      const names = newPetugas.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
      if (names.length > 0) {
        onAddPetugas(selectedUlp, names);
        setNewPetugas('');
      }
    }
  };

  const handleAddPenyulangSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUlp && newPenyulang.trim()) {
      const names = newPenyulang.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
      if (names.length > 0) {
        onAddPenyulang(selectedUlp, names);
        setNewPenyulang('');
      }
    }
  };

  const handleAddKeypointSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUlp && activePenyulangForKeypoints && newKeypoint.trim()) {
      const names = newKeypoint.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
      if (names.length > 0) {
        onAddKeypoint(selectedUlp, activePenyulangForKeypoints, names);
        setNewKeypoint('');
      }
    }
  };

  const currentData = selectedUlp ? masterData[selectedUlp] : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 className="font-bold text-blue-800">Petunjuk Pengelolaan Database</h3>
          <p className="text-sm text-blue-700 mt-1">
            Gunakan panel ini untuk mengelola master data petugas, penyulang, dan keypoint. 
            Data yang diubah akan disinkronkan ke server secara real-time.
          </p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Data Master Sistem</h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Edit Konfigurasi Petugas & Infrastruktur</p>
          </div>
          <div className="w-full md:w-64">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pilih Unit Layanan (ULP)</label>
            <select
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none font-bold text-sm bg-slate-50 transition-all"
              value={selectedUlp}
              onChange={(e) => {
                setSelectedUlp(e.target.value as ULPName);
                setActivePenyulangForKeypoints('');
              }}
            >
              <option value="">-- Pilih ULP --</option>
              {Object.values(masterData).map((data: ULPData) => (
                <option key={data.name} value={data.name}>{data.name}</option>
              ))}
            </select>
          </div>
        </div>

        {!selectedUlp && (
          <div className="text-center p-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
             <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-slate-100">
               <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
               </svg>
             </div>
             <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Silahkan Pilih Unit Dahulu</h3>
          </div>
        )}

        {selectedUlp && currentData && (
          <div className="space-y-12 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Petugas */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shadow-sm">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Daftar Petugas</h3>
                </div>
                
                <form onSubmit={handleAddPetugasSubmit} className="flex gap-2">
                  <input
                    placeholder="Nama Petugas..."
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-primary/10 outline-none"
                    value={newPetugas}
                    onChange={(e) => setNewPetugas(e.target.value)}
                  />
                  <button type="submit" className="bg-primary text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-cyan-800 shadow-lg shadow-cyan-100 transition-all">+</button>
                </form>

                <div className="bg-slate-50 rounded-2xl border border-slate-100 max-h-60 overflow-y-auto no-scrollbar">
                  <div className="divide-y divide-slate-200">
                    {currentData.petugas.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 group hover:bg-white transition-all">
                        <span className="text-xs font-bold text-slate-700 uppercase">{p}</span>
                        <button onClick={() => onDeletePetugas(selectedUlp, p)} className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Penyulang */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Daftar Penyulang</h3>
                </div>

                <form onSubmit={handleAddPenyulangSubmit} className="flex gap-2">
                  <input
                    placeholder="Kode Penyulang..."
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-primary/10 outline-none"
                    value={newPenyulang}
                    onChange={(e) => setNewPenyulang(e.target.value)}
                  />
                  <button type="submit" className="bg-amber-500 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 shadow-lg shadow-amber-100 transition-all">+</button>
                </form>

                <div className="bg-slate-50 rounded-2xl border border-slate-100 max-h-60 overflow-y-auto no-scrollbar">
                  <div className="divide-y divide-slate-200">
                    {currentData.penyulang.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 group hover:bg-white transition-all">
                        <span className="text-xs font-bold text-slate-700 uppercase">{p}</span>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => setActivePenyulangForKeypoints(p)}
                            className={`p-2 rounded-lg transition-all ${activePenyulangForKeypoints === p ? 'bg-amber-100 text-amber-600' : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50'}`}
                            title="Edit Keypoints"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          <button onClick={() => onDeletePenyulang(selectedUlp, p)} className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Keypoints (Full Width) */}
            <div className={`p-8 rounded-[2rem] border-2 transition-all ${activePenyulangForKeypoints ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-dashed border-slate-200 opacity-60'}`}>
               {!activePenyulangForKeypoints ? (
                 <div className="text-center py-10">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Pilih satu penyulang di atas untuk mengedit daftar Keypoint</p>
                 </div>
               ) : (
                 <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm border border-slate-100">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                         </div>
                         <div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Kelola Keypoint</h3>
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Penyulang: {activePenyulangForKeypoints}</p>
                         </div>
                       </div>
                       <button onClick={() => setActivePenyulangForKeypoints('')} className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest">Tutup</button>
                    </div>

                    <form onSubmit={handleAddKeypointSubmit} className="flex gap-2">
                       <input 
                        placeholder="Nama Keypoint (Contoh: RECLOSER XX)..."
                        className="flex-1 px-5 py-4 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-primary/10 outline-none bg-white shadow-sm"
                        value={newKeypoint}
                        onChange={(e) => setNewKeypoint(e.target.value)}
                       />
                       <button type="submit" className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-cyan-800 shadow-xl shadow-cyan-100">Tambah</button>
                    </form>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                       {(currentData.keypoints?.[activePenyulangForKeypoints] || []).length > 0 ? (
                         (currentData.keypoints?.[activePenyulangForKeypoints] || []).map((kp, idx) => (
                           <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between group">
                             <span className="text-[11px] font-bold text-slate-700 uppercase">{kp}</span>
                             <button onClick={() => onDeleteKeypoint(selectedUlp, activePenyulangForKeypoints, kp)} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                               </svg>
                             </button>
                           </div>
                         ))
                       ) : (
                         <div className="col-span-full py-8 text-center text-slate-400 font-bold text-[10px] uppercase tracking-widest">Belum ada keypoint terdaftar untuk penyulang ini</div>
                       )}
                    </div>
                 </div>
               )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
