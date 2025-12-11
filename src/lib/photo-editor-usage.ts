import FingerprintJS from '@fingerprintjs/fingerprintjs';

const STORAGE_KEY = 'photo_editor_usage';
const DAILY_EDIT_LIMIT = 20;
const DAILY_GENERATION_LIMIT = 10;

export interface UsageData {
  fingerprint: string;
  edits: number;
  generations: number;
  captions: number;
  lastReset: string; // ISO date string
}

let fpPromise: Promise<any> | null = null;

// Initialize fingerprint library
export const initFingerprint = () => {
  if (!fpPromise) {
    fpPromise = FingerprintJS.load();
  }
  return fpPromise;
};

// Get browser fingerprint
export const getFingerprint = async (): Promise<string> => {
  const fp = await initFingerprint();
  const result = await fp.get();
  return result.visitorId;
};

// Get current date (YYYY-MM-DD)
const getCurrentDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Get usage data from localStorage
export const getUsageData = async (): Promise<UsageData> => {
  const fingerprint = await getFingerprint();
  const stored = localStorage.getItem(STORAGE_KEY);
  
  if (stored) {
    try {
      const data: UsageData = JSON.parse(stored);
      
      // Reset if different day or different fingerprint
      if (data.lastReset !== getCurrentDate() || data.fingerprint !== fingerprint) {
        return resetUsageData(fingerprint);
      }
      
      return data;
    } catch {
      return resetUsageData(fingerprint);
    }
  }
  
  return resetUsageData(fingerprint);
};

// Reset usage data
const resetUsageData = (fingerprint: string): UsageData => {
  const data: UsageData = {
    fingerprint,
    edits: 0,
    generations: 0,
    captions: 0,
    lastReset: getCurrentDate(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
};

// Save usage data
const saveUsageData = (data: UsageData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// Check if edit is allowed
export const canEdit = async (): Promise<{ allowed: boolean; remaining: number; message?: string }> => {
  const data = await getUsageData();
  const remaining = DAILY_EDIT_LIMIT - data.edits;
  
  if (data.edits >= DAILY_EDIT_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      message: `Daily edit limit reached (${DAILY_EDIT_LIMIT}/day). Resets tomorrow.`,
    };
  }
  
  return { allowed: true, remaining };
};

// Check if generation is allowed
export const canGenerate = async (): Promise<{ allowed: boolean; remaining: number; message?: string }> => {
  const data = await getUsageData();
  const remaining = DAILY_GENERATION_LIMIT - data.generations;
  
  if (data.generations >= DAILY_GENERATION_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      message: `Daily generation limit reached (${DAILY_GENERATION_LIMIT}/day). Resets tomorrow.`,
    };
  }
  
  return { allowed: true, remaining };
};

// Increment edit count
export const incrementEdits = async () => {
  const data = await getUsageData();
  data.edits += 1;
  saveUsageData(data);
  return data.edits;
};

// Increment generation count
export const incrementGenerations = async () => {
  const data = await getUsageData();
  data.generations += 1;
  saveUsageData(data);
  return data.generations;
};

// Increment caption count (no limit, just tracking)
export const incrementCaptions = async () => {
  const data = await getUsageData();
  data.captions += 1;
  saveUsageData(data);
  return data.captions;
};

// Get warning message based on usage
export const getWarningMessage = (count: number, limit: number): string | null => {
  const remaining = limit - count;
  
  if (remaining === 5) {
    return `You have 5 operations remaining today`;
  } else if (remaining === 2) {
    return `⚠️ Only 2 operations remaining today`;
  } else if (remaining === 0) {
    return `Daily limit reached. Resets tomorrow.`;
  }
  
  return null;
};

// Export limits for UI display
export const LIMITS = {
  DAILY_EDIT_LIMIT,
  DAILY_GENERATION_LIMIT,
};
