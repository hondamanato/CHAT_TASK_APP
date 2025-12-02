import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { EventEntry } from '../../services/hybridAIService';

interface EventListViewProps {
  events: EventEntry[];
  showConfirmButtons: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const EventListView: React.FC<EventListViewProps> = ({
  events,
  showConfirmButtons,
  onConfirm,
  onCancel,
}) => {
  const formatDateTime = (event: EventEntry) => {
    return `${event.date} ${event.startTime} - ${event.endTime}`;
  };

  return (
    <View style={styles.container}>
      {events.map((event, index) => (
        <View key={index} style={styles.eventItem}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.datetime}>{formatDateTime(event)}</Text>
          {event.location && <Text style={styles.location}>{event.location}</Text>}
        </View>
      ))}

      {showConfirmButtons && (
        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={onConfirm} style={[styles.button, styles.confirmButton]}>
            <Text style={styles.confirmText}>追加</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel} style={[styles.button, styles.cancelButton]}>
            <Text style={styles.cancelText}>キャンセル</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  eventItem: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginVertical: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  datetime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  location: {
    fontSize: 14,
    color: '#666',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#ddd',
  },
  cancelText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});
