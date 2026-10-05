import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Settings {
  /** Minuti fra una scansione programmata e la successiva; 0 la disattiva. */
  @Field(() => Int) sweepMinutes!: number;

  /** Il default di partenza, per poter dire all'utente da cosa si discosta. */
  @Field(() => Int) defaultSweepMinutes!: number;
}
