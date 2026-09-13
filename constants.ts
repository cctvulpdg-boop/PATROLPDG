
import { ULPData } from './types';
import seedData from './data/seedData.json';

export const APP_VERSION = '1.0.5';

export const DATA_ULP: Record<string, ULPData> = (seedData.masterData as unknown as Record<string, ULPData>) || {};


export const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export const PHOTO_SECTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const BACKUP_FOLDER_ID = '1350Gyl2G7WE2iBJhi5ENqJ4gTTObq0la';
