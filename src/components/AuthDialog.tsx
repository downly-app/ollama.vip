
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => void;
  onRegister: (email: string, password: string, username: string) => void;
}

const AuthDialog = ({ open, onClose, onLogin, onRegister }: AuthDialogProps) => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    confirmPassword: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      onLogin(formData.email, formData.password);
    } else {
      if (formData.password !== formData.confirmPassword) {
        alert(t('auth.passwordMismatch'));
        return;
      }
      onRegister(formData.email, formData.password, formData.username);
    }
    setFormData({ email: '', password: '', username: '', confirmPassword: '' });
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({ email: '', password: '', username: '', confirmPassword: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center text-xl font-semibold">
            {isLogin ? (
              <LogIn className="mr-3 text-orange-400" size={24} />
            ) : (
              <UserPlus className="mr-3 text-purple-400" size={24} />
            )}
            <span className="bg-gradient-to-r from-orange-400 to-purple-400 bg-clip-text text-transparent">
              {isLogin ? t('auth.login') : t('auth.register')}
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="username" className="text-white/90 font-medium">{t('auth.username')}</Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="px-4 py-3 bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 hover:bg-white/15 transition-all duration-300 rounded-xl"
                placeholder={t('auth.enterUsername')}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/90 font-medium">{t('auth.email')}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="px-4 py-3 bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400/50 hover:bg-white/15 transition-all duration-300 rounded-xl"
              placeholder={t('auth.enterEmail')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/90 font-medium">{t('auth.password')}</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="px-4 py-3 bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400/50 hover:bg-white/15 transition-all duration-300 rounded-xl"
              placeholder={t('auth.enterPassword')}
              required
            />
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white/90 font-medium">{t('auth.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                className="px-4 py-3 bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 hover:bg-white/15 transition-all duration-300 rounded-xl"
                placeholder={t('auth.reenterPassword')}
                required
              />
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white border-0 shadow-lg transition-all duration-300 font-medium rounded-xl text-base"
          >
            {isLogin ? t('auth.loginButton') : t('auth.registerButton')}
          </Button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={toggleMode}
              className="bg-gradient-to-r from-orange-400 to-purple-400 bg-clip-text text-transparent text-sm underline transition-colors duration-300 font-medium hover:from-orange-300 hover:to-purple-300"
            >
              {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
