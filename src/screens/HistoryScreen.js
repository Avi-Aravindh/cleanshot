import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../store';
import { formatBytes } from '../utils/photoScanner';

const HistoryScreen = ({ navigation }) => {
  const { cleanupHistory } = useStore();

  const categoryNames = {
    screenshots: 'Screenshots',
    blurry: 'Blurry Photos',
    duplicates: 'Duplicates',
    old: 'Old Photos',
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderHistoryItem = ({ item }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyLeft}>
        <View style={styles.historyIcon}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
        </View>
        <View style={styles.historyInfo}>
          <Text style={styles.historyTitle}>
            Deleted {item.count} {categoryNames[item.type] || item.type}
          </Text>
          <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
        </View>
      </View>
      <Text style={styles.historySpace}>
        {formatBytes(item.space || item.count * 1024 * 500)}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {cleanupHistory.length > 0 ? (
        <FlatList
          data={cleanupHistory}
          renderItem={renderHistoryItem}
          keyExtractor={(item, index) => `${item.date}-${index}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No cleanup history</Text>
          <Text style={styles.emptyText}>
            Your cleanup sessions will appear here
          </Text>
          <TouchableOpacity 
            style={styles.scanButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.scanButtonText}>Start Cleaning</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    padding: 20,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B98120',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  historyDate: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  historySpace: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  scanButton: {
    marginTop: 24,
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HistoryScreen;
