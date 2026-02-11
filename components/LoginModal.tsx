import React, { useState, useEffect } from 'react';
import { X, Lock, KeyRound, AlertCircle, ArrowRight, Loader, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { AuthService } from '../services/auth';

interface LoginModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onSuccess, onClose }) => {
  // Pre-fill with default password 'admin' for convenience
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (shake) {
      const timer = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [shake]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setIsLoading(true);
    setError(false);

    // Simulate network delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));

    if (AuthService.login(password)) {
      onSuccess();
    } else {
      setError(true);
      setShake(true);
      setIsLoading(false);
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
      <div 
        className={`
          relative w-full max-w-md bg-[#121214] border border-white/10 rounded-3xl shadow-2xl overflow-hidden 
          flex flex-col animate-fade-in-up transition-transform duration-100
          ${shake ? 'translate-x-[-10px]' : ''}
        `}
        style={shake ? { animation: 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both' } : {}}
      >
        {/* Decorative background glow */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-600/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative p-8 flex flex-col items-center">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-all"
          >
            <X size={20} />
          </button>

          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-6 transform rotate-3">
            <Lock size={32} className="text-white drop-shadow-md" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Espace Admin</h2>
          <p className="text-gray-400 text-sm text-center mb-8">
            Veuillez vous authentifier pour accéder à la gestion des chaînes et du contenu.<br/>
            <span className="text-xs text-blue-400/70 font-mono mt-1 block">(Mot de passe par défaut : admin)</span>
          </p>

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
             <div className="relative group">
                <div className={`absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur transition-opacity duration-300 ${password ? 'opacity-100' : 'opacity-0'}`} />
                <div className="relative">
                    <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                    <input 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(false); }}
                        className={`
                          w-full bg-black/40 border-2 rounded-xl pl-12 pr-12 py-4 text-white placeholder-gray-600 outline-none transition-all
                          ${error 
                            ? 'border-red-500/50 focus:border-red-500 bg-red-500/5' 
                            : 'border-white/5 focus:border-blue-500/50 focus:bg-white/5'}
                        `}
                        placeholder="Mot de passe"
                        autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-1"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
             </div>

             {error && (
                <div className="flex items-center justify-center gap-2 text-red-400 text-xs font-medium bg-red-500/10 py-2 rounded-lg animate-fade-in">
                    <AlertCircle size={14} />
                    <span>Mot de passe incorrect</span>
                </div>
             )}

             <button 
               type="submit"
               disabled={isLoading || !password}
               className={`
                 w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-3 transition-all duration-300
                 ${isLoading || !password
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-blue-900/30 hover:shadow-blue-900/50 hover:scale-[1.02] active:scale-[0.98]'}
               `}
             >
               {isLoading ? (
                 <>
                   <Loader size={20} className="animate-spin" />
                   <span>Vérification...</span>
                 </>
               ) : (
                 <>
                   <span>Connexion</span>
                   <ArrowRight size={20} />
                 </>
               )}
             </button>
          </form>

          <div className="mt-8 flex items-center gap-2 text-[10px] text-gray-600 font-medium uppercase tracking-wider">
            <ShieldCheck size={12} />
            Connexion Sécurisée • v2.0
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
    </div>
  );
};

export default LoginModal;