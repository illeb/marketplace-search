import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Place {
  @Field() label!: string;
  @Field(() => Float) lat!: number;
  @Field(() => Float) lon!: number;
  @Field() country!: string;
}

@ObjectType()
export class Country {
  @Field() code!: string;
  @Field() name!: string;
}

@ObjectType()
export class Stats {
  @Field(() => Int) listings!: number;
  @Field(() => Int) live!: number;
  @Field(() => Int) sold!: number;
  @Field(() => Int) sellers!: number;
  @Field(() => Int) searches!: number;
}
