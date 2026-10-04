import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'node:path';

import { SearchesService } from './searches/searches.service.js';
import { SearchesResolver } from './searches/searches.resolver.js';
import { ListingsService } from './listings/listings.service.js';
import { ListingsResolver } from './listings/listings.resolver.js';
import { MetaService } from './meta/meta.service.js';
import { MetaResolver } from './meta/meta.resolver.js';
import { SweepService } from './sweep/sweep.service.js';
import { CONFIG } from './hunter/config.mjs';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
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
  ],
})
export class AppModule {}

export { CONFIG };
