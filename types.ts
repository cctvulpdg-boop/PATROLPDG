
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST'
}

export enum ULPName {
  PADANG = 'ULP Padang',
  PADANG_PANJANG = 'ULP Padang Panjang',
  LUBUK_SIKAPING = 'ULP Lubuk Sikaping',
  LUBUK_BASUNG = 'ULP Lubuk Basung',
  SIMPANG_EMPAT = 'ULP Simpang Empat',
  BASO = 'ULP Baso',
  KOTO_TUO = 'ULP Koto Tuo'
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

export type ViewState = 'LOGIN' | 'CONFIG' | 'DASHBOARD' | 'INPUT' | 'TABLE' | 'SETTINGS' | 'ABOUT' | 'REKAP' | 'UPDATE_LIST' | 'UPDATE_FORM' | 'BACKUP';
