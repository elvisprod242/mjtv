import React, { useState, useEffect } from 'react';
import { Channel } from './types';
import { DBService } from './services/db';
import { AuthService } from './services/auth';
import VideoPlayer from './components/VideoPlayer';
import AdminPanel from './components/AdminPanel';
import LoginModal from './components/LoginModal';
import { Loader, RefreshCw, Settings } from 'lucide-react';

const App: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentChannelId, setCurrentChannelId] = useState<string>('');
  
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load channels from DB on mount
  useEffect(() => {
    const initApp = async () => {
        try {
            const loadedChannels = await DBService.init();
            setChannels(loadedChannels);
            if (loadedChannels.length > 0) {
                setCurrentChannelId(loadedChannels[0].id);
            }
        } catch (e) {
            console.error("Error loading channels", e);
        } finally {
            setIsLoading(false);
        }
    };
    initApp();
  }, []);

  const currentChannel = channels.find(c => c.id === currentChannelId) || channels[0];

  const handleChannelChange = (id: string) => {
    const target = channels.find(c => c.id === id) 
        || channels.find(c => c.name.toLowerCase().includes(id.toLowerCase()))
        || channels.find(c => c.id.includes(id));

    if (target) {
        setCurrentChannelId(target.id);
    }
  };

  const handleSaveChannels = async (updatedChannels: Channel[]) => {
      setChannels(updatedChannels);
      try {
        await DBService.saveAllChannels(updatedChannels);
      } catch (e) {
          console.error("Failed to save channels to DB", e);
      }
      if (!updatedChannels.find(c => c.id === currentChannelId) && updatedChannels.length > 0) {
          setCurrentChannelId(updatedChannels[0].id);
      }
  };

  const handleRateChannel = (rating: number) => {
    if (!currentChannel) return;
    const updatedChannels = channels.map(c => 
        c.id === currentChannel.id ? { ...c, rating } : c
    );
    handleSaveChannels(updatedChannels);
  };

  const handleToggleFavorite = (channelId: string) => {
    const updatedChannels = channels.map(c => 
        c.id === channelId ? { ...c, isFavorite: !c.isFavorite } : c
    );
    handleSaveChannels(updatedChannels);
  };

  const handleOpenAdmin = () => {
    if (AuthService.isAuthenticated()) {
      setIsAdminOpen(true);
    } else {
      setIsLoginOpen(true);
    }
  };

  const handleLoginSuccess = () => {
    setIsLoginOpen(false);
    setIsAdminOpen(true);
  };

  if (isLoading) {
      return (
          <div className="bg-black h-screen w-screen text-white flex flex-col items-center justify-center gap-4">
              <Loader size={40} className="animate-spin text-blue-500" />
              <p className="text-gray-400 font-mono text-sm animate-pulse">Initialisation...</p>
          </div>
      );
  }

  if (channels.length === 0) return (
    <div className="bg-black h-screen w-screen text-white flex flex-col items-center justify-center gap-6 p-4 text-center">
        <div>
            <h2 className="text-xl font-bold mb-2">Aucune chaîne disponible</h2>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">Impossible de charger le contenu pour le moment. Vérifiez votre connexion.</p>
        </div>
        <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
        >
            <RefreshCw size={16} />
            Réessayer
        </button>
    </div>
  );

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden flex flex-col lg:flex-row">
      
      {/* Main Content Area */}
      <main className="flex-1 relative h-full w-full">
        <VideoPlayer 
            channel={currentChannel} 
            onRate={handleRateChannel}
            onToggleFavorite={handleToggleFavorite}
        />
        
        {/* Admin Panel Button */}
        <button 
            onClick={handleOpenAdmin}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30 p-3 bg-black/40 hover:bg-black/60 text-white/50 hover:text-white rounded-full backdrop-blur-md transition-all border border-white/10 shadow-lg"
            title="Administration"
        >
            <Settings size={20} />
        </button>
      </main>

      {/* Modals */}
      {isLoginOpen && (
        <LoginModal 
          onSuccess={handleLoginSuccess}
          onClose={() => setIsLoginOpen(false)}
        />
      )}

      {isAdminOpen && (
          <AdminPanel 
            channels={channels}
            onSave={handleSaveChannels}
            onClose={() => setIsAdminOpen(false)}
          />
      )}
    </div>
  );
};

export default App;