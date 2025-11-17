import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      groups: {
        Row: {
          id: string;
          name: string;
          description: string;
          created_by: string;
          total_pooled: number;
          status: 'active' | 'closed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          created_by: string;
          total_pooled?: number;
          status?: 'active' | 'closed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          created_by?: string;
          total_pooled?: number;
          status?: 'active' | 'closed';
          created_at?: string;
          updated_at?: string;
        };
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          upi_id: string;
          display_name: string;
          role: 'admin' | 'member';
          joined_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          upi_id: string;
          display_name: string;
          role?: 'admin' | 'member';
          joined_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          upi_id?: string;
          display_name?: string;
          role?: 'admin' | 'member';
          joined_at?: string;
        };
      };
      payment_requests: {
        Row: {
          id: string;
          group_id: string;
          member_id: string;
          amount: number;
          status: 'pending' | 'accepted' | 'rejected' | 'expired';
          requested_at: string;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          group_id: string;
          member_id: string;
          amount: number;
          status?: 'pending' | 'accepted' | 'rejected' | 'expired';
          requested_at?: string;
          responded_at?: string | null;
        };
        Update: {
          id?: string;
          group_id?: string;
          member_id?: string;
          amount?: number;
          status?: 'pending' | 'accepted' | 'rejected' | 'expired';
          requested_at?: string;
          responded_at?: string | null;
        };
      };
      transactions: {
        Row: {
          id: string;
          group_id: string;
          member_id: string;
          type: 'pool_in' | 'payment_out' | 'refund';
          amount: number;
          description: string;
          merchant_name: string | null;
          transaction_ref: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          member_id: string;
          type: 'pool_in' | 'payment_out' | 'refund';
          amount: number;
          description?: string;
          merchant_name?: string | null;
          transaction_ref?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          member_id?: string;
          type?: 'pool_in' | 'payment_out' | 'refund';
          amount?: number;
          description?: string;
          merchant_name?: string | null;
          transaction_ref?: string | null;
          created_at?: string;
        };
      };
      group_expenses: {
        Row: {
          id: string;
          group_id: string;
          paid_by: string;
          amount: number;
          category: 'flight' | 'hotel' | 'food' | 'transport' | 'other';
          description: string;
          merchant_name: string | null;
          receipt_url: string | null;
          transaction_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          paid_by: string;
          amount: number;
          category?: 'flight' | 'hotel' | 'food' | 'transport' | 'other';
          description: string;
          merchant_name?: string | null;
          receipt_url?: string | null;
          transaction_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          paid_by?: string;
          amount?: number;
          category?: 'flight' | 'hotel' | 'food' | 'transport' | 'other';
          description?: string;
          merchant_name?: string | null;
          receipt_url?: string | null;
          transaction_id?: string | null;
          created_at?: string;
        };
      };
    };
  };
};
