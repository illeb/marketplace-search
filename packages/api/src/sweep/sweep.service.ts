import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CONFIG } from '../hunter/config.mjs';
import { sweep } from '../hunter/worker.mjs';

/**
 * The hourly sweep. The interval is a setting rather than a decorator argument,
 * so it is registered by hand at boot.
 */
@Injectable()
export class SweepService implements OnModuleInit {
  private readonly log = new Logger('Sweep');

  constructor(private readonly schedule: SchedulerRegistry) {}

  onModuleInit(): void {
    const minutes = CONFIG.sweepMinutes;
    if (!minutes || minutes <= 0) { this.log.log('scheduler disabled'); return; }

    // A first pass shortly after boot, so a fresh container is not an hour stale.
    const kick = setTimeout(() => void this.run(), 10_000);
    this.schedule.addTimeout('sweep-initial', kick);

    const every = setInterval(() => void this.run(), minutes * 60_000);
    this.schedule.addInterval('sweep', every);
    this.log.log(`armed, every ${minutes} min`);
  }

  private async run(): Promise<void> {
    try { await sweep(); }
    catch (e) { this.log.error(`sweep failed: ${(e as Error).message}`); }
  }
}
