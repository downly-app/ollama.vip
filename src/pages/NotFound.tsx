import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    // This page should not be rendered in production
  }, [location.pathname]);

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-100'>
      <div className='text-center'>
        <h1 className='text-4xl font-bold mb-4'>{t('pages.notFound.title')}</h1>
        <p className='text-xl text-gray-600 mb-4'>{t('pages.notFound.message')}</p>
        <a href='/' className='text-blue-500 hover:text-blue-700 underline'>
          {t('pages.notFound.returnHome')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
