import { ReportData, ULPData } from '../types';
import { BACKUP_FOLDER_ID } from '../constants';

/**
 * URL Google Apps Script
 */
const GOOGLE_SCRIPT_URL: string = 'https://script.google.com/macros/s/AKfycbwL_M9hjTO5OVupCnVGA-kQh9luXayLeVZfgKZNDn96YHXp9pryhgbqGQPXuwIbCKUj/exec'; 

export const api = {
  getAllData: async () => {
    try {
      const url = `${GOOGLE_SCRIPT_URL}?action=getAll&_=${Date.now()}`;
      console.log("Fetching all data from:", url);
      
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-cache'
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      console.log("Raw response length:", text.length);
      
      if (text.trim().startsWith('<')) {
        console.error("Received HTML instead of JSON:", text.substring(0, 200));
        throw new Error("Database mengembalikan format HTML. Pastikan skrip dideploy sebagai 'Anyone'.");
      }

      try {
        const data = JSON.parse(text);
        return data;
      } catch (e) {
        console.error("JSON Parse Error. Raw text:", text.substring(0, 500));
        throw new Error("Gagal mengurai data JSON dari server.");
      }
    } catch (error: any) {
      console.error("Detailed API Error (GetAll):", error);
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new Error("Gagal terhubung ke server (CORS/Network Error). Ini biasanya terjadi jika skrip Apps Script error atau belum di-deploy sebagai 'Anyone'.");
      }
      throw error;
    }
  },

  getBackupFiles: async () => {
    try {
      // Pastikan folderId terkirim dengan benar
      const url = `${GOOGLE_SCRIPT_URL}?action=getBackupFiles&folderId=${BACKUP_FOLDER_ID}&_=${Date.now()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store' // Hindari cache agar data selalu fresh
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const text = await response.text();
      
      // Cek apakah response berupa HTML (biasanya tanda error GAS)
      if (text.trim().startsWith('<')) {
        throw new Error("Server mengembalikan format HTML. Pastikan skrip sudah di-deploy sebagai 'Anyone'.");
      }

      // Jika response adalah Method GET OK (belum di-deploy fitur backup di GAS)
      if (text.trim() === "Method GET OK" || !text.trim().startsWith("[")) {
        return { error: "Fitur file backup belum ditambahkan/aktif di Google Apps Script Anda. Silakan hubungi Administrator untuk memperbarui Apps Script." };
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error("Gagal mengurai JSON: " + text.substring(0, 100));
      }
      
      // Jika server mengembalikan objek dengan properti error
      if (data && typeof data === 'object' && !Array.isArray(data) && data.error) {
        throw new Error(data.error);
      }
      
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error("API Error (GetBackupFiles):", error);
      
      if (error.message.includes('parameter')) {
        throw new Error("Server Error: Parameter 'e' tidak terbaca. Pastikan fungsi doGet meneruskan 'e' ke getBackupFiles(e).");
      }
      
      throw error;
    }
  },

  saveReport: async (report: ReportData, isEdit: boolean = false) => {
    try {
      const action = isEdit ? 'updateReport' : 'saveReport';
      
      const payload = JSON.stringify({
        action: action,
        data: report
      });

      const urlWithAction = `${GOOGLE_SCRIPT_URL}?action=${action}`;

      // Menggunakan mode: 'cors' dengan 'text/plain' agar bisa mendeteksi status sukses/gagal
      // tanpa memicu preflight OPTIONS request yang tidak didukung GAS.
      const response = await fetch(urlWithAction, {
        method: 'POST',
        mode: 'cors',
        headers: { 
          'Content-Type': 'text/plain' 
        },
        body: payload
      });

      if (!response.ok && response.status !== 0) {
        throw new Error(`Gagal menyimpan data (HTTP ${response.status})`);
      }

      // Periksa isi respons untuk mendeteksi pesan error dari Google Apps Script
      try {
        const text = await response.text();
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed && parsed.status === 'error') {
            throw new Error(parsed.message || "Terjadi kesalahan di server Google Apps Script.");
          }
        }
      } catch (jsonErr: any) {
        if (jsonErr.message && (jsonErr.message.includes("DriveApp") || jsonErr.message.includes("Akses ditolak") || jsonErr.message.includes("Access denied"))) {
          throw jsonErr;
        }
      }

      return true;
    } catch (error) {
      console.error("API Error (Save/Update):", error);
      throw error;
    }
  },

  updateMasterData: async (masterData: Record<string, ULPData>) => {
    try {
      const payload = JSON.stringify({
        action: 'updateMaster',
        data: masterData
      });

      const urlWithAction = `${GOOGLE_SCRIPT_URL}?action=updateMaster`;

      await fetch(urlWithAction, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: payload
      });
      return true;
    } catch (error) {
      console.error("API Error (UpdateMaster):", error);
      return true;
    }
  }
};