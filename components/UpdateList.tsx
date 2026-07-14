
import React, { useState } from 'react';
import { ReportData, LoginSession } from '../types';

interface UpdateListProps {
  reports: ReportData[];
  session: LoginSession;
  onUpdate: (report: ReportData) => void;
}

export const UpdateList: React.FC<UpdateListProps> = ({ reports, session, onUpdate }) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Helper untuk membersihkan dan memformat URL gambar agar tampil dengan benar
  const formatImageUrl = (url: any): string => {
    if (!url || typeof url !== 'string') return '';
    let clean = url.trim();
    
    // Penanganan Base64
    if (clean.startsWith('data:image')) {
      const parts = clean.split(',');
      if (parts.length > 1) {
        // Mengganti spasi dengan + yang sering terjadi pada transmisi base64
        return parts[0] + ',' + parts[1].replace(/\s/g, '+');
      }
      return clean;
    }
    
    // Penanganan Google Drive (sinkron dengan DataTable.tsx)
    if (clean.includes('drive.google.com/file/d/')) {
      const id = clean.split('/d/')[1]?.split('/')[0];
      if (id) return `https://lh3.googleusercontent.com/d/${id}`;
    }
    
    return clean;
  };

  // Mendapatkan tanggal lokal (YYYY-MM-DD) untuk akurasi hari ini di zona waktu Indonesia
  const localDate = new Date();
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  const todayLocal = `${year}-${month}-${day}`;

  const incompleteReports = reports.filter(r => {
    // 1. Filter berdasarkan tanggal lokal (hari ini)
    const reportDate = new Date(r.timestamp);
    const rYear = reportDate.getFullYear();
    const rMonth = String(reportDate.getMonth() + 1).padStart(2, '0');
    const rDay = String(reportDate.getDate()).padStart(2, '0');
    const rDateString = `${rYear}-${rMonth}-${rDay}`;
    
    const isToday = rDateString === todayLocal;
    
    // 2. Filter ULP sesuai session
    const isSameUlp = r.ulp === session.ulp;
    
    // 3. Filter Petugas sesuai session
    const sP1 = session.petugas1?.trim().toLowerCase();
    const sP2 = session.petugas2?.trim().toLowerCase();
    const rP1 = r.petugas1?.trim().toLowerCase();
    const rP2 = r.petugas2?.trim().toLowerCase();
    
    const isSamePetugas = (rP1 === sP1 && rP2 === sP2) || (rP1 === sP2 && rP2 === sP1);
    
    if (!isToday || !isSameUlp || !isSamePetugas) return false;

    // 4. Cek jika ada foto yang masih null
    const isBeforeIncomplete = r.photos.sebelum.some(p => p === null || p === '');
    const isAfterIncomplete = r.photos.sesudah.some(p => p === null || p === '');
    
    return isBeforeIncomplete || isAfterIncomplete;
  });

  if (incompleteReports.length === 0) {
    return (
      <div className="bg-white p-12 text-center rounded-[2rem] shadow-sm border border-slate-200 animate-fade-in">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
          <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Semua laporan anda hari ini sudah lengkap</h3>
        <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">Tidak ada data foto yang perlu diupdate untuk tim {session.petugas1} & {session.petugas2}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Update Dokumentasi Hari Ini</h3>
          <p className="text-[9px] font-bold text-primary uppercase tracking-widest">{session.ulp} • {session.petugas1} & {session.petugas2}</p>
        </div>
        <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-100 text-[10px] font-black uppercase tracking-widest">
          {incompleteReports.length} Laporan Belum Lengkap
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {incompleteReports.map(report => (
          <div key={report.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all group border-l-4 border-l-amber-400">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{report.noPenugasan}</div>
                <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight">{report.penyulang}</h4>
                <div className="text-[11px] font-bold text-slate-500 uppercase">Keypoint: {report.keypoint}</div>
              </div>
              <button 
                onClick={() => onUpdate(report)}
                className="bg-primary text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-cyan-100 hover:bg-cyan-800 transition-all active:scale-95"
              >
                Update Foto
              </button>
            </div>

            {/* Gallery Foto yang sudah ada (Ukuran Kecil) */}
            <div className="mb-4 flex flex-wrap gap-1.5">
               {[...report.photos.sebelum, ...report.photos.sesudah].filter(p => p).map((img, idx) => {
                 const formattedUrl = formatImageUrl(img);
                 return (
                   <div 
                    key={idx} 
                    className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:border-primary transition-colors bg-slate-50"
                    onClick={() => setPreviewImage(formattedUrl)}
                   >
                     <img src={formattedUrl} alt="thumb" className="w-full h-full object-cover" />
                   </div>
                 );
               })}
               {[...report.photos.sebelum, ...report.photos.sesudah].filter(p => p).length === 0 && (
                 <span className="text-[8px] font-bold text-slate-300 uppercase italic">Belum ada foto</span>
               )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
              <div className="space-y-1">
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Foto Sebelum</div>
                <div className="flex items-center gap-1">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-400 transition-all duration-500" 
                      style={{ width: `${(report.photos.sebelum.filter(p => p !== null && p !== '').length / 10) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-[9px] font-black text-slate-500">{report.photos.sebelum.filter(p => p !== null && p !== '').length}/10</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Foto Sesudah</div>
                <div className="flex items-center gap-1">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-cyan-400 transition-all duration-500" 
                      style={{ width: `${(report.photos.sesudah.filter(p => p !== null && p !== '').length / 10) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-[9px] font-black text-slate-500">{report.photos.sesudah.filter(p => p !== null && p !== '').length}/10</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Pratinjau Gambar */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-4 animate-fade-in" 
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative w-full max-w-md">
            <img 
              src={previewImage} 
              alt="Full Preview" 
              className="w-full h-auto aspect-square object-contain bg-black rounded-3xl shadow-2xl border-4 border-white/20" 
            />
            <button 
              className="absolute -top-4 -right-4 bg-red-500 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-xl font-bold"
              onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
            >
              ✕
            </button>
          </div>
          <p className="text-white text-[10px] mt-6 font-black uppercase tracking-[0.3em] animate-pulse">
            Ketuk di mana saja untuk menutup
          </p>
        </div>
      )}
    </div>
  );
};
