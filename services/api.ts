import { ReportData, ULPData } from '../types';
import { BACKUP_FOLDER_ID } from '../constants';
import seedData from '../data/seedData.json';

/**
 * URL Google Apps Script Default & Dynamic Configuration
 */
const DEFAULT_SCRIPT_URL: string = 'https://script.google.com/macros/s/AKfycbwX0ayOTnDMZQi8r10jkz13vfi2531_N687C1xRQd767IIwlHWK2WOd1mzX9Z4taC30/exec'; 
const LEGACY_SCRIPT_URLS = [
  'https://script.google.com/macros/s/AKfycbwL_M9hjTO5OVupCnVGA-kQh9luXayLeVZfgKZNDn96YHXp9pryhgbqGQPXuwIbCKUj/exec'
];

export const getScriptUrl = (): string => {
  if (typeof window !== 'undefined') {
    const savedUrl = localStorage.getItem('yandal_script_url');
    if (savedUrl && savedUrl.trim().length > 0) {
      const trimmed = savedUrl.trim();
      // If client has the defunct old deployment in localStorage, clear it and use the latest default URL
      if (LEGACY_SCRIPT_URLS.includes(trimmed)) {
        localStorage.removeItem('yandal_script_url');
        return DEFAULT_SCRIPT_URL;
      }
      return trimmed;
    }
  }
  return DEFAULT_SCRIPT_URL;
};

export const setScriptUrl = (url: string): void => {
  if (typeof window !== 'undefined') {
    if (url && url.trim().length > 0) {
      localStorage.setItem('yandal_script_url', url.trim());
    } else {
      localStorage.removeItem('yandal_script_url');
    }
  }
};

const getFallbackData = () => {
  let reports = seedData.reports || [];
  let masterData = (seedData.masterData as unknown as Record<string, ULPData>) || {};

  if (typeof window !== 'undefined') {
    try {
      const cachedReports = localStorage.getItem('yandal_local_reports');
      if (cachedReports) {
        const parsed = JSON.parse(cachedReports);
        if (Array.isArray(parsed) && parsed.length > 0) {
          reports = parsed;
        }
      }
      const cachedMaster = localStorage.getItem('yandal_cached_master');
      if (cachedMaster) {
        const parsedM = JSON.parse(cachedMaster);
        if (parsedM && typeof parsedM === 'object') {
          masterData = parsedM;
        }
      }
    } catch (e) {
      // Ignore cache parse error
    }
  }

  return {
    status: 'ok',
    reports: reports as unknown as ReportData[],
    masterData,
    isOffline: true
  };
};

export const api = {
  getAllData: async () => {
    const baseUrl = getScriptUrl();

    // 1. Try local Vite proxy first (avoids browser CORS and 404 from Google account switching)
    try {
      const proxyUrl = `/api/data?scriptUrl=${encodeURIComponent(baseUrl)}&_=${Date.now()}`;
      const proxyRes = await fetch(proxyUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (proxyRes.ok) {
        const text = await proxyRes.text();
        if (text && !text.trim().startsWith('<')) {
          const parsed = JSON.parse(text);
          if (parsed && (parsed.reports || parsed.masterData)) {
            return parsed;
          }
        }
      }
    } catch (err) {
      // Local proxy not available or in standalone preview, continue to direct fetch
    }

    // 2. Try direct fetch to Google Apps Script
    try {
      const directUrl = `${baseUrl}?action=getAll&_=${Date.now()}`;
      const directRes = await fetch(directUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (directRes.ok) {
        const text = await directRes.text();
        if (text && !text.trim().startsWith('<') && (text.trim().startsWith('{') || text.trim().startsWith('['))) {
          const parsed = JSON.parse(text);
          if (parsed && (parsed.reports || parsed.masterData)) {
            return parsed;
          }
        }
      }
    } catch (err) {
      console.warn("Direct fetch to Google Apps Script failed, using offline fallback data.");
    }

    // 3. Fallback safely to cached/seed data
    return getFallbackData();
  },

  getBackupFiles: async () => {
    try {
      const baseUrl = getScriptUrl();
      const url = `${baseUrl}?action=getBackupFiles&folderId=${BACKUP_FOLDER_ID}&_=${Date.now()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store'
      });

      if (!response.ok) {
        return [];
      }

      const text = await response.text();
      if (text.trim().startsWith('<') || text.trim() === "Method GET OK" || !text.trim().startsWith("[")) {
        return [];
      }

      const data = JSON.parse(text);
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.warn("API Note (GetBackupFiles): Could not reach backup endpoint, returning empty list.");
      return [];
    }
  },

  saveReport: async (report: ReportData, isEdit: boolean = false) => {
    // 1. Sanitize photos: ensure arrays exist and no null/undefined values
    const cleanSebelum = Array.isArray(report.photos?.sebelum)
      ? report.photos.sebelum.map(p => (p === null || p === undefined) ? '' : String(p))
      : Array(6).fill('');
    while (cleanSebelum.length < 6) cleanSebelum.push('');

    const cleanSesudah = Array.isArray(report.photos?.sesudah)
      ? report.photos.sesudah.map(p => (p === null || p === undefined) ? '' : String(p))
      : Array(6).fill('');
    while (cleanSesudah.length < 6) cleanSesudah.push('');

    const sanitizedReport: ReportData = {
      ...report,
      photos: {
        sebelum: cleanSebelum,
        sesudah: cleanSesudah
      }
    };

    // 2. Immediately persist locally in localStorage so data is never lost
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('yandal_local_reports');
        let currentReports: ReportData[] = cached ? JSON.parse(cached) : (seedData.reports as unknown as ReportData[]);
        if (isEdit) {
          currentReports = currentReports.map(r => r.id === sanitizedReport.id ? sanitizedReport : r);
        } else {
          currentReports = [sanitizedReport, ...currentReports.filter(r => r.id !== sanitizedReport.id)];
        }
        localStorage.setItem('yandal_local_reports', JSON.stringify(currentReports));
      } catch (e) {
        console.warn("Could not save report to localStorage:", e);
      }
    }

    // 3. Try sending to server proxy or Google Apps Script
    const baseUrl = getScriptUrl();
    const action = isEdit ? 'updateReport' : 'saveReport';
    const payload = JSON.stringify({ action, data: sanitizedReport });

    // Try Vite proxy first
    try {
      const proxyUrl = `/api/gas?action=${action}&scriptUrl=${encodeURIComponent(baseUrl)}`;
      const proxyRes = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: payload
      });
      if (proxyRes.ok) {
        const text = await proxyRes.text();
        console.log("Server proxy save response:", text);
        try {
          const json = JSON.parse(text);
          if (json.status === 'success' || json.status === 'ok') {
            return true;
          }
        } catch (e) {
          if (text.includes('success')) return true;
        }
      }
    } catch (err) {
      console.warn("Proxy save failed, trying direct fetch to GAS:", err);
    }

    // Fallback: Direct fetch to Google Apps Script
    try {
      const directUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}action=${action}`;
      await fetch(directUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: payload
      });
      console.log("Direct fetch to Google Apps Script sent successfully.");
      return true;
    } catch (error) {
      console.error("Direct save to Google Apps Script failed:", error);
      throw error;
    }
  },

  testConnection: async (testUrl?: string): Promise<{ success: boolean; message: string }> => {
    const url = testUrl || getScriptUrl();
    try {
      const pingUrl = `/api/data?scriptUrl=${encodeURIComponent(url)}&action=getAll&_=${Date.now()}`;
      const res = await fetch(pingUrl, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const text = await res.text();
        if (text && !text.trim().startsWith('<') && (text.trim().startsWith('{') || text.trim().startsWith('['))) {
          const parsed = JSON.parse(text);
          const count = Array.isArray(parsed.reports) ? parsed.reports.length : 0;
          return {
            success: true,
            message: `Koneksi berhasil! Terhubung ke Spreadsheet (${count} laporan terdata).`
          };
        }
      }
      return {
        success: false,
        message: 'Endpoint merespons tapi format data bukan JSON yang valid.'
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Gagal menghubungi server Apps Script.'
      };
    }
  },

  updateMasterData: async (masterData: Record<string, ULPData>) => {
    // 1. Persist locally
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('yandal_cached_master', JSON.stringify(masterData));
      } catch (e) {
        console.warn("Could not cache master data to localStorage:", e);
      }
    }

    // 2. Send to server
    const baseUrl = getScriptUrl();
    const payload = JSON.stringify({ action: 'updateMaster', data: masterData });

    try {
      await fetch(`/api/gas?scriptUrl=${encodeURIComponent(baseUrl)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: payload
      });
      return true;
    } catch (e) {
      // Fallback
    }

    try {
      await fetch(`${baseUrl}?action=updateMaster`, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: payload
      });
      return true;
    } catch (error) {
      console.warn("Direct update master data failed, saved locally:", error);
      return true;
    }
  }
};
