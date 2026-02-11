import React, { useState, useMemo } from 'react';
import { Channel } from '../types';
import { 
  Trash2, Plus, Save, X, Edit2, LogOut, Copy, 
  RefreshCw, Loader, ChevronLeft, Check, Search, 
  Image as ImageIcon, Globe, Info, AlertTriangle,
  Settings, Tv
} from 'lucide-react';
import { AuthService } from '../services/auth';

interface AdminPanelProps {
  channels: Channel[];
  onSave: (channels: Channel[]) => Promise<void>;
  onClose: () => void;
}

const EmptyChannel: Channel = {
  id: '',
  name: '',
  category: 'Général',
  description: '',
  videoUrl: '',
  thumbnail: '',
  currentProgram: '',
  rating: 3.5
};

const SAMPLE_VIDEOS = [
  'https://live20.bozztv.com/akamaissh101/ssh101/evtele2xrdc/playlist.m3u8',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4'
];

const CATEGORIES = ['Information', 'Sport', 'Cinéma', 'Enfants', 'Documentaire', 'Musique', 'Général'];

const AdminPanel: React.FC<AdminPanelProps> = ({ channels, onSave, onClose }) => {
  const [localChannels, setLocalChannels] = useState<Channel[]>(channels);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Channel>(EmptyChannel);
  const [isSaving, setIsSaving] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');

  // Filtering for the admin list
  const filteredList = useMemo(() => {
    if (!adminSearch) return localChannels;
    const q = adminSearch.toLowerCase();
    return localChannels.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.id.toLowerCase().includes(q) || 
      c.category.toLowerCase().includes(q)
    );
  }, [localChannels, adminSearch]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Supprimer définitivement cette chaîne ?')) {
      const updated = localChannels.filter(c => c.id !== id);
      setLocalChannels(updated);
      if (editingId === id) setEditingId(null);
    }
  };

  const handleDuplicate = (channel: Channel, e: React.MouseEvent) => {
      e.stopPropagation();
      const newId = `${channel.id}_copy_${Math.floor(Math.random() * 1000)}`;
      const newChannel = { ...channel, id: newId, name: `${channel.name} (Copie)` };
      setLocalChannels([...localChannels, newChannel]);
      setEditingId(newId);
      setEditForm(newChannel);
  };

  const startEdit = (channel: Channel) => {
    setEditingId(channel.id);
    setEditForm({ ...channel });
  };

  const startCreate = () => {
    const newId = `ch_${Date.now().toString().slice(-6)}`;
    const newChannel = { ...EmptyChannel, id: newId, name: 'Nouvelle Chaîne' };
    setEditingId('NEW');
    setEditForm(newChannel);
  };

  const saveEdit = () => {
    if (!editForm.name || !editForm.id) return;
    if (editingId === 'NEW') {
      setLocalChannels([...localChannels, editForm]);
    } else {
      setLocalChannels(localChannels.map(c => c.id === editingId ? editForm : c));
    }
    setEditingId(null);
  };

  const handleGlobalSave = async () => {
    setIsSaving(true);
    await onSave(localChannels);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 sm:bg-black/90 backdrop-blur-xl p-0 sm:p-4 animate-fade-in">
      <div className="bg-[#121214] w-full max-w-7xl h-full sm:h-[92vh] sm:rounded-[2rem] border-0 sm:border border-white/10 flex flex-col shadow-2xl overflow-hidden animate-fade-in-up ring-1 ring-white/5">
        
        {/* Header Section */}
        <header className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-black/40 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-4">
            {editingId && (
              <button onClick={() => setEditingId(null)} className="p-2 hover:bg-white/5 rounded-full text-gray-400 sm:hidden">
                <ChevronLeft size={24} />
              </button>
            )}
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
                <div className="p-1.5 bg-blue-600 rounded-lg">
                    <Settings size={18} className="text-white" />
                </div>
                Administration
              </h2>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] ml-11">Gestion du catalogue</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
                onClick={() => { AuthService.logout(); onClose(); }} 
                className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all text-xs font-bold uppercase tracking-wide border border-transparent hover:border-red-500/20" 
                title="Déconnexion"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
            <div className="w-px h-6 bg-white/10 mx-1"></div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col sm:flex-row">
          
          {/* Side List Panel */}
          <aside className={`${editingId ? 'hidden sm:flex' : 'flex'} w-full sm:w-80 border-r border-white/5 flex-col bg-[#0f0f11] shrink-0`}>
            <div className="p-4 border-b border-white/5 space-y-4">
              <div className="relative group">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Filtrer les chaînes..."
                  value={adminSearch}
                  onChange={e => setAdminSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl py-3 pl-9 pr-4 text-xs text-white focus:border-blue-500/50 focus:bg-white/10 outline-none transition-all"
                />
              </div>
              <button 
                onClick={startCreate}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
              >
                <Plus size={16} /> NOUVELLE CHAÎNE
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredList.map(channel => (
                <div 
                  key={channel.id} 
                  onClick={() => startEdit(channel)}
                  className={`
                    p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 flex items-center justify-between group transition-all relative
                    ${editingId === channel.id ? 'bg-white/5' : ''}
                  `}
                >
                  {editingId === channel.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-gray-800 overflow-hidden shrink-0 shadow-inner">
                      <img src={channel.thumbnail} alt="" className="w-full h-full object-cover opacity-70" />
                    </div>
                    <div className="overflow-hidden">
                      <div className={`font-bold text-xs truncate ${editingId === channel.id ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>{channel.name}</div>
                      <div className="text-[10px] text-gray-500 uppercase font-black tracking-wide mt-0.5">{channel.category}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => handleDuplicate(channel, e)} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors" title="Dupliquer"><Copy size={14} /></button>
                    <button onClick={(e) => handleDelete(channel.id, e)} className="p-1.5 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400 transition-colors" title="Supprimer"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 text-[10px] text-gray-600 text-center border-t border-white/5 bg-black/20">
                {filteredList.length} éléments
            </div>
          </aside>

          {/* Editor Panel */}
          <main className={`${!editingId ? 'hidden sm:flex' : 'flex'} flex-1 bg-[#121214] overflow-y-auto custom-scrollbar flex-col relative`}>
            {editingId ? (
              <div className="p-6 sm:p-10 max-w-4xl mx-auto w-full space-y-10 animate-fade-in pb-24">
                
                {/* Visual Preview Card */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Tv size={12} /> Aperçu Live
                    </label>
                    <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group">
                      {editForm.thumbnail ? (
                        <img src={editForm.thumbnail} alt="Preview" className="w-full h-full object-cover opacity-80" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-700 bg-white/5"><ImageIcon size={40} /></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                      <div className="absolute bottom-0 left-0 p-4 w-full">
                        <span className="inline-block px-1.5 py-0.5 bg-white/20 backdrop-blur-md rounded text-[9px] font-bold text-white mb-2 border border-white/10">{editForm.category}</span>
                        <h4 className="text-base font-bold text-white truncate leading-tight">{editForm.name || 'Nom de la chaîne'}</h4>
                        <p className="text-[10px] text-gray-400 mt-1 truncate">{editForm.currentProgram || 'Programme en cours'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center gap-2 text-blue-400 mb-2 border-b border-white/5 pb-2">
                      <Info size={18} />
                      <h3 className="text-sm font-black uppercase tracking-wider">Métadonnées</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Nom du canal</label>
                        <input 
                          type="text" 
                          value={editForm.name}
                          placeholder="Ex: Ciné Frisson"
                          onChange={e => setEditForm({...editForm, name: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:bg-white/10 outline-none transition-all"
                        />
                      </div>
                      <div className="col-span-1">
                         <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">ID Unique</label>
                         <input 
                          type="text" 
                          value={editForm.id}
                          placeholder="Ex: cine_frisson"
                          onChange={e => setEditForm({...editForm, id: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-400 font-mono text-xs focus:border-blue-500 focus:text-white outline-none transition-all"
                        />
                      </div>
                      <div className="col-span-1">
                         <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Note (0-5)</label>
                         <input 
                          type="number" step="0.1" min="0" max="5"
                          value={editForm.rating}
                          onChange={e => setEditForm({...editForm, rating: parseFloat(e.target.value)})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-all"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Programme Actuel</label>
                        <input 
                          type="text" 
                          value={editForm.currentProgram}
                          placeholder="Ex: Le Seigneur des Anneaux"
                          onChange={e => setEditForm({...editForm, currentProgram: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content & Stream Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-4 border-t border-white/5">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-purple-400 border-b border-white/5 pb-2">
                      <Globe size={18} />
                      <h3 className="text-sm font-black uppercase tracking-wider">Source Vidéo</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1">URL du Flux (HLS .m3u8 / MP4)</label>
                        <div className="relative">
                            <input 
                            type="text" 
                            value={editForm.videoUrl}
                            onChange={e => setEditForm({...editForm, videoUrl: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-gray-300 font-mono text-[10px] focus:border-purple-500 outline-none transition-all"
                            />
                            {editForm.videoUrl && <Check size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />}
                        </div>
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-gray-600 uppercase mb-2 ml-1">Presets Rapides</label>
                          <div className="flex flex-wrap gap-2">
                            {SAMPLE_VIDEOS.map((v, i) => (
                            <button 
                                key={i} 
                                onClick={() => setEditForm({...editForm, videoUrl: v})} 
                                className="text-[10px] px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-gray-400 transition-colors"
                            >
                                Flux {i+1}
                            </button>
                            ))}
                          </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-green-400 border-b border-white/5 pb-2">
                      <ImageIcon size={18} />
                      <h3 className="text-sm font-black uppercase tracking-wider">Apparence</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1">URL Miniature</label>
                        <input 
                          type="text" 
                          value={editForm.thumbnail}
                          onChange={e => setEditForm({...editForm, thumbnail: e.target.value})}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-gray-300 font-mono text-[10px] focus:border-green-500 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-2 ml-1">Catégorie</label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map(cat => (
                            <button 
                                key={cat} 
                                onClick={() => setEditForm({...editForm, category: cat})}
                                className={`
                                    text-[10px] px-3 py-1.5 rounded-lg border transition-all font-medium
                                    ${editForm.category === cat 
                                        ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-900/30' 
                                        : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/10'}
                                `}
                            >
                                {cat}
                            </button>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-6 p-8 text-center animate-fade-in">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-2 shadow-inner">
                  <Settings size={40} className="opacity-20 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-white mb-2">Espace de Configuration</h3>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                    Sélectionnez une chaîne dans la liste de gauche pour modifier ses détails, ou créez-en une nouvelle pour enrichir votre catalogue.
                  </p>
                </div>
              </div>
            )}

            {/* Floating Save Bar */}
            {editingId && (
                <div className="absolute bottom-6 left-6 right-6 lg:left-10 lg:right-10">
                    <button 
                        onClick={saveEdit}
                        className="w-full py-4 bg-white text-black rounded-2xl font-black text-sm shadow-2xl hover:bg-gray-100 transition-all active:scale-[0.99] flex items-center justify-center gap-3 transform hover:-translate-y-1"
                    >
                        <Check size={20} className="text-green-600" /> 
                        APPLIQUER LES MODIFICATIONS
                    </button>
                </div>
            )}
          </main>
        </div>

        {/* Global Action Bar */}
        <footer className="px-6 py-4 border-t border-white/5 bg-[#0f0f11] flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{localChannels.length} actifs</span>
             </div>
             {localChannels !== channels && (
               <span className="text-[10px] text-yellow-500 font-bold flex items-center gap-1.5 bg-yellow-500/10 px-3 py-1.5 rounded-lg border border-yellow-500/20">
                 <RefreshCw size={10} className="animate-spin-slow" /> 
                 Non sauvegardé
               </span>
             )}
          </div>
          <div className="flex w-full sm:w-auto gap-3">
            <button 
                onClick={onClose} 
                disabled={isSaving} 
                className="flex-1 sm:flex-none px-6 py-3 text-gray-400 font-bold text-xs hover:text-white hover:bg-white/5 rounded-xl transition-all"
            >
              ANNULER
            </button>
            <button 
              onClick={handleGlobalSave} 
              disabled={isSaving}
              className={`
                flex-1 sm:flex-none px-8 py-3 rounded-xl font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2
                ${isSaving ? 'bg-gray-700 text-gray-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40 hover:-translate-y-0.5'}
              `}
            >
              {isSaving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
              PUBLIER LES CHANGEMENTS
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AdminPanel;