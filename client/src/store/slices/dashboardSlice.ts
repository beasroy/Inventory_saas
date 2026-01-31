import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import type { DashboardState, DashboardData, LowStockItem } from '../../types/dashboard.types';

const initialState: DashboardState = {
  data: null,
  loading: false,
  error: null,
  lastUpdated: null,
};

// Fetch dashboard data
export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchDashboardData',
  async (lowStockThreshold: number | undefined, { rejectWithValue }) => {
    try {
      const params = lowStockThreshold ? { lowStockThreshold } : {};
      const response = await api.get<{ success: boolean; data: DashboardData }>('/analytics/dashboard', {
        params,
      });
      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue('Failed to fetch dashboard data');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch dashboard data');
    }
  }
);

// Fetch only low stock items (for real-time updates)
export const fetchLowStockItems = createAsyncThunk(
  'dashboard/fetchLowStockItems',
  async (lowStockThreshold: number | undefined, { rejectWithValue }) => {
    try {
      const params = lowStockThreshold ? { lowStockThreshold } : {};
      const response = await api.get<{ success: boolean; data: DashboardData }>('/analytics/dashboard', {
        params,
      });
      if (response.data.success) {
        return response.data.data.lowStockItems;
      }
      return rejectWithValue('Failed to fetch low stock items');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch low stock items');
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    updateInventoryValue: (state, action: PayloadAction<number>) => {
      if (state.data) {
        state.data.inventoryValue = action.payload;
        state.lastUpdated = new Date().toISOString();
      }
    },
    updateLowStockItems: (state, action: PayloadAction<LowStockItem[]>) => {
      if (state.data) {
        state.data.lowStockItems = action.payload;
        state.lastUpdated = new Date().toISOString();
      }
    },
    setDashboardData: (state, action: PayloadAction<DashboardData>) => {
      state.data = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action: PayloadAction<DashboardData>) => {
        state.loading = false;
        state.data = action.payload;
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Low Stock Items
    builder
      .addCase(fetchLowStockItems.fulfilled, (state, action: PayloadAction<LowStockItem[]>) => {
        if (state.data) {
          state.data.lowStockItems = action.payload;
          state.lastUpdated = new Date().toISOString();
        }
      });
  },
});

export const { updateInventoryValue, updateLowStockItems, setDashboardData, clearError } =
  dashboardSlice.actions;
export default dashboardSlice.reducer;

