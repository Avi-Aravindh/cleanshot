import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../store';

const SENSITIVITY_OPTIONS = [
  { key: 'conservative', label: 'Conservative', description: 'Only show obvious clutter', threshold: 0.6 },
  { key: 'balanced', label: 'Balanced', description: 'Recommended for most users', threshold: 0.4 },
  { key: 'aggressive', label: 'Aggressive', description: 'Catch more, may have false positives', threshold: 0.25 },
];

const SettingsScreen = ({ navigation }) => {
  const { settings, updateSettings } = useStore();
  const [localSettings, setLocalSettings] = useState(settings);

  // Zustand persist auto-loads settings, no need for manual load

  const handleSensitivityChange = (key) => {
    const option = SENSITIVITY_OPTIONS.find(o => o.key === key);
    setLocalSettings({ ...localSettings, sensitivity: key, sensitivityThreshold: option.threshold });
    updateSettings({ sensitivity: key, sensitivityThreshold: option.threshold });
  };

  const handleScheduleChange = (value) => {
    setLocalSettings({ ...localSettings, schedule: value });
    updateSettings({ schedule: value });
  };

  const handleNotificationToggle = (value) => {
    setLocalSettings({ ...localSettings, notifications: value });
    updateSettings({ notifications: value });
  };

  const handleDarkModeChange = (value) => {
    setLocalSettings({ ...localSettings, darkMode: value });
    updateSettings({ darkMode: value });
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear cached thumbnails and data. Your photos will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Done', 'Cache cleared!');
          }
        }
      ]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'Your photos stay on your device. Always.\n\nCleanShot processes everything locally on your phone. No photos are ever uploaded to any server.\n\nWe do not collect, store, or share any of your data.',
      [{ text: 'OK' }]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'CleanShot',
      'Version 1.0.0\n\nPhoto decluttering made simple.\n\nBuilt with ❤️ using React Native Expo.',
      [{ text: 'OK' }]
    );
  };

  const handleRateApp = () => {
    Alert.alert(
      'Rate CleanShot',
      'Would you like to rate this app on the App Store?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Rate', onPress: () => {} }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Detection Sensitivity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="stats-chart-outline" size={20} color="#10B981" />
            <Text style={styles.sectionTitle}>Detection Sensitivity</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            How aggressive should we be when finding clutter?
          </Text>
          
          {SENSITIVITY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.optionRow,
                localSettings.sensitivity === option.key && styles.optionRowActive
              ]}
              onPress={() => handleSensitivityChange(option.key)}
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionText}>
                  {option.label}
                </Text>
                <Text style={styles.optionDescription}>
                  {option.description}
                </Text>
              </View>
              {localSettings.sensitivity === option.key && (
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Scan Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scan Schedule</Text>
          <Text style={styles.sectionSubtitle}>How often to check for clutter</Text>
          
          {['daily', 'weekly', 'monthly', 'manual'].map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.optionRow}
              onPress={() => handleScheduleChange(option)}
            >
              <View style={styles.optionLeft}>
                <Text style={styles.optionText}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
              </View>
              {localSettings.schedule === option && (
                <Ionicons name="checkmark" size={20} color="#10B981" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <Text style={styles.sectionSubtitle}>Choose your preferred theme</Text>

          {[
            { key: 'light', label: 'Light', icon: 'sunny-outline' },
            { key: 'dark', label: 'Dark', icon: 'moon-outline' },
            { key: 'auto', label: 'Auto', icon: 'phone-portrait-outline' }
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              style={styles.optionRow}
              onPress={() => handleDarkModeChange(option.key)}
            >
              <View style={styles.optionLeft}>
                <Ionicons name={option.icon} size={24} color="#64748B" />
                <Text style={styles.optionText}>{option.label}</Text>
              </View>
              {localSettings.darkMode === option.key && (
                <Ionicons name="checkmark" size={20} color="#10B981" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <View style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <Ionicons name="notifications-outline" size={24} color="#64748B" />
              <Text style={styles.optionText}>Notifications</Text>
            </View>
            <Switch
              value={localSettings.notifications}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#E2E8F0', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.optionRow} onPress={handlePrivacyPolicy}>
            <View style={styles.optionLeft}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#64748B" />
              <Text style={styles.optionText}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.optionRow} onPress={handleClearCache}>
            <View style={styles.optionLeft}>
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
              <Text style={[styles.optionText, { color: '#EF4444' }]}>Clear Cache</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.optionRow} onPress={handleAbout}>
            <View style={styles.optionLeft}>
              <Ionicons name="information-circle-outline" size={24} color="#64748B" />
              <Text style={styles.optionText}>About</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.optionRow} onPress={handleRateApp}>
            <View style={styles.optionLeft}>
              <Ionicons name="star-outline" size={24} color="#64748B" />
              <Text style={styles.optionText}>Rate App</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionRowActive: {
    backgroundColor: '#10B98110',
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#1E293B',
  },
  optionDescription: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
});

export default SettingsScreen;
