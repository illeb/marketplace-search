import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CONFIG } from '../hunter/config.mjs';
import { getSetting } from '../hunter/db.mjs';
import { sweep } from '../hunter/worker.mjs';

/** Chiave in `settings`; il valore è in minuti, 0 vuol dire "non programmare". */
export const SWEEP_KEY = 'sweep_minutes';

const INTERVAL = 'sweep';
const INITIAL = 'sweep-initial';

/**
 * La scansione programmata. Il ritmo è un'impostazione, non un argomento di
 * decoratore, quindi l'intervallo è registrato a mano e può essere rifatto
 * mentre il processo gira: cambiarlo dalle impostazioni non richiede un riavvio.
 */
@Injectable()
export class SweepService implements OnModuleInit {
  private readonly log = new Logger('Sweep');

  constructor(private readonly schedule: SchedulerRegistry) {}

  /**
   * Il ritmo scelto, o quello di default se nessuno l'ha mai toccato. La
   * distinzione conta: `Number(null)` è 0, cioè "mai", quindi l'assenza di
   * un'impostazione va vista prima di convertire o lo scheduler nasce spento.
   */
  minutes(): number {
    const saved = getSetting(SWEEP_KEY);
    if (saved == null) return CONFIG.sweepMinutes;
    const n = Number(saved);
    return Number.isFinite(n) && n >= 0 ? n : CONFIG.sweepMinutes;
  }

  onModuleInit(): void {
    this.apply(this.minutes(), { kick: true });
  }

  /**
   * Arma lo scheduler al ritmo dato, sostituendo quello in corso. `kick` lancia
   * anche una passata poco dopo l'avvio, così un contenitore appena acceso non
   * resta indietro di un intero intervallo; un cambio di impostazione non la
   * vuole, o salvare il modulo scatenerebbe una scansione ogni volta.
   */
  apply(minutes: number, { kick = false } = {}): void {
    this.clear(INTERVAL);
    if (kick) this.clear(INITIAL);

    if (!minutes || minutes <= 0) { this.log.log('scansione programmata disattivata'); return; }

    if (kick) {
      const first = setTimeout(() => void this.run(), 10_000);
      this.schedule.addTimeout(INITIAL, first);
    }
    const every = setInterval(() => void this.run(), minutes * 60_000);
    this.schedule.addInterval(INTERVAL, every);
    this.log.log(`armata, ogni ${minutes} min`);
  }

  /** Togliere un timer che non esiste lancia, quindi si chiede prima. */
  private clear(name: string): void {
    if (name === INTERVAL && this.schedule.doesExist('interval', name))
      this.schedule.deleteInterval(name);
    if (name === INITIAL && this.schedule.doesExist('timeout', name))
      this.schedule.deleteTimeout(name);
  }

  private async run(): Promise<void> {
    // tagged so the history can tell a scheduled pass from a button press
    try { await sweep({ trigger: 'schedule' }); }
    catch (e) { this.log.error(`sweep failed: ${(e as Error).message}`); }
  }
}
