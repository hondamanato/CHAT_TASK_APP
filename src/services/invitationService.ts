import { supabase } from '../lib/supabase';
import * as Linking from 'expo-linking';
import * as Crypto from 'expo-crypto';

interface Invitation {
  id: string;
  calendar_id: string;
  inviter_id: string;
  invitee_email: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

interface CalendarMember {
  id: string;
  calendar_id: string;
  user_id: string;
  role: string;
  can_invite: boolean;
  joined_at: string;
}

class InvitationService {
  private baseUrl: string = 'aicalendarapp://';

  async createInvitation(calendarId: string, inviteeEmail: string): Promise<Invitation> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ユーザーがログインしていません');

      const token = await this.generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data, error } = await supabase
        .from('invitations')
        .insert({
          calendar_id: calendarId,
          inviter_id: user.id,
          invitee_email: inviteeEmail,
          token,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('招待作成エラー:', error);
      throw error;
    }
  }

  async generateToken(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return btoa(String.fromCharCode(...new Uint8Array(randomBytes)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  getInviteLink(token: string): string {
    return `${this.baseUrl}invite?token=${token}`;
  }

  getInviteDeepLink(token: string): string {
    return Linking.createURL('invite', {
      queryParams: { token }
    });
  }

  async validateInvitation(token: string): Promise<Invitation | null> {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error) {
        console.error('招待検証エラー:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('招待検証エラー:', error);
      return null;
    }
  }

  async acceptInvitation(token: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ユーザーがログインしていません');

      const invitation = await this.validateInvitation(token);
      if (!invitation) {
        throw new Error('無効な招待リンクです');
      }

      const { error: updateError } = await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('token', token);

      if (updateError) throw updateError;

      const { error: memberError } = await supabase
        .from('calendar_members')
        .insert({
          calendar_id: invitation.calendar_id,
          user_id: user.id,
          role: 'member',
          can_invite: true,
        });

      if (memberError) {
        if (memberError.code === '23505') {
          console.log('既にメンバーです');
          return true;
        }
        throw memberError;
      }

      return true;
    } catch (error) {
      console.error('招待受諾エラー:', error);
      throw error;
    }
  }

  async getCalendarMembers(calendarId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('calendar_members')
        .select(`
          *,
          profiles:user_id (
            id,
            email,
            name
          )
        `)
        .eq('calendar_id', calendarId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('メンバー取得エラー:', error);
      return [];
    }
  }

  async removeMember(calendarId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('calendar_members')
        .delete()
        .eq('calendar_id', calendarId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('メンバー削除エラー:', error);
      return false;
    }
  }

  async updateMemberRole(
    calendarId: string,
    userId: string,
    canInvite: boolean
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('calendar_members')
        .update({ can_invite: canInvite })
        .eq('calendar_id', calendarId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('権限更新エラー:', error);
      return false;
    }
  }

  async getPendingInvitations(calendarId: string): Promise<Invitation[]> {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('calendar_id', calendarId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('招待一覧取得エラー:', error);
      return [];
    }
  }

  async cancelInvitation(invitationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('招待キャンセルエラー:', error);
      return false;
    }
  }

  formatInviteMessage(calendarName: string, inviteLink: string): string {
    return `カレンダー「${calendarName}」へ招待されました！\n\n以下のリンクから参加できます：\n${inviteLink}\n\n※このリンクは7日間有効です`;
  }

  async checkUserCanInvite(calendarId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: calendar } = await supabase
        .from('calendars')
        .select('owner_id')
        .eq('id', calendarId)
        .single();

      if (calendar?.owner_id === user.id) return true;

      const { data: member } = await supabase
        .from('calendar_members')
        .select('can_invite')
        .eq('calendar_id', calendarId)
        .eq('user_id', user.id)
        .single();

      return member?.can_invite || false;
    } catch (error) {
      console.error('権限確認エラー:', error);
      return false;
    }
  }
}

export const invitationService = new InvitationService();