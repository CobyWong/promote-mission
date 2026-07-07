export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      app_logs: {
        Row: {
          category: string;
          context: Json;
          created_at: string;
          event: string;
          id: string;
          level: string;
          message: string | null;
          request_id: string | null;
          route: string | null;
          user_id: string | null;
        };
        Insert: {
          category: string;
          context?: Json;
          created_at?: string;
          event: string;
          id?: string;
          level: string;
          message?: string | null;
          request_id?: string | null;
          route?: string | null;
          user_id?: string | null;
        };
        Update: {
          category?: string;
          context?: Json;
          created_at?: string;
          event?: string;
          id?: string;
          level?: string;
          message?: string | null;
          request_id?: string | null;
          route?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
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
          archived_at: string | null;
          brand: string;
          category: string;
          current_participants: number;
          created_at: string;
          deliverables: string[];
          description: string;
          difficulty: string;
          display_order: number;
          eta: string;
          hook: string;
          is_active: boolean;
          ends_at: string | null;
          min_participants: number;
          mission_image_url: string | null;
          product: string;
          requirements: string[];
          reward_coins: number;
          slug: string;
          starts_at: string | null;
          status: string;
          tags: string[];
          title: string;
        };
        Insert: {
          archived_at?: string | null;
          brand: string;
          category: string;
          current_participants?: number;
          created_at?: string;
          deliverables?: string[];
          description: string;
          difficulty: string;
          display_order?: number;
          eta: string;
          hook: string;
          is_active?: boolean;
          ends_at?: string | null;
          min_participants?: number;
          mission_image_url?: string | null;
          product: string;
          requirements?: string[];
          reward_coins: number;
          slug: string;
          starts_at?: string | null;
          status?: string;
          tags?: string[];
          title: string;
        };
        Update: {
          archived_at?: string | null;
          brand?: string;
          category?: string;
          current_participants?: number;
          created_at?: string;
          deliverables?: string[];
          description?: string;
          difficulty?: string;
          display_order?: number;
          eta?: string;
          hook?: string;
          is_active?: boolean;
          ends_at?: string | null;
          min_participants?: number;
          mission_image_url?: string | null;
          product?: string;
          requirements?: string[];
          reward_coins?: number;
          slug?: string;
          starts_at?: string | null;
          status?: string;
          tags?: string[];
          title?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          created_at: string;
          delivery_status: string;
          id: string;
          is_read: boolean;
          link: string | null;
          message: string;
          metadata: Json;
          read_at: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          delivery_status?: string;
          id?: string;
          is_read?: boolean;
          link?: string | null;
          message: string;
          metadata?: Json;
          read_at?: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          delivery_status?: string;
          id?: string;
          is_read?: boolean;
          link?: string | null;
          message?: string;
          metadata?: Json;
          read_at?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
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
          public_user_id: string;
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
          public_user_id?: string;
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
          public_user_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      referral_profiles: {
        Row: {
          created_at: string;
          referral_code: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          referral_code: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          referral_code?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      referrals: {
        Row: {
          campaign_medium: string | null;
          campaign_source: string | null;
          created_at: string;
          first_approved_submission_id: string | null;
          id: string;
          invited_user_id: string;
          inviter_user_id: string;
          last_reminded_at: string | null;
          qualified_at: string | null;
          referral_stage: string;
          referral_code_used: string;
          reminder_count: number;
          reward_coins: number | null;
          reward_hold_until: string | null;
          reward_status: string;
          rewarded_at: string | null;
          review_status: string;
          risk_flags: string[];
          risk_score: number;
          season_key: string | null;
          status: string;
        };
        Insert: {
          campaign_medium?: string | null;
          campaign_source?: string | null;
          created_at?: string;
          first_approved_submission_id?: string | null;
          id?: string;
          invited_user_id: string;
          inviter_user_id: string;
          last_reminded_at?: string | null;
          qualified_at?: string | null;
          referral_stage?: string;
          referral_code_used: string;
          reminder_count?: number;
          reward_coins?: number | null;
          reward_hold_until?: string | null;
          reward_status?: string;
          rewarded_at?: string | null;
          review_status?: string;
          risk_flags?: string[];
          risk_score?: number;
          season_key?: string | null;
          status?: string;
        };
        Update: {
          campaign_medium?: string | null;
          campaign_source?: string | null;
          created_at?: string;
          first_approved_submission_id?: string | null;
          id?: string;
          invited_user_id?: string;
          inviter_user_id?: string;
          last_reminded_at?: string | null;
          qualified_at?: string | null;
          referral_stage?: string;
          referral_code_used?: string;
          reminder_count?: number;
          reward_coins?: number | null;
          reward_hold_until?: string | null;
          reward_status?: string;
          rewarded_at?: string | null;
          review_status?: string;
          risk_flags?: string[];
          risk_score?: number;
          season_key?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      referral_reward_holds: {
        Row: {
          amount: number;
          created_at: string;
          hold_until: string | null;
          id: string;
          invited_user_id: string;
          inviter_user_id: string;
          referral_id: string;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          risk_flags: string[];
          risk_score: number;
          status: string;
          submission_id: string | null;
          updated_at: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          hold_until?: string | null;
          id?: string;
          invited_user_id: string;
          inviter_user_id: string;
          referral_id: string;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          risk_flags?: string[];
          risk_score?: number;
          status?: string;
          submission_id?: string | null;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          hold_until?: string | null;
          id?: string;
          invited_user_id?: string;
          inviter_user_id?: string;
          referral_id?: string;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          risk_flags?: string[];
          risk_score?: number;
          status?: string;
          submission_id?: string | null;
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
      support_tickets: {
        Row: {
          category: string;
          created_at: string;
          email: string;
          id: string;
          message: string;
          name: string;
          page_path: string | null;
          status: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          category?: string;
          created_at?: string;
          email: string;
          id?: string;
          message: string;
          name: string;
          page_path?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          category?: string;
          created_at?: string;
          email?: string;
          id?: string;
          message?: string;
          name?: string;
          page_path?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      submissions: {
        Row: {
          assigned_reviewer_id: string | null;
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
          review_due_at: string | null;
          screenshot_count: number;
          screenshot_paths: Json;
          sla_breached_at: string | null;
          status: string;
          submitted_at: string;
          user_id: string;
        };
        Insert: {
          assigned_reviewer_id?: string | null;
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
          review_due_at?: string | null;
          screenshot_count?: number;
          screenshot_paths?: Json;
          sla_breached_at?: string | null;
          status?: string;
          submitted_at?: string;
          user_id: string;
        };
        Update: {
          assigned_reviewer_id?: string | null;
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
          review_due_at?: string | null;
          screenshot_count?: number;
          screenshot_paths?: Json;
          sla_breached_at?: string | null;
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
      settle_referral_reward: {
        Args: {
          approved_submission_id_input: string;
        };
        Returns: Json;
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
