import React, { useState, useMemo, useCallback } from 'react';
import { Channel } from '../types';
import { Play, Settings, Search, Star, Heart, Filter, Film, X, Clock, RotateCcw, ChevronDown } from 'lucide-react';
import Fuse from 'fuse.js';

interface ChannelListProps {
  channels: Channel[];
  currentChannelId: string;
  onSelectChannel: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  isOpen: boolean;
  onOpenAdmin: () => void;
  onClose?: () => void;
}

interface ChannelItemProps {
  channel: Channel;
  isCurrent: boolean;
  onSelectChannel: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

// Memoized ChannelItem to prevent unnecessary re-renders of the entire list
const ChannelItem = React.memo<ChannelItemProps>(({ 
  channel, 
  isCurrent, 
  onSelectChannel, 
  onToggleFavorite 
}) => (
    <div
        onClick={() => onSelectChannel(channel.id)}
        className={`
        p-4 cursor-pointer transition-all border-b border-white/5 group relative
        content-visibility-auto contain-intrinsic-size-[72px]
        ${isCurrent ? 'bg-white/10 border-l-4 border-l-red-500' : 'hover:bg-white/5 border-l-4 border-l-transparent'}
        `}
    >
        <div className="flex gap-3">
            <div className="relative w-28 h-16 bg-gray-800 rounded-md overflow-hidden flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-300">
                <img 
                    src={channel.thumbnail} 
                    alt={channel.name} 
                    loading="lazy"
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                />
                <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] px-1 rounded font-mono">
                    REPLAY
                </div>
                {isCurrent && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                        <Play size={20} className="text-red-500 fill-current" />
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0 pr-6 flex flex-col justify-center">
                <h4 className={`text-sm font-bold truncate leading-tight ${isCurrent ? 'text-red-400' : 'text-gray-200 group-hover:text-white'}`}>
                    {channel.currentProgram}
                </h4>
                <p className="text-xs text-gray-500 truncate mt-1">{channel.name}</p>
                <div className="flex items-center gap-2 mt-1.5">
                    <span className="inline-block px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-gray-400 border border-white/5">
                        {channel.category}
                    </span>
                    {channel.rating !== undefined && (
                        <div className="flex items-center gap-1 text-[10px] text-yellow-500/80">
                            <Star size={10} fill="currentColor" />
                            <span>{channel.rating}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
        
        <button 
            onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(channel.id);
            }}
            className={`
                absolute top-2 right-2 p-2 rounded-full transition-all duration-200 z-10
                ${channel.isFavorite 
                    ? 'text-red-500 opacity-100 scale-100' 
                    : 'text-gray-500 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 hover:text-white hover:bg-white/10'}
            `}
            title={channel.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
            <Heart size={16} className={channel.isFavorite ? 'fill-current' : ''} />
        </button>
    </div>
));

const ChannelList: React.FC<ChannelListProps> = ({ channels, currentChannelId, onSelectChannel, onToggleFavorite, isOpen, onOpenAdmin, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');

  const categories = useMemo(() => {
    const cats = Array.from(new Set(channels.map(c => c.category))).sort();
    return ['Tous', ...cats];
  }, [channels]);

  const filteredChannels = useMemo(() => {
    let result = activeCategory === 'Tous' 
        ? channels 
        : channels.filter(c => c.category === activeCategory);

    if (searchQuery.trim()) {
        const fuse = new Fuse(result, {
            keys: [
                { name: 'name', weight: 0.5 },
                { name: 'currentProgram', weight: 0.3 },
                { name: 'category', weight: 0.2 }
            ],
            threshold: 0.4,
            distance: 100,
        });
        result = fuse.search(searchQuery).map(r => r.item);
    }

    return result;
  }, [channels, activeCategory, searchQuery]);

  const { favorites, others } = useMemo(() => {
    if (searchQuery.trim()) {
      return { favorites: [], others: filteredChannels };
    }
    return {
      favorites: filteredChannels.filter(c => c.isFavorite),
      others: filteredChannels.filter(c => !c.isFavorite)
    };
  }, [filteredChannels, searchQuery]);

  const groupedChannels = useMemo<Record<string, Channel[]> | null>(() => {
    if (activeCategory !== 'Tous' || searchQuery.trim()) return null;

    const groups: Record<string, Channel[]> = {};
    others.forEach(channel => {
      if (!groups[channel.category]) groups[channel.category] = [];
      groups[channel.category].push(channel);
    });
    return groups;
  }, [others, activeCategory, searchQuery]);

  // Use callback for item click to keep memoized items stable
  const handleSelect = useCallback((id: string) => {
    onSelectChannel(id);
    if (window.innerWidth < 1024 && onClose) onClose();
  }, [onSelectChannel, onClose]);

  return (
    <div 
        className={`
            fixed 
            lg:top-0 lg:right-0 lg:h-full lg:w-96 lg:border-l lg:rounded-none lg:translate-y-0
            
            bottom-0 left-0 w-full h-[85vh] rounded-t-3xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]
            
            bg-[#121214]/98 backdrop-blur-xl border-white/5 
            transform transition-transform duration-300 ease-out z-40 flex flex-col
            ${isOpen 
                ? 'translate-y-0 lg:translate-x-0' 
                : 'translate-y-full lg:translate-x-full'}
        `}
    >
      {/* Mobile Drag Handle */}
      <div 
        className="w-full flex justify-center py-3 lg:hidden cursor-pointer"
        onClick={onClose}
      >
        <div className="w-12 h-1.5 bg-white/20 rounded-full"></div>
      </div>

      <div className="px-6 pb-4 lg:pt-6 border-b border-white/5 bg-gradient-to-b from-black/20 to-transparent shrink-0">
        <div className="flex justify-between items-center mb-6">
            <div>
                <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                   <Film size={22} className="text-red-500" />
                   Replay TV
                </h3>
                <p className="text-xs text-gray-400 font-medium mt-1 flex items-center gap-1">
                    <Clock size={10} />
                    {channels.length} programmes disponibles
                </p>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={onOpenAdmin}
                    className="p-2 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                    title="Administration"
                >
                    <Settings size={18} />
                </button>
                <button 
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-white/10 text-white transition-colors lg:hidden"
                >
                    <X size={24} />
                </button>
            </div>
        </div>

        <div className="relative mb-4">
            <input 
                type="text" 
                placeholder="Rechercher un replay..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 sm:py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:bg-white/10 transition-all shadow-inner"
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            {categories.map(cat => (
                <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`
                        px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border
                        ${activeCategory === cat 
                            ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/40 scale-105' 
                            : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/20'}
                    `}
                >
                    {cat}
                </button>
            ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar will-change-transform scroll-smooth">
        {searchQuery.trim() ? (
            filteredChannels.length > 0 ? (
                <div>
                     <div className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider bg-white/5 sticky top-0 backdrop-blur-md z-10 flex items-center gap-2 border-y border-white/5">
                        <Search size={12} />
                        Résultats de recherche
                    </div>
                    {filteredChannels.map(channel => (
                        <ChannelItem 
                            key={channel.id} 
                            channel={channel} 
                            isCurrent={currentChannelId === channel.id}
                            onSelectChannel={handleSelect}
                            onToggleFavorite={onToggleFavorite}
                        />
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center flex flex-col items-center justify-center h-60 text-gray-500">
                    <Search size={32} className="mb-4 opacity-20" />
                    <p className="text-sm font-medium">Aucun programme trouvé</p>
                    <p className="text-xs mt-1 opacity-60">Essayez un autre titre ou changez de catégorie</p>
                    {activeCategory !== 'Tous' && (
                        <button 
                            onClick={() => setActiveCategory('Tous')}
                            className="mt-4 text-xs text-red-400 hover:text-red-300 underline"
                        >
                            Voir tout le catalogue
                        </button>
                    )}
                </div>
            )
        ) : (
            <>
                {favorites.length > 0 && (
                    <div className="mb-2">
                        <div className="px-4 py-2 text-xs font-bold text-red-400 uppercase tracking-wider bg-white/5 sticky top-0 backdrop-blur-md z-10 flex items-center gap-2 border-y border-white/5 shadow-sm">
                            <Heart size={10} className="fill-current" />
                            Mes Favoris {activeCategory !== 'Tous' && `(${activeCategory})`}
                        </div>
                        {favorites.map(channel => (
                            <ChannelItem 
                                key={channel.id} 
                                channel={channel} 
                                isCurrent={currentChannelId === channel.id}
                                onSelectChannel={handleSelect}
                                onToggleFavorite={onToggleFavorite}
                            />
                        ))}
                    </div>
                )}

                <div>
                    {groupedChannels ? (
                         Object.entries(groupedChannels).sort().map(([category, catChannels]) => (
                             <div key={category}>
                                 <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider bg-white/5 sticky top-0 backdrop-blur-md z-10 border-y border-white/5">
                                    {category}
                                 </div>
                                 {(catChannels as Channel[]).map(channel => (
                                    <ChannelItem 
                                        key={channel.id} 
                                        channel={channel} 
                                        isCurrent={currentChannelId === channel.id}
                                        onSelectChannel={handleSelect}
                                        onToggleFavorite={onToggleFavorite}
                                    />
                                 ))}
                             </div>
                         ))
                    ) : (
                        <>
                            {(favorites.length > 0 || activeCategory !== 'Tous') && (
                                <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider bg-white/5 sticky top-0 backdrop-blur-md z-10 border-y border-white/5">
                                    {activeCategory === 'Tous' ? 'Derniers ajouts' : activeCategory}
                                </div>
                            )}
                            
                            {others.length > 0 ? (
                                others.map(channel => (
                                    <ChannelItem 
                                        key={channel.id} 
                                        channel={channel} 
                                        isCurrent={currentChannelId === channel.id}
                                        onSelectChannel={handleSelect}
                                        onToggleFavorite={onToggleFavorite}
                                    />
                                ))
                            ) : (
                                favorites.length === 0 && (
                                    <div className="p-12 text-center text-gray-500">
                                        <Filter size={24} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">Aucun replay disponible</p>
                                        <button 
                                            onClick={() => setActiveCategory('Tous')}
                                            className="mt-2 text-xs text-red-400 hover:underline"
                                        >
                                            Tout afficher
                                        </button>
                                    </div>
                                )
                            )}
                        </>
                    )}
                </div>
            </>
        )}
      </div>

      <div className="p-3 text-center border-t border-white/5 bg-black/40 shrink-0 hidden lg:block">
          <p className="text-[10px] text-gray-600 font-mono flex items-center justify-center gap-2">
            <RotateCcw size={10} />
            Replay TV • v2.2
          </p>
      </div>
    </div>
  );
};

export default ChannelList;