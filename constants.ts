
import { ULPName, ULPData } from './types';

export const APP_VERSION = '1.0.4';

export const DATA_ULP: Record<string, ULPData> = {
  [ULPName.PADANG]: {
    name: ULPName.PADANG,
    petugas: ['Ahmad Zaki', 'Budi Santoso', 'Candra Wijaya', 'Doni Kurniawan'],
    penyulang: ['BKT.01', 'BKT.02', 'BKT.03', 'BKT.Express'],
    keypoints: {
      'BKT.01': ['KP BKT1-A', 'KP BKT1-B', 'KP BKT1-C'],
      'BKT.02': ['KP BKT2-X', 'KP BKT2-Y'],
      'BKT.03': ['KP BKT3-Alpha', 'KP BKT3-Beta'],
      'BKT.Express': ['Express Point A', 'Express Point B']
    }
  },
  [ULPName.PADANG_PANJANG]: {
    name: ULPName.PADANG_PANJANG,
    petugas: ['Eko Prasetyo', 'Fajar Nugroho', 'Gilang Ramadhan'],
    penyulang: ['PP.01', 'PP.02', 'PP.Industri'],
    keypoints: {
      'PP.01': ['Keypoint PP1-1', 'Keypoint PP1-2'],
      'PP.02': ['Keypoint PP2-A', 'Keypoint PP2-B'],
      'PP.Industri': ['Zone Industri 1', 'Zone Industri 2']
    }
  },
  [ULPName.LUBUK_SIKAPING]: {
    name: ULPName.LUBUK_SIKAPING,
    petugas: ['Hendra Gunawan', 'Indra Lesmana', 'Joko Susilo'],
    penyulang: ['LBS.01', 'LBS.02'],
    keypoints: {
      'LBS.01': ['LBS.01-KP1', 'LBS.01-KP2'],
      'LBS.02': ['LBS.02-KP1', 'LBS.02-KP2']
    }
  },
  [ULPName.LUBUK_BASUNG]: {
    name: ULPName.LUBUK_BASUNG,
    petugas: ['Kiki Amalia', 'Lukman Hakim', 'Muhammad Ilham'],
    penyulang: ['LBB.01', 'LBB.02', 'LBB.03'],
    keypoints: {
      'LBB.01': ['LBB.01-A', 'LBB.01-B'],
      'LBB.02': ['LBB.02-A', 'LBB.02-B'],
      'LBB.03': ['LBB.03-A', 'LBB.03-B']
    }
  },
  [ULPName.SIMPANG_EMPAT]: {
    name: ULPName.SIMPANG_EMPAT,
    petugas: ['Nanda Putra', 'Oki Setiawan', 'Putra Pratama'],
    penyulang: ['SPE.01', 'SPE.02', 'SPE.03', 'SPE.04'],
    keypoints: {
      'SPE.01': ['SPE.01-Point1', 'SPE.01-Point2'],
      'SPE.02': ['SPE.02-Point1', 'SPE.02-Point2'],
      'SPE.03': ['SPE.03-Point1', 'SPE.03-Point2'],
      'SPE.04': ['SPE.04-Point1', 'SPE.04-Point2']
    }
  },
  [ULPName.BASO]: {
    name: ULPName.BASO,
    petugas: ['Qori Sandi', 'Rian Hidayat', 'Surya Saputra'],
    penyulang: ['BSO.01', 'BSO.02'],
    keypoints: {
      'BSO.01': ['BSO-1', 'BSO-2'],
      'BSO.02': ['BSO-3', 'BSO-4']
    }
  },
  [ULPName.KOTO_TUO]: {
    name: ULPName.KOTO_TUO,
    petugas: ['Taufik Hidayat', 'Usman Harun', 'Vicky Nitinegoro'],
    penyulang: ['KT.01', 'KT.02'],
    keypoints: {
      'KT.01': ['KT1-1', 'KT1-2'],
      'KT.02': ['KT2-1', 'KT2-2']
    }
  }
};

export const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export const PHOTO_SECTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const BACKUP_FOLDER_ID = '1350Gyl2G7WE2iBJhi5ENqJ4gTTObq0la';
