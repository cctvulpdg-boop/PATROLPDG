
import React, { useState } from 'react';
import { ReportData } from '../types';

interface DataTableProps {
  reports: ReportData[];
  onEdit?: (report: ReportData) => void;
}

export const DataTable: React.FC<DataTableProps> = ({ reports, onEdit }) => {
  const [previewImage, setPreviewImage] = useState<{ url: string } | null>(null);

  if (reports.length === 0) {
    return (
      <div className="bg-white p-12 rounded-[2rem] shadow-sm border-2 border-dashed border-slate-200 text-center animate-fade-in">
        <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-slate-800 font-black uppercase tracking-tight mb-2 text-xl">Belum Ada Data Laporan</h3>
        <p className="text-slate-500 text-xs font-medium max-w-xs mx-auto leading-relaxed">
          Tidak ditemukan data untuk rentang tanggal atau filter ULP yang dipilih. <br/>
          <span className="text-primary font-bold">Coba ubah filter tanggal</span> atau pastikan nama Sheet di Spreadsheet adalah <span className="font-bold text-slate-800">"Laporan"</span>.
        </p>
      </div>
    );
  }

  const formatImageUrl = (url: any): string => {
    if (!url || typeof url !== 'string') return '';
    let clean = url.trim();
    if (clean.startsWith('data:image')) {
      const parts = clean.split(',');
      if (parts.length > 1) {
        return parts[0] + ',' + parts[1].replace(/\s/g, '+');
      }
      return clean;
    }
    
    // Extract Google Drive File ID using regex to cover all link formats
    const driveIdRegex = /(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=)([^/\s?&]+)/;
    const match = clean.match(driveIdRegex);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    
    return clean;
  };

  const isValidImage = (str: any): boolean => {
    if (!str || typeof str !== 'string') return false;
    const s = str.trim();
    return s.startsWith('data:image') || s.startsWith('http');
  };

  const PhotoCard: React.FC<{
    url: string;
    label: string;
    type: 'sebelum' | 'sesudah';
  }> = ({ url, label, type }) => {
    const finalUrl = formatImageUrl(url);
    if (!finalUrl) return null;

    return (
      <div
        className="group relative flex flex-col items-center gap-0.5 cursor-pointer"
        onClick={() => setPreviewImage({ url: finalUrl })}
      >
        <div
          className={`w-12 h-12 rounded-lg border-2 overflow-hidden shadow-sm transition-transform group-hover:scale-110 ${
            type === 'sebelum'
              ? 'border-amber-300 bg-amber-50'
              : 'border-cyan-300 bg-cyan-50'
          }`}
        >
          <img
            src={finalUrl}
            alt={label}
            className="w-full h-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://via.placeholder.com/80x80?text=ERR";
            }}
          />
        </div>
        <span
          className={`text-[5px] font-black uppercase tracking-tighter leading-none ${
            type === 'sebelum' ? 'text-amber-600' : 'text-cyan-600'
          }`}
        >
          {label}
        </span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-600 min-w-[800px]">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold w-40">Waktu & Aksi</th>
              <th className="px-6 py-4 font-semibold w-40">No. Penugasan</th>
              <th className="px-6 py-4 font-semibold">ULP / Petugas</th>
              <th className="px-6 py-4 font-semibold">Lokasi</th>
              <th className="px-6 py-4 font-semibold text-center w-64">Dokumentasi (Sblm / Ssdh)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reports.map((report) => {
              const validSebelum = report.photos.sebelum.filter(isValidImage);
              const validSesudah = report.photos.sesudah.filter(isValidImage);
              
              return (
                <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap align-top">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col">
                        <div className="font-medium text-slate-900">{new Date(report.timestamp).toLocaleDateString('id-ID')}</div>
                        <div className="text-xs text-slate-500">{new Date(report.timestamp).toLocaleTimeString('id-ID')} WIB</div>
                        <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-600 uppercase">
                          {report.bulan}
                        </div>
                      </div>
                      {onEdit && (
                        <button 
                          onClick={() => onEdit(report)}
                          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-primary hover:border-primary hover:shadow-sm transition-all"
                          title="Edit Laporan"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-700 align-top font-bold text-xs break-all">
                      {report.noPenugasan}
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="font-semibold text-primary">{report.ulp}</div>
                    <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-tight">Penyulang: {report.penyulang}</div>
                    <div className="mt-2 text-xs space-y-0.5">
                      <div className="font-medium text-slate-700 flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-slate-300"></div> {report.petugas1}</div>
                      <div className="font-medium text-slate-700 flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-slate-300"></div> {report.petugas2}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                     <div className="text-xs font-black text-slate-800 mb-2 uppercase">Keypoint: {report.keypoint}</div>
                    <div className="flex flex-col gap-1.5 text-[10px]">
                      <div className="flex items-center gap-2 text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        <span className="font-bold">START:</span> {report.titikStart}
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        <span className="font-bold">FINISH:</span> {report.titikFinish}
                      </div>
                      {(report.jumlahTiang || report.jumlahKms) && (
                        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-2 text-[9px] text-slate-600 font-bold">
                          {report.jumlahTiang && (
                            <span className="bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                              ⚡ Tiang: <span className="font-black text-slate-800">{report.jumlahTiang}</span>
                            </span>
                          )}
                          {report.jumlahKms && (
                            <span className="bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                              📏 KMS: <span className="font-black text-slate-800">{report.jumlahKms}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex flex-col gap-1 p-2 bg-amber-50/50 rounded-xl border border-amber-100/50 min-h-[60px]">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[7px] font-black text-amber-600 uppercase tracking-widest">Baris Atas: Sebelum</span>
                          <span className="text-[6px] font-bold text-amber-400 uppercase">{validSebelum.length} Foto</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 justify-start">
                          {validSebelum.length > 0 ? (
                            validSebelum.map((u, i) => (
                              <PhotoCard
                                key={`sb-${report.id}-${i}`}
                                url={u!}
                                label={`SB-${i + 1}`}
                                type="sebelum"
                              />
                            ))
                          ) : (
                            <span className="text-[8px] italic text-slate-300 p-2">Tidak ada foto sebelum</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 p-2 bg-cyan-50/50 rounded-xl border border-cyan-100/50 min-h-[60px]">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[7px] font-black text-cyan-600 uppercase tracking-widest">Baris Bawah: Sesudah</span>
                          <span className="text-[6px] font-bold text-cyan-400 uppercase">{validSesudah.length} Foto</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 justify-start">
                          {validSesudah.length > 0 ? (
                            validSesudah.map((u, i) => (
                              <PhotoCard
                                key={`sd-${report.id}-${i}`}
                                url={u!}
                                label={`SS-${i + 1}`}
                                type="sesudah"
                              />
                            ))
                          ) : (
                            <span className="text-[8px] italic text-slate-300 p-2">Tidak ada foto sesudah</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {previewImage && (
        <div 
          className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-4 animate-fade-in" 
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative w-full max-w-md">
            <img 
              src={previewImage.url} 
              alt="Preview" 
              className="w-full h-auto aspect-square object-contain bg-black rounded-3xl shadow-2xl border-4 border-white/10" 
              referrerPolicy="no-referrer" 
            />
            <button 
              className="absolute -top-4 -right-4 bg-red-500 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-xl font-bold"
              onClick={() => setPreviewImage(null)}
            >
              ✕
            </button>
          </div>
          <p className="text-white text-[10px] mt-6 font-black uppercase tracking-[0.3em] animate-pulse">
            Ketuk di mana saja untuk kembali
          </p>
        </div>
      )}
    </div>
  );
};
