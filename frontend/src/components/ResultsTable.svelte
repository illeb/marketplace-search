<script>
  import {
    money, gb, distance, percent, cpuLabel, storageDetail,
    isMemory, isMachine, isNew, ageLabel, sellerTone, stated, threads, modelLabel,
  } from '../lib/format.js';

  let { rows, search } = $props();

  // Default direction per column: cheapest first, newest first, best-reviewed first.
  const DEFAULT_DIR = { price: 'asc', year: 'desc', reviews: 'desc' };
  let sort = $state({ key: 'price', dir: 'asc' });

  function setSort(key) {
    sort = sort.key === key
      ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: DEFAULT_DIR[key] };
  }

  const VALUE = {
    price: (r) => Number(r.price ?? 0),
    year: (r) => Number(r.year ?? 0),
    reviews: (r) => Number(r.reviews ?? -1),
  };

  const sorted = $derived.by(() => {
    const pick = VALUE[sort.key] ?? VALUE.price;
    const sign = sort.dir === 'asc' ? 1 : -1;
    return rows
      .slice()
      .sort((a, b) => sign * (pick(a) - pick(b)) || Number(a.price ?? 0) - Number(b.price ?? 0));
  });

  const ariaSort = (key) => (sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');
  const hasCentre = $derived(search?.lat != null && search?.lon != null);

  const where = (r) => [r.city, r.country].filter(Boolean).join(', ');
</script>

{#snippet sortButton(label, key)}
  <button type="button" class="sorter" class:on={sort.key === key} onclick={() => setSort(key)}>
    {label}<span class="arrow" aria-hidden="true">{sort.key === key ? (sort.dir === 'asc' ? '▲' : '▼') : '⇅'}</span>
  </button>
{/snippet}

{#snippet notStated(text = 'not stated')}
  <span class="unstated">{text}</span>
{/snippet}

<div class="wrap">
  <table class="results">
    <thead>
      <tr>
        <th scope="col" aria-sort={ariaSort('price')}>{@render sortButton('Price', 'price')}</th>
        <th scope="col" class="plain">Machine</th>
        <th scope="col" aria-sort={ariaSort('year')}>{@render sortButton('Specification', 'year')}</th>
        <th scope="col" aria-sort={ariaSort('reviews')}>{@render sortButton('Seller', 'reviews')}</th>
        <th scope="col" class="plain">Where</th>
      </tr>
    </thead>
    <tbody>
      {#each sorted as r (r.id)}
        <tr class:sold={!!r.sold_at}>
          <td data-label="Price" class="c-price">
            <span class="price mono">{money(r.price)}</span>
            {#if stated(r.price_max) && r.price_max > r.price}
              <span class="was">was {money(r.price_max)}</span>
            {/if}
          </td>

          <td data-label="Machine" class="c-machine">
            <a class="title" href={r.url} target="_blank" rel="noopener noreferrer">
              {r.title || '(untitled advert)'}
            </a>
            <div class="chips">
              {#if isNew(r) && !r.sold_at}<span class="chip new">new today</span>{/if}
              {#if r.sold_at}<span class="chip sold-chip">sold</span>{/if}
              {#if r.chassis && isMachine(r)}<span class="chip">{r.chassis}</span>{/if}
              {#if r.vendor}<span class="chip">{r.vendor}</span>{/if}
              {#if modelLabel(r)}<span class="chip">{modelLabel(r)}</span>{/if}
              {#each r.cautions ?? [] as c (c)}<span class="chip caution">{c}</span>{/each}
            </div>
            <div class="hint">{ageLabel(r.age_days)}</div>
          </td>

          <td data-label="Specification" class="c-spec">
            {#if isMemory(r)}
              <div class="line">
                <span class="k">Kit</span>
                {#if stated(r.mem_sticks) && stated(r.mem_per)}
                  <span class="mono">{r.mem_sticks} × {r.mem_per} GB</span>
                {:else}{@render notStated()}{/if}
              </div>
              <div class="line">
                <span class="k">Total</span>
                {#if gb(r.mem_total)}<span class="mono">{gb(r.mem_total)}</span>{:else}{@render notStated()}{/if}
              </div>
              <div class="line">
                <span class="k">Speed</span>
                {#if stated(r.mem_speed)}<span class="mono">{r.mem_speed} MHz</span>{:else}{@render notStated()}{/if}
              </div>
            {:else if isMachine(r)}
              <div class="line">
                <span class="k">CPU</span>
                {#if cpuLabel(r)}
                  <span class="mono">{cpuLabel(r)}</span>
                {:else}{@render notStated()}{/if}
              </div>
              <div class="line">
                <span class="k">RAM</span>
                {#if gb(r.ram_gb)}<span class="mono">{gb(r.ram_gb)}</span>{:else}{@render notStated()}{/if}
              </div>
              <div class="line">
                <span class="k">Disk</span>
                {#if gb(r.storage_gb)}
                  <span class="mono">{gb(r.storage_gb)}</span>
                {:else}{@render notStated()}{/if}
              </div>
              {#if storageDetail(r) || stated(r.year) || stated(r.generation) || threads(r)}
                <div class="hint">
                  {[
                    storageDetail(r),
                    stated(r.year) ? `${r.year} model` : null,
                    stated(r.generation) ? `gen ${r.generation}` : null,
                    threads(r),
                  ].filter(Boolean).join(' · ')}
                </div>
              {/if}
            {:else}
              <div class="line">
                <span class="k">Condition</span>
                {#if r.condition}<span>{r.condition}</span>{:else}{@render notStated()}{/if}
              </div>
            {/if}
          </td>

          <td data-label="Seller" class="c-seller">
            <div class="trust t-{sellerTone(r)}">
              <b>{r.reviews ?? '?'} review{r.reviews === 1 ? '' : 's'}</b>
              {#if percent(r.positive_pct)}
                <span>{percent(r.positive_pct)} positive</span>
              {:else}
                <span class="unstated">no score</span>
              {/if}
            </div>
            {#if stated(r.reports)}<div class="hint">{r.reports} reports</div>{/if}
          </td>

          <td data-label="Where" class="c-where">
            <div class="source">{r.source}</div>
            {#if where(r)}
              <div>{where(r)}</div>
            {:else}
              <div>{@render notStated('location unknown')}</div>
            {/if}
            {#if distance(r.distance_km)}
              <div class="hint">{distance(r.distance_km)} away</div>
            {:else if hasCentre && where(r)}
              <div class="hint">{@render notStated('distance unknown')}</div>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .wrap {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    overflow-x: auto;
  }

  table { width: 100%; border-collapse: collapse; font-size: 13px; }

  th {
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--muted);
    padding: 0;
    background: var(--surface-2);
    border-bottom: 1px solid var(--line);
    white-space: nowrap;
  }
  th.plain { padding: 9px 12px; }

  .sorter {
    width: 100%;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-transform: inherit;
    letter-spacing: inherit;
    text-align: left;
    padding: 9px 12px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .sorter:hover { color: var(--ink); background: var(--surface-3); border-color: transparent; }
  .sorter.on { color: var(--accent-ink); }
  .arrow { font-size: 9px; opacity: 0.75; }

  td { padding: 11px 12px; border-bottom: 1px solid var(--line); vertical-align: top; }
  tbody tr:last-child td { border-bottom: 0; }
  tbody tr:hover td { background: var(--surface-2); }
  tr.sold td { opacity: 0.55; }

  .c-price { white-space: nowrap; }
  .price { font-size: 17px; font-weight: 700; }
  .was { display: block; font-size: 11px; color: var(--muted); text-decoration: line-through; }

  .c-machine { min-width: 210px; max-width: 420px; }
  .title { font-weight: 600; color: var(--ink); text-decoration: none; line-height: 1.3; }
  .title:hover { color: var(--accent-ink); text-decoration: underline; }

  .chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
  .chip {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--surface-2);
    color: var(--muted);
    border: 1px solid var(--line);
  }
  .chip.new { background: var(--good); color: #fff; border-color: transparent; }
  .chip.sold-chip { background: var(--surface-3); color: var(--ink); }
  .chip.caution {
    background: var(--warn-wash);
    color: var(--warn);
    border-color: var(--warn);
    text-transform: none;
    letter-spacing: 0;
    font-size: 10.5px;
  }

  .c-spec { min-width: 150px; }
  .line { display: flex; gap: 7px; align-items: baseline; }
  .k {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--faint);
    min-width: 38px;
    flex: none;
  }

  .trust { line-height: 1.3; }
  .trust b { display: block; font-family: var(--mono); font-variant-numeric: tabular-nums; }
  .trust span { font-size: 11.5px; color: var(--muted); }
  .t-good b { color: var(--good); }
  .t-warn b { color: var(--warn); }
  .t-bad b { color: var(--bad); }

  .c-where { min-width: 120px; }
  .source {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--accent-ink);
  }

  .hint { margin-top: 3px; }

  /* Below the point where five columns stop fitting, each row becomes a card
     and the column headings move into the cells. */
  @media (max-width: 840px) {
    thead { display: none; }
    table, tbody, tr, td { display: block; width: auto; }
    .wrap { background: transparent; border: 0; overflow-x: visible; }
    tbody tr {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      margin-bottom: 8px;
      padding: 5px 0;
    }
    tbody tr:hover td { background: transparent; }
    td {
      position: relative;
      border-bottom: 0;
      padding: 7px 12px 7px 94px;
      min-height: 0;
    }
    td::before {
      content: attr(data-label);
      position: absolute;
      left: 12px;
      top: 9px;
      width: 74px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--faint);
    }
    .c-machine, .c-spec, .c-seller, .c-where { max-width: none; min-width: 0; }
  }

  @media (max-width: 460px) {
    td { padding: 6px 12px; }
    td::before { position: static; display: block; width: auto; margin-bottom: 3px; }
  }

</style>
