import React, { useState, useEffect } from 'react';
import { Channel } from './types';
import { DBService } from './services/db';
import { AuthService } from './services/auth';
import VideoPlayer from './components/VideoPlayer';
import ChannelList from './components/ChannelList';
import AdminPanel from './components/AdminPanel';
import LoginModal from './components/LoginModal';
import { Menu, X, Loader } from 'lucide-react';

const App: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentChannelId, setCurrentChannelId] = useState<string>('');
  
  // Responsive menu state: Closed by default on mobile, open on desktop
  const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth >= 1024);
  
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Handle window resize to auto-adjust menu visibility
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMenuOpen(true);
      } else if (window.innerWidth < 1024) {
        // Only close if it was auto-opened, but user state preference is better kept manually
        // For simplicity, we respect the user's last toggle or default to false on mobile
        if (isMenuOpen) setIsMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        // On mobile/tablet, close menu after selection
        if (window.innerWidth < 1024) {
          setIsMenuOpen(false);
        }
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

  if (channels.length === 0) return <div className="bg-black h-screen w-screen text-white flex items-center justify-center">Aucune chaîne disponible.</div>;

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden flex flex-col lg:flex-row">
      
      {/* Main Content Area */}
      <main className={`flex-1 relative h-full transition-all duration-500 ease-in-out ${isMenuOpen ? 'lg:mr-96' : 'mr-0'}`}>
        <VideoPlayer 
            channel={currentChannel} 
            onRate={handleRateChannel}
            onToggleFavorite={handleToggleFavorite}
        />
        
        {/* Toggle Menu Button */}
        <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`absolute top-4 right-4 sm:top-6 sm:right-6 z-30 p-3 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all border border-white/10 active:scale-90 lg:hidden shadow-lg`}
            aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </main>

      {/* Mobile Backdrop - Closes the Bottom Sheet when clicked */}
      <div 
        className={`fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMenuOpen(false)}
      ></div>

      {/* Sidebar (EPG / Channel List) */}
      <aside className={`absolute z-40 lg:relative h-full pointer-events-none lg:pointer-events-auto`}>
        <div className="pointer-events-auto h-full">
            <ChannelList 
                channels={channels} 
                currentChannelId={currentChannelId}
                onSelectChannel={handleChannelChange}
                onToggleFavorite={handleToggleFavorite}
                isOpen={isMenuOpen}
                onOpenAdmin={handleOpenAdmin}
                onClose={() => setIsMenuOpen(false)}
            />
        </div>
      </aside>

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