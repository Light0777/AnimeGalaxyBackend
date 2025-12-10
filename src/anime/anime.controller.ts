import { Controller, Get, Query, Param } from '@nestjs/common';
import { AnimeService } from './anime.service';
import axios from 'axios';

@Controller('anime')
export class AnimeController {
  jikanBaseUrl: any;
  constructor(private readonly animeService: AnimeService) { }

  @Get('search')
  async searchAnime(@Query('q') q: string) {
    if (!q || q.trim() === '') {
      return [];
    }
    return await this.animeService.searchAnime(q);
  }

  @Get('trending')
  async getTrendingAnime() {
    return await this.animeService.getTrendingAnime();
  }

  @Get('top-airing')
  async getTopAiringAnime() {
    return await this.animeService.getTopAiringAnime();
  }

  // Add this to AnimeController
  @Get('debug/top-airing')
  async debugTopAiring() {
    const result = await this.animeService.getTopAiringAnime();
    return {
      message: "Top Airing Anime Data",
      data: result,
      summary: {
        total: result.length,
        with_trailers: result.filter(a => a.trailer_youtube_id).length,
        currently_airing: result.filter(a => a.status === 'Currently Airing').length
      }
    };
  }

  @Get(':id')
  async getAnime(@Param('id') id: string) {
    return await this.animeService.getAnime(Number(id));
  }

  // Test endpoint to debug
  @Get('debug/trailers')
  async debugTrailers() {
    const result = await this.animeService.getTopAiringAnime();
    return {
      message: "Debug: Checking trailer data",
      total_anime: result.length,
      first_anime: {
        title: result[0]?.title,
        has_trailer_youtube_id: !!result[0]?.trailer_youtube_id,
        trailer_youtube_id: result[0]?.trailer_youtube_id,
        trailer_url: result[0]?.trailer_url,
        all_fields: Object.keys(result[0] || {})
      },
      all_anime: result.map(anime => ({
        title: anime.title,
        trailer_youtube_id: anime.trailer_youtube_id
      }))
    };
  }
  // Add this to AnimeController class
  @Get('test/approaches')
  async testApproaches() {
    try {
      // Test seasonal endpoint
      const seasonalResponse = await axios.get('https://api.jikan.moe/v4/seasons/now?limit=5');
      const seasonal = (seasonalResponse.data as { data: any[] }).data || [];

      // Test top airing endpoint  
      const topAiringResponse = await axios.get('https://api.jikan.moe/v4/top/anime?filter=airing&limit=5');
      const topAiring = (topAiringResponse.data as { data: any[] }).data || [];

      return {
        seasonal_approach: {
          endpoint: '/seasons/now',
          count: seasonal.length,
          anime: seasonal.map((a: any) => ({
            title: a.title,
            popularity: a.popularity,
            score: a.score,
            status: a.status,
            has_trailer: !!a.trailer?.youtube_id
          }))
        },
        top_airing_approach: {
          endpoint: '/top/anime?filter=airing',
          count: topAiring.length,
          anime: topAiring.map((a: any) => ({
            title: a.title,
            popularity: a.popularity,
            score: a.score,
            status: a.status,
            has_trailer: !!a.trailer?.youtube_id
          }))
        },
        recommendation: {
          for_seasonal_anime: "Use /seasons/now",
          for_long_running: "Use /top/anime?filter=airing",
          for_mixed: "Use hybrid approach (seasonal + direct fetch of long-running)"
        }
      };
    } catch (error) {
      return {
        error: error.message,
        message: "Make sure you imported axios at the top of your controller"
      };
    }
  }
}