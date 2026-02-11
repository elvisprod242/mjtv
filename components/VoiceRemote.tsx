import React, { useEffect, useState, useRef } from 'react';
import { Mic, MicOff, Radio, Activity, Sparkles } from 'lucide-react';
import { ConnectionState, Channel } from '../types';
import { GeminiLiveService } from '../services/geminiLive';

interface VoiceRemoteProps {
  channels: Channel[];
  onChangeChannel: (channelId: string) => void;
}

const VoiceRemote: React.FC<VoiceRemoteProps> = ({ channels, onChangeChannel }) => {
  const [status, setStatus] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState<string>('');
  const liveService = useRef<GeminiLiveService>(new GeminiLiveService());
  const visualizerRef = useRef<HTMLDivElement>(null);

  const toggleConnection = async () => {
    if (status === ConnectionState.CONNECTED || status === ConnectionState.CONNECTING) {
      await liveService.current.disconnect();
      setStatus(ConnectionState.DISCONNECTED);
      setTranscript('');
    } else {
      setTranscript('Initialisation...');
      await liveService.current.connect({
        channels: channels, // Pass current dynamic channels
        onStatusChange: (s) => setStatus(s as ConnectionState),
        onAudioData: (level) => {
            // Smooth dampening
            setAudioLevel(prev => prev * 0.8 + level * 0.2);
        },
        onChangeChannel: (id) => {
            onChangeChannel(id);
            setTranscript(`Changement de chaîne vers ${id}...`);
        },
        onTranscript: (text) => setTranscript(text)
      });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        liveService.current.disconnect();
    };
  }, []);

  return (
    // Raised bottom-20 on mobile to clear video controls, bottom-8 on desktop
    <div className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4 w-full max-w-md pointer-events-none px-4">
       
      {/* Transcript Bubble or Recommendations Hint */}
      {status === ConnectionState.CONNECTED && transcript ? (
        <div className="bg-black/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 shadow-2xl animate-fade-in-up mb-2 max-w-full text-center">
            <p className="text-white text-sm font-medium leading-relaxed">
                "{transcript}"
            </p>
        </div>
      ) : status === ConnectionState.DISCONNECTED && (
        <div className="bg-black/40 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/5 shadow-lg mb-2 animate-fade-in flex items-center gap-2">
            <Sparkles size={12} className="text-yellow-500" />
            <p className="text-gray-400 text-xs font-medium">
               "Conseille-moi un programme..."
            </p>
        </div>
      )}

      {/* Main Control Pill */}
      <div className="pointer-events-auto bg-[#1a1a1d] rounded-full p-2 pl-6 pr-2 shadow-2xl border border-white/10 flex items-center gap-4 transition-all duration-300 hover:scale-105 hover:border-blue-500/30 group w-auto max-w-full">
        
        {/* Status Indicator / Visualizer */}
        <div className="flex items-center gap-3 h-8">
            {status === ConnectionState.CONNECTED ? (
                <div className="flex items-center gap-1" ref={visualizerRef}>
                     {/* Fake visualizer bars based on audio level */}
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div 
                            key={i} 
                            className="w-1 bg-blue-500 rounded-full transition-all duration-75"
                            style={{ 
                                height: `${Math.max(4, Math.min(24, audioLevel * 100 * (Math.random() + 0.5)))}px`,
                                opacity: 0.8 + audioLevel 
                            }} 
                        />
                    ))}
                </div>
            ) : status === ConnectionState.CONNECTING ? (
                 <div className="flex items-center gap-2 text-yellow-500">
                    <Activity size={18} className="animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Connexion</span>
                 </div>
            ) : (
                <div className="flex items-center gap-2 text-gray-400">
                    <Radio size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Assistant</span>
                    <span className="text-xs font-bold uppercase tracking-wider sm:hidden">IA</span>
                </div>
            )}
        </div>

        {/* Separator */}
        <div className="w-px h-8 bg-white/10"></div>

        {/* Mic Button */}
        <button
          onClick={toggleConnection}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg shrink-0
            ${status === ConnectionState.CONNECTED 
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20 animate-pulse' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'}
          `}
        >
          {status === ConnectionState.CONNECTED ? <Mic size={24} /> : <MicOff size={24} />}
        </button>
      </div>
    </div>
  );
};

export default VoiceRemote;