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
import { ClientOrders } from './pages/ClientOrders';
import { ClientAccount } from './pages/ClientAccount';
import { PaymentWaiting } from './pages/PaymentWaiting';
import { Info } from './pages/Info';
import { SplashScreen } from './components/SplashScreen';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <SplashScreen />
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
            <Route path="/pagamento-pendente/:id" element={<PaymentWaiting />} />
            <Route path="/meus-pedidos" element={<ClientOrders />} />
            <Route path="/meus-dados" element={<ClientAccount />} />
            <Route path="/ajuda" element={<Info />} />
            <Route path="/suporte" element={<Info />} />
            <Route path="/parcerias" element={<Info />} />
            <Route path="/trabalhe-conosco" element={<Info />} />
            <Route path="/privacidade" element={<Info />} />
            {/* Rota coringa */}
            <Route path="*" element={<Navigate to="/restaurantes" replace />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
