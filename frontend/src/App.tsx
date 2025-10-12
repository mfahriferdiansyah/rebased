import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { AuthProvider } from '@/contexts/AuthContext';
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { privyConfig, getPrivyAppId } from './lib/privy';
import { wagmiConfig } from './lib/wagmi';
// Removed: AuthRetryButton - auto-trigger handles everything now

const queryClient = new QueryClient();

const App = () => {
  // Get Privy App ID (will throw helpful error if not configured)
  const privyAppId = getPrivyAppId();

  return (
    <PrivyProvider
      appId={privyAppId}
      config={privyConfig}
    >
      {/* AuthProvider wraps entire app - single source of truth for auth */}
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </WagmiProvider>
        </QueryClientProvider>
      </AuthProvider>
    </PrivyProvider>
  );
};

export default App;
