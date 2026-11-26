import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './helpers/useAuth';
import { CartProvider } from './helpers/useCart';
import { Login } from './pages/Login';
import { Restaurants } from './pages/Restaurants';
import { SplashScreen } from './components/SplashScreen';

// Páginas carregadas sob demanda: a tela inicial baixa só o que precisa.
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const Cart = lazy(() => import('./pages/Cart').then(m => ({ default: m.Cart })));
const RestaurantDashboard = lazy(() => import('./pages/RestaurantDashboard').then(m => ({ default: m.RestaurantDashboard })));
const RestaurantSettings = lazy(() => import('./pages/RestaurantSettings').then(m => ({ default: m.RestaurantSettings })));
const RestaurantStoreSettings = lazy(() => import('./pages/RestaurantStoreSettings').then(m => ({ default: m.RestaurantStoreSettings })));
const RestaurantMenu = lazy(() => import('./pages/RestaurantMenu').then(m => ({ default: m.RestaurantMenu })));
const PaymentStatus = lazy(() => import('./pages/PaymentStatus').then(m => ({ default: m.PaymentStatus })));
const OrderTracking = lazy(() => import('./pages/OrderTracking').then(m => ({ default: m.OrderTracking })));
const ClientOrders = lazy(() => import('./pages/ClientOrders').then(m => ({ default: m.ClientOrders })));
const ClientAccount = lazy(() => import('./pages/ClientAccount').then(m => ({ default: m.ClientAccount })));
const PaymentWaiting = lazy(() => import('./pages/PaymentWaiting').then(m => ({ default: m.PaymentWaiting })));
const Info = lazy(() => import('./pages/Info').then(m => ({ default: m.Info })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage').then(m => ({ default: m.SubscriptionPage })));
const SubscriptionStatus = lazy(() => import('./pages/SubscriptionStatus').then(m => ({ default: m.SubscriptionStatus })));


export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <SplashScreen />
          <Toaster position="top-right" richColors />
          <Suspense fallback={<div className="min-h-screen bg-[#f7f5f0]" />}>
          <Routes>
            <Route path="/" element={<Navigate to="/restaurantes" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/esqueci-senha" element={<ForgotPassword />} />
            <Route path="/redefinir-senha" element={<ResetPassword />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/restaurantes" element={<Restaurants />} />
            <Route path="/restaurantes/:id" element={<RestaurantMenu />} />
            <Route path="/meu-restaurante" element={<RestaurantDashboard />} />
            <Route path="/configuracoes" element={<RestaurantSettings />} />
            <Route path="/configuracoes/estabelecimento" element={<RestaurantStoreSettings />} />
            <Route path="/assinatura" element={<SubscriptionPage />} />
            <Route path="/assinatura-status" element={<SubscriptionStatus />} />
            <Route path="/admin" element={<AdminDashboard />} />
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
            <Route path="/politica-assinatura" element={<Info />} />
            {/* Rota coringa */}
            <Route path="*" element={<Navigate to="/restaurantes" replace />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
