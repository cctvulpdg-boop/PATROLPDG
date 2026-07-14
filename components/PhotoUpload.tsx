
import React, { useRef, useState } from 'react';

interface PhotoUploadProps {
  label: string;
  imageSrc: string | null;
  onImageChange: (file: File) => void;
  id: string;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({ label, imageSrc, onImageChange, id }) => {
  const [showOptions, setShowOptions] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageChange(e.target.files[0]);
      setShowOptions(false);
    }
  };

  const openGallery = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    galleryInputRef.current?.click();
  };

  const openCamera = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    cameraInputRef.current?.click();
  };

  return (
    <div className="flex flex-col gap-2 relative">
      <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      
      <div 
        className={`relative w-full h-36 border-2 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 ${
          imageSrc 
            ? 'border-primary shadow-md shadow-cyan-50' 
            : 'border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-primary'
        }`}
        onClick={() => setShowOptions(true)}
      >
        {imageSrc ? (
          <div className="relative w-full h-full group">
            <img src={imageSrc} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <span className="text-white text-[10px] font-black uppercase tracking-widest bg-primary/80 px-3 py-1.5 rounded-full">Ganti Foto</span>
            </div>
          </div>
        ) : (
          <div className="text-center p-4">
            <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ambil Dokumentasi</span>
          </div>
        )}

        {/* Overlay Options */}
        {showOptions && (
          <div 
            className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-4 p-4 animate-fade-in"
            onClick={(e) => { e.stopPropagation(); setShowOptions(false); }}
          >
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pilih Sumber Foto</h5>
            <div className="flex gap-4 w-full px-4">
              <button 
                type="button"
                onClick={openCamera}
                className="flex-1 bg-primary text-white p-4 rounded-2xl flex flex-col items-center gap-2 shadow-lg shadow-cyan-100 hover:bg-cyan-800 transition-all active:scale-95"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
                <span className="text-[9px] font-black uppercase tracking-widest">Kamera</span>
              </button>
              
              <button 
                type="button"
                onClick={openGallery}
                className="flex-1 bg-slate-100 text-slate-700 p-4 rounded-2xl flex flex-col items-center gap-2 border border-slate-200 hover:bg-slate-200 transition-all active:scale-95"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[9px] font-black uppercase tracking-widest">Galeri</span>
              </button>
            </div>
            <button 
              type="button"
              className="text-[9px] font-bold text-red-500 uppercase tracking-widest mt-2 px-4 py-2 hover:bg-red-50 rounded-xl transition-all"
              onClick={(e) => { e.stopPropagation(); setShowOptions(false); }}
            >
              Batal
            </button>
          </div>
        )}
      </div>

      {/* Hidden Inputs */}
      <input 
        ref={galleryInputRef}
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={handleFileChange}
      />
      <input 
        ref={cameraInputRef}
        type="file" 
        accept="image/*" 
        capture="environment"
        className="hidden" 
        onChange={handleFileChange}
      />
    </div>
  );
};
