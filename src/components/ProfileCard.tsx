import { Camera, Edit3, Save, UserCircle } from 'lucide-react';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTheme } from '@/contexts/ThemeContext';

interface ProfileCardProps {
  open: boolean;
  onClose: () => void;
}

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  bio: string;
  avatar: string;
}

const ProfileCard = ({ open, onClose }: ProfileCardProps) => {
  const { t } = useTranslation();
  const { currentTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Username',
    email: 'user@example.com',
    phone: '+86 138 0013 8000',
    bio: 'This person is lazy and left nothing...',
    avatar: '',
  });

  const [editProfile, setEditProfile] = useState<UserProfile>(profile);

  React.useEffect(() => {
    if (open) {
      const savedProfile = localStorage.getItem('userProfile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        setProfile(parsed);
        setEditProfile(parsed);
      }
    }
  }, [open]);

  const handleSave = () => {
    setProfile(editProfile);
    localStorage.setItem('userProfile', JSON.stringify(editProfile));
    setIsEditing(false);
    // Profile saved
  };

  const handleCancel = () => {
    setEditProfile(profile);
    setIsEditing(false);
  };

  const handleClose = () => {
    if (isEditing) {
      handleCancel();
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-[420px] bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-2xl rounded-2xl'>
        <DialogHeader>
          <DialogTitle className='text-center text-2xl font-bold text-white flex items-center justify-center gap-2'>
            <UserCircle className='w-6 h-6' />
            {t('profile.title', 'User Profile')}
          </DialogTitle>
          <DialogDescription className='text-center text-white/70'>
            {t('profile.description', 'Manage your personal information and preferences')}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6 py-4'>
          {/* avatar area */}
          <div className='flex flex-col items-center space-y-4'>
            <div
              className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${currentTheme.colors.primary} flex items-center justify-center shadow-lg`}
            >
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt='Avatar'
                  className='w-full h-full rounded-full object-cover'
                />
              ) : (
                <UserCircle size={40} className='text-white' />
              )}
              {isEditing && (
                <div className='absolute -bottom-2 -right-2 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors'>
                  <Camera size={16} className='text-white' />
                </div>
              )}
            </div>
            {!isEditing && (
              <div className='text-center'>
                <h3 className='text-lg font-semibold text-white'>{profile.name}</h3>
                <p className='text-sm text-white/70'>{profile.email}</p>
              </div>
            )}
          </div>

          {/* form area */}
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='name' className='text-white/90 font-medium'>
                {t('profile.username')}
              </Label>
              {isEditing ? (
                <Input
                  id='name'
                  value={editProfile.name}
                  onChange={e => setEditProfile({ ...editProfile, name: e.target.value })}
                  className='bg-white/10 backdrop-blur-sm border-white/30 text-white placeholder-white/60 hover:bg-white/15 transition-all duration-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-white/40 focus:border-white/60'
                />
              ) : (
                <div className='px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white'>
                  {profile.name}
                </div>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='email' className='text-white/90 font-medium'>
                {t('profile.email')}
              </Label>
              {isEditing ? (
                <Input
                  id='email'
                  type='email'
                  value={editProfile.email}
                  onChange={e => setEditProfile({ ...editProfile, email: e.target.value })}
                  className='bg-white/10 backdrop-blur-sm border-white/30 text-white placeholder-white/60 hover:bg-white/15 transition-all duration-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-white/40 focus:border-white/60'
                />
              ) : (
                <div className='px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white'>
                  {profile.email}
                </div>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='phone' className='text-white/90 font-medium'>
                Phone
              </Label>
              {isEditing ? (
                <Input
                  id='phone'
                  value={editProfile.phone}
                  onChange={e => setEditProfile({ ...editProfile, phone: e.target.value })}
                  className='bg-white/10 backdrop-blur-sm border-white/30 text-white placeholder-white/60 hover:bg-white/15 transition-all duration-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-white/40 focus:border-white/60'
                />
              ) : (
                <div className='px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white'>
                  {profile.phone}
                </div>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='bio' className='text-white/90 font-medium'>
                Bio
              </Label>
              {isEditing ? (
                <Textarea
                  id='bio'
                  value={editProfile.bio}
                  onChange={e => setEditProfile({ ...editProfile, bio: e.target.value })}
                  className='bg-white/10 backdrop-blur-sm border-white/30 text-white placeholder-white/60 hover:bg-white/15 transition-all duration-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-white/40 focus:border-white/60 min-h-[80px]'
                  placeholder='Tell us about yourself...'
                />
              ) : (
                <div className='px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white min-h-[80px]'>
                  {profile.bio}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* buttons area */}
        <div className='flex justify-end space-x-3 pt-4'>
          {isEditing ? (
            <>
              <Button
                variant='outline'
                onClick={handleCancel}
                className='px-6 py-3 border-white/30 text-white hover:bg-white/10 hover:border-white/50 bg-transparent backdrop-blur-sm transition-all duration-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-white/30'
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleSave}
                className={`px-6 py-3 bg-gradient-to-r ${currentTheme.colors.primary} hover:opacity-90 text-white border-0 shadow-lg transition-all duration-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-white/30 flex items-center space-x-2`}
              >
                <Save size={16} />
                <span>{t('common.save')}</span>
              </Button>
            </>
          ) : (
            <Button
              onClick={handleClose}
              className={`px-8 py-3 bg-gradient-to-r ${currentTheme.colors.primary} hover:opacity-90 text-white border-0 shadow-lg transition-all duration-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-white/30`}
            >
              {t('common.close')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileCard;
