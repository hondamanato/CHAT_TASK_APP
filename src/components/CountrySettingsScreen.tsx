import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {
  CheckIcon,
  MagnifyingGlassIcon,
} from 'react-native-heroicons/outline';
import { HolidayService, Country } from '../services/holidayService';
import { useTheme } from '@/hooks/useThemeColor';

// 国名の日本語マッピング
const COUNTRY_NAMES_JA: { [key: string]: string } = {
  'JP': '日本',
  'US': 'アメリカ合衆国',
  'GB': 'イギリス',
  'FR': 'フランス',
  'DE': 'ドイツ',
  'IT': 'イタリア',
  'ES': 'スペイン',
  'CA': 'カナダ',
  'AU': 'オーストラリア',
  'KR': '韓国',
  'CN': '中国',
  'BR': 'ブラジル',
  'IN': 'インド',
  'RU': 'ロシア',
  'MX': 'メキシコ',
  'NL': 'オランダ',
  'SE': 'スウェーデン',
  'NO': 'ノルウェー',
  'DK': 'デンマーク',
  'FI': 'フィンランド',
  'CH': 'スイス',
  'AT': 'オーストリア',
  'BE': 'ベルギー',
  'IE': 'アイルランド',
  'NZ': 'ニュージーランド',
  'SG': 'シンガポール',
  'HK': '香港',
  'TW': '台湾',
  'TH': 'タイ',
  'MY': 'マレーシア',
  'ID': 'インドネシア',
  'PH': 'フィリピン',
  'VN': 'ベトナム',
  'AR': 'アルゼンチン',
  'CL': 'チリ',
  'PE': 'ペルー',
  'CO': 'コロンビア',
  'VE': 'ベネズエラ',
  'EC': 'エクアドル',
  'UY': 'ウルグアイ',
  'PY': 'パラグアイ',
  'BO': 'ボリビア',
  'GY': 'ガイアナ',
  'SR': 'スリナム',
  'GF': 'フランス領ギアナ',
  'FK': 'フォークランド諸島',
  'GS': 'サウスジョージア・サウスサンドウィッチ諸島',
  'BV': 'ブーベ島',
  'AQ': '南極大陸',
  'TF': 'フランス領南方・南極地域',
  'HM': 'ハード島・マクドナルド諸島',
  'IO': 'イギリス領インド洋地域',
  'CX': 'クリスマス島',
  'CC': 'ココス諸島',
  'NF': 'ノーフォーク島',
  'PN': 'ピトケアン諸島',
  'TK': 'トケラウ',
  'NU': 'ニウエ',
  'CK': 'クック諸島',
  'WS': 'サモア',
  'FJ': 'フィジー',
  'TO': 'トンガ',
  'VU': 'バヌアツ',
  'NC': 'ニューカレドニア',
  'PF': 'フランス領ポリネシア',
  'WF': 'ウォリス・フツナ',
  'AS': 'アメリカ領サモア',
  'GU': 'グアム',
  'MP': '北マリアナ諸島',
  'PW': 'パラオ',
  'FM': 'ミクロネシア連邦',
  'MH': 'マーシャル諸島',
  'KI': 'キリバス',
  'TV': 'ツバル',
  'NR': 'ナウル',
  'PG': 'パプアニューギニア',
  'SB': 'ソロモン諸島',
  'TL': '東ティモール',
  'BN': 'ブルネイ',
  'MM': 'ミャンマー',
  'LA': 'ラオス',
  'KH': 'カンボジア',
  'BD': 'バングラデシュ',
  'LK': 'スリランカ',
  'NP': 'ネパール',
  'BT': 'ブータン',
  'MV': 'モルディブ',
  'PK': 'パキスタン',
  'AF': 'アフガニスタン',
  'IR': 'イラン',
  'IQ': 'イラク',
  'SA': 'サウジアラビア',
  'AE': 'アラブ首長国連邦',
  'QA': 'カタール',
  'KW': 'クウェート',
  'BH': 'バーレーン',
  'OM': 'オマーン',
  'YE': 'イエメン',
  'JO': 'ヨルダン',
  'LB': 'レバノン',
  'SY': 'シリア',
  'IL': 'イスラエル',
  'PS': 'パレスチナ',
  'CY': 'キプロス',
  'TR': 'トルコ',
  'GE': 'ジョージア',
  'AM': 'アルメニア',
  'AZ': 'アゼルバイジャン',
  'BY': 'ベラルーシ',
  'UA': 'ウクライナ',
  'MD': 'モルドバ',
  'RO': 'ルーマニア',
  'BG': 'ブルガリア',
  'GR': 'ギリシャ',
  'AL': 'アルバニア',
  'MK': '北マケドニア',
  'ME': 'モンテネグロ',
  'RS': 'セルビア',
  'BA': 'ボスニア・ヘルツェゴビナ',
  'HR': 'クロアチア',
  'SI': 'スロベニア',
  'HU': 'ハンガリー',
  'SK': 'スロバキア',
  'CZ': 'チェコ',
  'PL': 'ポーランド',
  'LT': 'リトアニア',
  'LV': 'ラトビア',
  'EE': 'エストニア',
  'IS': 'アイスランド',
  'PT': 'ポルトガル',
  'LU': 'ルクセンブルク',
  'MT': 'マルタ',
  'MC': 'モナコ',
  'LI': 'リヒテンシュタイン',
  'SM': 'サンマリノ',
  'VA': 'バチカン',
  'AD': 'アンドラ',
  'GI': 'ジブラルタル',
  'JE': 'ジャージー',
  'GG': 'ガーンジー',
  'IM': 'マン島',
  'FO': 'フェロー諸島',
  'GL': 'グリーンランド',
  'SJ': 'スバールバル・ヤンマイエン',
  'AX': 'オーランド諸島',
  'BL': 'サン・バルテルミー',
  'MF': 'サン・マルタン',
  'GP': 'グアドループ',
  'MQ': 'マルティニーク',
  'RE': 'レユニオン',
  'YT': 'マヨット',
  'PM': 'サン・ピエール・ミクロン',
  'TC': 'タークス・カイコス諸島',
  'VG': 'イギリス領ヴァージン諸島',
  'VI': 'アメリカ領ヴァージン諸島',
  'AI': 'アンギラ',
  'AW': 'アルバ',
  'CW': 'キュラソー',
  'SX': 'シント・マールテン',
  'BQ': 'ボネール・シント・ユースタティウス・サバ',
  'BB': 'バルバドス',
  'GD': 'グレナダ',
  'LC': 'セントルシア',
  'VC': 'セントビンセント・グレナディーン',
  'AG': 'アンティグア・バーブーダ',
  'KN': 'セントクリストファー・ネイビス',
  'DM': 'ドミニカ',
  'TT': 'トリニダード・トバゴ',
  'JM': 'ジャマイカ',
  'BS': 'バハマ',
  'CU': 'キューバ',
  'HT': 'ハイチ',
  'DO': 'ドミニカ共和国',
  'PR': 'プエルトリコ',
  'PA': 'パナマ',
  'CR': 'コスタリカ',
  'NI': 'ニカラグア',
  'HN': 'ホンジュラス',
  'SV': 'エルサルバドル',
  'GT': 'グアテマラ',
  'BZ': 'ベリーズ',
};

interface CountrySettingsScreenProps {
  selectedCountry?: string;
  onCountrySelect?: (countryCode: string) => void;
  onBack?: () => void;
}

export const CountrySettingsScreen: React.FC<CountrySettingsScreenProps> = ({
  selectedCountry = 'JP',
  onCountrySelect,
}) => {
  const { colors } = useTheme();
  const [countries, setCountries] = useState<Country[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    try {
      setLoading(true);
      const holidayService = new HolidayService();
      const countriesData = await holidayService.getCountries();
      
      // 主要国を上位に配置
      const priorityCountries = ['JP', 'US', 'GB', 'DE', 'FR', 'CA', 'AU', 'KR', 'CN'];
      const sortedCountries = countriesData.sort((a, b) => {
        const aPriority = priorityCountries.indexOf(a.countryCode);
        const bPriority = priorityCountries.indexOf(b.countryCode);
        
        if (aPriority !== -1 && bPriority !== -1) {
          return aPriority - bPriority;
        }
        if (aPriority !== -1) return -1;
        if (bPriority !== -1) return 1;
        
        return a.name.localeCompare(b.name);
      });
      
      setCountries(sortedCountries);
      setFilteredCountries(sortedCountries);
    } catch (err) {
      setError('国の読み込みに失敗しました');
      console.error('国の読み込みエラー:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCountrySelect = (countryCode: string) => {
    onCountrySelect?.(countryCode);
  };

  const getCountryNameInJapanese = (countryCode: string): string => {
    return COUNTRY_NAMES_JA[countryCode] || countryCode;
  };

  const getCountryFlag = (countryCode: string): string => {
    // 国コードから国旗の絵文字を生成
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  const filterCountries = (query: string) => {
    if (!query.trim()) {
      setFilteredCountries(countries);
      return;
    }

    const filtered = countries.filter(country => {
      const japaneseName = getCountryNameInJapanese(country.countryCode);
      const englishName = country.name.toLowerCase();
      const searchTerm = query.toLowerCase();
      
      return japaneseName.includes(searchTerm) || 
             englishName.includes(searchTerm) ||
             country.countryCode.toLowerCase().includes(searchTerm);
    });
    
    setFilteredCountries(filtered);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    filterCountries(text);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={[styles.loadingText, { color: colors.secondaryText }]}>国データを読み込み中...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadCountries}>
          <Text style={styles.retryButtonText}>再試行</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 検索入力欄 */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.secondaryBackground }]}>
          <MagnifyingGlassIcon size={20} color={colors.secondaryText} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.primaryText }]}
            placeholder="国名で検索..."
            placeholderTextColor={colors.secondaryText}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      {/* 国リスト */}
      <ScrollView
        style={styles.countryList}
        showsVerticalScrollIndicator={false}
      >
        {filteredCountries.map((country) => (
          <TouchableOpacity
            key={country.countryCode}
            style={[styles.countryItem, { borderBottomColor: colors.border }]}
            onPress={() => handleCountrySelect(country.countryCode)}
          >
            <View style={styles.countryItemLeft}>
              <Text style={styles.countryFlag}>{getCountryFlag(country.countryCode)}</Text>
              <Text style={[styles.countryName, { color: colors.primaryText }]}>{getCountryNameInJapanese(country.countryCode)}</Text>
            </View>
            {selectedCountry === country.countryCode && (
              <CheckIcon size={20} color="#007AFF" />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  countryList: {
    flex: 1,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e7',
  },
  countryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryName: {
    fontSize: 17,
    color: '#000000',
  },
});
