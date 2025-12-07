import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnimeModule } from './anime/anime.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AnimeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
