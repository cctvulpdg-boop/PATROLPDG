
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST'
}

export enum ULPName {
  BALAI_SELASA = 'ULP BALAI SELASA',
  BELANTI = 'ULP BELANTI',
  INDARUNG = 'ULP INDARUNG',
  KURANJI = 'ULP KURANJI',
  LUBUK_ALUNG = 'ULP LUBUK ALUNG',
  MENTAWAI = 'ULP MENTAWAI',
  PAINAN = 'ULP PAINAN',
  PARIAMAN = 'ULP PARIAMAN',
  SICINCIN = 'ULP SICINCIN',
  TABING = 'ULP TABING'
}

export interface ReportData {
  id: string;
  timestamp: string; // ISO String
  bulan: string; // Month name
  noPenugasan: string;
  ulp: ULPName;
  petugas1: string;
  petugas2: string;
  penyulang: string;
  keypoint: string;
  titikStart: string;
  titikFinish: string;
  jumlahTiang?: string;
  jumlahKms?: string;
  photos: {
    sebelum: (string | null)[]; // Array of 10 URLs/Base64
    sesudah: (string | null)[]; // Array of 10 URLs/Base64
  };
}

export interface ULPData {
  name: ULPName;
  petugas: string[];
  penyulang: string[];
  keypoints: Record<string, string[]>; // Map: Penyulang Name -> Array of Keypoints
}

export interface LoginSession {
  ulp: ULPName | null;
  petugas1: string | null;
  petugas2: string | null;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
}

export type ViewState = 'LOGIN' | 'CONFIG' | 'DASHBOARD' | 'INPUT' | 'TABLE' | 'SETTINGS' | 'ABOUT' | 'REKAP' | 'REKAP_TIANG_KMS' | 'UPDATE_LIST' | 'UPDATE_FORM' | 'BACKUP';
