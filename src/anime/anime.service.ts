import { Injectable } from '@nestjs/common';
import { supabase } from '../supabase.client';
import axios from 'axios';

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

      // Fetch from Jikan API
      const response = await axios.get(`${this.jikanBaseUrl}/anime/${id}`);
      const anime = (response.data as any).data; // Type assertion

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
        genres: anime.genres.map((g: any) => g.name),
        themes: anime.themes?.map((t: any) => t.name) || [],
        demographics: anime.demographics?.map((d: any) => d.name) || [],
        studios: anime.studios?.map((s: any) => s.name) || [],
        trailer_url: anime.trailer?.url || null,
        duration: anime.duration,
        broadcast_day: anime.broadcast?.day || null,
        broadcast_time: anime.broadcast?.time || null,
        broadcast_timezone: anime.broadcast?.timezone || null,
        source: anime.source,
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

      const response = await axios.get(
        `${this.jikanBaseUrl}/anime?q=${encodeURIComponent(query)}&limit=20&order_by=popularity`
      );

      const data = response.data as any; // Type assertion

      // Transform the data to match frontend expectations
      return data.data.map((anime: any) => ({
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
      const response = await axios.get(
        `${this.jikanBaseUrl}/top/anime?limit=20&filter=bypopularity`
      );

      const data = response.data as any; // Type assertion
      const animeList = data.data;

      // Transform the data to match frontend expectations
      return animeList.map((anime: any, index: number) => ({
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
      return this.getFallbackAiringAnime();
    }
  }

  async getTopAiringAnime() {
    try {
      // Get currently airing anime
      const response = await axios.get(
        `https://api.jikan.moe/v4/seasons/now?limit=15`
      );

      const data = response.data as any;
      const animeList = data.data;

      // Transform the data
      return animeList.slice(0, 5).map((anime: any, index: number) => {
        // Extract YouTube ID from trailer if available
        let trailerUrl: string | null = null;

        if (anime.trailer?.youtube_id) {
          trailerUrl = `https://www.youtube.com/watch?v=${anime.trailer.youtube_id}`;
        } else if (anime.trailer?.url) {
          trailerUrl = anime.trailer.url;
        }

        // If no trailer from Jikan, try to get one from our fallback list
        if (!trailerUrl) {
          trailerUrl = this.getTrailerByTitle(anime.title) || null;
        }

        return {
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
          year: anime.year || new Date().getFullYear(),
          status: anime.status,
          rating: anime.rating,
          rank: index + 1,
          popularity: anime.popularity,
          synopsis: anime.synopsis,
          genres: anime.genres,
          themes: anime.themes || [],
          demographics: anime.demographics || [],
          studios: anime.studios || [],
          trailer_url: trailerUrl,
          aired: anime.aired,
          duration: anime.duration,
          broadcast: anime.broadcast,
          source: anime.source,
        };
      });
    } catch (error) {
      console.error('Error fetching top airing anime:', error);

      // Return fallback anime with trailers
      return this.getFallbackAiringAnime();
    }
  }

  // Helper method to get trailers for popular anime
  private getTrailerByTitle(title: string): string | null {
    const trailerMap: Record<string, string> = {
      // My Hero Academia
      "Boku no Hero Academia": "https://www.youtube.com/watch?v=Af3J8t3X5jM",
      "My Hero Academia": "https://www.youtube.com/watch?v=Af3J8t3X5jM",
      "Boku no Hero Academia: Final Season": "https://www.youtube.com/watch?v=Af3J8t3X5jM",

      // Spy x Family
      "Spy x Family": "https://www.youtube.com/watch?v=41i8b2bQvMk",
      "Spy x Family Season 3": "https://www.youtube.com/watch?v=41i8b2bQvMk",

      // Jujutsu Kaisen
      "Jujutsu Kaisen": "https://www.youtube.com/watch?v=2L5WraRgFw4",
      "Jujutsu Kaisen 2nd Season": "https://www.youtube.com/watch?v=2L5WraRgFw4",

      // One Piece
      "One Piece": "https://www.youtube.com/watch?v=Ades3pQbeh8",

      // Demon Slayer
      "Demon Slayer": "https://www.youtube.com/watch?v=VQGCKyvzIM4",
      "Kimetsu no Yaiba": "https://www.youtube.com/watch?v=VQGCKyvzIM4",

      // Attack on Titan
      "Attack on Titan": "https://www.youtube.com/watch?v=MGRm4IzK1SQ",
      "Shingeki no Kyojin": "https://www.youtube.com/watch?v=MGRm4IzK1SQ",
    };

    return trailerMap[title] || null;
  }

  private async getFallbackAiringAnime(): Promise<any[]> {
    // Hardcoded list of currently airing anime with working trailers
    return [
      {
        mal_id: 51009,
        title: "Jujutsu Kaisen 2nd Season",
        title_english: "Jujutsu Kaisen Season 2",
        title_japanese: "呪術廻戦 懐玉・玉折",
        score: 8.95,
        rank: 1,
        images: {
          jpg: {
            image_url: "https://cdn.myanimelist.net/images/anime/1792/138022.jpg",
            large_image_url: "https://cdn.myanimelist.net/images/anime/1792/138022.jpg",
            small_image_url: "https://cdn.myanimelist.net/images/anime/1792/138022.jpg"
          }
        },
        episodes: 23,
        year: 2023,
        status: "Finished Airing",
        rating: "R - 17+",
        popularity: 2,
        synopsis: "Yuji Itadori is a boy with tremendous physical strength...",
        genres: [
          { mal_id: 1, name: "Action" },
          { mal_id: 2, name: "Supernatural" }
        ],
        trailer_url: "https://www.youtube.com/watch?v=2L5WraRgFw4",
        source: "Manga"
      },
      {
        mal_id: 52991,
        title: "Sousou no Frieren",
        title_english: "Frieren: Beyond Journey's End",
        title_japanese: "葬送のフリーレン",
        score: 9.1,
        rank: 2,
        images: {
          jpg: {
            image_url: "https://cdn.myanimelist.net/images/anime/1015/138006.jpg",
            large_image_url: "https://cdn.myanimelist.net/images/anime/1015/138006.jpg",
            small_image_url: "https://cdn.myanimelist.net/images/anime/1015/138006.jpg"
          }
        },
        episodes: 28,
        year: 2023,
        status: "Currently Airing",
        rating: "PG-13 - Teens 13 or older",
        popularity: 1,
        genres: [
          { mal_id: 2, name: "Adventure" },
          { mal_id: 6, name: "Fantasy" }
        ],
        trailer_url: "https://www.youtube.com/watch?v=SpmJx5jvfoo",
        source: "Manga"
      },
      {
        mal_id: 51298,
        title: "Oshi no Ko",
        score: 8.73,
        rank: 3,
        images: {
          jpg: {
            image_url: "https://cdn.myanimelist.net/images/anime/1816/134736.jpg",
            large_image_url: "https://cdn.myanimelist.net/images/anime/1816/134736.jpg",
            small_image_url: "https://cdn.myanimelist.net/images/anime/1816/134736.jpg"
          }
        },
        episodes: 11,
        year: 2023,
        status: "Finished Airing",
        rating: "R - 17+",
        genres: [
          { mal_id: 36, name: "Slice of Life" },
          { mal_id: 7, name: "Mystery" }
        ],
        trailer_url: "https://www.youtube.com/watch?v=zutgV1Dk-uk",
        source: "Manga"
      },
      {
        mal_id: 52614,
        title: "Mushoku Tensei II: Isekai Ittara Honki Dasu",
        title_english: "Mushoku Tensei: Jobless Reincarnation Season 2",
        score: 8.49,
        rank: 4,
        images: {
          jpg: {
            image_url: "https://cdn.myanimelist.net/images/anime/1948/136244.jpg",
            large_image_url: "https://cdn.myanimelist.net/images/anime/1948/136244.jpg",
            small_image_url: "https://cdn.myanimelist.net/images/anime/1948/136244.jpg"
          }
        },
        episodes: 12,
        year: 2023,
        status: "Finished Airing",
        rating: "R+ - Mild Nudity",
        genres: [
          { mal_id: 2, name: "Adventure" },
          { mal_id: 6, name: "Fantasy" }
        ],
        trailer_url: "https://www.youtube.com/watch?v=Km80e5RZGkM",
        source: "Light Novel"
      },
      {
        mal_id: 54918,
        title: "Jujutsu Kaisen: Kaigyoku Gyokusetsu",
        title_english: "Jujutsu Kaisen: Culling Game",
        score: 8.7,
        rank: 5,
        images: {
          jpg: {
            image_url: "https://cdn.myanimelist.net/images/anime/1985/141053.jpg",
            large_image_url: "https://cdn.myanimelist.net/images/anime/1985/141053.jpg",
            small_image_url: "https://cdn.myanimelist.net/images/anime/1985/141053.jpg"
          }
        },
        episodes: 18,
        year: 2024,
        status: "Currently Airing",
        rating: "R - 17+",
        genres: [
          { mal_id: 1, name: "Action" },
          { mal_id: 2, name: "Supernatural" }
        ],
        trailer_url: "https://www.youtube.com/watch?v=lY5pYo7mE0c",
        source: "Manga"
      }
    ];
  }
}