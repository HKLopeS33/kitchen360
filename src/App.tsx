import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './helpers/useAuth';
import { CartProvider } from './helpers/useCart';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Cart } from './pages/Cart';
import { Restaurants } from './pages/Restaurants';
import { RestaurantDashboard } from './pages/RestaurantDashboard';
import { RestaurantMenu } from './pages/RestaurantMenu';
import { PaymentStatus } from './pages/PaymentStatus';
import { OrderTracking } from './pages/OrderTracking';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/" element={<Navigate to="/restaurantes" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/restaurantes" element={<Restaurants />} />
            <Route path="/restaurantes/:id" element={<RestaurantMenu />} />
            <Route path="/meu-restaurante" element={<RestaurantDashboard />} />
            <Route path="/pedido-status" element={<PaymentStatus />} />
            <Route path="/pedido/:id" element={<OrderTracking />} />
            {/* Rota coringa */}
            <Route path="*" element={<Navigate to="/restaurantes" replace />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
