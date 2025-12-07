import { Controller, Get, Query, Param } from '@nestjs/common';
import { AnimeService } from './anime.service';

@Controller('anime')
export class AnimeController {
  constructor(private readonly animeService: AnimeService) {}

  // GET /anime/search?q=naruto
  @Get('search')
  async searchAnime(@Query('q') q: string) {
    if (!q || q.trim() === '') {
      return [];
    }
    return await this.animeService.searchAnime(q);
  }

  // GET /anime/trending - Get currently trending anime
  @Get('trending')
  async getTrendingAnime() {
    return await this.animeService.getTrendingAnime();
  }

  // GET /anime/:id
  @Get(':id')
  async getAnime(@Param('id') id: string) {
    return await this.animeService.getAnime(Number(id));
  }
}