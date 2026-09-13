import { ReportData, ULPData } from '../types';
import { BACKUP_FOLDER_ID } from '../constants';
import seedData from '../data/seedData.json';

/**
 * URL Google Apps Script Default & Dynamic Configuration
 */
const DEFAULT_SCRIPT_URL: string = 'https://script.google.com/macros/s/AKfycbwL_M9hjTO5OVupCnVGA-kQh9luXayLeVZfgKZNDn96YHXp9pryhgbqGQPXuwIbCKUj/exec'; 

export const getScriptUrl = (): string => {
  if (typeof window !== 'undefined') {
    const savedUrl = localStorage.getItem('yandal_script_url');
    if (savedUrl && savedUrl.trim().length > 0) {
      return savedUrl.trim();
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
    // 1. Immediately persist locally in localStorage so data is never lost
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('yandal_local_reports');
        let currentReports: ReportData[] = cached ? JSON.parse(cached) : (seedData.reports as unknown as ReportData[]);
        if (isEdit) {
          currentReports = currentReports.map(r => r.id === report.id ? report : r);
        } else {
          currentReports = [report, ...currentReports.filter(r => r.id !== report.id)];
        }
        localStorage.setItem('yandal_local_reports', JSON.stringify(currentReports));
      } catch (e) {
        console.warn("Could not save report to localStorage:", e);
      }
    }

    // 2. Try sending to server proxy or Google Apps Script
    const baseUrl = getScriptUrl();
    const action = isEdit ? 'updateReport' : 'saveReport';
    const payload = JSON.stringify({ action, data: report });

    try {
      // Try Vite proxy first
      await fetch(`/api/gas?scriptUrl=${encodeURIComponent(baseUrl)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: payload
      });
      return true;
    } catch (err) {
      // Fallback to direct fetch
    }

    try {
      await fetch(`${baseUrl}?action=${action}`, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: payload
      });
      return true;
    } catch (error) {
      console.warn("Direct save to Google Apps Script failed, saved locally:", error);
      return true;
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
