import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { SearchesService } from './searches.service.js';
import { RunResult, RunProgress, RunRecord, Search, SearchInput } from './search.model.js';

@Resolver(() => Search)
export class SearchesResolver {
  constructor(private readonly searches: SearchesService) {}

  @Query(() => [Search], { name: 'searches' })
  findAll(): Search[] { return this.searches.findAll(); }

  @Query(() => Search, { name: 'search', nullable: true })
  findOne(@Args('id', { type: () => Int }) id: number): Search | null {
    return this.searches.findOne(id);
  }

  @Query(() => [RunProgress], { name: 'runProgress' })
  progress(): RunProgress[] { return this.searches.progress(); }

  @Query(() => [RunRecord], { name: 'runHistory' })
  history(@Args('limit', { type: () => Int, nullable: true }) limit?: number): RunRecord[] {
    return this.searches.history(limit ?? 50);
  }

  @Mutation(() => Search)
  createSearch(@Args('input') input: SearchInput): Search {
    return this.searches.create(input);
  }

  @Mutation(() => Search)
  updateSearch(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: SearchInput,
  ): Search {
    return this.searches.update(id, input);
  }

  @Mutation(() => Boolean)
  deleteSearch(@Args('id', { type: () => Int }) id: number): boolean {
    return this.searches.remove(id);
  }

  /** Takes one to four minutes: it reads three marketplaces. */
  @Mutation(() => RunResult)
  runSearch(@Args('id', { type: () => Int }) id: number): Promise<RunResult> {
    return this.searches.run(id);
  }

  /** Returns as soon as the sweep is started, not when it finishes. */
  @Mutation(() => Boolean)
  sweep(): boolean { return this.searches.sweepAll(); }
}
