import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';

interface BottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  selectedDate?: string;
}

const { height: screenHeight } = Dimensions.get('window');
const SHEET_HEIGHT = screenHeight * 0.9; // 画面の90%
const CLOSE_THRESHOLD = 150; // 閉じるためのしきい値（px）
const CLOSE_VELOCITY = 0.5; // 閉じるための速度しきい値（px/s）

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isVisible,
  onClose,
  selectedDate,
}) => {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (isVisible) {
      // 表示アニメーション
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      // 非表示アニメーション
      Animated.spring(translateY, {
        toValue: SHEET_HEIGHT,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [isVisible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 縦方向のスワイプを検知（しきい値を緩和）
        return Math.abs(gestureState.dy) > 5;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        // タッチ開始時の処理
        translateY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // 下方向のスワイプのみ許可（より自然な操作感）
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dy, vy } = gestureState;
        
        // オフセットをクリア
        translateY.flattenOffset();
        
        // 速度または距離による閉じる判定
        if (dy > CLOSE_THRESHOLD || vy > CLOSE_VELOCITY) {
          // 閉じる
          Animated.spring(translateY, {
            toValue: SHEET_HEIGHT,
            useNativeDriver: true,
            velocity: vy,
            tension: 100,
            friction: 8,
          }).start(() => {
            onClose();
          });
        } else {
          // 元の位置に戻る
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            velocity: vy,
            tension: 100,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const getDayOfWeek = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `（${days[date.getDay()]}）`;
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.bottomSheet,
                {
                  height: SHEET_HEIGHT,
                  transform: [{ translateY }],
                },
              ]}
              {...panResponder.panHandlers}
            >
              {/* ハンドル */}
              <View style={styles.handle} />
              
              {/* ヘッダー */}
              <View style={styles.header}>
                <Text style={styles.dateText}>
                  {formatDate(selectedDate)}
                  {getDayOfWeek(selectedDate)}
                </Text>
              </View>

              {/* コンテンツ */}
              <View style={styles.content}>
                <TouchableOpacity style={styles.addButton}>
                  <Text style={styles.addButtonText}>+ 予定を追加</Text>
                </TouchableOpacity>

                <View style={styles.eventsList}>
                  <Text style={styles.noEventsText}>予定はありません</Text>
                </View>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 34, // Safe Area対応
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 16,
    marginBottom: 20,
  },
  dateText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  eventsList: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noEventsText: {
    fontSize: 16,
    color: '#9ca3af',
  },
});