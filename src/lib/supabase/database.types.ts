export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      coin_transactions: {
        Row: {
          amount: number;
          created_at: string;
          description: string | null;
          id: string;
          submission_id: string | null;
          transaction_type: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          submission_id?: string | null;
          transaction_type?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          submission_id?: string | null;
          transaction_type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      instagram_connections: {
        Row: {
          access_token: string;
          created_at: string;
          facebook_page_name: string | null;
          instagram_user_id: string;
          instagram_username: string | null;
          last_error: string | null;
          last_synced_at: string | null;
          status: string;
          token_expires_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          access_token: string;
          created_at?: string;
          facebook_page_name?: string | null;
          instagram_user_id: string;
          instagram_username?: string | null;
          last_error?: string | null;
          last_synced_at?: string | null;
          status?: string;
          token_expires_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          access_token?: string;
          created_at?: string;
          facebook_page_name?: string | null;
          instagram_user_id?: string;
          instagram_username?: string | null;
          last_error?: string | null;
          last_synced_at?: string | null;
          status?: string;
          token_expires_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      missions: {
        Row: {
          brand: string;
          category: string;
          created_at: string;
          deliverables: string[];
          description: string;
          difficulty: string;
          display_order: number;
          eta: string;
          hook: string;
          is_active: boolean;
          product: string;
          requirements: string[];
          reward_coins: number;
          slug: string;
          tags: string[];
          title: string;
        };
        Insert: {
          brand: string;
          category: string;
          created_at?: string;
          deliverables?: string[];
          description: string;
          difficulty: string;
          display_order?: number;
          eta: string;
          hook: string;
          is_active?: boolean;
          product: string;
          requirements?: string[];
          reward_coins: number;
          slug: string;
          tags?: string[];
          title: string;
        };
        Update: {
          brand?: string;
          category?: string;
          created_at?: string;
          deliverables?: string[];
          description?: string;
          difficulty?: string;
          display_order?: number;
          eta?: string;
          hook?: string;
          is_active?: boolean;
          product?: string;
          requirements?: string[];
          reward_coins?: number;
          slug?: string;
          tags?: string[];
          title?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          followers_range: string | null;
          full_name: string | null;
          id: string;
          instagram_handle: string | null;
          niche: string | null;
          portfolio_url: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          followers_range?: string | null;
          full_name?: string | null;
          id: string;
          instagram_handle?: string | null;
          niche?: string | null;
          portfolio_url?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          followers_range?: string | null;
          full_name?: string | null;
          id?: string;
          instagram_handle?: string | null;
          niche?: string | null;
          portfolio_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      reel_insights: {
        Row: {
          comments: number;
          created_at: string;
          id: string;
          likes: number;
          media_id: string;
          metric_date: string;
          plays: number;
          raw_metrics: Json;
          reach: number;
          reel_url: string;
          saves: number;
          shares: number;
          submission_id: string | null;
          total_interactions: number;
          user_id: string;
        };
        Insert: {
          comments?: number;
          created_at?: string;
          id?: string;
          likes?: number;
          media_id: string;
          metric_date: string;
          plays?: number;
          raw_metrics?: Json;
          reach?: number;
          reel_url: string;
          saves?: number;
          shares?: number;
          submission_id?: string | null;
          total_interactions?: number;
          user_id: string;
        };
        Update: {
          comments?: number;
          created_at?: string;
          id?: string;
          likes?: number;
          media_id?: string;
          metric_date?: string;
          plays?: number;
          raw_metrics?: Json;
          reach?: number;
          reel_url?: string;
          saves?: number;
          shares?: number;
          submission_id?: string | null;
          total_interactions?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      reward_redemptions: {
        Row: {
          cost_coins: number;
          created_at: string;
          fulfilled_at: string | null;
          id: string;
          notes: string | null;
          reviewed_by: string | null;
          reward_name: string;
          reward_slug: string;
          status: string;
          user_id: string;
        };
        Insert: {
          cost_coins: number;
          created_at?: string;
          fulfilled_at?: string | null;
          id?: string;
          notes?: string | null;
          reviewed_by?: string | null;
          reward_name: string;
          reward_slug: string;
          status?: string;
          user_id: string;
        };
        Update: {
          cost_coins?: number;
          created_at?: string;
          fulfilled_at?: string | null;
          id?: string;
          notes?: string | null;
          reviewed_by?: string | null;
          reward_name?: string;
          reward_slug?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      rewards_catalog: {
        Row: {
          badge: string | null;
          cost: number;
          created_at: string;
          description: string;
          display_order: number;
          fulfillment_eta: string;
          is_active: boolean;
          name: string;
          slug: string;
          stock: number | null;
        };
        Insert: {
          badge?: string | null;
          cost: number;
          created_at?: string;
          description: string;
          display_order?: number;
          fulfillment_eta?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          stock?: number | null;
        };
        Update: {
          badge?: string | null;
          cost?: number;
          created_at?: string;
          description?: string;
          display_order?: number;
          fulfillment_eta?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          stock?: number | null;
        };
        Relationships: [];
      };
      submissions: {
        Row: {
          caption_summary: string | null;
          checklist: Json | null;
          created_at: string;
          creator_handle: string | null;
          creator_name: string | null;
          id: string;
          mission_brand: string;
          mission_slug: string;
          mission_title: string;
          notes: string | null;
          reel_url: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reward_coins: number;
          screenshot_count: number;
          screenshot_paths: Json;
          status: string;
          submitted_at: string;
          user_id: string;
        };
        Insert: {
          caption_summary?: string | null;
          checklist?: Json | null;
          created_at?: string;
          creator_handle?: string | null;
          creator_name?: string | null;
          id?: string;
          mission_brand: string;
          mission_slug: string;
          mission_title: string;
          notes?: string | null;
          reel_url: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reward_coins: number;
          screenshot_count?: number;
          screenshot_paths?: Json;
          status?: string;
          submitted_at?: string;
          user_id: string;
        };
        Update: {
          caption_summary?: string | null;
          checklist?: Json | null;
          created_at?: string;
          creator_handle?: string | null;
          creator_name?: string | null;
          id?: string;
          mission_brand?: string;
          mission_slug?: string;
          mission_title?: string;
          notes?: string | null;
          reel_url?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reward_coins?: number;
          screenshot_count?: number;
          screenshot_paths?: Json;
          status?: string;
          submitted_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      approve_submission: {
        Args: {
          submission_id_input: string;
          reviewer_id_input?: string | null;
          review_notes_input?: string | null;
        };
        Returns: undefined;
      };
      redeem_reward: {
        Args: {
          reward_slug_input: string;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
