import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppLayout, Sidebar } from "@/components/layouts";
import Toolbar from "@/components/Toolbar";
import Models from "./pages/Models";
import LocalModels from "./pages/LocalModels";
import General from "./pages/General";
import Chat from "./pages/Chat";
import ModelDetail from "./pages/ModelDetail";
import NotFound from "./pages/NotFound";
import "@/styles/titlebar.css";

const App = () => {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 1000 * 60 * 5, // 5 minutes
      },
    },
  }));

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<General />} />
              <Route path="/chat" element={
                <AppLayout
                  sidebar={
                    <Sidebar>
                      <Toolbar />
                    </Sidebar>
                  }
                >
                  <Chat />
                </AppLayout>
              } />
              <Route path="/models" element={<Models />} />
              <Route path="/local-models" element={<LocalModels />} />
              <Route path="/model/:modelName" element={<ModelDetail />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
