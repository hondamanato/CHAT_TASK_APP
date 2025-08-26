import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';

interface WheelingTimePickerProps {
  value: Date;
  onChange: (time: Date) => void;
  minuteInterval?: number;
}

const ITEM_HEIGHT = 40;
const PICKER_HEIGHT = 180;

export const WheelingTimePicker: React.FC<WheelingTimePickerProps> = ({
  value,
  onChange,
  minuteInterval = 5,
}) => {
  // 時間と分の選択肢を生成
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 / minuteInterval }, (_, i) => 
    (i * minuteInterval).toString().padStart(2, '0')
  );

  // 現在の値から初期インデックスを取得
  const [selectedHourIndex, setSelectedHourIndex] = useState(value.getHours());
  const [selectedMinuteIndex, setSelectedMinuteIndex] = useState(
    Math.floor(value.getMinutes() / minuteInterval)
  );

  // ScrollView参照
  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  // 時刻変更時の処理
  const updateTime = (hourIndex: number, minuteIndex: number) => {
    const newTime = new Date(value);
    newTime.setHours(hourIndex);
    newTime.setMinutes(minuteIndex * minuteInterval);
    newTime.setSeconds(0);
    newTime.setMilliseconds(0);
    onChange(newTime);
  };

  // スクロール終了時の処理
  const handleHourScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(hours.length - 1, index));
    
    if (clampedIndex !== selectedHourIndex) {
      setSelectedHourIndex(clampedIndex);
      updateTime(clampedIndex, selectedMinuteIndex);
    }
  };

  const handleMinuteScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(minutes.length - 1, index));
    
    if (clampedIndex !== selectedMinuteIndex) {
      setSelectedMinuteIndex(clampedIndex);
      updateTime(selectedHourIndex, clampedIndex);
    }
  };

  // プロップの値が変更された時の同期
  useEffect(() => {
    try {
      if (value && value instanceof Date && !isNaN(value.getTime())) {
        const hourIndex = value.getHours();
        const minuteIndex = Math.floor(value.getMinutes() / minuteInterval);
        
        setSelectedHourIndex(hourIndex);
        setSelectedMinuteIndex(minuteIndex);
        
        // ScrollViewの位置も同期
        hourScrollRef.current?.scrollTo({
          y: hourIndex * ITEM_HEIGHT,
          animated: false
        });
        minuteScrollRef.current?.scrollTo({
          y: minuteIndex * ITEM_HEIGHT,
          animated: false
        });
      }
    } catch (error) {
      console.error('Error synchronizing time picker values:', error);
    }
  }, [value, minuteInterval]);

  // アイテムのレンダリング
  const renderTimeItem = (item: string, index: number, isSelected: boolean) => (
    <TouchableOpacity
      key={index}
      style={[styles.timeItem, isSelected && styles.selectedTimeItem]}
      onPress={() => {
        if (item.startsWith('H')) { // 時間の場合
          setSelectedHourIndex(index);
          updateTime(index, selectedMinuteIndex);
          hourScrollRef.current?.scrollTo({
            y: index * ITEM_HEIGHT,
            animated: true
          });
        } else { // 分の場合
          setSelectedMinuteIndex(index);
          updateTime(selectedHourIndex, index);
          minuteScrollRef.current?.scrollTo({
            y: index * ITEM_HEIGHT,
            animated: true
          });
        }
      }}
    >
      <Text style={[
        styles.timeItemText,
        isSelected && styles.selectedTimeItemText
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.pickerContainer}>
        {/* 時間ピッカー */}
        <View style={styles.wheelContainer}>
          <View style={styles.highlightContainer}>
            <View style={styles.highlight} />
          </View>
          <ScrollView
            ref={hourScrollRef}
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            onMomentumScrollEnd={handleHourScroll}
            contentContainerStyle={styles.scrollContent}
          >
            {/* 上部パディング */}
            <View style={styles.paddingItem} />
            <View style={styles.paddingItem} />
            
            {hours.map((hour, index) => 
              renderTimeItem(hour, index, index === selectedHourIndex)
            )}
            
            {/* 下部パディング */}
            <View style={styles.paddingItem} />
            <View style={styles.paddingItem} />
          </ScrollView>
        </View>

        {/* コロン区切り */}
        <View style={styles.colonSeparator}>
          <Text style={styles.colonText}>:</Text>
        </View>

        {/* 分ピッカー */}
        <View style={styles.wheelContainer}>
          <View style={styles.highlightContainer}>
            <View style={styles.highlight} />
          </View>
          <ScrollView
            ref={minuteScrollRef}
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            onMomentumScrollEnd={handleMinuteScroll}
            contentContainerStyle={styles.scrollContent}
          >
            {/* 上部パディング */}
            <View style={styles.paddingItem} />
            <View style={styles.paddingItem} />
            
            {minutes.map((minute, index) => 
              renderTimeItem(minute, index, index === selectedMinuteIndex)
            )}
            
            {/* 下部パディング */}
            <View style={styles.paddingItem} />
            <View style={styles.paddingItem} />
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginVertical: 8,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: PICKER_HEIGHT,
  },
  wheelContainer: {
    flex: 1,
    height: '100%',
    position: 'relative',
  },
  highlightContainer: {
    position: 'absolute',
    top: (PICKER_HEIGHT - ITEM_HEIGHT) / 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    pointerEvents: 'none',
  },
  highlight: {
    width: '90%',
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  timeItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  selectedTimeItem: {
    // 選択状態のスタイルは highlight で表現
  },
  timeItemText: {
    fontSize: 20,
    color: '#8e8e93',
    fontWeight: '400',
  },
  selectedTimeItemText: {
    color: '#000000',
    fontWeight: 'bold',
  },
  paddingItem: {
    height: ITEM_HEIGHT,
    width: '100%',
  },
  colonSeparator: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 20,
    marginHorizontal: 10,
  },
  colonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
});