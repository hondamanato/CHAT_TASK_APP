import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useHolidayContext } from '../contexts/HolidayContext';

interface OfflineIndicatorProps {
  style?: any;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ style }) => {
  const { isOnline } = useHolidayContext();

  if (isOnline) {
    return null; // オンライン時は何も表示しない
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.indicator}>
        <Text style={styles.text}>📵 オフライン</Text>
        <Text style={styles.subText}>キャッシュデータを表示中</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 1000, // Android用
  },
  indicator: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 0,
  },
  text: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  subText: {
    color: '#ffffff',
    fontSize: 10,
    opacity: 0.9,
    textAlign: 'center',
    marginTop: 1,
  },
});

export default OfflineIndicator;