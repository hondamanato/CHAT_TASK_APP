import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {
  MagnifyingGlassIcon,
  CheckIcon,
  ClockIcon,
} from 'react-native-heroicons/outline';
import timezoneData from '../data/timezones.json';

interface Timezone {
  id: string;
  city: string;
  country: string;
  region: string;
  offset: string;
  utcOffset: number;
}

interface TimezoneSelectionScreenProps {
  onBack?: () => void;
  selectedTimezone?: string;
  onTimezoneSelect?: (timezoneId: string) => void;
}

export const TimezoneSelectionScreen: React.FC<TimezoneSelectionScreenProps> = ({
  onBack,
  selectedTimezone = 'Asia/Tokyo',
  onTimezoneSelect,
}) => {
  const [searchText, setSearchText] = useState('');
  const [currentTimes, setCurrentTimes] = useState<Record<string, string>>({});

  // 現在時刻を更新する関数
  const updateCurrentTimes = () => {
    const times: Record<string, string> = {};
    const now = new Date();
    
    timezoneData.timezones.forEach((timezone) => {
      try {
        const formatter = new Intl.DateTimeFormat('ja-JP', {
          timeZone: timezone.id,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        times[timezone.id] = formatter.format(now);
      } catch {
        // フォールバック: UTCオフセットを使用して計算
        const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
        const timezoneTime = new Date(utcTime + (timezone.utcOffset * 3600000));
        times[timezone.id] = timezoneTime.toTimeString().slice(0, 5);
      }
    });
    
    setCurrentTimes(times);
  };

  // 初回読み込みと定期更新
  useEffect(() => {
    updateCurrentTimes();
    const interval = setInterval(updateCurrentTimes, 60000); // 1分ごとに更新
    
    return () => clearInterval(interval);
  }, []);

  // 検索とフィルタリング
  const filteredTimezones = useMemo(() => {
    const timezones = timezoneData.timezones as Timezone[];
    
    if (!searchText.trim()) {
      return timezones;
    }
    
    const searchLower = searchText.toLowerCase();
    return timezones.filter(timezone => 
      timezone.city.toLowerCase().includes(searchLower) ||
      timezone.country.toLowerCase().includes(searchLower) ||
      timezone.region.toLowerCase().includes(searchLower)
    );
  }, [searchText]);

  // 地域別にグループ化
  const groupedTimezones = useMemo(() => {
    const groups: Record<string, Timezone[]> = {};
    
    filteredTimezones.forEach(timezone => {
      if (!groups[timezone.region]) {
        groups[timezone.region] = [];
      }
      groups[timezone.region].push(timezone);
    });
    
    // 地域をソート（アジアを最初に）
    const regionOrder = ['アジア', 'ヨーロッパ', '北アメリカ', '南アメリカ', 'オセアニア', 'アフリカ', '太平洋', 'UTC'];
    const sortedRegions = Object.keys(groups).sort((a, b) => {
      const indexA = regionOrder.indexOf(a);
      const indexB = regionOrder.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    
    return sortedRegions.map(region => ({
      region,
      timezones: groups[region].sort((a, b) => a.city.localeCompare(b.city)),
    }));
  }, [filteredTimezones]);

  const handleTimezoneSelect = (timezoneId: string) => {
    if (onTimezoneSelect) {
      onTimezoneSelect(timezoneId);
    }
    if (onBack) {
      onBack();
    }
  };

  const renderTimezoneItem = ({ item }: { item: Timezone }) => {
    const isSelected = item.id === selectedTimezone;
    const currentTime = currentTimes[item.id] || '--:--';
    
    return (
      <TouchableOpacity
        style={[styles.timezoneItem, isSelected && styles.selectedItem]}
        onPress={() => handleTimezoneSelect(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.timezoneInfo}>
          <Text style={[styles.cityText, isSelected && styles.selectedText]}>
            {item.city}
          </Text>
          <Text style={[styles.countryText, isSelected && styles.selectedSubText]}>
            {item.country}
          </Text>
        </View>
        
        <View style={styles.timezoneDetails}>
          <View style={styles.timeContainer}>
            <ClockIcon 
              size={16} 
              color={isSelected ? '#007AFF' : '#8e8e93'} 
            />
            <Text style={[styles.timeText, isSelected && styles.selectedSubText]}>
              {currentTime}
            </Text>
          </View>
          <Text style={[styles.offsetText, isSelected && styles.selectedSubText]}>
            UTC{item.offset}
          </Text>
        </View>
        
        {isSelected && (
          <CheckIcon size={20} color="#007AFF" />
        )}
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ region }: { region: string }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{region}</Text>
    </View>
  );

  const renderFlatListData = () => {
    const data: { type: 'header' | 'item'; region?: string; item?: Timezone }[] = [];
    
    groupedTimezones.forEach(group => {
      data.push({ type: 'header', region: group.region });
      group.timezones.forEach(timezone => {
        data.push({ type: 'item', item: timezone });
      });
    });
    
    return data;
  };

  const renderItem = ({ item }: { item: { type: 'header' | 'item'; region?: string; item?: Timezone } }) => {
    if (item.type === 'header') {
      return renderSectionHeader({ region: item.region! });
    }
    return renderTimezoneItem({ item: item.item! });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* 検索バー */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MagnifyingGlassIcon size={20} color="#8e8e93" />
          <TextInput
            style={styles.searchInput}
            placeholder="タイムゾーンを検索"
            placeholderTextColor="#8e8e93"
            value={searchText}
            onChangeText={setSearchText}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* タイムゾーンリスト */}
      <FlatList
        data={renderFlatListData()}
        renderItem={renderItem}
        keyExtractor={(item, index) => {
          if (item.type === 'header') {
            return `header-${item.region}`;
          }
          return `item-${item.item!.id}`;
        }}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        getItemLayout={(data, index) => ({
          length: data?.[index]?.type === 'header' ? 40 : 60,
          offset: data?.slice(0, index).reduce((acc, curr) => {
            return acc + (curr.type === 'header' ? 40 : 60);
          }, 0) || 0,
          index,
        })}
        removeClippedSubviews={true}
        maxToRenderPerBatch={20}
        windowSize={10}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e7',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#000000',
  },
  list: {
    flex: 1,
  },
  sectionHeader: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e7',
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8e8e93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timezoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 60,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e7',
    backgroundColor: '#ffffff',
  },
  selectedItem: {
    backgroundColor: '#f0f8ff',
  },
  timezoneInfo: {
    flex: 1,
  },
  cityText: {
    fontSize: 17,
    fontWeight: '400',
    color: '#000000',
    marginBottom: 2,
  },
  countryText: {
    fontSize: 14,
    color: '#8e8e93',
  },
  timezoneDetails: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginLeft: 4,
  },
  offsetText: {
    fontSize: 12,
    color: '#8e8e93',
  },
  selectedText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  selectedSubText: {
    color: '#007AFF',
  },
});