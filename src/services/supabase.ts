import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import Config from 'react-native-config';

// react-native-configから環境変数を取得
const SUPABASE_URL = Config.SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = Config.SUPABASE_ANON_KEY || 'placeholder-key';

// Web環境では localStorage を使用、ネイティブでは AsyncStorage を使用
const storage = Platform.OS === 'web' ? {
  getItem: (key: string) => {
    if (typeof window !== 'undefined') {
      return Promise.resolve(window.localStorage.getItem(key));
    }
    return Promise.resolve(null);
  },
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
    return Promise.resolve();
  },
} : AsyncStorage;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// データベース型定義
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      calendars: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          is_shared: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          is_shared?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          is_shared?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      calendar_members: {
        Row: {
          id: string;
          calendar_id: string;
          user_id: string;
          role: string;
          can_invite: boolean;
          joined_at: string;
        };
        Insert: {
          id?: string;
          calendar_id: string;
          user_id: string;
          role?: string;
          can_invite?: boolean;
          joined_at?: string;
        };
        Update: {
          id?: string;
          calendar_id?: string;
          user_id?: string;
          role?: string;
          can_invite?: boolean;
          joined_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          start_date: string;
          end_date: string;
          is_all_day: boolean;
          user_id: string;
          calendar_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          start_date: string;
          end_date: string;
          is_all_day?: boolean;
          user_id: string;
          calendar_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          start_date?: string;
          end_date?: string;
          is_all_day?: boolean;
          user_id?: string;
          calendar_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      invitations: {
        Row: {
          id: string;
          calendar_id: string;
          inviter_id: string;
          invitee_email: string;
          token: string;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          calendar_id: string;
          inviter_id: string;
          invitee_email: string;
          token: string;
          expires_at: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          calendar_id?: string;
          inviter_id?: string;
          invitee_email?: string;
          token?: string;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
      };
    };
  };
}