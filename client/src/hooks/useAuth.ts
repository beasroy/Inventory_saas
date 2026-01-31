import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { login, register, logout, getCurrentUser, clearError } from '../store/slices/authSlice';
import type { LoginCredentials, RegisterData } from '../types/auth.types';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, tenant, isAuthenticated, loading, error } = useSelector(
    (state: RootState) => state.auth
  );

  return {
    user,
    tenant,
    isAuthenticated,
    loading,
    error,
    login: (credentials: LoginCredentials) => dispatch(login(credentials)),
    register: (data: RegisterData) => dispatch(register(data)),
    logout: () => dispatch(logout()),
    getCurrentUser: () => dispatch(getCurrentUser()),
    clearError: () => dispatch(clearError()),
  };
};

