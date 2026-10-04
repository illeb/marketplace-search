import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { ListingsService } from './listings.service.js';
import { Listing } from './listing.model.js';

@Resolver(() => Listing)
export class ListingsResolver {
  constructor(private readonly listings: ListingsService) {}

  @Query(() => [Listing], { name: 'listings' })
  forSearch(@Args('searchId', { type: () => Int }) searchId: number): Listing[] {
    return this.listings.forSearch(searchId);
  }
}
