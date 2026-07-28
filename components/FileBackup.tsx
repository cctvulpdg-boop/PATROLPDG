
import React, { useState, useMemo } from 'react';
import { DriveFile } from '../types';
import { BACKUP_FOLDER_ID } from '../constants';

interface FileBackupProps {
  files: DriveFile[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const ITEMS_PER_PAGE = 20;

export const FileBackup: React.FC<FileBackupProps> = ({ files, loading, error, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [displayLimit, setDisplayLimit] = useState(ITEMS_PER_PAGE);
  const [showGasGuide, setShowGasGuide] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const driveFolderUrl = `https://drive.google.com/drive/folders/${BACKUP_FOLDER_ID}`;

  const gasCodeSnippet = `// Tambahkan fungsi ini di Google Apps Script Anda (Code.gs):

function doGet(e) {
  var action = e ? e.parameter.action : "";
  if (action === "getBackupFiles") {
    return getBackupFiles(e);
  }
  // Logika doGet Anda lainnya...
  return ContentService.createTextOutput("Method GET OK");
}

function getBackupFiles(e) {
  try {
    var folderId = (e && e.parameter.folderId) ? e.parameter.folderId : "${BACKUP_FOLDER_ID}";
    var folder = DriveApp.getFolderById(folderId);
    var files = folder.getFiles();
    var result = [];
    
    while (files.hasNext()) {
      var file = files.next();
      result.push({
        id: file.getId(),
        name: file.getName(),
        size: file.getSize().toString(),
        mimeType: file.getMimeType(),
        createdTime: file.getDateCreated().toISOString(),
        webContentLink: file.getDownloadUrl() || ("https://drive.google.com/uc?export=download&id=" + file.getId())
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gasCodeSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const filteredFiles = useMemo(() => {
    return files.filter(file => 
      file.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [files, searchTerm]);

  const displayedFiles = useMemo(() => {
    return filteredFiles.slice(0, displayLimit);
  }, [filteredFiles, displayLimit]);

  const hasMore = filteredFiles.length > displayLimit;

  const handleLoadMore = () => {
    setDisplayLimit(prev => prev + ITEMS_PER_PAGE);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return (
      <svg className="w-8 h-8 text-rose-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5zm4 4h-2v-2h2v2zm0-4h-2V7h2v5z"/>
      </svg>
    );
    if (mimeType.includes('image')) return (
      <svg className="w-8 h-8 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
      </svg>
    );
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return (
      <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
      </svg>
    );
    return (
      <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z"/>
      </svg>
    );
  };

  const formatSize = (bytes?: string) => {
    if (!bytes) return 'N/A';
    const b = parseInt(bytes);
    if (isNaN(b)) return bytes;
    if (b === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">File BackUp</h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total: {filteredFiles.length} File</p>
            <span className="w-1 h-1 bg-slate-200 rounded-full hidden sm:block"></span>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Folder ID: <span className="font-black select-all">{BACKUP_FOLDER_ID}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={driveFolderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-emerald-600 text-white px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-md flex items-center gap-1.5 hover:bg-emerald-700 transition-all active:scale-95"
            title="Buka Folder Google Drive"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>Buka Google Drive</span>
          </a>
          <button 
            onClick={onRefresh}
            disabled={loading}
            className="bg-primary text-white px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2 hover:bg-cyan-800 transition-all disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Daftar
          </button>
        </div>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Cari file backup berdasarkan nama..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setDisplayLimit(ITEMS_PER_PAGE); // Reset limit on search
          }}
          className="w-full bg-white border-2 border-slate-100 rounded-2xl px-12 py-4 text-sm font-bold text-slate-700 focus:border-primary focus:outline-none transition-all shadow-sm"
        />
        <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden min-h-[400px]">
        {loading && files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-bold animate-pulse uppercase text-xs tracking-widest">Memuat Daftar File...</p>
          </div>
        ) : error ? (
          <div className="p-8 space-y-6">
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-rose-800 uppercase tracking-tight">Perhatian Layanan Backup</h3>
                <p className="text-slate-600 font-bold text-xs max-w-xl mx-auto leading-relaxed">{error}</p>
              </div>

              <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
                <a
                  href={driveFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span>Buka Folder Google Drive Langsung</span>
                </a>
                <button 
                  onClick={onRefresh}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm"
                >
                  Coba Lagi
                </button>
              </div>
            </div>

            {/* Toggle Panduan Update GAS */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
              <button
                onClick={() => setShowGasGuide(!showGasGuide)}
                className="w-full p-4 text-left font-black text-xs text-slate-700 uppercase tracking-wider flex items-center justify-between hover:bg-slate-100 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Panduan Menambahkan Fitur Backup di Google Apps Script (Untuk Admin)
                </span>
                <span className="text-slate-400 font-mono text-sm">{showGasGuide ? '▲ Sembunyikan' : '▼ Tampilkan'}</span>
              </button>

              {showGasGuide && (
                <div className="p-6 border-t border-slate-200 space-y-4 bg-white text-xs">
                  <ol className="list-decimal list-inside space-y-2 text-slate-600 font-medium leading-relaxed">
                    <li>Buka proyek <strong>Google Apps Script</strong> yang terhubung dengan Spreadsheet Anda.</li>
                    <li>Tambahkan fungsi <code className="bg-slate-100 text-indigo-600 font-mono px-1 py-0.5 rounded">getBackupFiles(e)</code> berikut ke file script Anda:</li>
                  </ol>

                  <div className="relative">
                    <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-[11px] font-mono overflow-x-auto leading-normal">
                      {gasCodeSnippet}
                    </pre>
                    <button
                      onClick={handleCopyCode}
                      className="absolute top-2 right-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all"
                    >
                      {copiedCode ? '✓ Berhasil Disalin' : 'Salin Kode'}
                    </button>
                  </div>

                  <p className="text-slate-500 italic text-[11px]">
                    * Setelah menyimpan kode, pastikan klik <strong>Deploy &gt; New Deployment &gt; Execute as: Me &gt; Who has access: Anyone</strong> lalu klik Deploy.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] p-8 text-center gap-4">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 00-2 2H6a2 2 0 00-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Tidak ada file ditemukan</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayedFiles.map((file) => (
              <div key={file.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="shrink-0">
                    {getFileIcon(file.mimeType)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-800 truncate uppercase tracking-tight" title={file.name}>
                      {file.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {formatSize(file.size)}
                      </span>
                      {file.createdTime && (
                        <>
                          <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {new Date(file.createdTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <a 
                  href={file.webContentLink || `https://drive.google.com/uc?export=download&id=${file.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 bg-slate-100 text-slate-600 p-3 rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm group-hover:shadow-md flex items-center gap-2"
                  title="Download File"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Download</span>
                </a>
              </div>
            ))}
            
            {hasMore && (
              <div className="p-8 flex justify-center">
                <button 
                  onClick={handleLoadMore}
                  className="px-8 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Tampilkan Lebih Banyak ({filteredFiles.length - displayLimit} File Lagi)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
        <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-xs text-amber-800 font-medium leading-relaxed">
          <p className="font-black uppercase mb-1">Informasi:</p>
          <p>Daftar di atas menampilkan file backup yang tersimpan di folder Google Drive khusus. Klik tombol "Download" atau "Buka Google Drive" untuk mengunduh/melihat file secara langsung.</p>
        </div>
      </div>
    </div>
  );
};

