import { Channel } from '../types';
import { DEFAULT_CHANNELS } from '../constants';

const STORAGE_KEY = 'gemini_tv_channels_v1';

export const StorageService = {
  getChannels: (): Channel[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load channels", e);
    }
    // Seed with defaults if empty
    return DEFAULT_CHANNELS;
  },

  saveChannels: (channels: Channel[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
    } catch (e) {
      console.error("Failed to save channels", e);
    }
  },

  reset: () => {
    localStorage.removeItem(STORAGE_KEY);
    return DEFAULT_CHANNELS;
  }
};