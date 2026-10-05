import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ListingsService } from './listings.service.js';
import { Listing } from './listing.model.js';
import { SearchesService } from '../searches/searches.service.js';
import { SearchInput } from '../searches/search.model.js';

@Resolver(() => Listing)
export class ListingsResolver {
  constructor(
    private readonly listings: ListingsService,
    private readonly searches: SearchesService,
  ) {}

  @Query(() => [Listing], { name: 'listings' })
  forSearch(@Args('searchId', { type: () => Int }) searchId: number): Listing[] {
    return this.listings.forSearch(searchId);
  }

  /**
   * What a search would match if the given filters were saved. Nothing is
   * written, so the editor can show the effect of a change before you commit
   * to it. Reads only what is already stored, so it costs no network.
   */
  @Query(() => [Listing], { name: 'preview' })
  preview(
    @Args('searchId', { type: () => Int }) searchId: number,
    @Args('input') input: SearchInput,
  ): Listing[] {
    const { ids, centre } = this.searches.wouldMatch(searchId, input);
    return this.listings.byIds(ids, centre);
  }

  @Query(() => [Listing], { name: 'favourites' })
  favourites(): Listing[] {
    return this.listings.favourites();
  }

  /** Saving an advert keeps it whatever happens to the search that found it. */
  @Mutation(() => Boolean)
  setFavourite(
    @Args('listingId', { type: () => Int }) listingId: number,
    @Args('value') value: boolean,
  ): boolean {
    return this.listings.setFavourite(listingId, value);
  }
}
