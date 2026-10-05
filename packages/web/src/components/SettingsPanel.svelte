<script module>
  import * as stylex from '@stylexjs/stylex';
  import { t } from '../lib/tokens.stylex.js';
  import { ui } from '../lib/ui.stylex.js';

  const s = stylex.create({
    panel: { marginBlockStart: 10, display: 'flex', flexDirection: 'column', gap: 10 },
    head: { margin: 0, fontSize: 13, letterSpacing: '0.04em', textTransform: 'uppercase', color: t.faint },
    row: { display: 'flex', alignItems: 'center', gap: 8 },
    grow: { flexGrow: 1, minWidth: 0 },
    note: { margin: 0 },
    bad: { color: t.bad },
    saved: { color: t.good },
  });

  /**
   * I ritmi offerti. Non è un numero libero perché un campo aperto invita a
   * scrivere "5" e a farsi bloccare dai marketplace: una passata completa legge
   * tre siti per ogni ricerca attiva e dura minuti, quindi sotto la mezz'ora
   * non si farebbe in tempo a finire prima di ricominciare.
   */
  const RATES = [
    { minutes: 30, label: 'ogni 30 minuti' },
    { minutes: 60, label: 'ogni ora' },
    { minutes: 120, label: 'ogni 2 ore' },
    { minutes: 180, label: 'ogni 3 ore' },
    { minutes: 360, label: 'ogni 6 ore' },
    { minutes: 720, label: 'ogni 12 ore' },
    { minutes: 1440, label: 'una volta al giorno' },
    { minutes: 0, label: 'mai (solo a mano)' },
  ];
</script>

<script>
  let { settings, saving = false, error = null, savedAt = null, onsave } = $props();

  // Il valore mostrato parte da quello salvato e segue le scelte dell'utente
  // finché il server non ne manda uno diverso.
  let chosen = $state(null);
  const current = $derived(chosen ?? settings?.sweepMinutes ?? null);
  const changed = $derived(settings != null && current !== settings.sweepMinutes);

  $effect(() => {
    // una risposta del server è la nuova verità: si lascia cadere la scelta locale
    if (settings) chosen = null;
  });

  const describe = (m) => RATES.find((r) => r.minutes === m)?.label ?? `ogni ${m} minuti`;
</script>

<div {...stylex.attrs(ui.panel, s.panel)}>
  <h2 {...stylex.attrs(s.head)}>Impostazioni generali</h2>

  {#if !settings}
    <p {...stylex.attrs(ui.hint, s.note)}>Carico…</p>
  {:else}
    <div {...stylex.attrs(ui.field)}>
      <label for="sweep-rate" {...stylex.attrs(ui.label)}>Ritmo delle scansioni</label>
      <select
        id="sweep-rate"
        value={current}
        onchange={(e) => { chosen = Number(e.currentTarget.value); }}
        {...stylex.attrs(ui.input)}
      >
        {#each RATES as r (r.minutes)}
          <option value={r.minutes}>{r.label}</option>
        {/each}
      </select>
    </div>

    <p {...stylex.attrs(ui.hint, s.note)}>
      {#if settings.sweepMinutes === 0}
        Nessuna scansione automatica: le ricerche partono solo dai pulsanti.
      {:else}
        Ogni passaggio lancia tutte le ricerche attive, una dopo l'altra. Vale subito,
        senza riavviare.
      {/if}
      {#if settings.sweepMinutes !== settings.defaultSweepMinutes}
        Il valore di partenza è {describe(settings.defaultSweepMinutes)}.
      {/if}
    </p>

    <div {...stylex.attrs(s.row)}>
      <button
        type="button"
        disabled={!changed || saving}
        onclick={() => onsave(current)}
        {...stylex.attrs(ui.button, ui.primary, ui.tiny)}
      >
        {saving ? 'Salvo…' : 'Salva'}
      </button>
      <span {...stylex.attrs(ui.hint, s.grow)}>
        {#if error}
          <span {...stylex.attrs(s.bad)}>{error}</span>
        {:else if changed}
          Non ancora salvato.
        {:else if savedAt}
          <span {...stylex.attrs(s.saved)}>Salvato.</span>
        {/if}
      </span>
    </div>
  {/if}
</div>
