const AUTH_KEY = 'gemini_tv_auth';

export const AuthService = {
  login: (password: string): boolean => {
    // Simple password check (default: admin)
    if (password === 'admin') {
      localStorage.setItem(AUTH_KEY, 'true');
      return true;
    }
    return false;
  },

  logout: () => {
    localStorage.removeItem(AUTH_KEY);
  },

  isAuthenticated: (): boolean => {
    return localStorage.getItem(AUTH_KEY) === 'true';
  }
};