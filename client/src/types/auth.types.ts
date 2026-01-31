export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'owner' | 'manager' | 'staff';
  permissions: string[];
  status?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status?: string;
}

export interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  tenantName: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    tenant: Tenant;
  };
  message?: string;
  error?: string;
}

