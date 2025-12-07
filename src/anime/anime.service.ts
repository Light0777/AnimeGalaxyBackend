import { Injectable } from '@nestjs/common';
import { supabase } from '../supabase.client';
import axios from 'axios';

@Injectable()
export class AnimeService {
  async getAnime(id: number) {
    const { data: cached } = await supabase
      .from('anime')
      .select('*')
      .eq('mal_id', id)
      .single();

    if (cached) return cached;

    const { data }: any = await axios.get(
      `https://api.jikan.moe/v4/anime/${id}`
    );

    const anime = data.data;

    await supabase.from('anime').insert({
      mal_id: anime.mal_id,
      title: anime.title,
      synopsis: anime.synopsis,
      image_url: anime.images.jpg.image_url,
      score: anime.score,
      episodes: anime.episodes,
      genres: anime.genres.map((g: any) => g.name),
    });

    return anime;
  }

  async searchAnime(query: string) {
    if (!query) return [];

    const { data }: any = await axios.get(
      `https://api.jikan.moe/v4/anime?q=${query}&limit=20`
    );

    return data.data;
  }
}
