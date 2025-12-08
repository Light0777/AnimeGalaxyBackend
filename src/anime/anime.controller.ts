import { Controller, Get, Query, Param } from '@nestjs/common';
import { AnimeService } from './anime.service';

@Controller('anime')
export class AnimeController {
  constructor(private readonly animeService: AnimeService) {}

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

  // NEW: Get top currently airing anime
  @Get('top-airing')
  async getTopAiringAnime() {
    return await this.animeService.getTopAiringAnime();
  }

  @Get(':id')
  async getAnime(@Param('id') id: string) {
    return await this.animeService.getAnime(Number(id));
  }
}