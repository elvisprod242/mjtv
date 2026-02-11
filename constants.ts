
import { Channel } from './types';

export const LIVE_STREAM_URL = 'https://live20.bozztv.com/akamaissh101/ssh101/evtele2xrdc/playlist.m3u8';
export const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-12-2025';

export const DEFAULT_CHANNELS: Channel[] = [
  {
    id: 'live1',
    name: 'MJ TV Info',
    category: 'Information',
    description: 'Diffusion en direct.',
    videoUrl: LIVE_STREAM_URL,
    thumbnail: 'https://picsum.photos/id/1018/400/225',
    currentProgram: 'Le Journal',
    rating: 4.9,
    isFavorite: true
  },
  {
    id: 'nature1',
    name: 'Nature Zen',
    category: 'Documentaire',
    description: 'Paysages apaisants et vie sauvage en haute définition.',
    videoUrl: LIVE_STREAM_URL,
    thumbnail: 'https://picsum.photos/id/1018/400/225',
    currentProgram: 'Merveilles de la Forêt',
    rating: 4.5
  },
  {
    id: 'cine1',
    name: 'Ciné Classique',
    category: 'Cinéma',
    description: 'Les grands classiques du cinéma d\'animation.',
    videoUrl: LIVE_STREAM_URL,
    thumbnail: 'https://picsum.photos/id/1025/400/225',
    currentProgram: 'Le Grand Lapin',
    rating: 3.8
  },
  {
    id: 'toon1',
    name: 'Toon TV',
    category: 'Enfants',
    description: 'Dessins animés et aventures pour les plus jeunes.',
    videoUrl: LIVE_STREAM_URL,
    thumbnail: 'https://picsum.photos/id/1040/400/225',
    currentProgram: 'La Quête du Dragon',
    rating: 4.2
  },
  {
    id: 'sport1',
    name: 'Sport Extrême',
    category: 'Sport',
    description: 'Adrénaline pure et compétitions de haut niveau.',
    videoUrl: LIVE_STREAM_URL,
    thumbnail: 'https://picsum.photos/id/1035/400/225',
    currentProgram: 'Championnat de Glisse',
    rating: 4.7
  }
];