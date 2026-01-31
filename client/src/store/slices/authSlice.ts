import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { connectSocket, disconnectSocket } from '../../services/socket';
import type { AuthState, LoginCredentials, RegisterData, AuthResponse, User, Tenant } from '../../types/auth.types';

const initialState: AuthState = {
  user: null,
  tenant: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      if (response.data.success && response.data.data) {
        // Connect socket after successful login
        // Socket will use httpOnly cookie for auth automatically
        connectSocket();
        return response.data.data;
      }
      return rejectWithValue(response.data.error ?? 'Login failed');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (data: RegisterData, { rejectWithValue }) => {
    try {
      const response = await api.post<AuthResponse>('/auth/register', data);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return rejectWithValue(response.data.error ?? 'Registration failed');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Registration failed');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await api.post('/auth/logout');
    disconnectSocket();
    return null;
  } catch (error: any) {
    disconnectSocket();
    return rejectWithValue(error.response?.data?.error || 'Logout failed');
  }
});

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<AuthResponse>('/auth/current-user');
      if (response.data.success && response.data.data) {
        // Connect socket if not already connected
        // Socket will use httpOnly cookie for auth automatically
        connectSocket();
        return response.data.data;
      }
      return rejectWithValue(response.data.error ?? 'Failed to get user');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to get user');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<{ user: User; tenant: Tenant }>) => {
        state.loading = false;
        state.user = action.payload.user;
        state.tenant = action.payload.tenant;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action: PayloadAction<{ user: User; tenant: Tenant }>) => {
        state.loading = false;
        state.user = action.payload.user;
        state.tenant = action.payload.tenant;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Logout
    builder
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.tenant = null;
        state.isAuthenticated = false;
        state.error = null;
      });

    // Get Current User
    builder
      .addCase(getCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action: PayloadAction<{ user: User; tenant: Tenant }>) => {
        state.loading = false;
        state.user = action.payload.user;
        state.tenant = action.payload.tenant;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(getCurrentUser.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.tenant = null;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;

