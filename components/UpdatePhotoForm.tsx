import React, { useState } from 'react';
import { ReportData } from '../types';
import { PhotoUpload } from './PhotoUpload';
import { PHOTO_SECTIONS } from '../constants';

interface UpdatePhotoFormProps {
  report: ReportData;
  onSubmit: (data: ReportData, isEdit: boolean) => Promise<void> | void;
  onCancel: () => void;
}

export const UpdatePhotoForm: React.FC<UpdatePhotoFormProps> = ({ report, onSubmit, onCancel }) => {
  const [photosSebelum, setPhotosSebelum] = useState<(string | null)[]>(() => {
    const arr = [...(report.photos?.sebelum || [])];
    while (arr.length < 10) arr.push(null);
    return arr.slice(0, 10);
  });
  const [photosSesudah, setPhotosSesudah] = useState<(string | null)[]>(() => {
    const arr = [...(report.photos?.sesudah || [])];
    while (arr.length < 10) arr.push(null);
    return arr.slice(0, 10);
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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
    if (clean.includes('drive.google.com/file/d/')) {
      const id = clean.split('/d/')[1]?.split('/')[0];
      if (id) return `https://lh3.googleusercontent.com/d/${id}`;
    }
    return clean;
  };

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          // Ukuran 160px adalah ukuran paling aman untuk kestabilan Google Apps Script & Drive
          const MAX_WIDTH = 160; 
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'medium';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
          // Kualitas 0.3 memastikan payload ringan (< 10KB) sehingga tidak memicu timeout di server
          resolve(canvas.toDataURL('image/jpeg', 0.3));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handlePhotoChange = async (index: number, type: 'sebelum' | 'sesudah', file: File) => {
    try {
      const resizedImage = await resizeImage(file);
      if (type === 'sebelum') {
        const newPhotos = [...photosSebelum];
        newPhotos[index] = resizedImage;
        setPhotosSebelum(newPhotos);
      } else {
        const newPhotos = [...photosSesudah];
        newPhotos[index] = resizedImage;
        setPhotosSesudah(newPhotos);
      }
    } catch (error) {
      alert("Gagal memproses foto.");
    }
  };

  const saveData = async () => {
    setIsSubmitting(true);
    // Sanitasi data: Pastikan tidak ada null yang terkirim
    const cleanSebelum = photosSebelum.map(p => (p === null || p === undefined) ? "" : p);
    const cleanSesudah = photosSesudah.map(p => (p === null || p === undefined) ? "" : p);

    const updatedReport: ReportData = {
      ...report,
      // PENTING: Timestamp harus sama dengan data asli agar backend bisa menemukan baris di Spreadsheet
      timestamp: report.timestamp, 
      photos: {
        sebelum: cleanSebelum,
        sesudah: cleanSesudah
      }
    };

    try {
      // Mengirimkan data dengan isEdit = true agar backend mengeksekusi logika 'updateReport'
      await onSubmit(updatedReport, true);
    } catch (error) {
      alert("Gagal update. Periksa koneksi internet.");
      setIsSubmitting(false);
    } finally {
      setShowConfirmModal(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const countSebelum = photosSebelum.filter(p => p !== null && p !== '').length;
    const countSesudah = photosSesudah.filter(p => p !== null && p !== '').length;

    if (countSebelum < 6 || countSesudah < 6) {
      setShowConfirmModal(true);
    } else {
      saveData();
    }
  };

  const Thumbnail = ({ src, label }: { src: string; label: string }) => (
    <div 
      className="flex flex-col items-center gap-1 cursor-pointer group"
      onClick={() => setPreviewImage(formatImageUrl(src))}
    >
      <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm group-hover:border-primary group-hover:scale-105 transition-all bg-slate-50">
        <img src={formatImageUrl(src)} alt={label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors"></div>
      </div>
      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in mb-20 border border-slate-200">
      <div className="bg-primary px-6 py-5">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Update Foto Dokumentasi</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse"></span>
              <p className="text-cyan-100 text-[10px] font-bold uppercase tracking-widest">{report.noPenugasan} • {report.penyulang}</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-white/70 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* Info Laporan Ringkas */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-center">
          <div>
            <div className="text-[8px] font-black text-slate-400 uppercase">Keypoint</div>
            <div className="text-[10px] font-bold text-slate-700">{report.keypoint}</div>
          </div>
          <div>
            <div className="text-[8px] font-black text-slate-400 uppercase">Petugas</div>
            <div className="text-[10px] font-bold text-slate-700 truncate">{report.petugas1} & {report.petugas2}</div>
          </div>
          <div>
            <div className="text-[8px] font-black text-slate-400 uppercase">Start</div>
            <div className="text-[10px] font-bold text-slate-700 truncate">{report.titikStart}</div>
          </div>
          <div>
            <div className="text-[8px] font-black text-slate-400 uppercase">Finish</div>
            <div className="text-[10px] font-bold text-slate-700 truncate">{report.titikFinish}</div>
          </div>
          <div>
            <div className="text-[8px] font-black text-slate-400 uppercase">Tiang</div>
            <div className="text-[10px] font-bold text-slate-700 truncate">{report.jumlahTiang || '-'}</div>
          </div>
          <div>
            <div className="text-[8px] font-black text-slate-400 uppercase">KMS</div>
            <div className="text-[10px] font-bold text-slate-700 truncate">{report.jumlahKms || '-'}</div>
          </div>
      </div>

      <div className="p-6 bg-white border-b border-slate-100">
         <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/></svg>
            Foto yang Sudah Ada
         </h3>
         <div className="flex flex-wrap gap-3">
            {PHOTO_SECTIONS.map((num, idx) => (
              <React.Fragment key={`existing-${num}`}>
                {report.photos.sebelum[idx] && (
                  <Thumbnail src={report.photos.sebelum[idx]!} label={`SBLM ${num}`} />
                )}
                {report.photos.sesudah[idx] && (
                  <Thumbnail src={report.photos.sesudah[idx]!} label={`SSDH ${num}`} />
                )}
              </React.Fragment>
            ))}
            {!report.photos.sebelum.some(p => p) && !report.photos.sesudah.some(p => p) && (
              <p className="text-[10px] italic text-slate-300 font-bold uppercase tracking-widest">Belum ada foto.</p>
            )}
         </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-primary uppercase tracking-widest">Lengkapi Dokumentasi</h3>
            <span className="text-[8px] font-black bg-amber-100 text-amber-600 px-2 py-1 rounded-full uppercase tracking-widest">Format JPG • Maks 15KB/Foto</span>
          </div>

          {PHOTO_SECTIONS.map((num, idx) => {
            const isSblmEmpty = !report.photos.sebelum[idx];
            const isSsdhEmpty = !report.photos.sesudah[idx];
            
            if (!isSblmEmpty && !isSsdhEmpty) return null;

            return (
              <div key={num} className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-200 transition-all hover:bg-white group">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-black">0{num}</span>
                  <h4 className="font-black text-slate-700 text-xs uppercase tracking-widest">Titik Pengamatan {num}</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {isSblmEmpty && (
                    <PhotoUpload 
                      id={`sebelum-${num}`}
                      label={`Kondisi Sebelum`}
                      imageSrc={photosSebelum[idx]}
                      onImageChange={(file) => handlePhotoChange(idx, 'sebelum', file)}
                    />
                  )}
                  {isSsdhEmpty && (
                    <PhotoUpload 
                      id={`sesudah-${num}`}
                      label={`Kondisi Sesudah`}
                      imageSrc={photosSesudah[idx]}
                      onImageChange={(file) => handlePhotoChange(idx, 'sesudah', file)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 sticky bottom-0 bg-white/95 backdrop-blur py-6 z-10 px-6 -mx-6">
          <button 
            type="button" 
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-3.5 rounded-2xl text-slate-400 hover:text-slate-600 font-black uppercase text-[10px] tracking-widest transition-all"
          >
            Batal
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="px-10 py-3.5 rounded-2xl bg-primary text-white font-black uppercase text-[10px] tracking-widest hover:bg-cyan-800 shadow-xl shadow-cyan-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Mengirim Ke Server...
              </>
            ) : 'Kirim Update Laporan'}
          </button>
        </div>
      </form>

      {previewImage && (
        <div 
          className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-4 animate-fade-in" 
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative w-full max-w-md">
            <img 
              src={previewImage} 
              alt="Preview" 
              className="w-full h-auto aspect-square object-contain bg-black rounded-3xl shadow-2xl border-4 border-white/10" 
              referrerPolicy="no-referrer" 
            />
          </div>
          <p className="text-white text-[10px] mt-6 font-black uppercase tracking-widest animate-pulse">
            Ketuk di mana saja untuk kembali
          </p>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100">
                <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Konfirmasi Update Foto</h3>
              <p className="text-slate-500 text-xs mt-2 uppercase font-semibold leading-relaxed">
                Jumlah foto yang Anda lampirkan kurang dari 6 pasang ({photosSebelum.filter(p => p !== null && p !== '').length} Sebelum, {photosSesudah.filter(p => p !== null && p !== '').length} Sesudah).
              </p>
              <p className="text-slate-400 text-[10px] mt-1 font-bold uppercase tracking-wider">
                Apakah Anda yakin ingin tetap mengirim update ini?
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3.5 border border-slate-300 text-slate-600 font-extrabold rounded-xl hover:bg-slate-50 transition-colors uppercase text-[10px] tracking-widest"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveData}
                disabled={isSubmitting}
                className="flex-[2] py-3.5 bg-primary hover:bg-cyan-800 text-white font-black rounded-xl transition-colors shadow-lg shadow-cyan-100 uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Memproses...' : 'Ya, Tetap Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};