import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../utils/constants';

export const Header = () => {
  const { user, tenant, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = ROUTES.LOGIN;
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center min-w-0">
            <Link to={ROUTES.DASHBOARD} className="text-lg sm:text-xl font-bold text-gray-900 truncate">
              Inventory SaaS
            </Link>
            {tenant && (
              <span className="ml-2 sm:ml-4 text-xs sm:text-sm text-gray-500 truncate hidden sm:inline">
                ({tenant.name})
              </span>
            )}
          </div>
          <nav className="flex items-center space-x-1 sm:space-x-4">
            <Link
              to={ROUTES.DASHBOARD}
              className="text-gray-700 hover:text-blue-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
            >
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Dash</span>
            </Link>
            <Link
              to={ROUTES.PRODUCTS}
              className="text-gray-700 hover:text-blue-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium hidden md:inline"
            >
              Products
            </Link>
            <Link
              to={ROUTES.SUPPLIERS}
              className="text-gray-700 hover:text-blue-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium hidden lg:inline"
            >
              Suppliers
            </Link>
            <Link
              to={ROUTES.PURCHASE_ORDERS}
              className="text-gray-700 hover:text-blue-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium hidden lg:inline"
            >
              POs
            </Link>
            {user && (
              <div className="flex items-center space-x-2 sm:space-x-3 border-l border-gray-200 pl-2 sm:pl-4">
                <span className="text-xs sm:text-sm text-gray-700 truncate max-w-[100px] sm:max-w-none">
                  <span className="hidden sm:inline">{user.firstName} {user.lastName}</span>
                  <span className="sm:hidden">{user.firstName}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs sm:text-sm text-gray-700 hover:text-red-600 whitespace-nowrap"
                >
                  Logout
                </button>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

