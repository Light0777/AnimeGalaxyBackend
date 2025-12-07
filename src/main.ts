import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      "http://localhost:3000",         // local frontend
      "http://localhost:3001",         // optional, if you run frontend on 3001
      "https://animegalaxy.vercel.app" // production frontend
    ],
    credentials: true,
  });

  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  await app.listen(port);
  console.log(`Server running on port ${port}`);
}
bootstrap();
