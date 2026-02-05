import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CategoryCard from '../components/CategoryCard';
import useStore from '../store';
import { scanPhotos, formatBytes } from '../utils/photoScanner';
import { useTheme } from '../theme/useTheme';

const HomeScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { scanResults, setScanResults, setIsScanning, isScanning } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  // Zustand persist auto-loads settings, no need for manual load

  const [scanProgress, setScanProgress] = useState({ phase: '', current: 0, total: 0 });

  const handleScan = async () => {
    console.log('handleScan called');
    setIsLoading(true);
    setIsScanning(true);
    try {
      console.log('Starting scan...');
      const results = await scanPhotos({
        deepScan: true,
        includeVisualSimilarity: true,
        onProgress: (progress) => {
          setScanProgress(progress);
        }
      });
      console.log('Scan complete:', results);
      setScanResults(results);
      setHasScanned(true);
    } catch (error) {
      console.error('Scan failed:', error);
      Alert.alert('Scan Error', error.message || 'Failed to scan photos');
    } finally {
      setIsLoading(false);
      setIsScanning(false);
      setScanProgress({ phase: '', current: 0, total: 0 });
    }
  };

  const totalPhotos = scanResults.screenshots + scanResults.blurry + scanResults.duplicates;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>CleanShot</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={24} color="#64748B" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Summary */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Your Photo Library</Text>
          {isScanning || isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.loadingText}>
                {scanProgress.phase && `${scanProgress.phase}: ${scanProgress.current}/${scanProgress.total}` || 'Scanning your photos...'}
              </Text>
            </View>
          ) : totalPhotos > 0 ? (
            <>
              <Text style={styles.statsNumber}>{totalPhotos}</Text>
              <Text style={styles.statsLabel}>photos can be cleaned</Text>
              <Text style={styles.spaceSaved}>{formatBytes(scanResults.totalSpace)} could be freed</Text>
            </>
          ) : hasScanned ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              <Text style={styles.emptyTitle}>All clean! ✨</Text>
              <Text style={styles.emptyText}>No clutter found in your library</Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>Tap scan to find clutter</Text>
          )}
        </View>

        {/* Scan Button */}
        <TouchableOpacity 
          style={[styles.scanButton, isLoading && styles.scanButtonDisabled]} 
          onPress={handleScan}
          disabled={isLoading}
        >
          <Ionicons name="scan-outline" size={24} color="#FFFFFF" />
          <Text style={styles.scanButtonText}>
            {isLoading ? 'Scanning...' : 'Scan for Clutter'}
          </Text>
        </TouchableOpacity>

        {/* Category Cards */}
        {totalPhotos > 0 && !isLoading && (
          <View style={styles.categoriesSection}>
            <Text style={styles.sectionTitle}>Found Clutter</Text>
            <View style={styles.categoriesGrid}>
              {scanResults.screenshots > 0 && (
                <CategoryCard
                  title="screenshots"
                  count={scanResults.screenshots}
                  space={formatBytes(scanResults.screenshots * 1024 * 500)} // Rough estimate
                  color="#60A5FA"
                  onPress={() => navigation.navigate('Category', { type: 'screenshots' })}
                />
              )}
              {scanResults.blurry > 0 && (
                <CategoryCard
                  title="blurry"
                  count={scanResults.blurry}
                  space={formatBytes(scanResults.blurry * 1024 * 800)}
                  color="#F59E0B"
                  onPress={() => navigation.navigate('Category', { type: 'blurry' })}
                />
              )}
              {scanResults.duplicates > 0 && (
                <CategoryCard
                  title="duplicates"
                  count={scanResults.duplicates}
                  space={formatBytes(scanResults.duplicates * 1024 * 1000)}
                  color="#10B981"
                  onPress={() => navigation.navigate('Category', { type: 'duplicates' })}
                />
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10B981',
  },
  settingsButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  statsTitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 8,
  },
  statsNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1E293B',
  },
  statsLabel: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 8,
  },
  spaceSaved: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 12,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  scanButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  scanButtonDisabled: {
    opacity: 0.7,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  categoriesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});

export default HomeScreen;
