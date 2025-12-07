import { Controller, Get, Query, Param } from '@nestjs/common';
import { AnimeService } from './anime.service';

@Controller('anime')
export class AnimeController {
  constructor(private readonly animeService: AnimeService) {}

  // GET /anime/search?q=naruto
  @Get('search')
  async searchAnime(@Query('q') q: string) {
    return await this.animeService.searchAnime(q);
  }

  // GET /anime/:id
  @Get(':id')
  async getAnime(@Param('id') id: string) {
    return await this.animeService.getAnime(Number(id));
  }
}
