export interface Channel {
  id: string;
  name: string;
  category: string;
  description: string;
  videoUrl: string;
  thumbnail: string;
  currentProgram: string;
  rating?: number; // 0 to 5 stars
  isFavorite?: boolean;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export interface VoiceRemoteState {
  isActive: boolean;
  isSpeaking: boolean; // User is speaking
  isThinking: boolean; // AI is processing/speaking
}