import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { CustomCalendar } from '@/src/components/CustomCalendar';
import { ShiftScanner } from '@/src/components/ShiftScanner';
import { ViewMode } from '@/src/types';

export default function CalendarScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [showShiftScanner, setShowShiftScanner] = useState(false);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  const handleImageCapture = (imageUri: string) => {
    console.log('Captured image:', imageUri);
    // TODO: AIサービスで画像解析
  };

  const renderViewModeButtons = () => (
    <View style={styles.viewModeContainer}>
      {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
        <TouchableOpacity
          key={mode}
          style={[
            styles.viewModeButton,
            viewMode === mode && styles.activeViewModeButton,
          ]}
          onPress={() => setViewMode(mode)}
        >
          <Text
            style={[
              styles.viewModeText,
              viewMode === mode && styles.activeViewModeText,
            ]}
          >
            {mode === 'month' ? '月' : mode === 'week' ? '週' : '日'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AIカレンダー</Text>
        {renderViewModeButtons()}
      </View>
      
      <CustomCalendar
        viewMode={viewMode}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
      />
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.scanButton}
          onPress={() => setShowShiftScanner(true)}
        >
          <Text style={styles.scanButtonText}>📸 シフト表をスキャン</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.chatButton}>
          <Text style={styles.chatButtonText}>💬 AIに予定を追加</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showShiftScanner}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <ShiftScanner
          onImageCapture={handleImageCapture}
          onClose={() => setShowShiftScanner(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  viewModeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  viewModeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  activeViewModeButton: {
    backgroundColor: '#007AFF',
  },
  viewModeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeViewModeText: {
    color: '#ffffff',
  },
  footer: {
    padding: 16,
    backgroundColor: '#ffffff',
    gap: 12,
  },
  scanButton: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  chatButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
