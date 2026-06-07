import { Link, useNavigate } from 'react-router-dom';
import { Leaf, ShoppingCart, LogOut, User } from 'lucide-react';
import { useAuth } from '../helpers/useAuth';
import { useCart } from '../helpers/useCart';

export function Navbar() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-[#2D5016] text-lg">
          <Leaf size={22} className="text-[#6BA534]" />
          Cardápio Fitness
        </Link>

        <div className="flex items-center gap-1">
          <Link to="/" className="px-3 py-2 text-sm font-medium text-[#555] hover:text-[#2D5016] rounded-lg hover:bg-[#e8f5e0] transition-colors">
            Cardápio
          </Link>

          <Link to="/cart" className="relative px-3 py-2 text-sm font-medium text-[#555] hover:text-[#2D5016] rounded-lg hover:bg-[#e8f5e0] transition-colors flex items-center gap-1.5">
            <ShoppingCart size={17} />
            Carrinho
            {totalItems > 0 && (
              <span className="absolute -top-0.5 right-0.5 bg-[#E8721C] text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center min-w-[18px] min-h-[18px]">
                {totalItems}
              </span>
            )}
          </Link>

          {user ? (
            <>
              <Link to="/my-orders" className="px-3 py-2 text-sm font-medium text-[#555] hover:text-[#2D5016] rounded-lg hover:bg-[#e8f5e0] transition-colors flex items-center gap-1.5">
                <User size={16} /> Meus Pedidos
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="px-3 py-2 text-sm font-medium text-[#555] hover:text-[#2D5016] rounded-lg hover:bg-[#e8f5e0] transition-colors">
                  Admin
                </Link>
              )}
              <button onClick={handleLogout} className="ml-1 px-3 py-2 text-sm font-medium text-[#888] hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1.5">
                <LogOut size={16} /> Sair
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-3 py-2 text-sm font-medium text-[#555] hover:text-[#2D5016] rounded-lg hover:bg-[#e8f5e0] transition-colors">
                Entrar
              </Link>
              <Link to="/register" className="ml-1 bg-[#2D5016] text-white px-4 py-2 text-sm font-semibold rounded-xl hover:bg-[#3d6b1e] transition-colors">
                Criar Conta
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
