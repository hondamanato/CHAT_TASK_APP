import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import {
  HomeIcon,
  PlusCircleIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
} from 'react-native-heroicons/outline';

interface DockProps {
  onTodayPress: () => void;
  onAddEventPress: () => void;
  onSearchPress: () => void;
  onSettingsPress: () => void;
}

export const Dock: React.FC<DockProps> = ({
  onTodayPress,
  onAddEventPress,
  onSearchPress,
  onSettingsPress,
}) => {
  return (
    <View style={styles.dockContainer}>
      <View style={styles.dock}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onTodayPress}
          activeOpacity={0.8}
        >
          <View style={[styles.iconBackground, { backgroundColor: '#007AFF' }]}>
            <HomeIcon size={22} color="#ffffff" />
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onAddEventPress}
          activeOpacity={0.8}
        >
          <View style={[styles.iconBackground, { backgroundColor: '#34C759' }]}>
            <PlusCircleIcon size={22} color="#ffffff" />
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onSearchPress}
          activeOpacity={0.8}
        >
          <View style={[styles.iconBackground, { backgroundColor: '#FF9500' }]}>
            <MagnifyingGlassIcon size={22} color="#ffffff" />
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onSettingsPress}
          activeOpacity={0.8}
        >
          <View style={[styles.iconBackground, { backgroundColor: '#8E8E93' }]}>
            <Cog6ToothIcon size={22} color="#ffffff" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dockContainer: {
    position: 'absolute',
    bottom: 2,
    left: 20,
    right: 100,
    zIndex: 1000,
    alignItems: 'center',
  },
  dock: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
    backdropFilter: 'blur(30px)',
  },
  iconButton: {
    marginHorizontal: 6,
  },
  iconBackground: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
});