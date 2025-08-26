import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
  StatusBar,
  Platform,
} from 'react-native';
import {
  CalendarIcon,
  BellIcon,
  UserGroupIcon,
  CpuChipIcon,
  QuestionMarkCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from 'react-native-heroicons/outline';

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isVisible, onClose }) => {
  const slideAnimation = useRef(new Animated.Value(-300)).current;
  const overlayAnimation = useRef(new Animated.Value(0)).current;
  const { width } = Dimensions.get('window');
  
  const SIDEBAR_WIDTH = 280;

  useEffect(() => {
    if (isVisible) {
      // サイドバーを開く
      Animated.parallel([
        Animated.timing(slideAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // サイドバーを閉じる
      Animated.parallel([
        Animated.timing(slideAnimation, {
          toValue: -SIDEBAR_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnimation, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  // スワイプジェスチャーの設定
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dx < 0) {
        // 左方向のスワイプのみ処理
        const newValue = Math.max(-SIDEBAR_WIDTH, gestureState.dx);
        slideAnimation.setValue(newValue);
        overlayAnimation.setValue(1 + (gestureState.dx / SIDEBAR_WIDTH));
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dx < -50) {
        // 50px以上左にスワイプしたら閉じる
        onClose();
      } else {
        // 元の位置に戻す
        Animated.parallel([
          Animated.timing(slideAnimation, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(overlayAnimation, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    },
  });


  return (
    <View style={styles.container} pointerEvents={isVisible ? 'auto' : 'none'}>
      {/* オーバーレイ */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
        pointerEvents={isVisible ? 'auto' : 'none'}
      >
        <Animated.View
          style={[
            styles.overlayBackground,
            {
              opacity: overlayAnimation,
            },
          ]}
        />
      </TouchableOpacity>

      {/* サイドバー */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            width: SIDEBAR_WIDTH,
            transform: [{ translateX: slideAnimation }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>メニュー</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <XMarkIcon size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* メニューアイテム */}
        <View style={styles.content}>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemContent}>
              <CalendarIcon size={20} color="#333" />
              <Text style={styles.menuItemText}>カレンダー設定</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemContent}>
              <BellIcon size={20} color="#333" />
              <Text style={styles.menuItemText}>通知設定</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemContent}>
              <UserGroupIcon size={20} color="#333" />
              <Text style={styles.menuItemText}>共有設定</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemContent}>
              <CpuChipIcon size={20} color="#333" />
              <Text style={styles.menuItemText}>AI設定</Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.separator} />
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemContent}>
              <QuestionMarkCircleIcon size={20} color="#333" />
              <Text style={styles.menuItemText}>ヘルプ</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemContent}>
              <InformationCircleIcon size={20} color="#333" />
              <Text style={styles.menuItemText}>アプリについて</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* フッター */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#ffffff',
    ...(Platform.OS === 'web' 
      ? { boxShadow: '2px 0 8px rgba(0, 0, 0, 0.25)' }
      : {
          shadowColor: '#000',
          shadowOffset: {
            width: 2,
            height: 0,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }
    ),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: StatusBar.currentHeight || 44,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: '#f5f5f5',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 10,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#999',
  },
});