import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Type definitions for better TypeScript support
export interface Database {
  public: {
    Tables: {
      anime: {
        Row: {
          id: number;
          mal_id: number | null;
          title: string;
          title_english: string | null;
          title_japanese: string | null;
          synopsis: string | null;
          image_url: string | null;
          large_image_url: string | null;
          score: number | null;
          episodes: number | null;
          year: number | null;
          status: string | null;
          rating: string | null;
          rank: number | null;
          popularity: number | null;
          genres: string[] | null;
          themes: string[] | null;
          demographics: string[] | null;
          studios: string[] | null;
          trailer_url: string | null;
          duration: string | null;
          broadcast_day: string | null;
          broadcast_time: string | null;
          broadcast_timezone: string | null;
          source: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          mal_id?: number | null;
          title: string;
          title_english?: string | null;
          title_japanese?: string | null;
          synopsis?: string | null;
          image_url?: string | null;
          large_image_url?: string | null;
          score?: number | null;
          episodes?: number | null;
          year?: number | null;
          status?: string | null;
          rating?: string | null;
          rank?: number | null;
          popularity?: number | null;
          genres?: string[] | null;
          themes?: string[] | null;
          demographics?: string[] | null;
          studios?: string[] | null;
          trailer_url?: string | null;
          duration?: string | null;
          broadcast_day?: string | null;
          broadcast_time?: string | null;
          broadcast_timezone?: string | null;
          source?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          mal_id?: number | null;
          title?: string;
          title_english?: string | null;
          title_japanese?: string | null;
          synopsis?: string | null;
          image_url?: string | null;
          large_image_url?: string | null;
          score?: number | null;
          episodes?: number | null;
          year?: number | null;
          status?: string | null;
          rating?: string | null;
          rank?: number | null;
          popularity?: number | null;
          genres?: string[] | null;
          themes?: string[] | null;
          demographics?: string[] | null;
          studios?: string[] | null;
          trailer_url?: string | null;
          duration?: string | null;
          broadcast_day?: string | null;
          broadcast_time?: string | null;
          broadcast_timezone?: string | null;
          source?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_lists: {
        Row: {
          id: number;
          user_id: string;
          anime_id: number;
          status: 'watching' | 'completed' | 'dropped' | 'paused' | 'plan_to_watch';
          score: number | null;
          episodes_watched: number;
          is_favorite: boolean;
          notes: string | null;
          rewatch_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          anime_id: number;
          status: 'watching' | 'completed' | 'dropped' | 'paused' | 'plan_to_watch';
          score?: number | null;
          episodes_watched?: number;
          is_favorite?: boolean;
          notes?: string | null;
          rewatch_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          anime_id?: number;
          status?: 'watching' | 'completed' | 'dropped' | 'paused' | 'plan_to_watch';
          score?: number | null;
          episodes_watched?: number;
          is_favorite?: boolean;
          notes?: string | null;
          rewatch_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: number;
          user_id: string;
          anime_id: number;
          rating: number;
          comment: string | null;
          likes_count: number;
          is_spoiler: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          anime_id: number;
          rating: number;
          comment?: string | null;
          likes_count?: number;
          is_spoiler?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          anime_id?: number;
          rating?: number;
          comment?: string | null;
          likes_count?: number;
          is_spoiler?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

// Helper types
export type Anime = Database['public']['Tables']['anime']['Row'];
export type AnimeInsert = Database['public']['Tables']['anime']['Insert'];
export type AnimeUpdate = Database['public']['Tables']['anime']['Update'];

export type UserList = Database['public']['Tables']['user_lists']['Row'];
export type UserListInsert = Database['public']['Tables']['user_lists']['Insert'];
export type UserListUpdate = Database['public']['Tables']['user_lists']['Update'];

export type Review = Database['public']['Tables']['reviews']['Row'];
export type ReviewInsert = Database['public']['Tables']['reviews']['Insert'];
export type ReviewUpdate = Database['public']['Tables']['reviews']['Update'];