
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  User, 
  ShieldCheck, 
  BarChart3, 
  ChevronRight, 
  Lock,
  LayoutDashboard,
  ClipboardList,
  Database,
  Sliders,
  FileText,
  RefreshCw,
  Info,
  Plus,
  ArrowLeft,
  LogOut
} from 'lucide-react';
import { UserRole, ViewState, ReportData, ULPName, ULPData, LoginSession, DriveFile } from './types';
import { InputForm } from './components/InputForm';
import { Dashboard } from './components/Dashboard';
import { DataTable } from './components/DataTable';
import { AdminSettings } from './components/AdminSettings';
import { AdminRekap } from './components/AdminRekap';
import { FileBackup } from './components/FileBackup';
import { LoginConfig } from './components/LoginConfig';
import { UpdateList } from './components/UpdateList';
import { UpdatePhotoForm } from './components/UpdatePhotoForm';
import { DATA_ULP as INITIAL_DATA_ULP, APP_VERSION } from './constants';
import { api } from './services/api';

const LOGO_URL = "https://plnes.co.id/_next/image?url=https%3A%2F%2Fcms.plnes.co.id%2Fuploads%2FLogo_HP_New_Temporary_09a9c5a521.png&w=750&q=75"; 
const APP_LOGO = "https://lh3.googleusercontent.com/d/1ayQWBX032KZs0Cl86OzJO1lxqv-5RDds";
const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

const isMobileDevice = () => {
  if (typeof window === 'undefined' || !navigator) return false;
  const ua = navigator.userAgent || '';
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
};

declare global {
  interface Window {
    ExcelJS: any;
  }
}

const App: React.FC = () => {
  const getCurrentMonthRange = () => {
    const now = new Date();
    // Set start date to 1 month ago to be safer
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    return { firstDay: startDate, lastDay };
  };

  const { firstDay: initStart, lastDay: initEnd } = getCurrentMonthRange();

  const [role, setRole] = useState<UserRole | null>(null);
  const [view, setView] = useState<ViewState>('LOGIN');
  const [isLoading, setIsLoading] = useState(false);
  const [errorLoad, setErrorLoad] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [session, setSession] = useState<LoginSession>({ ulp: null, petugas1: null, petugas2: null });

  const [tableStartDate, setTableStartDate] = useState(initStart);
  const [tableEndDate, setTableEndDate] = useState(initEnd);
  const [tableUlpFilter, setTableUlpFilter] = useState<ULPName | ''>('');

  const [reports, setReports] = useState<ReportData[]>([]);
  const [backupFiles, setBackupFiles] = useState<DriveFile[]>([]);
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [lastBackupFetch, setLastBackupFetch] = useState<number>(0);
  const [masterData, setMasterData] = useState<Record<string, ULPData>>(INITIAL_DATA_ULP);
  const [editingReport, setEditingReport] = useState<ReportData | null>(null);
  const [updatingReport, setUpdatingReport] = useState<ReportData | null>(null);

  const pendingUpdatesRef = useRef<Map<string, string>>(new Map());
  const lastReportIdRef = useRef<string | null>(null);
  const lastPeriodicNotifyRef = useRef<number>(0);
  const lastReminderNotifyRef = useRef<string>("");

  const requestNotificationPermission = async () => {
    if (!isMobileDevice()) {
      return 'default';
    }
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      return permission;
    }
    return 'denied';
  };

  const playNotificationSound = () => {
    if (!isMobileDevice()) {
      console.log("Muted notification sound: device is PC/Desktop.");
      return;
    }
    const audio = new Audio(NOTIFICATION_SOUND);
    audio.play().catch(e => console.log("Audio play blocked"));
  };

  const updateAppBadge = (count: number) => {
    if ('setAppBadge' in navigator) {
      const nav = navigator as any;
      if (count > 0) nav.setAppBadge(count).catch(() => {});
      else nav.clearAppBadge().catch(() => {});
    }
  };

  const sendBrowserNotification = (title: string, body: string) => {
    if (!isMobileDevice()) {
      console.log("Notification blocked: device is PC/Desktop.");
      return;
    }
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      playNotificationSound();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            body, icon: APP_LOGO, badge: APP_LOGO, tag: 'yandal-patrol-notif',
            renotify: true, vibrate: [200, 100, 200], data: { url: window.location.origin }
          } as any);
        });
      } else {
        new Notification(title, { body, icon: APP_LOGO });
      }
    }
  };

  const generateSummaryMessage = (currentReports: ReportData[]) => {
    const today = new Date().toISOString().split('T')[0];
    const todayReports = currentReports.filter(r => r.timestamp.startsWith(today));
    const counts: Record<string, number> = {};
    
    const ulpKeys = Object.keys(masterData);
    ulpKeys.forEach(name => {
      counts[name] = todayReports.filter(r => r.ulp === name).length;
    });
    
    const dateStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    let message = `Laporan Yandal Patrol Hari ini : ${dateStr}\n`;
    ulpKeys.forEach(name => {
      message += `- ${name} : ${counts[name] || 0}\n`;
    });
    message += `\nMohon untuk ULP yang belum lapor untuk segera melaksanakannya.`;
    return { message, totalToday: todayReports.length };
  };

  const checkPeriodicNotification = (currentReports: ReportData[]) => {
    if (!isMobileDevice()) return;
    const now = new Date();
    const currentHour = now.getHours();
    if (currentHour >= 10 && currentHour <= 18) {
      if (currentHour % 2 === 0 && lastPeriodicNotifyRef.current !== currentHour) {
        lastPeriodicNotifyRef.current = currentHour;
        const { message, totalToday } = generateSummaryMessage(currentReports);
        sendBrowserNotification("Update Berkala Yandal Patrol", message);
        updateAppBadge(totalToday);
      }
    }
  };

  const checkReminderNotification = () => {
    if (!isMobileDevice()) return;
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Notifikasi setiap 15 menit antara jam 08:00 - 18:00 WIB
    if ((currentHour >= 8 && currentHour < 18) || (currentHour === 18 && currentMinute === 0)) {
      if (currentMinute % 15 === 0) {
        const timeKey = `${now.toDateString()}-${currentHour}:${currentMinute}`;
        if (lastReminderNotifyRef.current !== timeKey) {
          lastReminderNotifyRef.current = timeKey;
          sendBrowserNotification(
            "Sudahkah Anda Melakukan Yandal Patrol hari ini ...?",
            "Jangan lupa untuk melaporkan kegiatan patroli Anda tepat waktu."
          );
        }
      }
    }
  };

  useEffect(() => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
      if (isMobileDevice() && Notification.permission === 'default') requestNotificationPermission();
    }
    const savedDemo = localStorage.getItem('yandal_demo_mode');
    if (savedDemo === 'true') {
      setIsDemoMode(true);
      const savedReports = localStorage.getItem('yandal_local_reports');
      if (savedReports) setReports(JSON.parse(savedReports));
    }
    fetchData(true);
    const poller = setInterval(() => fetchData(false), 120000);
    
    // Poller untuk notifikasi pengingat dan berkala
    const notifPoller = setInterval(() => {
      checkReminderNotification();
    }, 30000); // Cek setiap 30 detik agar tidak terlewat menit ke-15

    return () => {
      clearInterval(poller);
      clearInterval(notifPoller);
    };
  }, []);

  useEffect(() => {
    if (reports.length > 0) {
      checkPeriodicNotification(reports);
    }
  }, [reports]);

  useEffect(() => {
    if (view === 'TABLE' && !isDemoMode) fetchData(false);
  }, [tableStartDate, tableEndDate, tableUlpFilter, view]);

  const fetchBackupFiles = async (force = false) => {
    // Cache for 5 minutes unless forced
    if (!force && backupFiles.length > 0 && Date.now() - lastBackupFetch < 300000) {
      return;
    }

    setIsBackupLoading(true);
    setBackupError(null);
    try {
      const data = await api.getBackupFiles();
      if (data && Array.isArray(data)) {
        setBackupFiles(data);
        setLastBackupFetch(Date.now());
      } else if (data && (data as any).error) {
        throw new Error((data as any).error);
      } else {
        throw new Error("Format data tidak valid");
      }
    } catch (err: any) {
      console.error("Error fetching backup files:", err);
      setBackupError(err.message || "Gagal mengambil daftar file backup.");
    } finally {
      setIsBackupLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'BACKUP') {
      fetchBackupFiles();
    }
  }, [view]);

  const fetchData = async (showLoading = true) => {
    if (isDemoMode) return;
    if (showLoading) { setIsLoading(true); setErrorLoad(null); }
    try {
      console.log("Memulai pengambilan data dari Apps Script...");
      const data = await api.getAllData();
      console.log("Data diterima dari server:", data);
      
      if (data) {
        if (data.status === 'error') {
          throw new Error(data.message || "Server mengembalikan error.");
        }

        if (data.reports) {
          console.log(`Ditemukan ${data.reports.length} laporan.`);
          setReports(data.reports);
          
          if (data.reports.length > 0) {
            const sorted = [...data.reports].sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            lastReportIdRef.current = sorted[0].id;
          }
        } else {
          console.warn("Data diterima tapi tidak ada field 'reports'.");
          setReports([]);
        }
        
        if (data.masterData) {
          console.log("Master data ditemukan.");
          const updatedMaster = { ...data.masterData };
          Object.keys(updatedMaster).forEach(k => { 
            if (!updatedMaster[k].keypoints) updatedMaster[k].keypoints = {}; 
            
            // Deduplicate petugas
            if (Array.isArray(updatedMaster[k].petugas)) {
              updatedMaster[k].petugas = Array.from(new Set(updatedMaster[k].petugas.map((p: string) => p?.trim()))).filter(Boolean);
            } else {
              updatedMaster[k].petugas = [];
            }

            // Deduplicate penyulang
            if (Array.isArray(updatedMaster[k].penyulang)) {
              updatedMaster[k].penyulang = Array.from(new Set(updatedMaster[k].penyulang.map((p: string) => p?.trim()))).filter(Boolean);
            } else {
              updatedMaster[k].penyulang = [];
            }

            // Deduplicate keypoints per penyulang
            if (updatedMaster[k].keypoints) {
              Object.keys(updatedMaster[k].keypoints).forEach(kpKey => {
                if (Array.isArray(updatedMaster[k].keypoints[kpKey])) {
                  updatedMaster[k].keypoints[kpKey] = Array.from(new Set(updatedMaster[k].keypoints[kpKey].map((p: string) => p?.trim()))).filter(Boolean);
                } else {
                  updatedMaster[k].keypoints[kpKey] = [];
                }
              });
            }

            // Sanitize name to prevent key collisions if API data contains duplicate values
            updatedMaster[k].name = k as any;
          });
          setMasterData(updatedMaster);
        }
      } else {
        throw new Error("Server tidak mengembalikan data.");
      }
    } catch (error: any) {
      console.error("Gagal mengambil data:", error);
      if (showLoading) setErrorLoad(error.message || "Gagal terhubung ke database.");
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const handleInitialRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
    if (selectedRole === UserRole.ADMIN) return; 
    setView('CONFIG');
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'Adminpdg') {
      setRole(UserRole.ADMIN);
      setView('DASHBOARD');
      setShowAdminLogin(false);
      setSession({ ulp: null, petugas1: null, petugas2: null });
      const { firstDay, lastDay } = getCurrentMonthRange();
      setTableStartDate(firstDay);
      setTableEndDate(lastDay);
      setTableUlpFilter('');
    } else {
      setLoginError('Password salah!');
    }
  };

  const handleConfigConfirm = (conf: LoginSession) => {
    setSession(conf);
    setView(role === UserRole.GUEST ? 'TABLE' : 'INPUT');
  };

  const handleLogout = () => {
    setRole(null);
    setView('LOGIN');
    setShowAdminLogin(false);
    setSession({ ulp: null, petugas1: null, petugas2: null });
    setEditingReport(null);
    setUpdatingReport(null);
    const { firstDay, lastDay } = getCurrentMonthRange();
    setTableStartDate(firstDay);
    setTableEndDate(lastDay);
    setTableUlpFilter('');
  };

  const handleBackToMenu = () => {
     if (view === 'CONFIG') { 
       setView('LOGIN'); 
       setRole(null); 
       setSession({ ulp: null, petugas1: null, petugas2: null });
       const { firstDay, lastDay } = getCurrentMonthRange();
       setTableStartDate(firstDay);
       setTableEndDate(lastDay);
       setTableUlpFilter('');
     }
     else { 
       if (role === UserRole.ADMIN) {
         setView('DASHBOARD'); 
       } else { 
         setView('LOGIN'); 
         setRole(null); 
         setSession({ ulp: null, petugas1: null, petugas2: null });
         const { firstDay, lastDay } = getCurrentMonthRange();
         setTableStartDate(firstDay);
         setTableEndDate(lastDay);
         setTableUlpFilter('');
       } 
     }
     setEditingReport(null);
     setUpdatingReport(null);
  };

  const handleSaveReport = async (data: ReportData, isEditMode: boolean) => {
    setIsSyncing(true);
    pendingUpdatesRef.current.set(data.id, data.timestamp);
    setReports(prev => [data, ...prev.filter(r => r.id !== data.id)]);
    try {
      if (isDemoMode) {
        localStorage.setItem('yandal_local_reports', JSON.stringify([data, ...reports.filter(r => r.id !== data.id)]));
      } else {
        await api.saveReport(data, isEditMode);
        setTimeout(() => { fetchData(false); pendingUpdatesRef.current.delete(data.id); }, 8000);
      }
      setEditingReport(null);
      setUpdatingReport(null);
      setView('TABLE');
    } catch (e: any) {
      const errMsg = e?.message || "";
      if (errMsg.includes("DriveApp") || errMsg.includes("Akses ditolak") || errMsg.includes("Access denied")) {
        alert(
          "🚨 ERROR OTORISASI / SHARING GOOGLE DRIVE 🚨\n\n" +
          "Sistem tidak dapat mengunggah foto atau menyimpan tautan ke Google Drive.\n\n" +
          "Penyebab Umum:\n" +
          "1. Otorisasi DriveApp belum diberikan di Google Apps Script Anda.\n" +
          "2. Akun Google institusi (misal: PLN corporate mail) memblokir fitur berbagi file keluar (setSharing / ANYONE_WITH_LINK dilarang).\n\n" +
          "Solusi Perbaikan:\n" +
          "A. Pastikan Anda sudah menggunakan kode Google Apps Script terbaru yang kami berikan (memiliki penanganan 'try-catch' khusus untuk pembatasan sharing).\n" +
          "B. Berikan Izin DriveApp:\n" +
          "   1. Buka Google Sheets > Ekstensi > Apps Script.\n" +
          "   2. Pilih fungsi 'getAllData' lalu klik tombol 'Jalankan' (Run) di bagian atas.\n" +
          "   3. Klik 'Tinjau Izin' (Review Permissions) -> Pilih Akun -> Klik 'Lanjutan' (Advanced) -> 'Buka Project' -> Klik 'Izinkan' (Allow).\n" +
          "C. Terapkan ulang/Deploy baru aplikasi web Anda (Terapkan > Deployment baru > Terapkan) untuk mengaktifkan perubahan."
        );
      } else {
        alert(`Gagal sinkronisasi otomatis. Detail: ${errMsg || "Koneksi terputus"}`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdatePhoto = (report: ReportData) => {
    setUpdatingReport(report);
    setView('UPDATE_FORM');
  };

  // Fix: Missing openEditForm function added to handle report editing
  const openEditForm = (report: ReportData) => {
    setEditingReport(report);
    setView('INPUT');
  };

  const filteredReportsForTable = useMemo(() => {
    const uniqueMap = new Map<string, ReportData>();
    [...reports].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .forEach(r => uniqueMap.set(r.id, r));
    
    return Array.from(uniqueMap.values())
      .filter(r => {
        if (session.ulp && r.ulp !== session.ulp) return false;
        if (role === UserRole.ADMIN && tableUlpFilter && r.ulp !== tableUlpFilter) return false;
        const reportDate = new Date(r.timestamp).toISOString().split('T')[0];
        if (tableStartDate && reportDate < tableStartDate) return false;
        if (tableEndDate && reportDate > tableEndDate) return false;
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [reports, session.ulp, role, tableUlpFilter, tableStartDate, tableEndDate]);

  const handleDownloadExcel = async () => {
    const ExcelJS = (window as any).ExcelJS;
    if (!ExcelJS) return alert("Library ExcelJS tidak tersedia.");
    setIsSyncing(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Laporan Patrol');
      const columns = [
        { header: 'No', key: 'no', width: 6 },
        { header: 'Tanggal', key: 'tanggal', width: 15 },
        { header: 'No. Penugasan', key: 'noPenugasan', width: 20 },
        { header: 'Unit (ULP)', key: 'ulp', width: 18 },
        { header: 'Petugas 1', key: 'petugas1', width: 18 },
        { header: 'Petugas 2', key: 'petugas2', width: 18 },
        { header: 'Penyulang', key: 'penyulang', width: 15 },
        { header: 'Keypoint', key: 'keypoint', width: 22 },
        { header: 'Titik Start', key: 'start', width: 25 },
        { header: 'Titik Finish', key: 'finish', width: 25 },
        ...Array(10).fill(0).flatMap((_, i) => [
          { header: `Foto Sblm ${i+1}`, key: `sblm${i+1}`, width: 25 },
          { header: `Foto Ssdh ${i+1}`, key: `ssdh${i+1}`, width: 25 }
        ]),
      ];

      // Set column keys and widths manually to prevent auto-writing headers on row 1
      columns.forEach((col, idx) => {
        const column = worksheet.getColumn(idx + 1);
        column.key = col.key;
        column.width = col.width;
      });

      // Write Custom Top Header Title blocks
      // Baris 1: REKAP PELAKSANAAN PEKERJAAN YANDAL PATROL
      worksheet.mergeCells('A1:J1');
      const title1 = worksheet.getCell('A1');
      title1.value = 'REKAP PELAKSANAAN PEKERJAAN YANDAL PATROL';
      title1.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0F172A' } };
      title1.alignment = { horizontal: 'center', vertical: 'middle' };

      // Baris 2: ULP <ULP FILTER> UP3 PADANG
      worksheet.mergeCells('A2:J2');
      const title2 = worksheet.getCell('A2');
      const filterUlpText = tableUlpFilter ? tableUlpFilter.toUpperCase() : 'SEMUA ULP';
      title2.value = `${filterUlpText} UP3 PADANG`;
      title2.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF334155' } };
      title2.alignment = { horizontal: 'center', vertical: 'middle' };

      // Baris 3: DARI TANGGAL <tanggal awal filter> SAMPAI <Tanggal akhir Filter>
      worksheet.mergeCells('A3:J3');
      const title3 = worksheet.getCell('A3');
      const startDateFormatted = tableStartDate ? new Date(tableStartDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';
      const endDateFormatted = tableEndDate ? new Date(tableEndDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';
      title3.value = `DARI TANGGAL ${startDateFormatted.toUpperCase()} SAMPAI ${endDateFormatted.toUpperCase()}`;
      title3.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF475569' } };
      title3.alignment = { horizontal: 'center', vertical: 'middle' };

      // Row Heights for spacing
      worksheet.getRow(1).height = 25;
      worksheet.getRow(2).height = 20;
      worksheet.getRow(3).height = 20;
      worksheet.getRow(4).height = 10; // spacing/blank row

      // Write Main Table Headers in Row 5
      const headerRow = worksheet.getRow(5);
      headerRow.values = columns.map(c => c.header);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E7490' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 30;

      // Helper to pad the array of photo URLs to length 10
      const prepPhotos = (photosArray: (string | null)[]) => {
        const result: string[] = [];
        for (let idx = 0; idx < 10; idx++) {
          result.push(photosArray[idx] || '');
        }
        return result;
      };

      // Helper to extract Google Drive file ID
      const getGoogleDriveFileId = (url: string): string | null => {
        if (!url) return null;
        const driveDMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
        if (driveDMatch && driveDMatch[1]) return driveDMatch[1];
        const queryMatch = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
        if (queryMatch && queryMatch[1]) return queryMatch[1];
        const genMatch = url.match(/([a-zA-Z0-9-_]{25,45})/);
        if (genMatch && genMatch[1]) return genMatch[1];
        return null;
      };

      // Helper to download image and convert to Base64 (supporting Google Drive)
      const urlToBase64 = async (url: string): Promise<string | null> => {
        if (!url) return null;
        if (url.startsWith('data:image')) return url;

        const id = getGoogleDriveFileId(url);
        let directUrl = url;
        if (id) {
          directUrl = `https://lh3.googleusercontent.com/d/${id}`;
        }

        try {
          const response = await fetch(directUrl);
          if (!response.ok) {
            // Backup direct download link if lh3 fails
            if (id) {
              const fallbackUrl = `https://docs.google.com/uc?export=download&id=${id}`;
              const fallbackResponse = await fetch(fallbackUrl);
              if (fallbackResponse.ok) {
                const blob = await fallbackResponse.blob();
                return new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.onerror = () => resolve(null);
                  reader.readAsDataURL(blob);
                });
              }
            }
            throw new Error("HTTP error " + response.status);
          }
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.warn("Gagal mengambil gambar dengan CORS: ", url, error);
          return null;
        }
      };

      const downloadTasks: { rowIndex: number; colIndex: number; url: string }[] = [];

      for (let i = 0; i < filteredReportsForTable.length; i++) {
        const r = filteredReportsForTable[i];
        const rowIndex = i + 6; // Data rows start at row 6
        const currentRow = worksheet.getRow(rowIndex);
        currentRow.height = 120;

        const sblmList = prepPhotos(r.photos?.sebelum || []);
        const ssdhList = prepPhotos(r.photos?.sesudah || []);

        // We write Hyperlinks to the cell values as a fallback.
        // That way, if downloading fails or user opens Excel without internet,
        // they can still click to view!
        const photoFormulas: any[] = [];
        for (let idx = 0; idx < 10; idx++) {
          const sblmUrl = sblmList[idx];
          const ssdhUrl = ssdhList[idx];
          photoFormulas.push(sblmUrl ? { formula: `HYPERLINK("${sblmUrl}", "Lihat Sblm ${idx + 1}")` } : '');
          photoFormulas.push(ssdhUrl ? { formula: `HYPERLINK("${ssdhUrl}", "Lihat Ssdh ${idx + 1}")` } : '');
        }

        currentRow.values = [
          i + 1,
          r.timestamp ? new Date(r.timestamp).toLocaleDateString('id-ID') : '',
          r.noPenugasan || '',
          r.ulp || '',
          r.petugas1 || '',
          r.petugas2 || '',
          r.penyulang || '',
          r.keypoint || '',
          r.titikStart || '',
          r.titikFinish || '',
          ...photoFormulas
        ];
        currentRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

        // Collect download tasks with interleaved columns
        sblmList.forEach((url, idx) => {
          if (url) downloadTasks.push({ rowIndex, colIndex: 11 + (2 * idx), url });
        });
        ssdhList.forEach((url, idx) => {
          if (url) downloadTasks.push({ rowIndex, colIndex: 12 + (2 * idx), url });
        });
      }

      // Download and embed keys in smaller batches of 5 to prevent browser/Google limit overload
      const BATCH_SIZE = 5;
      for (let batchStart = 0; batchStart < downloadTasks.length; batchStart += BATCH_SIZE) {
        const batch = downloadTasks.slice(batchStart, batchStart + BATCH_SIZE);
        await Promise.all(batch.map(async (task) => {
          const base64 = await urlToBase64(task.url);
          if (!base64) return;
          try {
            const matches = base64.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
            if (!matches) return;
            const ext = matches[1].replace('jpeg', 'jpg');
            const imageId = workbook.addImage({ base64: matches[2], extension: ext as any });
            
            worksheet.addImage(imageId, {
              tl: { col: task.colIndex - 1, row: task.rowIndex - 1 },
              br: { col: task.colIndex, row: task.rowIndex },
              editAs: 'oneCell'
            });
          } catch (e) {
            console.error("Gagal menempelkan gambar ke dalam excel cell: ", e);
          }
        }));
      }

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber >= 5) {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          });
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laporan_Patrol_Lengkap_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Kesalahan Export Excel: ", err);
      alert("Gagal ekspor Excel.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 p-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-slate-700 font-bold">Menghubungkan ke Database...</p>
      </div>
    );
  }

  if (view === 'LOGIN') {
    return (
      <div className="min-h-screen bg-[#f3f7fd] relative overflow-hidden flex flex-col justify-between py-6 px-4 font-sans select-none">
        
        {/* Background Waves (Top Right) */}
        <div className="absolute top-0 right-0 w-80 h-80 sm:w-96 sm:h-96 opacity-40 pointer-events-none z-0">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="M100 0C60 0 20 40 0 100H100V0Z" fill="url(#blueGrad1)" />
            <path d="M100 0C75 10 40 50 20 100H100V0Z" fill="url(#blueGrad2)" opacity="0.5" />
            <defs>
              <linearGradient id="blueGrad1" x1="100" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
                <stop stopColor="#005bd4" stopOpacity="0.3" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="blueGrad2" x1="100" y1="0" x2="30" y2="100" gradientUnits="userSpaceOnUse">
                <stop stopColor="#003c96" stopOpacity="0.2" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Background Waves (Bottom Left & Right) */}
        <div className="absolute bottom-0 left-0 right-0 h-48 sm:h-64 opacity-30 pointer-events-none z-0">
          <svg viewBox="0 0 100 50" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="M0 50C30 40 70 45 100 15V50H0Z" fill="url(#bottomGrad)" />
            <path d="M0 50C20 30 60 35 100 5V50H0Z" fill="url(#bottomGrad)" opacity="0.4" />
            <defs>
              <linearGradient id="bottomGrad" x1="50" y1="50" x2="50" y2="0" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0a59cc" />
                <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Subtle Transmission Tower BG Vector Overlay */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] sm:opacity-[0.06] flex items-end justify-between px-10 pb-16">
          <svg className="w-24 h-48 sm:w-36 sm:h-72 text-slate-800" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12,2L1,22H6L9,15H15L18,22H23L12,2ZM12,6L13.5,9H10.5L12,6ZM8,14L10,10H14L16,14H8Z" />
          </svg>
          <svg className="w-24 h-48 sm:w-36 sm:h-72 text-slate-800" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12,2L1,22H6L9,15H15L18,22H23L12,2ZM12,6L13.5,9H10.5L12,6ZM8,14L10,10H14L16,14H8Z" />
          </svg>
        </div>

        {/* Content Wrapper */}
        <div className="w-full max-w-xl mx-auto flex-1 flex flex-col justify-between z-10 relative">
          
          {/* Header Row */}
          <div className="w-full flex justify-between items-center pb-4 border-b border-blue-100/50">
            {/* Left Header - Official PLN Electricity Services Brand Image */}
            <div className="flex items-center">
              <img 
                src={LOGO_URL} 
                alt="PLN Electricity Services Logo" 
                className="h-10 sm:h-12 w-auto object-contain" 
              />
            </div>

            {/* Right Header */}
            <div className="flex items-center gap-2.5">
              <div className="text-right leading-none">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase">Unit Layanan</span>
                <span className="text-sm font-black text-[#004bb4] tracking-wider block uppercase">Padang</span>
              </div>
              <div className="w-0.5 h-7 bg-[#005bd4] rounded-full"></div>
            </div>
          </div>

          {/* Main Shield and App Title (Standalone centered logo image to avoid double text overlay) */}
          <div className="flex items-center justify-center my-8 sm:my-12 text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-100 rounded-full blur-3xl opacity-35 transform scale-110"></div>
              <img 
                src={APP_LOGO} 
                alt="Yandal Patrol Logo" 
                className="max-w-[280px] sm:max-w-md w-full h-auto object-contain relative hover:scale-[1.02] transition-transform duration-200" 
              />
            </div>
          </div>

          {/* Title and Buttons Section */}
          <div className="w-full">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-2">
                <span className="h-[2px] w-6 bg-amber-400 rounded-full"></span>
                <h3 className="text-xs sm:text-sm font-extrabold text-[#003c96] uppercase tracking-wider">
                  Yandal Patrol Monitoring
                </h3>
                <span className="h-[2px] w-6 bg-amber-400 rounded-full"></span>
              </div>
              
              <div className="w-16 h-1 mx-auto flex rounded-full overflow-hidden shadow-sm">
                <div className="w-1/2 h-full bg-[#004bb4]"></div>
                <div className="w-1/2 h-full bg-[#f1ab00]"></div>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-4 max-w-sm sm:max-w-md mx-auto w-full">
              {!showAdminLogin ? (
                <>
                  {/* Button 1: LOGIN PETUGAS */}
                  <button 
                    onClick={() => handleInitialRoleSelect(UserRole.USER)} 
                    className="w-full bg-[#005bd4] hover:bg-[#004bb4] active:scale-[0.98] text-white py-4 px-6 rounded-2xl flex items-center justify-between shadow-[0_6px_12px_rgba(0,91,212,0.15)] hover:shadow-[0_10px_20px_rgba(0,91,212,0.25)] transition-all font-bold duration-150"
                  >
                    <User className="w-5 h-5 text-white" />
                    <span className="font-extrabold text-xs sm:text-sm tracking-widest uppercase flex-1 text-center">
                      Login Petugas
                    </span>
                    <ChevronRight className="w-5 h-5 text-white opacity-80" />
                  </button>

                  {/* Button 2: LOGIN ADMIN */}
                  <button 
                    onClick={() => setShowAdminLogin(true)} 
                    className="w-full bg-[#1e2e4a] hover:bg-[#121f33] active:scale-[0.98] text-white py-4 px-6 rounded-2xl flex items-center justify-between shadow-md hover:shadow-lg transition-all font-bold duration-150"
                  >
                    <ShieldCheck className="w-5 h-5 text-white" />
                    <span className="font-extrabold text-xs sm:text-sm tracking-widest uppercase flex-1 text-center">
                      Login Admin
                    </span>
                    <ChevronRight className="w-5 h-5 text-white opacity-80" />
                  </button>

                  {/* Button 3: TAMPILKAN DATA */}
                  <button 
                    onClick={() => handleInitialRoleSelect(UserRole.GUEST)} 
                    className="w-full bg-white border border-slate-200 hover:border-[#005bd4]/40 hover:bg-slate-50 active:scale-[0.98] text-[#005bd4] py-4 px-6 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-all font-bold duration-150"
                  >
                    <BarChart3 className="w-5 h-5 text-[#005bd4]" />
                    <span className="font-extrabold text-xs sm:text-sm tracking-widest uppercase flex-1 text-center">
                      Tampilkan Data
                    </span>
                    <ChevronRight className="w-5 h-5 text-[#005bd4]" />
                  </button>
                </>
              ) : (
                /* Admin Pass form inside identical dimensions */
                <form 
                  onSubmit={handleAdminLoginSubmit} 
                  className="bg-white p-6 rounded-2xl border border-blue-50/70 shadow-lg animate-fade-in w-full"
                >
                  <div className="flex items-center gap-2.5 mb-4 text-[#1e2e4a]">
                    <Lock className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-wider">Otorisasi Admin</span>
                  </div>
                  <input 
                    type="password" 
                    autoFocus 
                    className="w-full px-4 py-3.5 border border-slate-200 rounded-xl mb-2 outline-none transition-all focus:border-[#005bd4] focus:ring-2 focus:ring-[#005bd4]/10 text-slate-800" 
                    value={adminPassword} 
                    onChange={(e) => setAdminPassword(e.target.value)} 
                    placeholder="Masukkan sandi khusus admin..." 
                  />
                  {loginError ? (
                    <p className="text-[11px] text-red-600 font-bold mb-3 animate-pulse">{loginError}</p>
                  ) : null}
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => { setShowAdminLogin(false); setLoginError(''); setAdminPassword(''); }} 
                      className="flex-1 py-3 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors duration-150"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 py-3 text-xs font-black bg-[#1e2e4a] hover:bg-[#152238] text-white rounded-xl shadow-md transition-colors duration-150"
                    >
                      Masuk
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Footer Branding Credit */}
          <div className="text-center pt-8 text-[10px] text-slate-400 font-medium">
            <span className="opacity-80">© {new Date().getFullYear()} PLN UP3 Padang — Yandal Patrol V{APP_VERSION}</span>
          </div>

        </div>

      </div>
    );
  }

  if (view === 'CONFIG' && role) {
    return <LoginConfig role={role} masterData={masterData} appLogo={APP_LOGO} onBack={() => { setView('LOGIN'); setRole(null); }} onConfirm={handleConfigConfirm} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {isSyncing && (
        <div className="fixed top-4 right-4 z-50 bg-white shadow-xl rounded-full px-5 py-2.5 flex items-center gap-2 border border-slate-200 animate-fade-in">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Memproses...</span>
        </div>
      )}

      <header className="bg-[#0f1d36] text-white shadow-xl z-20 sticky top-0 border-b border-[#1b2b48]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
            <div className="flex items-center gap-4">
               <button onClick={handleBackToMenu} className="p-2 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition-all group flex items-center gap-2">
                 <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                 <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Kembali</span>
               </button>
               <div className="w-px h-8 bg-white/20"></div>
               <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('ABOUT')}>
                 <img src={APP_LOGO} alt="App" className="h-8 object-contain brightness-110 drop-shadow-[0_0_8px_rgba(241,171,0,0.85)] hover:drop-shadow-[0_0_12px_rgba(241,171,0,1)] hover:scale-105 transition-all duration-200" />
               </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col leading-none text-right">
                <span className="font-extrabold text-sm text-white tracking-tight">Yandal Patrol</span>
                <span className="text-[9px] text-[#f1ab00] font-black uppercase tracking-widest mt-0.5">{session.ulp || 'UP3 PADANG'}</span>
              </div>
              <div className="w-px h-8 bg-white/20 block"></div>
              <button onClick={handleLogout} className="text-[10px] text-white bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 hover:border-red-500 font-extrabold px-3 py-2 rounded-xl transition-all uppercase tracking-widest flex items-center gap-1.5">
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
        </div>
        <div className="bg-[#172b4d] border-t border-white/5 py-2.5">
          <div className="max-w-7xl mx-auto px-4">
            <nav className="flex space-x-2 overflow-x-auto no-scrollbar scroll-smooth">
              {role === UserRole.ADMIN && (
                <>
                  <button onClick={() => setView('DASHBOARD')} className={`px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider whitespace-nowrap transition-all duration-150 flex items-center gap-2 ${view === 'DASHBOARD' ? 'bg-[#f1ab00] text-[#0f1d36] shadow-md font-black scale-102' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Dashboard
                  </button>
                  <button onClick={() => setView('REKAP')} className={`px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider whitespace-nowrap transition-all duration-150 flex items-center gap-2 ${view === 'REKAP' ? 'bg-[#f1ab00] text-[#0f1d36] shadow-md font-black scale-102' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
                    <ClipboardList className="w-3.5 h-3.5" />
                    Rekap Petugas
                  </button>
                  <button onClick={() => setView('BACKUP')} className={`px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider whitespace-nowrap transition-all duration-150 flex items-center gap-2 ${view === 'BACKUP' ? 'bg-[#f1ab00] text-[#0f1d36] shadow-md font-black scale-102' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
                    <Database className="w-3.5 h-3.5" />
                    File BackUp
                  </button>
                  <button onClick={() => setView('SETTINGS')} className={`px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider whitespace-nowrap transition-all duration-150 flex items-center gap-2 ${view === 'SETTINGS' ? 'bg-[#f1ab00] text-[#0f1d36] shadow-md font-black scale-102' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
                    <Sliders className="w-3.5 h-3.5" />
                    Kelola Data
                  </button>
                </>
              )}
              {role === UserRole.USER && (
                <>
                  <button onClick={() => setView('INPUT')} className={`px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider whitespace-nowrap transition-all duration-150 flex items-center gap-2 ${view === 'INPUT' ? 'bg-[#f1ab00] text-[#0f1d36] shadow-md font-black scale-102' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
                    <Plus className="w-3.5 h-3.5" />
                    Input Data
                  </button>
                  <button onClick={() => setView('UPDATE_LIST')} className={`px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider whitespace-nowrap transition-all duration-150 flex items-center gap-2 ${view === 'UPDATE_LIST' || view === 'UPDATE_FORM' ? 'bg-[#f1ab00] text-[#0f1d36] shadow-md font-black scale-102' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Update Data
                  </button>
                </>
              )}
              <button onClick={() => setView('TABLE')} className={`px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider whitespace-nowrap transition-all duration-150 flex items-center gap-2 ${view === 'TABLE' ? 'bg-[#f1ab00] text-[#0f1d36] shadow-md font-black scale-102' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
                <FileText className="w-3.5 h-3.5" />
                Data Laporan
              </button>
              <button onClick={() => setView('ABOUT')} className={`px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider whitespace-nowrap transition-all duration-150 flex items-center gap-2 ${view === 'ABOUT' ? 'bg-[#f1ab00] text-[#0f1d36] shadow-md font-black scale-102' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
                <Info className="w-3.5 h-3.5" />
                Tentang
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {view === 'DASHBOARD' && <Dashboard reports={filteredReportsForTable.filter(r => !session.ulp || r.ulp === session.ulp)} masterData={masterData} />}
        {view === 'REKAP' && role === UserRole.ADMIN && <AdminRekap reports={reports} masterData={masterData} />}
        {view === 'BACKUP' && role === UserRole.ADMIN && (
          <FileBackup 
            files={backupFiles} 
            loading={isBackupLoading} 
            error={backupError} 
            onRefresh={() => fetchBackupFiles(true)} 
          />
        )}
        {view === 'SETTINGS' && role === UserRole.ADMIN && (
          <AdminSettings 
            masterData={masterData}
            onAddPetugas={(ulp, names) => { const nd = {...masterData, [ulp]: {...masterData[ulp], petugas: [...masterData[ulp].petugas, ...names]}}; setMasterData(nd); if(!isDemoMode) api.updateMasterData(nd); }}
            onDeletePetugas={(ulp, n) => { const nd = {...masterData, [ulp]: {...masterData[ulp], petugas: masterData[ulp].petugas.filter(p => p !== n)}}; setMasterData(nd); if(!isDemoMode) api.updateMasterData(nd); }}
            onAddPenyulang={(ulp, names) => { const nd = {...masterData, [ulp]: {...masterData[ulp], penyulang: [...masterData[ulp].penyulang, ...names]}}; setMasterData(nd); if(!isDemoMode) api.updateMasterData(nd); }}
            onDeletePenyulang={(ulp, n) => { const nd = {...masterData, [ulp]: {...masterData[ulp], penyulang: masterData[ulp].penyulang.filter(p => p !== n)}}; setMasterData(nd); if(!isDemoMode) api.updateMasterData(nd); }}
            onAddKeypoint={(ulp, penyulang, kps) => {
              const nd = { ...masterData };
              if (!nd[ulp].keypoints) nd[ulp].keypoints = {};
              if (!nd[ulp].keypoints[penyulang]) nd[ulp].keypoints[penyulang] = [];
              nd[ulp].keypoints[penyulang] = [...new Set([...nd[ulp].keypoints[penyulang], ...kps])];
              setMasterData(nd); if(!isDemoMode) api.updateMasterData(nd);
            }}
            onDeleteKeypoint={(ulp, penyulang, kp) => {
              const nd = { ...masterData };
              if (nd[ulp].keypoints?.[penyulang]) nd[ulp].keypoints[penyulang] = nd[ulp].keypoints[penyulang].filter(item => item !== kp);
              setMasterData(nd); if(!isDemoMode) api.updateMasterData(nd);
            }}
          />
        )}
        {view === 'INPUT' && role !== UserRole.GUEST && <InputForm key={editingReport?.id || 'new-report'} onSubmit={handleSaveReport} onCancel={() => setView('TABLE')} masterData={masterData} sessionData={session} editData={editingReport} />}
        {view === 'UPDATE_LIST' && <UpdateList reports={reports} session={session} onUpdate={handleUpdatePhoto} />}
        {view === 'UPDATE_FORM' && updatingReport && <UpdatePhotoForm report={updatingReport} onSubmit={handleSaveReport} onCancel={() => setView('UPDATE_LIST')} />}
        {view === 'TABLE' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-800 uppercase">Riwayat Penugasan</h2>
              <div className="flex gap-2">
                <button onClick={() => fetchData(true)} className="p-2.5 bg-slate-200 rounded-2xl hover:bg-slate-300 transition-all"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
                {role === UserRole.USER && <button onClick={() => setView('INPUT')} className="bg-primary text-white px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">Tambah Laporan</button>}
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-5 gap-5 items-end">
              <input type="date" className="w-full px-4 py-2.5 border rounded-xl text-xs font-bold" value={tableStartDate} onChange={(e) => setTableStartDate(e.target.value)} />
              <input type="date" className="w-full px-4 py-2.5 border rounded-xl text-xs font-bold" value={tableEndDate} onChange={(e) => setTableEndDate(e.target.value)} />
              {(role === UserRole.ADMIN || (role === UserRole.GUEST && !session.ulp)) && (
                <select className="w-full px-4 py-2.5 border rounded-xl text-xs font-bold bg-white" value={tableUlpFilter} onChange={(e) => setTableUlpFilter(e.target.value as any)}>
                  <option value="">Semua ULP</option>
                  {Object.keys(masterData).map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              )}
              <button onClick={() => { setTableStartDate(initStart); setTableEndDate(initEnd); setTableUlpFilter(''); }} className="w-full py-2.5 px-4 bg-slate-50 text-slate-400 font-black rounded-xl text-[10px] uppercase border transition-all">Reset</button>
              {role === UserRole.ADMIN && <button onClick={handleDownloadExcel} className="w-full py-2.5 px-4 bg-green-600 text-white font-black rounded-xl text-[10px] uppercase shadow-lg">Export Excel LENGKAP</button>}
            </div>
            <DataTable reports={filteredReportsForTable} onEdit={role !== UserRole.GUEST ? openEditForm : undefined} />
          </div>
        )}
        {view === 'ABOUT' && (
          <div className="max-w-3xl mx-auto animate-fade-in">
            <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-200">
               <div className="bg-primary p-12 text-white text-center flex flex-col items-center">
                  <img src={APP_LOGO} alt="App" className="h-36 w-auto object-contain z-10 mb-6" />
                  <h1 className="text-4xl font-black mb-1 uppercase">Yandal Patrol Monitoring</h1>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] bg-white/20 px-4 py-1.5 rounded-full mt-3">Version {APP_VERSION}</span>
               </div>
               <div className="p-10 space-y-10">
                  <section className="text-center space-y-4">
                    <h2 className="text-xl font-black text-slate-800 uppercase">Status Sistem Notifikasi</h2>
                    <div className="flex flex-col items-center gap-4">
                      {isMobileDevice() ? (
                        <div className={`px-6 py-3 rounded-2xl flex items-center gap-3 border ${notifPermission === 'granted' ? 'bg-green-50 border-green-200 text-green-700' : notifPermission === 'denied' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                          <div className={`w-3 h-3 rounded-full ${notifPermission === 'granted' ? 'bg-green-500 animate-pulse' : notifPermission === 'denied' ? 'bg-red-500' : 'bg-slate-400'}`}></div>
                          <span className="text-sm font-black uppercase tracking-widest">Izin Notifikasi: {notifPermission === 'granted' ? 'Aktif' : notifPermission === 'denied' ? 'Diblokir' : 'Belum Diizinkan'}</span>
                        </div>
                      ) : (
                        <div className="px-6 py-3 rounded-2xl flex items-center gap-3 border bg-slate-50 border-slate-200 text-slate-500">
                          <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                          <span className="text-sm font-black uppercase tracking-widest">Dinonaktifkan pada PC / Desktop (Hanya Aktif di HP / Android)</span>
                        </div>
                      )}
                    </div>
                  </section>
                  <div className="pt-10 border-t border-slate-100 flex flex-col items-center gap-2">
                    <p className="text-base font-black text-slate-800 uppercase">PLN Electricity Services Padang</p>
                    <p className="text-[11px] text-slate-400 font-bold uppercase">© DD-2025 • IT Unit Layanan Bukittinggi</p>
                  </div>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
