import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { Vendor } from '../searches/search.model.js';

/**
 * A null on ramGb, storageGb, year and the rest means the advert never said,
 * which is not the same as the machine having none. Roughly a third of adverts
 * omit the specification entirely, and they are kept rather than discarded.
 */
@ObjectType()
export class Listing {
  @Field(() => Int) id!: number;
  @Field() source!: string;
  @Field() url!: string;
  @Field() title!: string;
  @Field({ nullable: true }) description?: string;
  @Field(() => Float) price!: number;
  @Field({ nullable: true }) city?: string;
  @Field({ nullable: true }) country?: string;
  @Field() shippable!: boolean;
  /** Thumbnail from the source advert; null when it carried no photo. */
  @Field({ nullable: true }) imageUrl?: string;
  @Field() firstSeen!: string;
  @Field({ nullable: true }) soldAt?: string;
  @Field() isNew!: boolean;

  /** Null when the advert states no location, never because it is far away. */
  @Field(() => Int, { nullable: true }) distanceKm?: number;

  @Field(() => Vendor, { nullable: true }) vendor?: Vendor;
  @Field({ nullable: true }) family?: string;
  @Field({ nullable: true }) model?: string;
  @Field({ nullable: true }) chassis?: string;
  @Field({ nullable: true }) cpu?: string;
  @Field({ nullable: true }) cpuNum?: string;
  @Field(() => Int, { nullable: true }) generation?: number;
  @Field(() => Int, { nullable: true }) year?: number;
  @Field(() => Int, { nullable: true }) ramGb?: number;
  @Field(() => Int, { nullable: true }) ssdGb?: number;
  @Field(() => Int, { nullable: true }) hddGb?: number;
  @Field(() => Int, { nullable: true }) storageGb?: number;
  @Field(() => Int, { nullable: true }) memTotal?: number;
  @Field(() => Int, { nullable: true }) memSticks?: number;
  @Field(() => Int, { nullable: true }) memPer?: number;
  @Field(() => Int, { nullable: true }) memSpeed?: number;
  @Field() tiered!: boolean;
  @Field(() => Int, { nullable: true }) reviews?: number;
  @Field(() => Int, { nullable: true }) positivePct?: number;

  /** Advisory notes shown beside a row. */
  @Field(() => [String]) cautions!: string[];
  @Field(() => Int) ageDays!: number;
  @Field(() => Float, { nullable: true }) priceMin?: number;
  @Field(() => Float, { nullable: true }) priceMax?: number;
}
