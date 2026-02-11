import { Channel } from '../types';
import { DEFAULT_CHANNELS } from '../constants';

// Updated storage key to force refresh for MJ TV rename
const STORAGE_KEY = 'mj_tv_data_v2';
const JSON_SOURCE = 'channels.json';

export const DBService = {
  /**
   * Initialize the DB.
   * 1. Try to load from LocalStorage (user persistence).
   * 2. If empty, fetch from channels.json (seed data).
   * 3. If fetch fails, use DEFAULT_CHANNELS from constants.
   */
  async init(): Promise<Channel[]> {
    try {
        // Try to retrieve data from LocalStorage first
        const storedData = localStorage.getItem(STORAGE_KEY);
        
        if (storedData) {
            try {
                const parsed = JSON.parse(storedData);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    console.log("Loaded channels from LocalStorage");
                    return parsed;
                }
            } catch (e) {
                console.warn("Corrupt local storage data", e);
            }
        }

        // Fallback 1: Fetch from JSON file
        console.log("Fetching channels from JSON file...");
        try {
            const response = await fetch(JSON_SOURCE);
            if (response.ok) {
                const channels: Channel[] = await response.json();
                if (Array.isArray(channels) && channels.length > 0) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
                    return channels;
                }
            }
        } catch (fetchError) {
            console.warn("Failed to load channels.json", fetchError);
        }

        // Fallback 2: Use hardcoded constants
        console.log("Using default channels from constants");
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CHANNELS));
        return DEFAULT_CHANNELS;

    } catch (error) {
        console.error("Critical error initializing DB", error);
        return DEFAULT_CHANNELS;
    }
  },

  /**
   * Save the entire list of channels to LocalStorage.
   */
  async saveAllChannels(channels: Channel[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
    } catch (e) {
        console.error("Failed to save channels", e);
    }
  },

  /**
   * Update a single channel in LocalStorage.
   */
  async updateChannel(channel: Channel) {
      const allChannels = await this.init();
      const updatedChannels = allChannels.map(c => c.id === channel.id ? channel : c);
      await this.saveAllChannels(updatedChannels);
  }
};

// Export a dummy db object to maintain compatibility if imported elsewhere, 
// though direct usage is discouraged with this new pattern.
export const db = {};