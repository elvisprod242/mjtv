import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Channel } from '../types';
import { Volume2, VolumeX, Star, Play, Pause, Heart, Settings, Maximize, Minimize, Monitor, Volume1 } from 'lucide-react';
import Hls from 'hls.js';

interface VideoPlayerProps {
  channel: Channel;
  onRate?: (rating: number) => void;
  onToggleFavorite?: (channelId: string) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ channel, onRate, onToggleFavorite }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  
  const [showSettings, setShowSettings] = useState(false);
  const [objectFit, setObjectFit] = useState<'contain' | 'cover'>('contain');
  const [isBuffering, setIsBuffering] = useState(true); // Default to buffering on load
  
  const [showControls, setShowControls] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const handleUserActivity = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
        if (isPlaying) {
            setShowControls(false);
            setShowSettings(false);
        }
    }, 3500);
  }, [isPlaying]);

  useEffect(() => {
      handleUserActivity();
      return () => {
          if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      };
  }, [handleUserActivity]);

  // Listen for Fullscreen changes (ESC key, etc.)
  useEffect(() => {
      const handleFullScreenChange = () => {
          setIsFullScreen(!!document.fullscreenElement);
      };
      
      const handleWebkitFullScreenChange = () => {
          // @ts-ignore
          setIsFullScreen(!!document.webkitFullscreenElement);
      };

      document.addEventListener('fullscreenchange', handleFullScreenChange);
      document.addEventListener('webkitfullscreenchange', handleWebkitFullScreenChange); // iOS listener
      
      return () => {
          document.removeEventListener('fullscreenchange', handleFullScreenChange);
          document.removeEventListener('webkitfullscreenchange', handleWebkitFullScreenChange);
      };
  }, []);

  // OPTIMIZATION: Force volume to 100% immediately on Application Launch (Mount)
  useEffect(() => {
      const video = videoRef.current;
      if (video) {
          console.log("App Launch: Forcing volume to 100%");
          video.volume = 1.0;
          video.muted = false;
      }
      setVolume(1.0);
      setIsMuted(false);

      // Global unlock for audio context and video mute on first interaction
      const handleFirstInteraction = () => {
        if (videoRef.current) {
            // Restore volume and unmute if browser policy muted it
            videoRef.current.volume = 1.0;
            videoRef.current.muted = false;
            setVolume(1.0);
            setIsMuted(false);
            
            // Resume audio context if suspended
            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
            }
        }
        // Remove listeners
        ['click', 'touchstart', 'keydown'].forEach(evt => 
            document.removeEventListener(evt, handleFirstInteraction)
        );
      };

      ['click', 'touchstart', 'keydown'].forEach(evt => 
          document.addEventListener(evt, handleFirstInteraction)
      );

      return () => {
        ['click', 'touchstart', 'keydown'].forEach(evt => 
            document.removeEventListener(evt, handleFirstInteraction)
        );
      };
  }, []);

  // Robust Autoplay Logic
  const attemptAutoPlay = async (video: HTMLVideoElement) => {
    // Force volume to 100% and unmute to ensure best experience (TV-like)
    video.volume = 1.0;
    setVolume(1.0);
    
    // Try to play unmuted first
    video.muted = false;
    setIsMuted(false);

    try {
        const playPromise = video.play();
        if (playPromise !== undefined) {
            await playPromise;
            setIsPlaying(true);
        }
    } catch (err) {
        console.warn("Autoplay with sound blocked. Muting and retrying...", err);
        // Fallback: Mute and try again (Browser Autoplay Policy)
        video.muted = true;
        setIsMuted(true);
        // Even if muted, ensure volume property is maxed for when user unmutes
        video.volume = 1.0;
        setVolume(1.0);
        
        try {
            await video.play();
            setIsPlaying(true);
        } catch (e) {
            console.error("Autoplay failed completely", e);
            setIsPlaying(false);
        }
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Strict volume enforcement on channel load
    video.volume = 1.0;
    setVolume(1.0);

    setIsBuffering(true);
    
    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHlsSource = channel.videoUrl.includes('.m3u8');

    if (isHlsSource) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
        });
        hlsRef.current = hls;
        
        hls.loadSource(channel.videoUrl);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsBuffering(false);
          attemptAutoPlay(video);
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
           if (data.fatal) {
             switch (data.type) {
               case Hls.ErrorTypes.NETWORK_ERROR:
                 console.log("fatal network error encountered, try to recover");
                 hls.startLoad();
                 break;
               case Hls.ErrorTypes.MEDIA_ERROR:
                 console.log("fatal media error encountered, try to recover");
                 hls.recoverMediaError();
                 break;
               default:
                 hls.destroy();
                 break;
             }
           }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = channel.videoUrl;
        const onLoadedMetadata = () => {
            setIsBuffering(false);
            attemptAutoPlay(video);
        };
        video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
      }
    } else {
      // Standard MP4/WebM
      video.src = channel.videoUrl;
      video.load(); // Explicit load call is important for switching sources properly
      attemptAutoPlay(video);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [channel.id, channel.videoUrl]); // Use channel.id to ensure strict re-run on channel change

  // Audio Visualization Setup
  useEffect(() => {
    const setupAudio = async () => {
      if (!videoRef.current || sourceRef.current) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        audioContextRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64; 
        analyserRef.current = analyser;
        
        // Handling CORS for audio analysis can be tricky with external video URLs
        // This try/catch prevents the whole app from crashing if CORS fails
        try {
            const source = ctx.createMediaElementSource(videoRef.current);
            source.connect(analyser);
            analyser.connect(ctx.destination);
            sourceRef.current = source;
            visualize();
        } catch (e) {
            console.log("Audio visualization disabled due to CORS or source restriction");
        }
      } catch (e) {}
    };

    const visualize = () => {
      if (!analyserRef.current || !glowRef.current) return;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength/2; i++) sum += dataArray[i];
      const intensity = Math.min(1, Math.max(0, (sum / (bufferLength/2) / 255) * 1.5));
      glowRef.current.style.opacity = (0.1 + (intensity * 0.5)).toString();
      rafRef.current = requestAnimationFrame(visualize);
    };

    const handlePlay = () => {
       if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
       if (!sourceRef.current) setupAudio();
       setIsPlaying(true);
       setIsBuffering(false);
    };

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);

    const videoEl = videoRef.current;
    if (videoEl) {
        videoEl.addEventListener('play', handlePlay);
        videoEl.addEventListener('pause', () => setIsPlaying(false));
        videoEl.addEventListener('waiting', handleWaiting);
        videoEl.addEventListener('playing', handlePlaying);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (videoEl) {
          videoEl.removeEventListener('play', handlePlay);
          videoEl.removeEventListener('waiting', handleWaiting);
          videoEl.removeEventListener('playing', handlePlaying);
      }
    };
  }, []);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else {
          videoRef.current.play();
          // Unmute if it was muted by autoplay policy and user manually interacts
          if (isMuted && videoRef.current.muted) {
              videoRef.current.muted = false;
              setIsMuted(false);
              videoRef.current.volume = 1.0; // Ensure volume is up when manually unmuting
              setVolume(1.0);
          }
      }
    }
  };

  const toggleFullScreen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const video = videoRef.current;
    // Check for iOS specifically where container fullscreen might fail or we prefer native player
    if (video && (video as any).webkitEnterFullscreen && !containerRef.current?.requestFullscreen) {
         (video as any).webkitEnterFullscreen();
         return;
    }

    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
        try {
            await containerRef.current.requestFullscreen();
            
            // Try locking orientation to landscape on mobile (Android)
            // PC/Tablets will generally ignore this or fail silently which is desired
            if (screen.orientation && 'lock' in screen.orientation) {
                try {
                    // @ts-ignore
                    await screen.orientation.lock('landscape');
                } catch (e) {
                    // Orientation lock not supported (Desktop/some tablets)
                }
            }
        } catch (err) {
            console.error("Error attempting to enable full-screen mode:", err);
            // Fallback for iOS if requestFullscreen fails
            if (video && (video as any).webkitEnterFullscreen) {
                 (video as any).webkitEnterFullscreen();
            }
        }
    } else {
        if (document.exitFullscreen) {
            await document.exitFullscreen();
            // Unlock orientation on exit
            if (screen.orientation && 'unlock' in screen.orientation) {
                try {
                     // @ts-ignore
                    screen.orientation.unlock();
                } catch(e) {}
            }
        }
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
      // If paused, click always plays. If playing, click toggles controls.
      if (!isPlaying) {
          togglePlay();
      } else {
          setShowControls(prev => !prev);
      }
      handleUserActivity();
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
      if (!videoRef.current.muted) {
          videoRef.current.volume = 1.0; // Reset to max volume when unmuting
          setVolume(1.0);
      }
    }
  };

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isLive = channel.videoUrl.includes('.m3u8');

  return (
    <div 
        ref={containerRef}
        className="relative w-full h-full bg-black overflow-hidden select-none group flex items-center justify-center"
        onClick={handleContainerClick}
        onMouseMove={handleUserActivity}
        onTouchStart={handleUserActivity}
    >
      <div ref={glowRef} className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-300 opacity-20" />

      <video
        ref={videoRef}
        className={`relative z-10 w-full h-full ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
        playsInline
        muted={isMuted} // State controlled
        onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
        onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
      />

      {/* Top Overlay */}
      <div className={`absolute top-0 left-0 z-20 w-full bg-gradient-to-b from-black/80 to-transparent p-6 sm:p-10 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex justify-between items-start">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl sm:text-4xl font-bold text-white drop-shadow-xl">{channel.name}</h2>
                    <button onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(channel.id); }} className="active:scale-75 transition-transform">
                        <Heart size={24} className={channel.isFavorite ? 'fill-red-500 text-red-500' : 'text-white/70'} />
                    </button>
                </div>
                <div className="flex items-center gap-4">
                    <p className="text-white/80 text-sm sm:text-lg font-medium">{channel.currentProgram}</p>
                    <span className="hidden sm:flex items-center gap-1 text-yellow-400 font-bold"><Star size={16} fill="currentColor"/> {channel.rating}</span>
                </div>
                <div className="flex gap-2 mt-1">
                    {isLive && <span className="px-2 py-0.5 bg-red-600 text-[10px] font-black rounded uppercase tracking-tighter">Live</span>}
                    <span className="px-2 py-0.5 bg-white/10 text-[10px] font-bold rounded uppercase tracking-wider">{channel.category}</span>
                </div>
            </div>
        </div>
      </div>

      {!isPlaying && !isBuffering && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <div className="bg-black/40 rounded-full p-6 backdrop-blur-md border border-white/10 animate-fade-in">
                  <Play size={48} className="text-white fill-white ml-1" />
              </div>
          </div>
      )}

      {/* Tap to Unmute Overlay (if browser forced mute on autoplay) */}
      {isPlaying && isMuted && showControls && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 animate-fade-in">
              <button 
                  onClick={toggleMute}
                  className="flex items-center gap-2 bg-blue-600/90 hover:bg-blue-500 text-white px-4 py-2 rounded-full backdrop-blur-md shadow-lg transition-all"
              >
                  <VolumeX size={18} />
                  <span className="text-sm font-bold">Activer le son</span>
              </button>
          </div>
      )}

      {/* Settings Menu */}
      {showSettings && (
          <div className="absolute bottom-24 right-6 z-40 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 w-64 shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
              <h3 className="text-white font-bold mb-3 text-sm flex items-center gap-2">
                  <Settings size={16} />
                  Paramètres du lecteur
              </h3>
              
              <div className="space-y-4">
                  <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-2 block">Format de l'image</label>
                      <div className="flex bg-white/5 rounded-lg p-1">
                          <button 
                              onClick={() => setObjectFit('contain')}
                              className={`flex-1 text-xs py-1.5 rounded-md transition-all ${objectFit === 'contain' ? 'bg-white/20 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                          >
                              Ajuster
                          </button>
                          <button 
                              onClick={() => setObjectFit('cover')}
                              className={`flex-1 text-xs py-1.5 rounded-md transition-all ${objectFit === 'cover' ? 'bg-white/20 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                          >
                              Remplir
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Bottom Controls */}
      <div className={`absolute bottom-0 left-0 z-30 w-full bg-gradient-to-t from-black/90 via-black/40 to-transparent px-6 pb-6 pt-16 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={e => e.stopPropagation()}>
        
        {!isLive && duration > 0 && (
            <div className="relative w-full h-1.5 bg-white/20 rounded-full mb-6 cursor-pointer group/progress">
                <div className="absolute h-full bg-blue-500 rounded-full transition-all duration-300 group-hover/progress:h-2 -top-[1px]" style={{ width: `${progressPercent}%` }} />
            </div>
        )}

        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-6">
                <button onClick={togglePlay} className="p-2 hover:bg-white/10 rounded-full text-white transition-all active:scale-90">
                    {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
                </button>
                {isLive ? (
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-600/20 border border-red-600/50 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">En Direct</span>
                    </div>
                ) : (
                    <span className="text-xs font-mono text-white/50">{formatTime(currentTime)} / {formatTime(duration)}</span>
                )}
            </div>
            
            <div className="flex items-center gap-1 sm:gap-3">
                <div className="flex items-center gap-2 group/vol">
                    <button onClick={toggleMute} className="p-2 text-white/80 hover:text-white transition-colors">
                        {isMuted || volume === 0 ? <VolumeX size={24}/> : <Volume2 size={24}/>}
                    </button>
                    <input 
                        type="range" min="0" max="1" step="0.1" 
                        value={volume} 
                        onChange={e => { 
                            const newVol = parseFloat(e.target.value);
                            setVolume(newVol); 
                            if (videoRef.current) {
                                videoRef.current.volume = newVol;
                                // Automatically unmute if user increases volume
                                if (newVol > 0 && videoRef.current.muted) {
                                    videoRef.current.muted = false;
                                    setIsMuted(false);
                                }
                            }
                        }}
                        className="hidden sm:block w-0 sm:group-hover/vol:w-20 transition-all duration-300 accent-white"
                    />
                </div>
                
                <button onClick={() => setShowSettings(!showSettings)} className="p-2 text-white/80 transition-transform hover:rotate-45 hover:text-white">
                    <Settings size={24} />
                </button>

                <div className="w-px h-6 bg-white/10 mx-1"></div>

                <button onClick={toggleFullScreen} className="p-2 text-white/80 hover:text-white transition-transform hover:scale-110">
                    {isFullScreen ? <Minimize size={24} /> : <Maximize size={24} />}
                </button>
            </div>
        </div>
      </div>

       {/* Removed buffering overlay */}
    </div>
  );
};

export default VideoPlayer;
