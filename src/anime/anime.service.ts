import { Injectable } from '@nestjs/common';
import { supabase } from '../supabase.client';
import axios from 'axios';

@Injectable()
export class AnimeService {
  private readonly jikanBaseUrl = 'https://api.jikan.moe/v4';
  private readonly anilistUrl = 'https://graphql.anilist.co';

  // Cache configuration
  private cacheDuration = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
  private cacheKey = 'top_airing_anime_cache';

  // YouTube API configuration (add to your .env file)
  private youtubeApiKey = process.env.YOUTUBE_API_KEY || '';

  // Get anime by ID (unchanged)
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
      const anime = (response.data as any).data;

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
        trailer_youtube_id: anime.trailer?.youtube_id || null,
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

  // Search anime (unchanged)
  async searchAnime(query: string) {
    try {
      if (!query || query.trim() === '') {
        return [];
      }

      const response = await axios.get(
        `${this.jikanBaseUrl}/anime?q=${encodeURIComponent(query)}&limit=20&order_by=popularity`
      );

      const data = response.data as any;

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
        trailer_youtube_id: anime.trailer?.youtube_id || null,
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

      const data = response.data as any;
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
        trailer_youtube_id: anime.trailer?.youtube_id || null,
        aired: anime.aired,
        duration: anime.duration,
        broadcast: anime.broadcast,
        source: anime.source,
      }));
    } catch (error) {
      console.error('Error fetching trending anime:', error);
      return this.getFallbackTrendingAnime();
    }
  }

  // Enhanced getTopAiringAnime with multi-source trailer fetching
  async getTopAiringAnime() {
    console.log('=== getTopAiringAnime() called ===');

    try {
      // Check cache first
      const cachedData = await this.getCachedData();
      if (cachedData) {
        console.log('Returning cached data');
        return cachedData;
      }

      // 1. Get top airing anime from Jikan
      console.log('Fetching top airing anime from Jikan...');
      const airingAnime = await this.getTopAiringFromJikan();

      if (airingAnime.length === 0) {
        console.log('No airing anime found, using fallback');
        return this.getGuaranteedAnimeWithTrailers();
      }

      // 2. Enrich each anime with trailer information
      console.log(`Enriching ${airingAnime.length} anime with trailers...`);
      const enrichedAnime = await this.enrichAnimeWithTrailers(airingAnime);

      // 3. Cache the results
      await this.cacheData(enrichedAnime);

      return enrichedAnime;

    } catch (error) {
      console.error('Error in getTopAiringAnime:', error);
      console.log('Falling back to guaranteed anime with trailers');
      return this.getGuaranteedAnimeWithTrailers();
    }
  }

  // Step 1: Fetch top airing anime from Jikan
  private async getTopAiringFromJikan(): Promise<any[]> {
  try {
    // Get current seasonal anime
    const response = await axios.get(
      `${this.jikanBaseUrl}/seasons/now?limit=10`,
      { timeout: 10000 }
    );

    const data = response.data as any;
    let animeList = data.data || [];

    console.log(`Received ${animeList.length} seasonal anime from Jikan`);

    // Sort by popularity (lower number = more popular)
    animeList.sort((a: any, b: any) =>
      (a.popularity || 9999) - (b.popularity || 9999)
    );

    // Take top 5
    animeList = animeList.slice(0, 5);

    // Transform to your format
    return animeList.map((anime: any, index: number) => ({
      mal_id: anime.mal_id,
      title: anime.title,
      title_english: anime.title_english || anime.title,
      title_japanese: anime.title_japanese || anime.title,
      images: {
        jpg: {
          image_url: anime.images?.jpg?.image_url || 'https://via.placeholder.com/225x318?text=No+Image',
          large_image_url: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
          small_image_url: anime.images?.jpg?.small_image_url || anime.images?.jpg?.image_url,
        }
      },
      score: anime.score || 0,
      episodes: anime.episodes,
      year: anime.year || new Date().getFullYear(),
      status: 'Currently Airing',
      rating: anime.rating || 'Unknown',
      rank: index + 1,
      popularity: anime.popularity || 9999,
      synopsis: anime.synopsis || 'No synopsis available.',
      genres: anime.genres || [],
      themes: anime.themes || [],
      demographics: anime.demographics || [],
      studios: anime.studios || [],
      trailer_url: anime.trailer?.url || null,
      trailer_youtube_id: anime.trailer?.youtube_id || null,
      aired: anime.aired,
      duration: anime.duration,
      broadcast: anime.broadcast,
      source: anime.source,
    }));

  } catch (error) {
    console.error('Error fetching from Jikan:', error);
    return [];
  }
}

  // Helper method to transform anime data
  private transformAnimeData(anime: any, rank: number): any {
    return {
      mal_id: anime.mal_id,
      title: anime.title,
      title_english: anime.title_english || anime.title,
      title_japanese: anime.title_japanese || anime.title,
      images: {
        jpg: {
          image_url: anime.images?.jpg?.image_url || 'https://via.placeholder.com/225x318?text=No+Image',
          large_image_url: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
          small_image_url: anime.images?.jpg?.small_image_url || anime.images?.jpg?.image_url,
        }
      },
      score: anime.score || 0,
      episodes: anime.episodes,
      year: anime.year || new Date().getFullYear(),
      status: anime.status === 'Currently Airing' ? 'Currently Airing' : 'Currently Airing',
      rating: anime.rating || 'Unknown',
      rank: rank,
      popularity: anime.popularity || 9999,
      synopsis: anime.synopsis || 'No synopsis available.',
      genres: anime.genres || [],
      themes: anime.themes || [],
      demographics: anime.demographics || [],
      studios: anime.studios || [],
      trailer_url: anime.trailer?.url || null,
      trailer_youtube_id: anime.trailer?.youtube_id || null,
      aired: anime.aired,
      duration: anime.duration,
      broadcast: anime.broadcast,
      source: anime.source,
    };
  }

  // Step 2: Enrich anime with trailers from multiple sources
  private async enrichAnimeWithTrailers(animeList: any[]): Promise<any[]> {
    const enrichedList: any[] = [];

    for (const anime of animeList.slice(0, 5)) { // Process only first 5
      console.log(`Processing: ${anime.title}`);

      let trailerYoutubeId = anime.trailer_youtube_id;
      let trailerUrl = anime.trailer_url;

      // If no trailer from Jikan, try other sources
      if (!trailerYoutubeId) {
        const trailerData = await this.findTrailerForAnime(anime);

        if (trailerData.youtube_id) {
          trailerYoutubeId = trailerData.youtube_id;
          trailerUrl = trailerData.url || `https://www.youtube.com/watch?v=${trailerYoutubeId}`;
          console.log(`Found trailer for ${anime.title}: ${trailerYoutubeId}`);
        } else {
          console.log(`No trailer found for ${anime.title}`);
        }
      }

      enrichedList.push({
        ...anime,
        trailer_url: trailerUrl,
        trailer_youtube_id: trailerYoutubeId,
      });

      // Delay between requests to respect rate limits
      await this.delay(200);
    }

    return enrichedList;
  }

  // Multi-source trailer search
  private async findTrailerForAnime(anime: any): Promise<{ youtube_id: string | null, url: string | null }> {
    // 1. Try AniList first (free, no API key needed)
    const anilistTrailer = await this.getTrailerFromAniList(anime.title);
    if (anilistTrailer.youtube_id) {
      return anilistTrailer;
    }

    // 2. Try AniList with English title
    if (anime.title_english && anime.title_english !== anime.title) {
      const anilistTrailerEnglish = await this.getTrailerFromAniList(anime.title_english);
      if (anilistTrailerEnglish.youtube_id) {
        return anilistTrailerEnglish;
      }
    }

    // 3. Fallback to YouTube API if you have an API key
    if (this.youtubeApiKey) {
      const youtubeTrailer = await this.searchYouTubeTrailer(anime.title);
      if (youtubeTrailer.youtube_id) {
        return youtubeTrailer;
      }
    }

    // 4. Check hardcoded database for popular shows
    const hardcodedTrailer = this.getHardcodedTrailer(anime.mal_id, anime.title);
    if (hardcodedTrailer.youtube_id) {
      return hardcodedTrailer;
    }

    return { youtube_id: null, url: null };
  }

  // Source 1: AniList GraphQL API
  private async getTrailerFromAniList(title: string): Promise<{ youtube_id: string | null, url: string | null }> {
    try {
      const query = `
        query ($search: String) {
          Media(search: $search, type: ANIME) {
            trailer {
              id
              site
            }
          }
        }
      `;

      const variables = { search: title };

      const response = await axios.post(this.anilistUrl, {
        query,
        variables
      }, { timeout: 5000 });

      const responseData = response.data as { data?: { Media?: { trailer?: { id?: string; site?: string } } } };
      const trailer = responseData.data?.Media?.trailer;

      if (trailer?.site === 'youtube' && trailer.id) {
        return {
          youtube_id: trailer.id,
          url: `https://www.youtube.com/watch?v=${trailer.id}`
        };
      }

      return { youtube_id: null, url: null };
    } catch (error) {
      console.log(`AniList error for "${title}":`, error.message);
      return { youtube_id: null, url: null };
    }
  }

  // Source 2: YouTube Data API
  private async searchYouTubeTrailer(title: string): Promise<{ youtube_id: string | null, url: string | null }> {
    if (!this.youtubeApiKey) {
      console.log('YouTube API key not configured');
      return { youtube_id: null, url: null };
    }

    try {
      const searchQuery = `${title} official trailer anime`;
      const encodedQuery = encodeURIComponent(searchQuery);

      const response = await axios.get<{
        items: Array<{
          id: { videoId?: string }
        }>
      }>(
        `https://www.googleapis.com/youtube/v3/search?key=${this.youtubeApiKey}&part=snippet&type=video&q=${encodedQuery}&maxResults=1`,
        { timeout: 5000 }
      );

      const videoId = response.data?.items?.[0]?.id?.videoId;

      if (videoId) {
        return {
          youtube_id: videoId,
          url: `https://www.youtube.com/watch?v=${videoId}`
        };
      }

      return { youtube_id: null, url: null };
    } catch (error) {
      console.log(`YouTube API error for "${title}":`, error.message);
      return { youtube_id: null, url: null };
    }
  }

  // Source 3: Hardcoded trailer database
  private getHardcodedTrailer(mal_id: number, title: string): { youtube_id: string | null, url: string | null } {
    const trailerDatabase: Record<number, { youtube_id: string, url: string }> = {
      // Currently airing popular shows
      52807: { youtube_id: 'vVnrCjv6rKk', url: 'https://www.youtube.com/watch?v=vVnrCjv6rKk' }, // One Punch Man 3
      57143: { youtube_id: '2ipIqaMUK6Q', url: 'https://www.youtube.com/watch?v=2ipIqaMUK6Q' }, // Kaiju No. 8 Season 2
      52034: { youtube_id: '7aMOurgDB-o', url: 'https://www.youtube.com/watch?v=7aMOurgDB-o' }, // My Hero Academia Season 7
      54900: { youtube_id: 'aH2sCvgC5c', url: 'https://www.youtube.com/watch?v=aH2sCvvgC5c' }, // Demon Slayer: Hashira Training Arc
      53415: { youtube_id: 'leZ0T3BeCYM', url: 'https://www.youtube.com/watch?v=leZ0T3BeCYM' }, // Blue Lock Season 2

      // NEW: Add the anime from your current results
      60274: { youtube_id: 'IT5EyilwgoQ', url: 'https://www.youtube.com/watch?v=IT5EyilwgoQ' }, // Kingdom 6th Season (MAL ID: 60274)
      57812: { youtube_id: 'wQgQij8Ry4g', url: 'https://www.youtube.com/watch?v=wQgQij8Ry4g' }, // Boku no Hero Academia: Final Season (MAL ID: 57812)
      21: { youtube_id: 'S8_YwFLCh4U', url: 'https://www.youtube.com/watch?v=S8_YwFLCh4U' }, // One Piece (MAL ID: 21)
      59741: { youtube_id: 'MNZchQvbMa0', url: 'https://www.youtube.com/watch?v=MNZchQvbMa0' }, // Uma Musume: Cinderella Gray Part 2 (MAL ID: 59741)
      59813: { youtube_id: 'm4yfCS_YBUU', url: 'https://www.youtube.com/watch?v=m4yfCS_YBUU' }, // Chiikawa (MAL ID: 59813)

      // Fallback for your guaranteed anime
      5114: { youtube_id: '-GoNo0DGroU', url: 'https://www.youtube.com/watch?v=-GoNo0DGroU' },
      9253: { youtube_id: 'uMYhjVwp0Fk', url: 'https://www.youtube.com/watch?v=uMYhjVwp0Fk' },
      11061: { youtube_id: 'd6kBeJjAGnQ', url: 'https://www.youtube.com/watch?v=d6kBeJjAGnQ' },
      28977: { youtube_id: 'Y8YgoOQ-6s0', url: 'https://www.youtube.com/watch?v=Y8YgoOQ-6s0' },
      42938: { youtube_id: 'Xku9GpWfBv4', url: 'https://www.youtube.com/watch?v=Xku9GpWfBv4' },
    };

    // Check by MAL ID
    if (trailerDatabase[mal_id]) {
      return trailerDatabase[mal_id];
    }

    // Check by title keywords
    const titleLower = title.toLowerCase();
    if (titleLower.includes('one punch man') || titleLower.includes('onepunch')) {
      return { youtube_id: 'vVnrCjv6rKk', url: 'https://www.youtube.com/watch?v=vVnrCjv6rKk' };
    }
    if (titleLower.includes('kaiju no. 8') || titleLower.includes('kaiju 8')) {
      return { youtube_id: '2ipIqaMUK6Q', url: 'https://www.youtube.com/watch?v=2ipIqaMUK6Q' };
    }
    if (titleLower.includes('my hero academia') || titleLower.includes('boku no hero')) {
      return { youtube_id: '7aMOurgDB-o', url: 'https://www.youtube.com/watch?v=7aMOurgDB-o' };
    }
    // NEW: Add keyword checks for your current results
    if (titleLower.includes('kingdom')) {
      return { youtube_id: 'IT5EyilwgoQ', url: 'https://www.youtube.com/watch?v=IT5EyilwgoQ' };
    }
    if (titleLower.includes('one piece')) {
      return { youtube_id: 'S8_YwFLCh4U', url: 'https://www.youtube.com/watch?v=S8_YwFLCh4U' };
    }
    if (titleLower.includes('uma musume') || titleLower.includes('cinderella gray')) {
      return { youtube_id: 'MNZchQvbMa0', url: 'https://www.youtube.com/watch?v=MNZchQvbMa0' };
    }
    if (titleLower.includes('chiikawa')) {
      return { youtube_id: 'm4yfCS_YBUU', url: 'https://www.youtube.com/watch?v=m4yfCS_YBUU' };
    }

    return { youtube_id: null, url: null };
  }

  // Caching functions
  private async getCachedData(): Promise<any[] | null> {
    try {
      const { data: cache } = await supabase
        .from('cache')
        .select('*')
        .eq('key', this.cacheKey)
        .single();

      if (cache && cache.expires_at > new Date().toISOString()) {
        return cache.value;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private async cacheData(animeData: any[]): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + this.cacheDuration).toISOString();

      await supabase
        .from('cache')
        .upsert({
          key: this.cacheKey,
          value: animeData,
          expires_at: expiresAt,
          updated_at: new Date().toISOString()
        });

      console.log('Data cached successfully');
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  // Utility function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Keep your existing guaranteed anime fallback (unchanged)
  private getGuaranteedAnimeWithTrailers(): any[] {
    // Return a fallback array of guaranteed anime with trailers
    return [
      {
        mal_id: 5114,
        title: 'Fullmetal Alchemist: Brotherhood',
        title_english: 'Fullmetal Alchemist: Brotherhood',
        title_japanese: '鋼の錬金術師 FULLMETAL ALCHEMIST',
        images: {
          jpg: {
            image_url: 'https://cdn.myanimelist.net/images/anime/1223/96541.jpg',
            large_image_url: 'https://cdn.myanimelist.net/images/anime/1223/96541.jpg',
            small_image_url: 'https://cdn.myanimelist.net/images/anime/1223/96541.jpg',
          }
        },
        score: 9.1,
        episodes: 64,
        year: 2009,
        status: 'Finished Airing',
        rating: 'R',
        rank: 1,
        popularity: 1,
        synopsis: 'Two brothers search for a Philosopher\'s Stone after an attempt to revive their deceased mother goes awry and leaves them in damaged physical forms.',
        genres: [{ name: 'Action' }, { name: 'Adventure' }, { name: 'Drama' }, { name: 'Fantasy' }, { name: 'Shounen' }],
        themes: [],
        demographics: [],
        studios: [{ name: 'Bones' }],
        trailer_url: 'https://www.youtube.com/watch?v=-GoNo0DGroU',
        trailer_youtube_id: '-GoNo0DGroU',
        aired: { from: '2009-04-05', to: '2010-07-04' },
        duration: '24 min per ep',
        broadcast: { day: 'Sundays', time: '17:00', timezone: 'Asia/Tokyo', string: 'Sundays at 17:00 (JST)' },
        source: 'Manga',
      }
      // Add more guaranteed anime objects if needed
    ];
  }

  // Keep your existing fallback trending data (unchanged)
  private async getFallbackTrendingAnime(): Promise<any[]> {
    // Return a fallback array of trending anime
    return [
      {
        mal_id: 9253,
        title: 'Steins;Gate',
        title_english: 'Steins;Gate',
        title_japanese: 'シュタインズ・ゲート',
        images: {
          jpg: {
            image_url: 'https://cdn.myanimelist.net/images/anime/5/73199.jpg',
            large_image_url: 'https://cdn.myanimelist.net/images/anime/5/73199.jpg',
            small_image_url: 'https://cdn.myanimelist.net/images/anime/5/73199.jpg',
          }
        },
        score: 9.1,
        episodes: 24,
        year: 2011,
        status: 'Finished Airing',
        rating: 'PG-13',
        rank: 2,
        popularity: 2,
        synopsis: 'A group of friends accidentally invent a device capable of sending messages to the past, triggering a chain of events that alters the course of history.',
        genres: [{ name: 'Sci-Fi' }, { name: 'Thriller' }, { name: 'Drama' }],
        themes: [],
        demographics: [],
        studios: [{ name: 'White Fox' }],
        trailer_url: 'https://www.youtube.com/watch?v=uMYhjVwp0Fk',
        trailer_youtube_id: 'uMYhjVwp0Fk',
        aired: { from: '2011-04-06', to: '2011-09-14' },
        duration: '24 min per ep',
        broadcast: { day: 'Wednesdays', time: '01:35', timezone: 'Asia/Tokyo', string: 'Wednesdays at 01:35 (JST)' },
        source: 'Visual novel',
      }
      // Add more fallback trending anime objects if needed
    ];
  }

  private async logMetrics(animeList: any[]) {
    const withTrailers = animeList.filter(a => a.trailer_youtube_id).length;
    const total = animeList.length;
    const successRate = Math.round((withTrailers / total) * 100);

    console.log(`Trailer Success Rate: ${successRate}% (${withTrailers}/${total})`);

    // Log which sources were successful
    animeList.forEach(anime => {
      console.log(`${anime.title}: ${anime.trailer_youtube_id ? '✅' : '❌'}`);
    });
  }

  // Optional: Store in Supabase for easy updates
  private async getTrailerFromDatabase(mal_id: number, title: string): Promise<{ youtube_id: string | null, url: string | null }> {
    try {
      const { data } = await supabase
        .from('anime_trailers')
        .select('youtube_id, trailer_url')
        .or(`mal_id.eq.${mal_id},title.ilike.%${title}%`)
        .limit(1);

      if (data && data.length > 0) {
        return { youtube_id: data[0].youtube_id, url: data[0].trailer_url };
      }
    } catch (error) {
      console.error('Error fetching from trailer database:', error);
    }

    return { youtube_id: null, url: null };
  }
  // Add this method to AnimeService
  async testJikanApproaches() {
    try {
      const seasonalResponse = await axios.get(`${this.jikanBaseUrl}/seasons/now?limit=5`);
      const topAiringResponse = await axios.get(`${this.jikanBaseUrl}/top/anime?filter=airing&limit=5`);

      const seasonal = (seasonalResponse.data as { data: any[] }).data || [];
      const topAiring = (topAiringResponse.data as { data: any[] }).data || [];

      return {
        seasonal_anime: seasonal.map((a: any) => a.title),
        top_airing_anime: topAiring.map((a: any) => a.title),
        overlap: seasonal.filter((s: any) =>
          topAiring.some((t: any) => t.mal_id === s.mal_id)
        ).map((a: any) => a.title)
      };
    } catch (error) {
      console.error('Error testing approaches:', error);
      return { error: error.message };
    }
  }
}