import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CONFIG } from '../hunter/config.mjs';
import { setSetting } from '../hunter/db.mjs';
import { SweepService, SWEEP_KEY } from '../sweep/sweep.service.js';
import { Settings } from './settings.model.js';

/** Un giorno, oltre il quale programmare una scansione non vuol più dire nulla. */
const MAX_MINUTES = 1440;

@Resolver()
export class SettingsResolver {
  constructor(private readonly sweep: SweepService) {}

  @Query(() => Settings)
  settings(): Settings {
    return { sweepMinutes: this.sweep.minutes(), defaultSweepMinutes: CONFIG.sweepMinutes };
  }

  /**
   * Il ritmo nuovo vale subito: l'intervallo in corso viene sostituito senza
   * riavviare il processo. Non fa partire una scansione, altrimenti salvare
   * l'impostazione ne scatenerebbe una ogni volta.
   */
  @Mutation(() => Settings)
  updateSettings(@Args('sweepMinutes', { type: () => Int }) sweepMinutes: number): Settings {
    if (!Number.isInteger(sweepMinutes) || sweepMinutes < 0 || sweepMinutes > MAX_MINUTES)
      throw new Error(`sweepMinutes deve stare fra 0 e ${MAX_MINUTES} minuti`);
    setSetting(SWEEP_KEY, sweepMinutes);
    this.sweep.apply(sweepMinutes);
    return { sweepMinutes, defaultSweepMinutes: CONFIG.sweepMinutes };
  }
}
