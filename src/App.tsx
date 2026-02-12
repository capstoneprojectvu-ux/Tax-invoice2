import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { ProtectedRoute } from "./components/ProtectedRoute";
import ItemsStep from "./pages/ItemsStep";
import CustomerStep from "./pages/CustomerStep";
import ReviewStep from "./pages/ReviewStep";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          {/* New keyboard-first wizard flow */}
          <Route
            path="/wizard/items"
            element={
              <ProtectedRoute>
                <ItemsStep />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wizard/company"
            element={
              <ProtectedRoute>
                <CustomerStep />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wizard/review"
            element={
              <ProtectedRoute>
                <ReviewStep />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Navigate to="/wizard/items" replace />
              </ProtectedRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
