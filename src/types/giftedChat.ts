import { IMessage, User } from 'react-native-gifted-chat';
import { EventEntry } from '../services/hybridAIService';

// 旧Message型（互換性のため保持）
export interface OldMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date | undefined;
  imageUri?: string;
  type?: 'text' | 'editable_events' | 'image_analysis';
  events?: EventEntry[];
  onEventsUpdate?: (events: EventEntry[]) => void;
  analysisState?: 'pending' | 'analyzing' | 'completed' | 'error';
  namePromptState?: 'waiting' | 'received';
  pendingImageUri?: string;
}

// GiftedChat用の拡張メッセージ型
export interface CustomMessage extends IMessage {
  // カスタムプロパティ
  type?: 'text' | 'editable_events' | 'image_analysis';
  events?: EventEntry[];
  onEventsUpdate?: (events: EventEntry[]) => void;
  // 画像解析関連
  analysisState?: 'pending' | 'analyzing' | 'completed' | 'error';
  // 名前確認関連
  namePromptState?: 'waiting' | 'received';
  pendingImageUri?: string;
}

// AIユーザーの定義
export const AI_USER: User = {
  _id: 'ai',
  name: 'AI Assistant',
};

// 現在のユーザーを生成
export const createCurrentUser = (
  userId: string,
  name?: string,
  avatar?: string
): User => ({
  _id: userId,
  name: name || 'User',
  avatar,
});

// 旧Message型から新CustomMessage型への変換
export const convertToGiftedMessage = (
  message: OldMessage,
  currentUserId: string,
  userName?: string,
  userAvatar?: string
): CustomMessage => {
  const isAI = !message.isUser;

  return {
    _id: message.id,
    text: message.text,
    createdAt: message.timestamp || new Date(),
    user: isAI
      ? AI_USER
      : createCurrentUser(currentUserId, userName, userAvatar),
    image: message.imageUri,
    type: message.type,
    events: message.events,
    onEventsUpdate: message.onEventsUpdate,
    analysisState: message.analysisState,
    namePromptState: message.namePromptState,
    pendingImageUri: message.pendingImageUri,
  };
};

// 新CustomMessage型から旧Message型への変換（互換性のため）
export const convertFromGiftedMessage = (
  message: CustomMessage
): OldMessage => {
  const isUser = message.user._id !== 'ai';

  return {
    id: message._id.toString(),
    text: message.text,
    isUser,
    timestamp: new Date(message.createdAt),
    imageUri: message.image,
    type: message.type,
    events: message.events,
    onEventsUpdate: message.onEventsUpdate,
    analysisState: message.analysisState,
    namePromptState: message.namePromptState,
    pendingImageUri: message.pendingImageUri,
  };
};
