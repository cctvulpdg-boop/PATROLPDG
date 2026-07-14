
import React, { useState, useEffect } from 'react';
import { MONTHS, PHOTO_SECTIONS } from '../constants';
import { ReportData, ULPData, LoginSession } from '../types';
import { PhotoUpload } from './PhotoUpload';

interface InputFormProps {
  onSubmit: (data: ReportData, isEdit: boolean) => Promise<void> | void;
  onCancel: () => void;
  masterData: Record<string, ULPData>;
  sessionData: LoginSession;
  editData?: ReportData | null;
}

export const InputForm: React.FC<InputFormProps> = ({ onSubmit, onCancel, masterData, sessionData, editData }) => {
  const [noPenugasan, setNoPenugasan] = useState(editData?.noPenugasan || '');
  const [penyulang, setPenyulang] = useState(editData?.penyulang || '');
  const [keypoint, setKeypoint] = useState(editData?.keypoint || '');
  const [titikStart, setTitikStart] = useState(editData?.titikStart || '');
  const [titikFinish, setTitikFinish] = useState(editData?.titikFinish || '');
  const [jumlahTiang, setJumlahTiang] = useState(editData?.jumlahTiang || '');
  const [jumlahKms, setJumlahKms] = useState(editData?.jumlahKms || '');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [photosSebelum, setPhotosSebelum] = useState<(string | null)[]>(() => {
    if (editData?.photos?.sebelum) {
      const arr = [...editData.photos.sebelum];
      while (arr.length < 10) arr.push(null);
      return arr.slice(0, 10);
    }
    return Array(10).fill(null);
  });
  const [photosSesudah, setPhotosSesudah] = useState<(string | null)[]>(() => {
    if (editData?.photos?.sesudah) {
      const arr = [...editData.photos.sesudah];
      while (arr.length < 10) arr.push(null);
      return arr.slice(0, 10);
    }
    return Array(10).fill(null);
  });

  const currentUlp = sessionData.ulp || editData?.ulp;
  const ulpData = currentUlp ? masterData[currentUlp] : null;

  const [isCustomKeypoint, setIsCustomKeypoint] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const availableKeypoints = (ulpData && penyulang) ? (ulpData.keypoints?.[penyulang] || []) : [];

  // Reset keypoint if penyulang changes and it's not the initial edit data
  useEffect(() => {
    if (!editData || penyulang !== editData.penyulang) {
      if (penyulang !== (editData?.penyulang || '')) {
         setKeypoint('');
         setIsCustomKeypoint(false);
      }
    } else if (editData && penyulang === editData.penyulang) {
      setKeypoint(editData.keypoint);
      const isCustom = availableKeypoints.length === 0 || !availableKeypoints.includes(editData.keypoint);
      setIsCustomKeypoint(isCustom);
    }
  }, [penyulang, editData, availableKeypoints]);

  // Automatically enable custom keypoint if a penyulang has no keypoints predefined
  useEffect(() => {
    if (penyulang && availableKeypoints.length === 0) {
      setIsCustomKeypoint(true);
    }
  }, [penyulang, availableKeypoints]);

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400; 
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'medium';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
          resolve(canvas.toDataURL('image/jpeg', 0.5));
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
      console.error("Gagal memproses foto:", error);
      alert("Gagal memproses foto, silakan coba lagi.");
    }
  };

  const saveData = async () => {
    setIsSubmitting(true);
    const isEditMode = !!editData;
    const now = new Date();

    const newReport: ReportData = {
      id: editData?.id || crypto.randomUUID(),
      timestamp: now.toISOString(),
      bulan: MONTHS[now.getMonth()],
      noPenugasan,
      ulp: currentUlp,
      petugas1: sessionData.petugas1 || editData?.petugas1 || 'N/A',
      petugas2: sessionData.petugas2 || editData?.petugas2 || 'N/A',
      penyulang,
      keypoint,
      titikStart,
      titikFinish,
      jumlahTiang,
      jumlahKms,
      photos: {
        sebelum: photosSebelum,
        sesudah: photosSesudah
      }
    };

    try {
        await onSubmit(newReport, isEditMode);
    } catch (error) {
        console.error("Submission error:", error);
        alert("Terjadi kesalahan saat menyimpan data.");
        setIsSubmitting(false);
    } finally {
        setShowConfirmModal(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUlp) {
        alert("Unit (ULP) tidak terdeteksi. Silakan login ulang.");
        return;
    }
    
    const countSebelum = photosSebelum.filter(p => p !== null && p !== '').length;
    const countSesudah = photosSesudah.filter(p => p !== null && p !== '').length;

    if (countSebelum < 6 || countSesudah < 6) {
      setShowConfirmModal(true);
    } else {
      saveData();
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in mb-20 border border-slate-200">
      <div className="bg-primary px-6 py-5">
        <h2 className="text-xl font-black text-white uppercase tracking-tight">{editData ? 'Edit Laporan Patrol' : 'Input Laporan Patrol'}</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse"></span>
          <p className="text-cyan-100 text-[10px] font-bold uppercase tracking-widest">Unit Tugas: {currentUlp}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
             <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Unit Layanan</label>
                <div className="font-black text-primary text-sm uppercase">{currentUlp}</div>
             </div>
             <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Petugas 1</label>
                <div className="font-bold text-slate-700 text-sm uppercase">{sessionData.petugas1 || editData?.petugas1 || '-'}</div>
             </div>
             <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Petugas 2</label>
                <div className="font-bold text-slate-700 text-sm uppercase">{sessionData.petugas2 || editData?.petugas2 || '-'}</div>
             </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">No Penugasan Khusus</label>
            <input 
              required
              type="text" 
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none font-bold text-sm transition-all"
              placeholder="PK-XXXX-XXXX"
              value={noPenugasan}
              onChange={(e) => setNoPenugasan(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Nama Penyulang</label>
            <select 
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none font-bold text-sm bg-white"
              value={penyulang}
              onChange={(e) => setPenyulang(e.target.value)}
            >
              <option value="">-- Pilih Penyulang --</option>
              {ulpData?.penyulang.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="md:col-span-2">
             <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Nama Keypoint</label>
             <div className="relative">
                {!isCustomKeypoint && availableKeypoints.length > 0 ? (
                  <select 
                    required
                    disabled={!penyulang}
                    className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none font-bold text-sm bg-white transition-all ${!penyulang ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer'}`}
                    value={keypoint}
                    onChange={(e) => {
                      if (e.target.value === '__CUSTOM__') {
                        setIsCustomKeypoint(true);
                        setKeypoint('');
                      } else {
                        setKeypoint(e.target.value);
                      }
                    }}
                  >
                    <option value="">{penyulang ? `-- Pilih Keypoint untuk ${penyulang} --` : '-- Pilih Penyulang Dahulu --'}</option>
                    {availableKeypoints.map(kp => <option key={kp} value={kp}>{kp}</option>)}
                    <option value="__CUSTOM__">✍️ Ketik Keypoint Manual...</option>
                  </select>
                ) : (
                  <div className="relative">
                    <input 
                      required
                      disabled={!penyulang}
                      type="text"
                      className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none font-bold text-sm bg-white transition-all pr-32 ${!penyulang ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
                      placeholder={penyulang ? "Ketik nama Keypoint..." : "Pilih penyulang dahulu"}
                      value={keypoint}
                      onChange={(e) => setKeypoint(e.target.value)}
                    />
                    {availableKeypoints.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomKeypoint(false);
                          setKeypoint('');
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#004bb4] font-black text-[9px] uppercase tracking-widest bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg border border-slate-200 transition-all"
                      >
                        Pilih dari Daftar
                      </button>
                    )}
                  </div>
                )}
                {!availableKeypoints.length && penyulang && (
                  <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-100 flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-[10px] font-bold text-amber-700 uppercase">Belum ada pilihan keypoint untuk penyulang ini di sistem. Anda dapat langsung mengetikkan namanya secara manual di atas.</p>
                  </div>
                )}
             </div>
          </div>
          
          <div>
             <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Titik Start</label>
             <input 
              required
              type="text" 
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none font-bold text-sm transition-all"
              placeholder="LOKASI MULAI PATROL"
              value={titikStart}
              onChange={(e) => setTitikStart(e.target.value)}
            />
          </div>

          <div>
             <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Titik Finish</label>
             <input 
              required
              type="text" 
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none font-bold text-sm transition-all"
              placeholder="LOKASI SELESAI PATROL"
              value={titikFinish}
              onChange={(e) => setTitikFinish(e.target.value)}
            />
          </div>

          <div>
             <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Jumlah Tiang</label>
             <input 
              required
              type="number" 
              min="0"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none font-bold text-sm transition-all"
              placeholder="JUMLAH TIANG YANG DIPATROL"
              value={jumlahTiang}
              onChange={(e) => setJumlahTiang(e.target.value)}
            />
          </div>

          <div>
             <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Jumlah KMS</label>
             <input 
              required
              type="number" 
              step="any"
              min="0"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none font-bold text-sm transition-all"
              placeholder="JUMLAH KMS YANG DIPATROL"
              value={jumlahKms}
              onChange={(e) => setJumlahKms(e.target.value)}
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-8">
          <div className="flex justify-between items-center mb-6">
             <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Dokumentasi Foto</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Minimal lampirkan foto sebelum dan sesudah pekerjaan</p>
             </div>
             <span className="text-[9px] font-black text-primary bg-cyan-50 border border-cyan-100 px-3 py-1.5 rounded-full uppercase tracking-widest">Maksimal 20 Foto</span>
          </div>
          
          <div className="space-y-8">
            {PHOTO_SECTIONS.map((num, idx) => (
              <div key={num} className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-200 transition-all hover:shadow-md hover:bg-white group">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-black">0{num}</span>
                  <h4 className="font-black text-slate-700 text-xs uppercase tracking-widest">Titik Pengamatan {num}</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <PhotoUpload 
                    id={`sebelum-${num}`}
                    label={`Kondisi Sebelum`}
                    imageSrc={photosSebelum[idx]}
                    onImageChange={(file) => handlePhotoChange(idx, 'sebelum', file)}
                  />
                  <PhotoUpload 
                    id={`sesudah-${num}`}
                    label={`Kondisi Sesudah`}
                    imageSrc={photosSesudah[idx]}
                    onImageChange={(file) => handlePhotoChange(idx, 'sesudah', file)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 sticky bottom-0 bg-white/95 backdrop-blur py-6 z-10 px-6 -mx-6">
          <button 
            type="button" 
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-3.5 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 font-black uppercase text-[10px] tracking-widest transition-all"
          >
            Batal
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="px-10 py-3.5 rounded-2xl bg-primary text-white font-black uppercase text-[10px] tracking-widest hover:bg-cyan-800 shadow-xl shadow-cyan-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-95"
          >
            {isSubmitting ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Memproses...
              </>
            ) : editData ? 'Perbarui Laporan' : 'Simpan Laporan'}
          </button>
        </div>
      </form>

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
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Konfirmasi Simpan Laporan</h3>
              <p className="text-slate-500 text-xs mt-2 uppercase font-semibold leading-relaxed">
                Jumlah foto yang Anda lampirkan kurang dari 6 pasang ({photosSebelum.filter(p => p !== null && p !== '').length} Sebelum, {photosSesudah.filter(p => p !== null && p !== '').length} Sesudah).
              </p>
              <p className="text-slate-400 text-[10px] mt-1 font-bold uppercase tracking-wider">
                Apakah Anda yakin ingin tetap menyimpan laporan ini?
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
