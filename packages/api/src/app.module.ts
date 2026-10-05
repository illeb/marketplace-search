import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ScheduleModule } from '@nestjs/schedule';

import { SearchesService } from './searches/searches.service.js';
import { SearchesResolver } from './searches/searches.resolver.js';
import { ListingsService } from './listings/listings.service.js';
import { ListingsResolver } from './listings/listings.resolver.js';
import { MetaService } from './meta/meta.service.js';
import { MetaResolver } from './meta/meta.resolver.js';
import { SweepService } from './sweep/sweep.service.js';
import { SettingsResolver } from './settings/settings.resolver.js';
import { CONFIG } from './hunter/config.mjs';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      // in memory: the tracked contract is schema.graphql at the repository
      // root, and writing a second copy wherever the process happens to be
      // started only littered the checkout and the image
      autoSchemaFile: true,
      sortSchema: true,
      // the UI is served from the same origin, so no CORS and no playground in prod
      playground: false,
      graphiql: process.env.NODE_ENV !== 'production',
      path: '/graphql',
    }),
  ],
  providers: [
    SearchesService, SearchesResolver,
    ListingsService, ListingsResolver,
    MetaService, MetaResolver,
    SweepService,
    SettingsResolver,
  ],
})
export class AppModule {}

export { CONFIG };
