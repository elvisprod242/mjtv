import { Channel } from '../types';

// Updated storage key to force refresh for MJ TV rename
const STORAGE_KEY = 'mj_tv_data_v2';
const JSON_SOURCE = 'channels.json';

export const DBService = {
  /**
   * Initialize the DB.
   * 1. Try to load from LocalStorage (user persistence).
   * 2. If empty, fetch from channels.json (seed data).
   */
  async init(): Promise<Channel[]> {
    try {
        // Try to retrieve data from LocalStorage first
        const storedData = localStorage.getItem(STORAGE_KEY);
        
        if (storedData) {
            console.log("Loaded channels from LocalStorage");
            return JSON.parse(storedData);
        }

        // Fallback: Fetch from JSON file
        console.log("Fetching channels from JSON file...");
        const response = await fetch(JSON_SOURCE);
        if (!response.ok) {
            throw new Error(`Failed to load ${JSON_SOURCE}`);
        }
        
        const channels: Channel[] = await response.json();
        
        // Save to LocalStorage for future persistence
        localStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
        
        return channels;
    } catch (error) {
        console.error("Failed to initialize DB from JSON", error);
        return [];
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