// src/types/jikan.types.ts

export interface JikanImageUrls {
  image_url: string;
  small_image_url: string;
  large_image_url: string;
}

export interface JikanImages {
  jpg: JikanImageUrls;
  webp?: JikanImageUrls;
}

export interface JikanGenre {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

export interface JikanAiredDate {
  day?: number;
  month?: number;
  year?: number;
}

export interface JikanAiredProp {
  from: JikanAiredDate;
  to: JikanAiredDate;
}

export interface JikanAired {
  from: string;
  to: string;
  prop: JikanAiredProp;
}

export interface JikanStudio {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

export interface JikanTrailer {
  youtube_id: string;
  url: string;
  embed_url: string;
}

export interface JikanAnime {
  mal_id: number;
  url: string;
  images: JikanImages;
  trailer?: JikanTrailer;
  title: string;
  title_english?: string;
  title_japanese?: string;
  title_synonyms?: string[];
  type: string;
  source: string;
  episodes: number;
  status: string;
  airing: boolean;
  aired: JikanAired;
  duration: string;
  rating: string;
  score: number;
  scored_by: number;
  rank: number;
  popularity: number;
  members: number;
  favorites: number;
  synopsis: string;
  background?: string;
  season?: string;
  year?: number;
  broadcast: {
    day?: string;
    time?: string;
    timezone?: string;
    string?: string;
  };
  producers: JikanGenre[];
  licensors: JikanGenre[];
  studios: JikanStudio[];
  genres: JikanGenre[];
  themes: JikanGenre[];
  demographics: JikanGenre[];
}

export interface JikanPagination {
  last_visible_page: number;
  has_next_page: boolean;
  current_page: number;
  items: {
    count: number;
    total: number;
    per_page: number;
  };
}

export interface JikanResponse<T> {
  data: T;
  pagination?: JikanPagination;
}

export interface JikanSearchResponse {
  data: JikanAnime[];
  pagination: JikanPagination;
}

export interface JikanSingleResponse {
  data: JikanAnime;
}