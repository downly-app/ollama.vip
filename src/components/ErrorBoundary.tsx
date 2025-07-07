import React from 'react';
import { useTranslation } from 'react-i18next';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

const DefaultErrorFallback: React.FC<{ error: Error; resetError: () => void }> = ({
  error,
  resetError,
}) => {
  const { t } = useTranslation();

  return (
    <div className='flex items-center justify-center h-full p-4'>
      <div className='text-center text-white max-w-md'>
        <div className='mb-4'>
          <div className='w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center'>
            <svg
              className='w-8 h-8 text-red-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
              />
            </svg>
          </div>
          <h2 className='text-xl font-semibold mb-2'>
            {t('error.somethingWentWrong', 'Something went wrong')}
          </h2>
          <p className='text-white/70 mb-4 text-sm'>
            {error.message || t('error.unknownError', 'An unknown error occurred')}
          </p>
        </div>

        <div className='space-y-2'>
          <button
            onClick={resetError}
            className='w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors'
          >
            {t('error.tryAgain', 'Try again')}
          </button>

          <button
            onClick={() => window.location.reload()}
            className='w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors'
          >
            {t('error.reloadPage', 'Reload page')}
          </button>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className='mt-4 text-left'>
            <summary className='text-sm text-white/60 cursor-pointer hover:text-white/80'>
              {t('error.technicalDetails', 'Technical details')}
            </summary>
            <pre className='mt-2 p-2 bg-black/20 rounded text-xs text-white/60 overflow-auto'>
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
