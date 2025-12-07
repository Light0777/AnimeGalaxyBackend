import { Injectable } from '@nestjs/common';
import { supabase } from '../supabase.client';
import axios from 'axios';
import {
  JikanAnime,
  JikanResponse,
  JikanSearchResponse,
  JikanSingleResponse,
} from '../types/jikan.types';

@Injectable()
export class AnimeService {
  private readonly jikanBaseUrl = 'https://api.jikan.moe/v4';

  // Get anime by ID
  async getAnime(id: number) {
    try {
      // Check cache first
      const { data: cached } = await supabase
        .from('anime')
        .select('*')
        .eq('mal_id', id)
        .single();

      if (cached) return cached;

      // Fetch from Jikan API with proper typing
      const response = await axios.get<JikanSingleResponse>(
        `${this.jikanBaseUrl}/anime/${id}`
      );
      const anime: JikanAnime = response.data.data;

      // Prepare data for caching
      const animeData = {
        mal_id: anime.mal_id,
        title: anime.title,
        title_english: anime.title_english || anime.title,
        title_japanese: anime.title_japanese || anime.title,
        synopsis: anime.synopsis,
        image_url: anime.images.jpg.image_url,
        large_image_url: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
        score: anime.score,
        episodes: anime.episodes,
        year: anime.year || anime.aired?.prop?.from?.year || null,
        status: anime.status,
        rating: anime.rating,
        rank: anime.rank,
        popularity: anime.popularity,
        genres: anime.genres.map((g) => g.name),
        themes: anime.themes?.map((t) => t.name) || [],
        demographics: anime.demographics?.map((d) => d.name) || [],
        studios: anime.studios?.map((s) => s.name) || [],
        trailer_url: anime.trailer?.url || null,
      };

      // Cache in Supabase
      await supabase.from('anime').insert(animeData);

      return animeData;
    } catch (error) {
      console.error(`Error fetching anime ${id}:`, error);
      throw error;
    }
  }

  // Search anime
  async searchAnime(query: string) {
    try {
      if (!query || query.trim() === '') {
        return [];
      }

      const response = await axios.get<JikanSearchResponse>(
        `${this.jikanBaseUrl}/anime?q=${encodeURIComponent(query)}&limit=20&order_by=popularity`
      );

      const animeList = response.data.data;

      // Transform the data to match frontend expectations
      return animeList.map((anime: JikanAnime) => ({
        mal_id: anime.mal_id,
        title: anime.title,
        title_english: anime.title_english || anime.title,
        title_japanese: anime.title_japanese || anime.title,
        images: {
          jpg: {
            image_url: anime.images.jpg.image_url,
            large_image_url: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
            small_image_url: anime.images.jpg.small_image_url || anime.images.jpg.image_url,
          }
        },
        score: anime.score,
        episodes: anime.episodes,
        year: anime.year || anime.aired?.prop?.from?.year || null,
        status: anime.status,
        rating: anime.rating,
        rank: anime.rank,
        popularity: anime.popularity,
        synopsis: anime.synopsis,
        genres: anime.genres,
        themes: anime.themes || [],
        demographics: anime.demographics || [],
        studios: anime.studios || [],
        trailer_url: anime.trailer?.url || null,
        aired: anime.aired,
        duration: anime.duration,
        broadcast: anime.broadcast,
        source: anime.source,
      }));
    } catch (error) {
      console.error(`Error searching anime for "${query}":`, error);
      throw error;
    }
  }

  // Get trending anime (top by popularity/score)
  async getTrendingAnime() {
    try {
      const response = await axios.get<JikanSearchResponse>(
        `${this.jikanBaseUrl}/top/anime?limit=20&filter=bypopularity`
      );

      const animeList = response.data.data;

      // Transform the data to match frontend expectations
      return animeList.map((anime: JikanAnime, index: number) => ({
        mal_id: anime.mal_id,
        title: anime.title,
        title_english: anime.title_english || anime.title,
        title_japanese: anime.title_japanese || anime.title,
        images: {
          jpg: {
            image_url: anime.images.jpg.image_url,
            large_image_url: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
            small_image_url: anime.images.jpg.small_image_url || anime.images.jpg.image_url,
          }
        },
        score: anime.score,
        episodes: anime.episodes,
        year: anime.year || anime.aired?.prop?.from?.year || null,
        status: anime.status,
        rating: anime.rating,
        rank: anime.rank || (index + 1),
        popularity: anime.popularity,
        synopsis: anime.synopsis,
        genres: anime.genres,
        themes: anime.themes || [],
        demographics: anime.demographics || [],
        studios: anime.studios || [],
        trailer_url: anime.trailer?.url || null,
        aired: anime.aired,
        duration: anime.duration,
        broadcast: anime.broadcast,
        source: anime.source,
      }));
    } catch (error) {
      console.error('Error fetching trending anime:', error);
      
      // Fallback: return some popular anime if API fails
      return this.getFallbackTrendingAnime();
    }
  }

  // Fallback trending data in case API fails
  private async getFallbackTrendingAnime(): Promise<any[]> {
    const fallbackAnime = [
      {
        mal_id: 5114,
        title: "Fullmetal Alchemist: Brotherhood",
        score: 9.1,
        rank: 1,
        images: {
          jpg: {
            image_url: "https://cdn.myanimelist.net/images/anime/1208/94745.jpg",
            large_image_url: "https://cdn.myanimelist.net/images/anime/1208/94745.jpg",
            small_image_url: "https://cdn.myanimelist.net/images/anime/1208/94745.jpg"
          }
        },
        episodes: 64,
        year: 2009,
        status: "Finished Airing",
        rating: "R - 17+ (violence & profanity)",
        popularity: 3,
        synopsis: "After a horrific alchemy experiment goes wrong in the Elric household...",
        genres: [
          { mal_id: 1, type: "anime", name: "Action", url: "https://myanimelist.net/anime/genre/1/Action" },
          { mal_id: 2, type: "anime", name: "Adventure", url: "https://myanimelist.net/anime/genre/2/Adventure" }
        ],
        themes: [],
        demographics: [],
        studios: [],
        trailer_url: null,
        aired: { from: "2009-04-05T00:00:00+00:00", to: "2010-07-04T00:00:00+00:00" },
        duration: "24 min per ep",
        broadcast: { day: "Sunday", time: "17:00", timezone: "Asia/Tokyo" },
        source: "Manga"
      },
      {
        mal_id: 9253,
        title: "Steins;Gate",
        score: 9.07,
        rank: 2,
        images: {
          jpg: {
            image_url: "https://cdn.myanimelist.net/images/anime/1935/127974.jpg",
            large_image_url: "https://cdn.myanimelist.net/images/anime/1935/127974.jpg",
            small_image_url: "https://cdn.myanimelist.net/images/anime/1935/127974.jpg"
          }
        },
        episodes: 24,
        year: 2011,
        status: "Finished Airing",
        rating: "PG-13 - Teens 13 or older",
        popularity: 10,
        synopsis: "The self-proclaimed mad scientist Rintarou Okabe rents out a room in a rickety old building in Akihabara...",
        genres: [
          { mal_id: 24, type: "anime", name: "Sci-Fi", url: "https://myanimelist.net/anime/genre/24/Sci-Fi" },
          { mal_id: 4, type: "anime", name: "Comedy", url: "https://myanimelist.net/anime/genre/4/Comedy" }
        ],
        themes: [],
        demographics: [],
        studios: [],
        trailer_url: null,
        aired: { from: "2011-04-06T00:00:00+00:00", to: "2011-09-14T00:00:00+00:00" },
        duration: "24 min per ep",
        broadcast: { day: "Wednesday", time: "02:05", timezone: "Asia/Tokyo" },
        source: "Visual novel"
      }
    ];
    
    return fallbackAnime;
  }
}