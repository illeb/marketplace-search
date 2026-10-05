import { Args, Query, Resolver } from '@nestjs/graphql';
import { MetaService } from './meta.service.js';
import { Country, Place, Stats, Version } from './meta.model.js';

@Resolver()
export class MetaResolver {
  constructor(private readonly meta: MetaService) {}

  @Query(() => [Place])
  places(@Args('q') q: string): Promise<Place[]> { return this.meta.places(q); }

  @Query(() => [Country])
  countries(): Country[] { return this.meta.countries(); }

  @Query(() => Stats)
  stats(): Stats { return this.meta.stats(); }

  @Query(() => Version)
  version(): Version { return this.meta.version(); }
}
