import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import Toolbar from '@/components/Toolbar';
import { AppLayout, Sidebar } from '@/components/layouts';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/contexts/ThemeContext';
import '@/styles/titlebar.css';

import Chat from './pages/Chat';
import Downloads from './pages/Downloads';
import General from './pages/General';
import LocalModels from './pages/LocalModels';
import ModelDetail from './pages/ModelDetail';
import Models from './pages/Models';
import NotFound from './pages/NotFound';

const App = () => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 1000 * 60 * 5, // 5 minutes
          },
        },
      })
  );

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path='/' element={<General />} />
              <Route
                path='/chat'
                element={
                  <AppLayout
                    sidebar={
                      <Sidebar>
                        <Toolbar />
                      </Sidebar>
                    }
                  >
                    <Chat />
                  </AppLayout>
                }
              />
              <Route path='/models' element={<Models />} />
              <Route path='/models/:modelName' element={<ModelDetail />} />
              <Route path='/local-models' element={<LocalModels />} />
              <Route path='/downloads' element={<Downloads />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path='*' element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
