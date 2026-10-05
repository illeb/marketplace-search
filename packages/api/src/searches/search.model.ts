import { Field, Float, ID, InputType, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum SearchKind { COMPUTER = 'COMPUTER', MEMORY = 'MEMORY', OTHER = 'OTHER' }
export enum Vendor { INTEL = 'INTEL', AMD = 'AMD' }

registerEnumType(SearchKind, { name: 'SearchKind' });
registerEnumType(Vendor, { name: 'Vendor' });

@ObjectType()
export class Search {
  @Field(() => Int) id!: number;
  @Field() name!: string;
  @Field() query!: string;
  /** Parole da non vedere, separate da virgole. Vuota vuol dire nessuna. */
  @Field() exclude!: string;
  @Field(() => SearchKind) kind!: SearchKind;
  @Field(() => Float) minPrice!: number;
  @Field(() => Float) maxPrice!: number;
  @Field(() => [String]) sources!: string[];
  @Field(() => [String]) countries!: string[];
  @Field({ nullable: true }) place?: string;
  @Field(() => Float, { nullable: true }) lat?: number;
  @Field(() => Float, { nullable: true }) lon?: number;
  @Field(() => Int) radiusKm!: number;
  @Field() includeUnlocated!: boolean;
  @Field(() => [String]) chassis!: string[];
  @Field(() => Vendor, { nullable: true }) vendor?: Vendor;
  @Field(() => [String]) brands!: string[];
  @Field(() => [String]) cpuTiers!: string[];
  @Field(() => Int) minGen!: number;
  @Field(() => Int) minYear!: number;
  @Field(() => Int) minRam!: number;
  @Field(() => Int) minStorage!: number;
  @Field(() => Int) minReviews!: number;
  @Field() enabled!: boolean;
  @Field({ nullable: true }) lastRunAt?: string;

  /** Live match count, so the sidebar needs no listings at all. */
  @Field(() => Int) count!: number;
  /** Of those, the ones first matched today. */
  @Field(() => Int) newCount!: number;
}

@InputType()
export class SearchInput {
  @Field({ nullable: true }) name?: string;
  @Field({ nullable: true }) query?: string;
  @Field({ nullable: true }) exclude?: string;
  @Field(() => SearchKind, { nullable: true }) kind?: SearchKind;
  @Field(() => Float, { nullable: true }) minPrice?: number;
  @Field(() => Float, { nullable: true }) maxPrice?: number;
  @Field(() => [String], { nullable: true }) sources?: string[];
  @Field(() => [String], { nullable: true }) countries?: string[];
  @Field({ nullable: true }) place?: string;
  @Field(() => Float, { nullable: true }) lat?: number;
  @Field(() => Float, { nullable: true }) lon?: number;
  @Field(() => Int, { nullable: true }) radiusKm?: number;
  @Field({ nullable: true }) includeUnlocated?: boolean;
  @Field(() => [String], { nullable: true }) chassis?: string[];
  @Field(() => Vendor, { nullable: true }) vendor?: Vendor;
  @Field(() => [String], { nullable: true }) brands?: string[];
  @Field(() => [String], { nullable: true }) cpuTiers?: string[];
  @Field(() => Int, { nullable: true }) minGen?: number;
  @Field(() => Int, { nullable: true }) minYear?: number;
  @Field(() => Int, { nullable: true }) minRam?: number;
  @Field(() => Int, { nullable: true }) minStorage?: number;
  @Field(() => Int, { nullable: true }) minReviews?: number;
  @Field({ nullable: true }) enabled?: boolean;
}

@ObjectType()
export class RunResult {
  @Field(() => Int) found!: number;
  @Field(() => Int) offTopic!: number;
  @Field(() => Int) matched!: number;
}

/** Where a running scan has got to. Absent when nothing is running. */
@ObjectType()
export class RunProgress {
  @Field(() => Int) searchId!: number;
  /** 'collect' while reading a marketplace, then 'details', then 'match'. */
  @Field() phase!: string;
  @Field(() => Int) step!: number;
  @Field(() => Int) steps!: number;
  /** The marketplace being read, or what the later phases are doing. */
  @Field() label!: string;
  @Field(() => Int) found!: number;
  @Field() startedAt!: string;
}

@ObjectType()
export class RunRecord {
  @Field(() => Int) id!: number;
  @Field(() => Int, { nullable: true }) searchId?: number;
  @Field({ nullable: true }) searchName?: string;
  /** 'schedule' for the hourly pass, 'sweep' for the button, 'manual' for one search. */
  @Field() trigger!: string;
  @Field() startedAt!: string;
  /** Null while running, or if the process died mid-scan. */
  @Field({ nullable: true }) finishedAt?: string;
  @Field(() => Int, { nullable: true }) found?: number;
  @Field(() => Int, { nullable: true }) offTopic?: number;
  @Field(() => Int, { nullable: true }) matched?: number;
  @Field({ nullable: true }) error?: string;
}
