/**
 * ReservationCard
 * 予約情報を表示するカードコンポーネント
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  PaperAirplaneIcon,
  BuildingOffice2Icon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  TicketIcon,
  TruckIcon,
} from 'react-native-heroicons/outline';
import { GmailReservation, ReservationType } from '../types/gmail';
import { useTheme } from '@/hooks/useThemeColor';

interface ReservationCardProps {
  reservation: GmailReservation;
  onAddToCalendar: (reservation: GmailReservation) => void;
  isAdding?: boolean;
}

/**
 * 予約タイプに応じたアイコンを取得
 */
const getTypeIcon = (type: ReservationType, color: string, size: number = 24) => {
  switch (type) {
    case 'flight':
      return <PaperAirplaneIcon size={size} color={color} />;
    case 'hotel':
      return <BuildingOffice2Icon size={size} color={color} />;
    case 'restaurant':
      return <MapPinIcon size={size} color={color} />;
    case 'car_rental':
      return <TruckIcon size={size} color={color} />;
    case 'event':
      return <TicketIcon size={size} color={color} />;
    default:
      return <CalendarIcon size={size} color={color} />;
  }
};

/**
 * 予約タイプの日本語ラベル
 */
const getTypeLabel = (type: ReservationType): string => {
  const labels: Record<ReservationType, string> = {
    flight: 'フライト',
    hotel: 'ホテル',
    restaurant: 'レストラン',
    car_rental: 'レンタカー',
    event: 'イベント',
    other: 'その他',
  };
  return labels[type] || 'その他';
};

/**
 * 日付を表示用にフォーマット
 */
const formatDate = (date: Date): string => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const weekday = weekdays[date.getDay()];
  return `${month}月${day}日(${weekday})`;
};

/**
 * 時刻を表示用にフォーマット
 */
const formatTime = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * ReservationCard コンポーネント
 */
export const ReservationCard: React.FC<ReservationCardProps> = ({
  reservation,
  onAddToCalendar,
  isAdding = false,
}) => {
  const { colors } = useTheme();

  const typeColor = getTypeColor(reservation.type);
  const isMultiDay = reservation.endDate &&
    formatDate(reservation.startDate) !== formatDate(reservation.endDate);

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: typeColor + '20' }]}>
          {getTypeIcon(reservation.type, typeColor)}
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.typeLabel, { color: typeColor }]}>
            {getTypeLabel(reservation.type)}
          </Text>
          <Text style={[styles.title, { color: colors.primaryText }]} numberOfLines={2}>
            {reservation.title}
          </Text>
        </View>
      </View>

      {/* 詳細情報 */}
      <View style={styles.details}>
        {/* 日時 */}
        <View style={styles.detailRow}>
          <CalendarIcon size={16} color={colors.secondaryText} />
          <Text style={[styles.detailText, { color: colors.primaryText }]}>
            {formatDate(reservation.startDate)}
            {isMultiDay && reservation.endDate && ` ~ ${formatDate(reservation.endDate)}`}
          </Text>
        </View>

        {/* 時刻（終日でない場合） */}
        {reservation.type !== 'hotel' && (
          <View style={styles.detailRow}>
            <ClockIcon size={16} color={colors.secondaryText} />
            <Text style={[styles.detailText, { color: colors.primaryText }]}>
              {formatTime(reservation.startDate)}
              {reservation.endDate && ` ~ ${formatTime(reservation.endDate)}`}
            </Text>
          </View>
        )}

        {/* 場所 */}
        {reservation.location && (
          <View style={styles.detailRow}>
            <MapPinIcon size={16} color={colors.secondaryText} />
            <Text
              style={[styles.detailText, { color: colors.primaryText }]}
              numberOfLines={1}
            >
              {reservation.location}
            </Text>
          </View>
        )}

        {/* 予約番号 */}
        {reservation.confirmationNumber && (
          <View style={styles.confirmationContainer}>
            <Text style={[styles.confirmationLabel, { color: colors.secondaryText }]}>
              予約番号:
            </Text>
            <Text style={[styles.confirmationNumber, { color: colors.primaryText }]}>
              {reservation.confirmationNumber}
            </Text>
          </View>
        )}

        {/* フライト情報 */}
        {reservation.type === 'flight' && reservation.departureAirport && reservation.arrivalAirport && (
          <View style={styles.flightRoute}>
            <Text style={[styles.airport, { color: colors.primaryText }]}>
              {reservation.departureAirport}
            </Text>
            <View style={styles.routeArrow}>
              <Text style={{ color: colors.secondaryText }}>→</Text>
            </View>
            <Text style={[styles.airport, { color: colors.primaryText }]}>
              {reservation.arrivalAirport}
            </Text>
          </View>
        )}
      </View>

      {/* カレンダーに追加ボタン */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: typeColor }]}
        onPress={() => onAddToCalendar(reservation)}
        disabled={isAdding}
      >
        {isAdding ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.addButtonText}>カレンダーに追加</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

/**
 * 予約タイプに応じた色を取得
 */
function getTypeColor(type: ReservationType): string {
  const colorMap: Record<ReservationType, string> = {
    flight: '#0ea5e9',
    hotel: '#8b5cf6',
    restaurant: '#f97316',
    car_rental: '#10b981',
    event: '#ec4899',
    other: '#6b7280',
  };
  return colorMap[type] || colorMap.other;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  details: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  confirmationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  confirmationLabel: {
    fontSize: 12,
  },
  confirmationNumber: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  flightRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  airport: {
    fontSize: 18,
    fontWeight: '700',
  },
  routeArrow: {
    marginHorizontal: 12,
  },
  addButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
