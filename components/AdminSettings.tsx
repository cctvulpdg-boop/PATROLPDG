
import React, { useState } from 'react';
import { ULPName, ULPData } from '../types';
import { getScriptUrl, setScriptUrl, api } from '../services/api';
import { SPREADSHEET_ID, PHOTO_FOLDER_ID, BACKUP_FOLDER_ID } from '../constants';
import { Link, Check, RefreshCw, Server, AlertCircle, Radio, Copy, Code, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react';

interface AdminSettingsProps {
  masterData: Record<string, ULPData>;
  onAddPetugas: (ulp: ULPName, names: string[]) => Promise<{ success: boolean; message?: string } | void> | void;
  onDeletePetugas: (ulp: ULPName, name: string) => Promise<{ success: boolean; message?: string } | void> | void;
  onAddPenyulang: (ulp: ULPName, names: string[]) => Promise<{ success: boolean; message?: string } | void> | void;
  onDeletePenyulang: (ulp: ULPName, name: string) => Promise<{ success: boolean; message?: string } | void> | void;
  onAddKeypoint: (ulp: ULPName, penyulang: string, keypoints: string[]) => Promise<{ success: boolean; message?: string } | void> | void;
  onDeleteKeypoint: (ulp: ULPName, penyulang: string, keypoint: string) => Promise<{ success: boolean; message?: string } | void> | void;
  onSyncMaster?: () => Promise<{ success: boolean; message?: string } | void>;
  onInitDefault?: () => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ 
  masterData, 
  onAddPetugas, 
  onDeletePetugas, 
  onAddPenyulang,
  onDeletePenyulang,
  onAddKeypoint,
  onDeleteKeypoint,
  onSyncMaster,
  onInitDefault
}) => {
  const [selectedUlp, setSelectedUlp] = useState<ULPName | ''>('');
  const [newPetugas, setNewPetugas] = useState('');
  const [newPenyulang, setNewPenyulang] = useState('');
  
  const [activePenyulangForKeypoints, setActivePenyulangForKeypoints] = useState('');
  const [newKeypoint, setNewKeypoint] = useState('');

  const [gasUrlInput, setGasUrlInput] = useState(getScriptUrl());
  const [urlStatusMsg, setUrlStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [showCodeGuide, setShowCodeGuide] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const fullGasScript = `/**
 * GOOGLE APPS SCRIPT - PEXASUS PROJECT (PLN ES UP4 SUMBAR)
 * Backend untuk Penugasan Khusus, Rekap Patroli & Pengaturan Master Data
 *
 * Petunjuk:
 * 1. Salin seluruh kode ini ke Apps Script editor di Spreadsheet Anda.
 * 2. Deploy sebagai 'Web App':
 *    - Execute as: 'Me' (email Anda)
 *    - Who has access: 'Anyone' (Wajib Anyone!)
 * 3. Salin URL Web App yang dihasilkan ke kotak 'Web App URL' pada menu Pengaturan Admin.
 */

// --- KONFIGURASI UTAMA ---
const SPREADSHEET_ID = "${SPREADSHEET_ID}"; // ID Spreadsheet Anda
const SHEET_NAME = "Laporan"; // Nama sheet utama untuk data penugasan/laporan
const MASTER_SHEET_NAME = "MasterData"; // Nama sheet untuk Master Petugas & Penyulang
const PHOTO_FOLDER_ID = "${PHOTO_FOLDER_ID}"; // ID Folder Google Drive untuk Foto
const BACKUP_FOLDER_ID = "${BACKUP_FOLDER_ID}"; // ID Folder Backup (Opsional)

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim().length > 0) {
    try {
      return SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (e) {
      Logger.log("Peringatan: fallback ke active spreadsheet: " + e.toString());
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getReportSheet(ss) {
  return ss.getSheetByName(SHEET_NAME) || 
         ss.getSheetByName("Laporan") || 
         ss.getSheetByName("DATA_PATROL") || 
         ss.getSheetByName("Sheet1") || 
         ss.insertSheet(SHEET_NAME);
}

function getMasterSheet(ss) {
  var sheet = ss.getSheetByName(MASTER_SHEET_NAME) || 
              ss.getSheetByName("MasterData") || 
              ss.getSheetByName("MASTER_DATA") || 
              ss.getSheetByName("Master Data");
  if (!sheet) {
    sheet = ss.insertSheet(MASTER_SHEET_NAME);
    sheet.appendRow(["Key", "DataJSON", "LastUpdated"]);
    sheet.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#fef3c7");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Handle GET Requests (Health Check & Mengambil Semua Data)
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getAll";

    if (action === "getBackupFiles") {
      return getBackupFiles(e);
    }

    if (action === "getMaster") {
      var ss = getSpreadsheet();
      var master = readMasterData(ss);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", masterData: master }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Default: kembalikan getAllData (laporan + masterData)
    return getAllData();

  } catch (err) {
    Logger.log("ERROR in doGet: " + err.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Server Error: " + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle POST Requests dari Frontend
 */
function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : "";
    Logger.log("Raw Post Data: " + raw);

    var requestData = {};
    if (raw) {
      try {
        requestData = JSON.parse(raw);
      } catch (ex) {
        requestData = e.parameter || {};
      }
    } else if (e && e.parameter) {
      requestData = e.parameter;
    }

    var action = requestData.action || (e && e.parameter && e.parameter.action);
    var data = requestData.data || requestData;

    Logger.log("Action: " + action);

    var result;
    if (action === "saveReport") {
      result = saveReport(data);
    } else if (action === "updateReport") {
      result = updateReport(data);
    } else if (action === "updateMaster" || action === "updateMasterSheets") {
      result = updateMasterSheets(data);
    } else {
      throw new Error("Action tidak dikenali: " + action);
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("ERROR in doPost: " + err.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        status: "error",
        message: "Server Error: " + err.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Simpan / Perbarui Master Data ke Sheet "MasterData"
 */
function updateMasterSheets(data) {
  try {
    var ss = getSpreadsheet();
    if (!ss) throw new Error("Gagal membuka spreadsheet. Periksa SPREADSHEET_ID.");

    var sheet = getMasterSheet(ss);
    var fullObj = typeof data === "string" ? JSON.parse(data) : data;
    var jsonStr = typeof data === "string" ? data : JSON.stringify(data);
    var nowStr = new Date().toISOString();

    sheet.clear();
    sheet.appendRow(["Key", "DataJSON", "LastUpdated"]);
    sheet.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#fef3c7");
    sheet.setFrozenRows(1);

    var rows = [
      ["MASTER_ULP", jsonStr, nowStr]
    ];

    if (fullObj && typeof fullObj === "object") {
      for (var ulpKey in fullObj) {
        if (ulpKey !== "MASTER_ULP" && fullObj[ulpKey] && typeof fullObj[ulpKey] === "object") {
          rows.push([ulpKey, JSON.stringify(fullObj[ulpKey]), nowStr]);
        }
      }
    }

    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, 3).setValues(rows);
    }

    Logger.log("Sukses menyimpan MasterData ke Sheet: " + sheet.getName());

    return {
      success: true,
      status: "success",
      message: "Data Master Petugas & Jaringan berhasil disimpan ke Sheet '" + sheet.getName() + "'."
    };
  } catch (e) {
    Logger.log("ERROR in updateMasterSheets: " + e.toString());
    return {
      success: false,
      status: "error",
      message: "Gagal menyimpan Master Data ke Spreadsheet: " + e.toString()
    };
  }
}

function updateMaster(data) {
  return updateMasterSheets(data);
}

/**
 * Baca Master Data dari Sheet "MasterData"
 */
function readMasterData(ss) {
  var sheet = ss.getSheetByName(MASTER_SHEET_NAME) || 
              ss.getSheetByName("MasterData") || 
              ss.getSheetByName("MASTER_DATA") || 
              ss.getSheetByName("Master Data");
  var master = {};
  if (!sheet) return master;

  var values = sheet.getDataRange().getValues();
  if (!values || values.length <= 1) return master;

  // 1. Cek baris MASTER_ULP jika ada format JSON gabungan semua ULP
  for (var i = 1; i < values.length; i++) {
    var key = String(values[i][0] || "").trim().toUpperCase();
    if (key === "MASTER_ULP" || key === "MASTERDATA" || key === "MASTER_DATA") {
      try {
        var parsed = JSON.parse(values[i][1]);
        if (parsed && typeof parsed === "object" && !parsed.name && !parsed.petugas) {
          for (var k in parsed) {
            if (parsed[k] && typeof parsed[k] === "object") {
              master[k] = parsed[k];
            }
          }
        }
      } catch (e) {}
    }
  }

  // 2. Loop SEMUA baris: kumpulkan data masing-masing ULP dari baris-baris sheet
  for (var r = 1; r < values.length; r++) {
    var col0 = String(values[r][0] || "").trim();
    var col1 = String(values[r][1] || "").trim();

    var jsonStr = col1.startsWith("{") ? col1 : (col0.startsWith("{") ? col0 : "");
    if (jsonStr) {
      try {
        var item = JSON.parse(jsonStr);
        if (item && typeof item === "object") {
          var ulpName = item.name || (col0.toUpperCase() !== "MASTER_ULP" ? col0 : "");
          if (ulpName) {
            master[ulpName] = item;
          } else if (!item.name && !item.petugas) {
            for (var mKey in item) {
              if (item[mKey] && typeof item[mKey] === "object") {
                master[mKey] = item[mKey];
              }
            }
          }
        }
      } catch (err) {}
    }
  }

  // 3. Cek format kolom tabel per ULP
  var header = values[0].map(function(h) { return String(h || "").trim(); });
  var hasUlpCols = header.some(function(h) { return h.toUpperCase().indexOf("ULP") !== -1; });
  if (hasUlpCols) {
    for (var c = 0; c < header.length; c++) {
      var colHeader = header[c];
      if (colHeader && colHeader.toUpperCase().indexOf("ULP") !== -1) {
        if (!master[colHeader]) {
          master[colHeader] = { name: colHeader, petugas: [], penyulang: [], keypoints: {} };
        }
        for (var row = 1; row < values.length; row++) {
          var val = String(values[row][c] || "").trim();
          if (val && master[colHeader].petugas.indexOf(val) === -1) {
            master[colHeader].petugas.push(val);
          }
        }
      }
    }
  }

  return master;
}

/**
 * Mengambil Seluruh Laporan dan MasterData
 */
function getAllData() {
  var ss = getSpreadsheet();
  if (!ss) throw new Error("Gagal membuka spreadsheet.");

  var sheet = getReportSheet(ss);
  var values = sheet.getDataRange().getValues();
  var reports = [];

  if (values.length > 1) {
    var headers = values[0].map(function(h) { return String(h || "").trim().toLowerCase(); });

    var idxId = headers.indexOf("id");
    var idxTs = headers.indexOf("timestamp");
    var idxBulan = headers.indexOf("bulan");
    var idxNo = headers.findIndex(function(h) { return h.indexOf("penugasan") !== -1 || h === "no"; });
    var idxUlp = headers.indexOf("ulp");
    var idxP1 = headers.findIndex(function(h) { return h === "petugas 1" || h === "petugas1"; });
    var idxP2 = headers.findIndex(function(h) { return h === "petugas 2" || h === "petugas2"; });
    var idxPeny = headers.findIndex(function(h) { return h.indexOf("penyulang") !== -1; });
    var idxKp = headers.indexOf("keypoint");
    var idxStart = headers.findIndex(function(h) { return h.indexOf("start") !== -1; });
    var idxFinish = headers.findIndex(function(h) { return h.indexOf("finish") !== -1; });
    var idxTiang = headers.findIndex(function(h) { return h.indexOf("tiang") !== -1; });
    var idxKms = headers.findIndex(function(h) { return h.indexOf("kms") !== -1; });

    var sblmIndices = [];
    var ssdhIndices = [];
    for (var n = 1; n <= 10; n++) {
      sblmIndices.push(headers.findIndex(function(h) { 
        return h === "foto sebelum " + n || h === "fotosebelum" + n || h === "foto sebelum" + n; 
      }));
      ssdhIndices.push(headers.findIndex(function(h) { 
        return h === "foto sesudah " + n || h === "fotosesudah" + n || h === "foto sesudah" + n; 
      }));
    }

    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      var rId = idxId !== -1 && row[idxId] ? String(row[idxId]) : ("REP_" + i);
      if (!row[idxId] && !row[idxNo] && !row[idxUlp]) continue;

      var sblm = [];
      for (var s = 0; s < 10; s++) {
        var idx = sblmIndices[s];
        var val = (idx !== -1 && row[idx]) ? String(row[idx]) : null;
        sblm.push(val);
      }

      var ssdh = [];
      for (var s = 0; s < 10; s++) {
        var idx = ssdhIndices[s];
        var val = (idx !== -1 && row[idx]) ? String(row[idx]) : null;
        ssdh.push(val);
      }

      reports.push({
        id: rId,
        timestamp: (row[idxTs] instanceof Date) ? row[idxTs].toISOString() : String(row[idxTs] || new Date().toISOString()),
        bulan: idxBulan !== -1 ? String(row[idxBulan] || "") : "",
        noPenugasan: idxNo !== -1 ? String(row[idxNo] || "") : "",
        ulp: idxUlp !== -1 ? String(row[idxUlp] || "") : "",
        petugas1: idxP1 !== -1 ? String(row[idxP1] || "") : "",
        petugas2: idxP2 !== -1 ? String(row[idxP2] || "") : "",
        penyulang: idxPeny !== -1 ? String(row[idxPeny] || "") : "",
        keypoint: idxKp !== -1 ? String(row[idxKp] || "") : "",
        titikStart: idxStart !== -1 ? String(row[idxStart] || "") : "",
        titikFinish: idxFinish !== -1 ? String(row[idxFinish] || "") : "",
        jumlahTiang: idxTiang !== -1 ? String(row[idxTiang] || "") : "",
        jumlahKms: idxKms !== -1 ? String(row[idxKms] || "") : "",
        photos: {
          sebelum: sblm,
          sesudah: ssdh
        }
      });
    }
  }

  var masterData = readMasterData(ss);

  // Pastikan seluruh 10 ULP resmi selalu terdefinisi
  var defaultULPs = [
    "ULP BALAI SELASA", "ULP BELANTI", "ULP INDARUNG", "ULP KURANJI",
    "ULP LUBUK ALUNG", "ULP MENTAWAI", "ULP PAINAN", "ULP PARIAMAN",
    "ULP SICINCIN", "ULP TABING"
  ];
  defaultULPs.forEach(function(uName) {
    if (!masterData[uName]) {
      masterData[uName] = {
        name: uName,
        petugas: [],
        penyulang: [],
        keypoints: {}
      };
    }
  });

  // Auto-enrich masterData dari data laporan nyata di spreadsheet ini
  reports.forEach(function(r) {
    if (r.ulp && String(r.ulp).trim().length > 0) {
      var uName = String(r.ulp).trim();
      if (!masterData[uName]) {
        masterData[uName] = {
          name: uName,
          petugas: [],
          penyulang: [],
          keypoints: {}
        };
      }
      var target = masterData[uName];
      if (r.petugas1 && target.petugas.indexOf(r.petugas1) === -1) target.petugas.push(r.petugas1);
      if (r.petugas2 && target.petugas.indexOf(r.petugas2) === -1) target.petugas.push(r.petugas2);
      if (r.penyulang && target.penyulang.indexOf(r.penyulang) === -1) target.penyulang.push(r.penyulang);
      if (r.penyulang && r.keypoint) {
        if (!target.keypoints) target.keypoints = {};
        if (!target.keypoints[r.penyulang]) target.keypoints[r.penyulang] = [];
        if (target.keypoints[r.penyulang].indexOf(r.keypoint) === -1) {
          target.keypoints[r.penyulang].push(r.keypoint);
        }
      }
    }
  });

  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    reports: reports,
    masterData: masterData
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Simpan Laporan Baru
 */
function saveReport(data) {
  try {
    var ss = getSpreadsheet();
    if (!ss) throw new Error("Gagal membuka spreadsheet.");

    var sheet = getReportSheet(ss);
    var headers = [];
    // 1. Dapatkan atau buat header jika belum ada
    if (sheet.getLastColumn() > 0 && sheet.getLastRow() > 0) {
      headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    } else {
      headers = [
        "ID", "Timestamp", "Bulan", "No Penugasan", "ULP",
        "Petugas 1", "Petugas 2", "Penyulang", "Keypoint",
        "Titik Start", "Titik Finish", "Jumlah Tiang", "Jumlah KMS"
      ];
      for (var i = 1; i <= 10; i++) {
        headers.push("Foto Sebelum " + i);
        headers.push("Foto Sesudah " + i);
      }
      sheet.appendRow(headers);
    }

    // 2. Cek apakah ID laporan sudah ada (Deduplikasi / Update)
    var values = sheet.getDataRange().getValues();
    var idIndex = headers.findIndex(function(h) { 
      var hl = String(h || "").toLowerCase().trim();
      return hl === 'id' || hl === 'timestamp';
    });

    var existingRowIdx = -1;
    if (idIndex !== -1 && values.length > 1 && (data.id || data.timestamp)) {
      for (var r = 1; r < values.length; r++) {
        var rowId = String(values[r][idIndex] || "").trim();
        if ((data.id && rowId === String(data.id)) || (data.timestamp && rowId === String(data.timestamp))) {
          existingRowIdx = r + 1;
          break;
        }
      }
    }

    var oldDataMap = {};
    if (existingRowIdx !== -1) {
      var oldRow = values[existingRowIdx - 1];
      headers.forEach(function(h, idx) { oldDataMap[h] = oldRow[idx]; });
    }

    // 3. Proses foto (upload Base64 & simpan link Drive)
    var processedData = processPhotos(data, oldDataMap);

    // 4. Petakan nilai berdasarkan nama Header kolom sheet
    var row = headers.map(function(header) {
      var hClean = String(header || "").toLowerCase().replace(/[\\s_-]/g, "");
      var foundKey = Object.keys(processedData).find(function(k) {
        return String(k).toLowerCase().replace(/[\\s_-]/g, "") === hClean;
      });
      return (foundKey !== undefined && processedData[foundKey] !== undefined) ? processedData[foundKey] : "";
    });

    if (existingRowIdx !== -1) {
      sheet.getRange(existingRowIdx, 1, 1, headers.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }

    return {
      success: true,
      status: "success",
      message: existingRowIdx !== -1 ? "Laporan berhasil diperbarui" : "Laporan berhasil disimpan",
      photoUrls: processedData.photoUrls
    };
  } catch (e) {
    return {
      success: false,
      status: "error",
      message: "Gagal menyimpan ke Spreadsheet: " + e.toString()
    };
  }
}

/**
 * Perbarui Laporan yang Sudah Ada
 */
function updateReport(data) {
  return saveReport(data);
}

// Fungsi mendapatkan atau membuat folder foto secara otomatis di Google Drive user
function getFolder() {
  if (PHOTO_FOLDER_ID && String(PHOTO_FOLDER_ID).trim().length > 0) {
    try {
      var f = DriveApp.getFolderById(PHOTO_FOLDER_ID);
      try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e) {}
      return f;
    } catch(err) {
      Logger.log("Peringatan: Gagal akses PHOTO_FOLDER_ID, beralih ke folder Yandal_Patrol_Photos");
    }
  }

  var folderName = "Yandal_Patrol_Photos";
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    var folder = folders.next();
    try { folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e) {}
    return folder;
  }
  var folderNew = DriveApp.createFolder(folderName);
  try { folderNew.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e) {}
  return folderNew;
}

/**
 * Memproses Foto (Base64 ke Drive)
 * Mendukung format objek array data.photos mau pun field flat (Foto Sebelum 1-10)
 */
function processPhotos(data, oldData) {
  oldData = oldData || {};
  var photoUrls = {};
  var result = Object.assign({}, data);

  // Normalisasi field standar
  if (data.petugas1) result["petugas1"] = data.petugas1;
  if (data.petugas2) result["petugas2"] = data.petugas2;
  if (data.noPenugasan) result["nopenugasan"] = data.noPenugasan;
  if (data.titikStart) result["titikstart"] = data.titikStart;
  if (data.titikFinish) result["titikfinish"] = data.titikFinish;
  if (data.jumlahTiang) result["jumlahtiang"] = data.jumlahTiang;
  if (data.jumlahKms) result["jumlahkms"] = data.jumlahKms;

  for (var i = 1; i <= 10; i++) {
    var sblmKey = "Foto Sebelum " + i;
    var ssdhKey = "Foto Sesudah " + i;

    // Ambil data foto dari berbagai kemungkinan struktur
    var valSeb = data[sblmKey] || data["fotoSebelum" + i] || data["sebelum" + i];
    if (!valSeb && data.photos && data.photos.sebelum && data.photos.sebelum[i - 1]) {
      valSeb = data.photos.sebelum[i - 1];
    }
    if (!valSeb && oldData[sblmKey]) {
      valSeb = oldData[sblmKey];
    }

    var valSes = data[ssdhKey] || data["fotoSesudah" + i] || data["sesudah" + i];
    if (!valSes && data.photos && data.photos.sesudah && data.photos.sesudah[i - 1]) {
      valSes = data.photos.sesudah[i - 1];
    }
    if (!valSes && oldData[ssdhKey]) {
      valSes = oldData[ssdhKey];
    }

    // Proses Foto Sebelum
    if (valSeb && String(valSeb).indexOf("data:image") === 0) {
      var fileNameSeb = "IMG_SEBELUM_" + i + "_" + (data.noPenugasan || "NO_REF") + "_" + Date.now() + ".jpg";
      var urlSeb = uploadBase64Image(valSeb, fileNameSeb);
      result[sblmKey] = urlSeb;
      result["Sebelum " + i] = urlSeb;
      result["sebelum" + i] = urlSeb;
      photoUrls[sblmKey] = urlSeb;
    } else if (valSeb) {
      result[sblmKey] = valSeb;
      result["Sebelum " + i] = valSeb;
      result["sebelum" + i] = valSeb;
      photoUrls[sblmKey] = valSeb;
    }

    // Proses Foto Sesudah
    if (valSes && String(valSes).indexOf("data:image") === 0) {
      var fileNameSes = "IMG_SESUDAH_" + i + "_" + (data.noPenugasan || "NO_REF") + "_" + Date.now() + ".jpg";
      var urlSes = uploadBase64Image(valSes, fileNameSes);
      result[ssdhKey] = urlSes;
      result["Sesudah " + i] = urlSes;
      result["sesudah" + i] = urlSes;
      photoUrls[ssdhKey] = urlSes;
    } else if (valSes) {
      result[ssdhKey] = valSes;
      result["Sesudah " + i] = valSes;
      result["sesudah" + i] = valSes;
      photoUrls[ssdhKey] = valSes;
    }
  }

  result.photoUrls = photoUrls;
  return result;
}

/**
 * Upload String Base64 ke Google Drive
 */
function uploadBase64Image(base64String, fileName) {
  if (!base64String || String(base64String).length < 50) return base64String || "";
  if (String(base64String).indexOf("http") === 0) return base64String;

  try {
    var commaIdx = base64String.indexOf('base64,');
    if (commaIdx === -1) return "";

    var contentType = base64String.substring(5, base64String.indexOf(';'));
    var bytes = Utilities.base64Decode(base64String.substring(commaIdx + 7));
    var blob = Utilities.newBlob(bytes, contentType, fileName);

    var folder = getFolder();
    var file = folder.createFile(blob);

    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (sharingErr) {}

    return file.getUrl();
  } catch (err) {
    Logger.log("ERROR uploadBase64Image: " + err.toString());
    return "";
  }
}

/**
 * Backup Files
 */
function getBackupFiles(e) {
  try {
    var folderId = (e && e.parameter && e.parameter.folderId) ? e.parameter.folderId : BACKUP_FOLDER_ID;
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
    navigator.clipboard.writeText(fullGasScript);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleTestGasUrl = async () => {
    if (!gasUrlInput.trim().startsWith('https://script.google.com/')) {
      setUrlStatusMsg({
        type: 'error',
        text: 'URL harus diawali dengan https://script.google.com/macros/s/.../exec'
      });
      return;
    }
    setIsTestingUrl(true);
    setUrlStatusMsg(null);
    try {
      const result = await api.testConnection(gasUrlInput.trim());
      setUrlStatusMsg({
        type: result.success ? 'success' : 'error',
        text: result.message
      });
    } catch (err: any) {
      setUrlStatusMsg({
        type: 'error',
        text: err.message || 'Gagal menghubungi server Apps Script.'
      });
    } finally {
      setIsTestingUrl(false);
    }
  };

  const handleSaveGasUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gasUrlInput.trim().startsWith('https://script.google.com/')) {
      setUrlStatusMsg({
        type: 'error',
        text: 'URL harus diawali dengan https://script.google.com/macros/s/.../exec'
      });
      return;
    }
    setScriptUrl(gasUrlInput.trim());
    setUrlStatusMsg({
      type: 'success',
      text: 'URL Endpoint Google Apps Script berhasil diperbarui! Silakan klik tombol muat ulang data.'
    });
    setTimeout(() => setUrlStatusMsg(null), 5000);
    if (onInitDefault) onInitDefault();
  };

  const handleResetGasUrl = () => {
    setScriptUrl('');
    setGasUrlInput(getScriptUrl());
    setUrlStatusMsg({
      type: 'success',
      text: 'URL Endpoint dikembalikan ke URL default.'
    });
    setTimeout(() => setUrlStatusMsg(null), 5000);
  };

  const [syncStatus, setSyncStatus] = useState<{
    type: 'loading' | 'success' | 'warning' | 'error';
    text: string;
    details?: string;
  } | null>(null);
  const [isSavingMaster, setIsSavingMaster] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [showSnippetGuide, setShowSnippetGuide] = useState(false);

  const missingSnippetCode = `/**
 * FUNGSI PENYIMPANAN MASTER DATA KE SPREADSHEET (Code.gs)
 * Salin dan tempel fungsi ini di Apps Script Spreadsheet Anda.
 */
function updateMasterSheets(data) {
  try {
    var ss = SpreadsheetApp.openById("${SPREADSHEET_ID}");
    if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
    
    var sheet = ss.getSheetByName("MasterData") || 
                ss.getSheetByName("MASTER_DATA") || 
                ss.getSheetByName("Master Data") ||
                ss.insertSheet("MasterData");
    
    var fullObj = typeof data === "string" ? JSON.parse(data) : data;
    var jsonStr = typeof data === "string" ? data : JSON.stringify(data);
    var nowStr = new Date().toISOString();

    sheet.clear();
    sheet.appendRow(["Key", "DataJSON", "LastUpdated"]);
    sheet.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#fef3c7");
    sheet.setFrozenRows(1);

    var rows = [
      ["MASTER_ULP", jsonStr, nowStr]
    ];

    if (fullObj && typeof fullObj === "object") {
      for (var ulpKey in fullObj) {
        if (ulpKey !== "MASTER_ULP" && fullObj[ulpKey] && typeof fullObj[ulpKey] === "object") {
          rows.push([ulpKey, JSON.stringify(fullObj[ulpKey]), nowStr]);
        }
      }
    }

    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, 3).setValues(rows);
    }

    Logger.log("Berhasil menyimpan ke Sheet: " + sheet.getName());
    return { 
      success: true, 
      status: "success", 
      message: "Data Master Petugas & Jaringan berhasil disimpan ke Sheet 'MasterData'." 
    };
  } catch (err) {
    Logger.log("Error updateMasterSheets: " + err.toString());
    return { success: false, status: "error", message: err.toString() };
  }
}

function handleUpdateMaster(masterData) {
  return updateMasterSheets(masterData);
}

function updateMaster(data) {
  return updateMasterSheets(data);
}`;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(missingSnippetCode);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleManualSyncMaster = async () => {
    setIsSavingMaster(true);
    setSyncStatus({ type: 'loading', text: "Menyinkronkan seluruh Master Data ke Spreadsheet Sheet 'MasterData'..." });
    try {
      let res;
      if (onSyncMaster) {
        res = await onSyncMaster();
      } else {
        res = await api.updateMasterData(masterData);
      }
      if (res && (res as any).success === false) {
        setSyncStatus({
          type: 'warning',
          text: `Master Data tersimpan di memori browser. Catatan Spreadsheet: ${(res as any).message}`,
          details: (res as any).message
        });
      } else {
        setSyncStatus({
          type: 'success',
          text: "✓ Seluruh Master Data Petugas & Penyulang berhasil disinkronkan ke Spreadsheet Sheet 'MasterData'!"
        });
        setTimeout(() => setSyncStatus(null), 5000);
      }
    } catch (err: any) {
      setSyncStatus({
        type: 'warning',
        text: `Data tersimpan aman di browser perangkat ini.`
      });
    } finally {
      setIsSavingMaster(false);
    }
  };

  const handleAddPetugasSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUlp) {
      setSyncStatus({ type: 'warning', text: 'Silakan pilih Unit Layanan (ULP) terlebih dahulu.' });
      return;
    }
    if (newPetugas.trim()) {
      const names = newPetugas.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
      if (names.length > 0) {
        setIsSavingMaster(true);
        setSyncStatus({ type: 'loading', text: `Menyimpan ${names.length} petugas baru ke database...` });
        try {
          const res = await onAddPetugas(selectedUlp, names);
          setNewPetugas('');
          if (res && (res as any).success === false) {
            setSyncStatus({
              type: 'warning',
              text: `Petugas "${names.join(', ')}" berhasil disimpan di memori aplikasi (tidak akan hilang saat refresh!). Server Spreadsheet mengembalikan catatan: ${(res as any).message}`,
              details: (res as any).message
            });
          } else {
            setSyncStatus({
              type: 'success',
              text: `✓ Petugas "${names.join(', ')}" berhasil disimpan ke database!`
            });
            setTimeout(() => setSyncStatus(null), 5000);
          }
        } catch (err: any) {
          setSyncStatus({
            type: 'warning',
            text: `Petugas "${names.join(', ')}" tersimpan aman di browser lokal.`
          });
        } finally {
          setIsSavingMaster(false);
        }
      }
    }
  };

  const handleDeletePetugas = async (ulp: ULPName, name: string) => {
    if (!window.confirm(`Hapus petugas "${name}" dari ${ulp}?`)) return;
    setIsSavingMaster(true);
    setSyncStatus({ type: 'loading', text: `Menghapus petugas "${name}"...` });
    try {
      const res = await onDeletePetugas(ulp, name);
      if (res && (res as any).success === false) {
        setSyncStatus({
          type: 'warning',
          text: `Petugas "${name}" dihapus dari sistem lokal, respon server: ${(res as any).message}`
        });
      } else {
        setSyncStatus({
          type: 'success',
          text: `✓ Petugas "${name}" berhasil dihapus dari Database.`
        });
        setTimeout(() => setSyncStatus(null), 4000);
      }
    } catch (err: any) {
      setSyncStatus({ type: 'warning', text: `Petugas "${name}" dihapus dari lokal.` });
    } finally {
      setIsSavingMaster(false);
    }
  };

  const handleAddPenyulangSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUlp) return;
    if (newPenyulang.trim()) {
      const names = newPenyulang.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
      if (names.length > 0) {
        setIsSavingMaster(true);
        setSyncStatus({ type: 'loading', text: `Menyimpan ${names.length} penyulang...` });
        try {
          const res = await onAddPenyulang(selectedUlp, names);
          setNewPenyulang('');
          if (res && (res as any).success === false) {
            setSyncStatus({
              type: 'warning',
              text: `Penyulang tersimpan di memori lokal, respon server: ${(res as any).message}`,
              details: (res as any).message
            });
          } else {
            setSyncStatus({ type: 'success', text: `✓ Penyulang berhasil disimpan!` });
            setTimeout(() => setSyncStatus(null), 4000);
          }
        } finally {
          setIsSavingMaster(false);
        }
      }
    }
  };

  const handleDeletePenyulang = async (ulp: ULPName, name: string) => {
    if (!window.confirm(`Hapus penyulang "${name}" dari ${ulp}?`)) return;
    setIsSavingMaster(true);
    try {
      await onDeletePenyulang(ulp, name);
      setSyncStatus({ type: 'success', text: `✓ Penyulang "${name}" berhasil dihapus.` });
      setTimeout(() => setSyncStatus(null), 4000);
    } finally {
      setIsSavingMaster(false);
    }
  };

  const handleAddKeypointSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUlp || !activePenyulangForKeypoints) return;
    if (newKeypoint.trim()) {
      const names = newKeypoint.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
      if (names.length > 0) {
        setIsSavingMaster(true);
        try {
          const res = await onAddKeypoint(selectedUlp, activePenyulangForKeypoints, names);
          setNewKeypoint('');
          if (res && (res as any).success === false) {
            setSyncStatus({ type: 'warning', text: `Keypoint tersimpan lokal, respon server: ${(res as any).message}`, details: (res as any).message });
          } else {
            setSyncStatus({ type: 'success', text: `✓ Keypoint berhasil disimpan!` });
            setTimeout(() => setSyncStatus(null), 4000);
          }
        } finally {
          setIsSavingMaster(false);
        }
      }
    }
  };

  const handleDeleteKeypoint = async (ulp: ULPName, penyulang: string, keypoint: string) => {
    if (!window.confirm(`Hapus keypoint "${keypoint}"?`)) return;
    setIsSavingMaster(true);
    try {
      await onDeleteKeypoint(ulp, penyulang, keypoint);
      setSyncStatus({ type: 'success', text: `✓ Keypoint "${keypoint}" berhasil dihapus.` });
      setTimeout(() => setSyncStatus(null), 4000);
    } finally {
      setIsSavingMaster(false);
    }
  };

  const currentData = selectedUlp ? masterData[selectedUlp] : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Google Apps Script Endpoint Configuration Card */}
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-50 text-cyan-700 rounded-2xl border border-cyan-100">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Konfigurasi Endpoint Google Apps Script</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Atur URL Web App Google Apps Script untuk koneksi Spreadsheet & Drive
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveGasUrl} className="space-y-3 pt-2">
          <label className="block text-xs font-black text-slate-600 uppercase tracking-wider">
            Web App URL (Google Apps Script)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-4 focus:ring-primary/10 outline-none bg-slate-50"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={gasUrlInput}
              onChange={(e) => setGasUrlInput(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleTestGasUrl}
                disabled={isTestingUrl}
                className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-100 flex items-center gap-1.5 whitespace-nowrap"
              >
                {isTestingUrl ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Radio className="w-3.5 h-3.5" />
                )}
                <span>{isTestingUrl ? 'Menguji...' : 'Tes Koneksi'}</span>
              </button>
              <button
                type="submit"
                className="px-5 py-3 bg-primary hover:bg-cyan-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-cyan-100 flex items-center gap-1.5 whitespace-nowrap"
              >
                <Check className="w-4 h-4" />
                <span>Simpan URL</span>
              </button>
              <button
                type="button"
                onClick={handleResetGasUrl}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap"
                title="Reset ke URL default"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </form>

        {urlStatusMsg && (
          <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
            urlStatusMsg.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {urlStatusMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
            <span>{urlStatusMsg.text}</span>
          </div>
        )}

        {/* Expandable Google Apps Script Code Helper */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 mt-4">
          <button
            type="button"
            onClick={() => setShowCodeGuide(!showCodeGuide)}
            className="w-full p-4 text-left font-black text-xs text-slate-700 uppercase tracking-wider flex items-center justify-between hover:bg-slate-100 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Code className="w-4 h-4 text-cyan-600" />
              <span>Kode Google Apps Script Lengkap (Code.gs) & Petunjuk Deployment</span>
            </span>
            {showCodeGuide ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>

          {showCodeGuide && (
            <div className="p-6 border-t border-slate-200 space-y-4 bg-white text-xs">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-900 font-medium space-y-2">
                <p className="font-bold text-xs">⚠️ Panduan Pasang Script di Google Spreadsheet:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Buka Spreadsheet target Anda (ID: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold select-all">{SPREADSHEET_ID}</code>).</li>
                  <li>Klik menu <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Hapus semua isi di <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">Code.gs</code> dan tempel kode di bawah ini.</li>
                  <li>Klik tombol <strong>Deploy &gt; New Deployment</strong>.</li>
                  <li>Pilih jenis: <strong>Web app</strong> | Execute as: <strong>Me</strong> | Who has access: <strong>Anyone</strong> (Wajib Anyone!).</li>
                  <li>Klik <strong>Deploy</strong>, lalu salin URL Web App yang dihasilkan ke kotak Web App URL di atas.</li>
                </ol>
              </div>

              <div className="relative">
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed max-h-96">
                  {fullGasScript}
                </pre>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="absolute top-3 right-3 bg-cyan-600 hover:bg-cyan-700 text-white text-[11px] font-bold px-3.5 py-2 rounded-lg transition-all shadow flex items-center gap-1.5"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-white" />}
                  <span>{copiedCode ? 'Tersalin!' : 'Salin Semua Kode'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 className="font-bold text-blue-800">Petunjuk Pengelolaan Database</h3>
          <p className="text-sm text-blue-700 mt-1">
            Gunakan panel ini untuk mengelola master data petugas, penyulang, dan keypoint. 
            Data yang diubah akan disinkronkan ke server secara real-time.
          </p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Data Master Sistem</h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Edit Konfigurasi Petugas & Infrastruktur</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={handleManualSyncMaster}
              disabled={isSavingMaster}
              className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-100 flex items-center justify-center gap-2 whitespace-nowrap h-[46px]"
              title="Kirim dan simpan seluruh data master ke Sheet 'MasterData' di Google Spreadsheet"
            >
              {isSavingMaster ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              )}
              <span>{isSavingMaster ? 'Menyinkronkan...' : 'Sinkronkan ke Sheet MasterData'}</span>
            </button>

            <div className="w-full sm:w-64">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pilih Unit Layanan (ULP)</label>
              <select
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none font-bold text-sm bg-slate-50 transition-all h-[46px]"
                value={selectedUlp}
                onChange={(e) => {
                  setSelectedUlp(e.target.value as ULPName);
                  setActivePenyulangForKeypoints('');
                }}
              >
                <option value="">-- Pilih ULP --</option>
                {Object.entries(masterData).map(([key, data]) => {
                  const ulpName = (data && typeof data === 'object' && (data as any).name) ? (data as any).name : key;
                  return <option key={ulpName} value={ulpName}>{ulpName}</option>;
                })}
              </select>
            </div>
          </div>
        </div>

        {!selectedUlp && (
          <div className="text-center p-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
             <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-slate-100">
               <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
               </svg>
             </div>
             <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Silahkan Pilih Unit Dahulu</h3>
          </div>
        )}

        {selectedUlp && currentData && (
          <div className="space-y-8 animate-fade-in">
            {/* Sync Status Feedback Banner */}
            {syncStatus && (
              <div className={`p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-bold transition-all shadow-sm ${
                syncStatus.type === 'loading'
                  ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                  : syncStatus.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border border-amber-300'
              }`}>
                <div className="flex items-center gap-2.5">
                  {syncStatus.type === 'loading' ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-600 flex-shrink-0" />
                  ) : syncStatus.type === 'success' ? (
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  )}
                  <span>{syncStatus.text}</span>
                </div>
                {syncStatus.type === 'warning' && (
                  <button
                    type="button"
                    onClick={() => setShowSnippetGuide(!showSnippetGuide)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap shadow"
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>{showSnippetGuide ? 'Sembunyikan Solusi' : 'Lihat Solusi GAS'}</span>
                  </button>
                )}
              </div>
            )}

            {/* Missing updateMasterSheets Snippet Guide */}
            {showSnippetGuide && (
              <div className="p-5 bg-amber-50 border border-amber-300 rounded-2xl space-y-3 animate-fade-in">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-amber-900 text-sm flex items-center gap-2">
                      <Code className="w-4 h-4 text-amber-700" />
                      Fungsi updateMasterSheets untuk Google Apps Script
                    </h4>
                    <p className="text-xs text-amber-800 mt-1">
                      Script Anda belum memiliki fungsi <code>updateMasterSheets</code>. Salin kode di bawah ini lalu tempelkan di bagian paling bawah file Google Apps Script (Code.gs) Anda, lalu simpan agar data master tersimpan otomatis di Spreadsheet.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSnippetGuide(false)}
                    className="text-amber-600 hover:text-amber-800 text-xs font-bold"
                  >
                    ✕ Tutup
                  </button>
                </div>
                <div className="relative">
                  <pre className="p-4 bg-slate-900 text-emerald-300 font-mono text-[11px] rounded-xl overflow-x-auto max-h-48 leading-relaxed">
                    {missingSnippetCode}
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopySnippet}
                    className="absolute top-2.5 right-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all shadow flex items-center gap-1"
                  >
                    {copiedSnippet ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSnippet ? 'Tersalin!' : 'Salin Fungsi'}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Petugas */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shadow-sm">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Daftar Petugas</h3>
                </div>
                
                <form onSubmit={handleAddPetugasSubmit} className="flex gap-2">
                  <input
                    placeholder="Nama Petugas..."
                    disabled={isSavingMaster}
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-primary/10 outline-none disabled:bg-slate-100"
                    value={newPetugas}
                    onChange={(e) => setNewPetugas(e.target.value)}
                  />
                  <button 
                    type="submit" 
                    disabled={isSavingMaster} 
                    className="bg-primary disabled:opacity-50 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-cyan-800 shadow-lg shadow-cyan-100 transition-all flex items-center justify-center min-w-[40px]"
                  >
                    {isSavingMaster ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : '+'}
                  </button>
                </form>

                <div className="bg-slate-50 rounded-2xl border border-slate-100 max-h-60 overflow-y-auto no-scrollbar">
                  <div className="divide-y divide-slate-200">
                    {currentData.petugas.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 group hover:bg-white transition-all">
                        <span className="text-xs font-bold text-slate-700 uppercase">{p}</span>
                        <button 
                          onClick={() => handleDeletePetugas(selectedUlp, p)} 
                          disabled={isSavingMaster}
                          className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Hapus Petugas"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Penyulang */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Daftar Penyulang</h3>
                </div>

                <form onSubmit={handleAddPenyulangSubmit} className="flex gap-2">
                  <input
                    placeholder="Kode Penyulang..."
                    disabled={isSavingMaster}
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-primary/10 outline-none disabled:bg-slate-100"
                    value={newPenyulang}
                    onChange={(e) => setNewPenyulang(e.target.value)}
                  />
                  <button 
                    type="submit" 
                    disabled={isSavingMaster} 
                    className="bg-amber-500 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 shadow-lg shadow-amber-100 transition-all flex items-center justify-center min-w-[40px]"
                  >
                    {isSavingMaster ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : '+'}
                  </button>
                </form>

                <div className="bg-slate-50 rounded-2xl border border-slate-100 max-h-60 overflow-y-auto no-scrollbar">
                  <div className="divide-y divide-slate-200">
                    {currentData.penyulang.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 group hover:bg-white transition-all">
                        <span className="text-xs font-bold text-slate-700 uppercase">{p}</span>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => setActivePenyulangForKeypoints(p)}
                            className={`p-2 rounded-lg transition-all ${activePenyulangForKeypoints === p ? 'bg-amber-100 text-amber-600' : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50'}`}
                            title="Edit Keypoints"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleDeletePenyulang(selectedUlp, p)} 
                            disabled={isSavingMaster}
                            className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Hapus Penyulang"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Keypoints (Full Width) */}
            <div className={`p-8 rounded-[2rem] border-2 transition-all ${activePenyulangForKeypoints ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-dashed border-slate-200 opacity-60'}`}>
               {!activePenyulangForKeypoints ? (
                 <div className="text-center py-10">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Pilih satu penyulang di atas untuk mengedit daftar Keypoint</p>
                 </div>
               ) : (
                 <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm border border-slate-100">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                         </div>
                         <div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Kelola Keypoint</h3>
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Penyulang: {activePenyulangForKeypoints}</p>
                         </div>
                       </div>
                       <button onClick={() => setActivePenyulangForKeypoints('')} className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest">Tutup</button>
                    </div>

                    <form onSubmit={handleAddKeypointSubmit} className="flex gap-2">
                       <input 
                        placeholder="Nama Keypoint (Contoh: RECLOSER XX)..."
                        disabled={isSavingMaster}
                        className="flex-1 px-5 py-4 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-primary/10 outline-none bg-white shadow-sm disabled:bg-slate-100"
                        value={newKeypoint}
                        onChange={(e) => setNewKeypoint(e.target.value)}
                       />
                       <button 
                        type="submit" 
                        disabled={isSavingMaster} 
                        className="bg-primary disabled:opacity-50 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-cyan-800 shadow-xl shadow-cyan-100"
                       >
                         {isSavingMaster ? 'Menyimpan...' : 'Tambah'}
                       </button>
                    </form>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                       {(currentData.keypoints?.[activePenyulangForKeypoints] || []).length > 0 ? (
                         (currentData.keypoints?.[activePenyulangForKeypoints] || []).map((kp, idx) => (
                           <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between group">
                             <span className="text-[11px] font-bold text-slate-700 uppercase">{kp}</span>
                             <button 
                               onClick={() => handleDeleteKeypoint(selectedUlp, activePenyulangForKeypoints, kp)} 
                               disabled={isSavingMaster}
                               className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                               title="Hapus Keypoint"
                             >
                               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                               </svg>
                             </button>
                           </div>
                         ))
                       ) : (
                         <div className="col-span-full py-8 text-center text-slate-400 font-bold text-[10px] uppercase tracking-widest">Belum ada keypoint terdaftar untuk penyulang ini</div>
                       )}
                    </div>
                 </div>
               )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
