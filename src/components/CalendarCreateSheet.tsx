import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  ScrollView,
  PanResponder,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  HomeIcon,
  HeartIcon,
  UsersIcon,
  BriefcaseIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  AcademicCapIcon,
  BeakerIcon,
  SparklesIcon,
  ChevronRightIcon,
  XMarkIcon,
  CheckIcon,
  ArrowLeftIcon,
} from 'react-native-heroicons/outline';

interface CalendarType {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
}

const calendarTypes: CalendarType[] = [
  { id: 'family', name: '家族', icon: <HomeIcon size={24} color="#FF6B6B" />, color: '#FF6B6B' },
  { id: 'private', name: 'プライベート', icon: <UserGroupIcon size={24} color="#4ECDC4" />, color: '#4ECDC4' },
  { id: 'couple', name: 'カップル', icon: <HeartIcon size={24} color="#FF69B4" />, color: '#FF69B4' },
  { id: 'work', name: '仕事', icon: <BriefcaseIcon size={24} color="#5E8BFF" />, color: '#5E8BFF' },
  { id: 'parttime', name: 'バイト', icon: <CurrencyDollarIcon size={24} color="#FFA500" />, color: '#FFA500' },
  { id: 'friends', name: '友達', icon: <UsersIcon size={24} color="#9B59B6" />, color: '#9B59B6' },
  { id: 'lessons', name: '習い事', icon: <AcademicCapIcon size={24} color="#3498DB" />, color: '#3498DB' },
  { id: 'club', name: '部活', icon: <BeakerIcon size={24} color="#2ECC71" />, color: '#2ECC71' },
  { id: 'hobby', name: '趣味', icon: <SparklesIcon size={24} color="#F39C12" />, color: '#F39C12' },
];

interface CalendarCreateSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectType: (type: CalendarType) => void;
}

const { height: screenHeight } = Dimensions.get('window');
const SHEET_HEIGHT = screenHeight * 0.9; // 画面の90%
const CLOSE_THRESHOLD = 100;


export const CalendarCreateSheet: React.FC<CalendarCreateSheetProps> = ({
  isVisible,
  onClose,
  onSelectType,
}) => {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const [showEditPage, setShowEditPage] = useState(false);
  const [selectedType, setSelectedType] = useState<CalendarType | null>(null);
  const [calendarName, setCalendarName] = useState('');

  useEffect(() => {
    if (isVisible) {
      // 初期位置を画面下に設定
      translateY.setValue(SHEET_HEIGHT);
      // すぐに上にスライドアップ
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // 下にスライドダウン
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dy) > 5;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dy > 0) {
        translateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dy > CLOSE_THRESHOLD || gestureState.vy > 0.5) {
        // アニメーション完了後に閉じる
        Animated.timing(translateY, {
          toValue: SHEET_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          onClose();
        });
      } else {
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* オーバーレイ */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        {/* ボトムシート */}
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* ハンドル */}
          <View style={styles.handle} />

          {!showEditPage ? (
            <>
              {/* ヘッダー */}
              <View style={styles.header}>
                <Text style={styles.title}>カレンダーを作成</Text>
                <Text style={styles.subtitle}>カテゴリを選択してください</Text>
              </View>

              {/* カレンダータイプリスト */}
              <ScrollView 
                style={styles.content} 
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
              >
                {calendarTypes.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={styles.typeItem}
                    onPress={() => {
                      setSelectedType(type);
                      setCalendarName(type.name);
                      setShowEditPage(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.typeItemContent}>
                      <View style={styles.iconContainer}>
                        {type.icon}
                      </View>
                      <Text style={styles.typeName}>{type.name}</Text>
                      <ChevronRightIcon size={20} color="#C7C7CC" />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : (
            <>
              {/* 編集ページヘッダー */}
              <View style={styles.editHeader}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setShowEditPage(false)}
                >
                  <ArrowLeftIcon size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.editTitle}>カレンダー名を編集</Text>
                <View style={styles.backButton} />
              </View>

              {/* 編集ページコンテンツ */}
              <KeyboardAvoidingView 
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              >
                <ScrollView 
                  style={styles.editContent}
                  contentContainerStyle={styles.editContentContainer}
                  showsVerticalScrollIndicator={false}
                >
                  {selectedType && (
                    <View style={styles.selectedTypeContainer}>
                      <View style={[styles.selectedIconContainer, { backgroundColor: selectedType.color + '20' }]}>
                        {selectedType.icon}
                      </View>
                      <Text style={styles.selectedTypeName}>{calendarName}</Text>
                    </View>
                  )}

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>カレンダー名</Text>
                    <TextInput
                      style={styles.textInput}
                      value={calendarName}
                      onChangeText={setCalendarName}
                      placeholder="カレンダー名を入力"
                      placeholderTextColor="#999"
                      autoFocus
                      selectTextOnFocus
                    />
                  </View>

                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => setShowEditPage(false)}
                    >
                      <Text style={styles.cancelButtonText}>キャンセル</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.createButton}
                      onPress={() => {
                        if (calendarName.trim()) {
                          onSelectType({
                            ...selectedType,
                            name: calendarName.trim()
                          });
                          setShowEditPage(false);
                        }
                      }}
                    >
                      <CheckIcon size={18} color="#fff" />
                      <Text style={styles.createButtonText}>作成</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            </>
          )}
        </Animated.View>
      </View>

    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: SHEET_HEIGHT,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#C7C7CC',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
  contentContainer: {
    paddingBottom: 40, // 下部に余白を追加
  },
  typeItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  typeItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  typeName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  editContent: {
    flex: 1,
  },
  editContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  selectedTypeContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  selectedIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedTypeName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  inputContainer: {
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 25,
    backgroundColor: '#F2F2F7',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  createButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 25,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});