import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Default state to ensure no undefined values
const defaultState = {
  scanResults: {
    screenshots: 0,
    blurry: 0,
    duplicates: 0,
    old: 0,
    totalSpace: 0,
    details: {},
  },
  isScanning: false,
  lastScanDate: null,
  settings: {
    schedule: 'weekly',
    notifications: true,
    autoDelete: false,
    sensitivity: 'balanced',
    sensitivityThreshold: 0.4,
  },
  cleanupHistory: [],
};

const useStore = create(
  persist(
    (set, get) => ({
      ...defaultState,

      // Actions
      setScanResults: (results) => set({ 
        scanResults: { ...defaultState.scanResults, ...results },
        lastScanDate: new Date().toISOString(),
      }),
      
      setIsScanning: (isScanning) => set({ isScanning }),
      
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...defaultState.settings, ...state.settings, ...newSettings }
      })),

      addCleanupRecord: (record) => set((state) => ({
        cleanupHistory: [record, ...state.cleanupHistory]
      })),

      // Reset scan results
      resetScanResults: () => set({
        scanResults: defaultState.scanResults,
      }),

      // Manual save/load (optional - persist does this automatically)
      saveSettings: () => Promise.resolve(),
      
      loadSettings: () => Promise.resolve(),
    }),
    {
      name: 'cleanshot-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // Ensure state is valid after hydration
        if (!state || !state.settings) {
          console.log('Rehydrating with default state');
        }
      },
    }
  )
);

export default useStore;
