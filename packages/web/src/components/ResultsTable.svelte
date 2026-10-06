<script module>
  import * as stylex from '@stylexjs/stylex';
  import { t } from '../lib/tokens.stylex.js';
  import { ui } from '../lib/ui.stylex.js';

  // Two rules here could not survive the move verbatim. `tbody tr:hover td`
  // needs a parent selector, so the hover sits on the row itself and the cells
  // stay transparent. `tr:last-child td` needed :last-child reaching into a
  // child, so the divider moved to the top of each cell instead of the bottom.
  const s = stylex.create({
    wrap: {
      backgroundColor: { default: t.surface, '@media (max-width: 840px)': 'transparent' },
      borderWidth: { default: 1, '@media (max-width: 840px)': 0 },
      borderStyle: 'solid',
      borderColor: t.line,
      borderRadius: t.radius,
      overflowX: { default: 'auto', '@media (max-width: 840px)': 'visible' },
    },
    table: {
      width: { default: '100%', '@media (max-width: 840px)': 'auto' },
      borderCollapse: 'collapse',
      fontSize: 13,
      display: { default: 'table', '@media (max-width: 840px)': 'block' },
    },
    thead: { display: { default: 'table-header-group', '@media (max-width: 840px)': 'none' } },
    tbody: { display: { default: 'table-row-group', '@media (max-width: 840px)': 'block' } },
    th: {
      textAlign: 'left',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      color: t.muted,
      padding: 0,
      backgroundColor: t.surface2,
      borderBottomWidth: 1,
      borderBottomStyle: 'solid',
      borderBottomColor: t.line,
      whiteSpace: 'nowrap',
    },
    thPlain: { paddingBlock: 9, paddingInline: 12 },
    sorter: {
      width: '100%',
      font: 'inherit',
      textTransform: 'inherit',
      letterSpacing: 'inherit',
      textAlign: 'left',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      cursor: 'pointer',
      borderWidth: 0,
      borderRadius: 0,
      paddingBlock: 9,
      paddingInline: 12,
      backgroundColor: { default: 'transparent', ':hover': t.surface3 },
      color: { default: 'inherit', ':hover': t.ink },
    },
    sorterOn: { color: { default: t.accentInk, ':hover': t.accentInk } },
    arrow: { fontSize: 9, opacity: 0.75 },

    tr: {
      display: { default: 'table-row', '@media (max-width: 840px)': 'block' },
      backgroundColor: { default: 'transparent', ':hover': t.surface2 },
      borderWidth: { default: 0, '@media (max-width: 840px)': 1 },
      borderStyle: 'solid',
      borderColor: t.line,
      borderRadius: { default: 0, '@media (max-width: 840px)': t.radius },
      marginBlockEnd: { default: 0, '@media (max-width: 840px)': 8 },
      paddingBlock: { default: 0, '@media (max-width: 840px)': 7 },
      // anchors the floated price
      position: { default: 'static', '@media (max-width: 840px)': 'relative' },
    },
    trSold: { opacity: 0.55 },
    td: {
      display: { default: 'table-cell', '@media (max-width: 840px)': 'block' },
      position: 'relative',
      verticalAlign: 'top',
      paddingBlock: { default: 11, '@media (max-width: 840px)': 4 },
      paddingInlineStart: 12,
      paddingInlineEnd: 12,
      borderTopWidth: { default: 1, '@media (max-width: 840px)': 0 },
      borderTopStyle: 'solid',
      borderTopColor: t.line,
      '::before': {
        content: 'attr(data-label)',
        display: { default: 'none', '@media (max-width: 840px)': 'block' },
        marginBlockEnd: 1,
        fontSize: 9.5,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: t.faint,
      },
    },
    // the price needs no caption and no row of its own on a phone
    tdPriceMobile: {
      position: { default: 'static', '@media (max-width: 840px)': 'absolute' },
      top: 7,
      insetInlineEnd: 12,
      paddingBlock: { default: 11, '@media (max-width: 840px)': 0 },
      '::before': { display: 'none' },
    },
    // seller and where are short, so they share a line instead of taking two
    tdHalf: {
      display: { default: 'table-cell', '@media (max-width: 840px)': 'inline-block' },
      width: { default: 'auto', '@media (max-width: 840px)': '50%' },
      verticalAlign: 'top',
    },
    cPrice: { whiteSpace: 'nowrap' },
    price: { fontSize: 17, fontWeight: 700 },
    was: { display: 'block', fontSize: 11, color: t.muted, textDecoration: 'line-through' },
    ship: { display: 'block', fontSize: 11, color: t.muted },

    cMachine: {
      minWidth: { default: 210, '@media (max-width: 840px)': 0 },
      maxWidth: { default: 420, '@media (max-width: 840px)': 'none' },
      // the thumbnail and the title say what this is
      '::before': { display: 'none' },
    },
    // the thumbnail sits beside the title rather than above it, so a row grows
    // sideways instead of taller — which is the whole point on a phone
    machineRow: { display: 'flex', gap: 10, alignItems: 'flex-start' },
    star: {
      flexGrow: 0, flexShrink: 0,
      font: 'inherit',
      fontSize: 17,
      lineHeight: 1,
      paddingBlock: 2,
      paddingInline: 4,
      cursor: 'pointer',
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderRadius: 4,
      color: { default: t.faint, ':hover': t.warn },
    },
    starOn: { color: { default: t.warn, ':hover': t.warn } },
    thumb: {
      flexGrow: 0, flexShrink: 0,
      width: { default: 56, '@media (max-width: 460px)': 46 },
      height: { default: 56, '@media (max-width: 460px)': 46 },
      objectFit: 'cover',
      borderRadius: 5,
      backgroundColor: t.surface2,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: t.line,
    },
    thumbWrap: { position: 'relative', flexGrow: 0, flexShrink: 0, lineHeight: 0 },
    // the enlarged copy floats out of the cell, so the row keeps its height
    zoom: {
      position: 'fixed',
      zIndex: 200,
      width: 300,
      height: 300,
      // app.css imposta img { max-width: 100% }: senza questo l'anteprima resta
      // larga quanto la miniatura che la apre
      maxWidth: 'none',
      objectFit: 'contain',
      padding: 6,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: t.lineStrong,
      borderRadius: t.radiusSm,
      boxShadow: t.shadow,
      pointerEvents: 'none',
    },
    machineText: {
      minWidth: 0,
      flexGrow: 1,
      paddingInlineEnd: { default: 0, '@media (max-width: 840px)': 72 },
    },
    title: {
      fontWeight: 600,
      lineHeight: 1.3,
      color: { default: t.ink, ':hover': t.accentInk },
      textDecoration: { default: 'none', ':hover': 'underline' },
    },
    chips: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBlockStart: 5 },
    chip: {
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      paddingBlock: 2,
      paddingInline: 6,
      borderRadius: 4,
      backgroundColor: t.surface2,
      color: t.muted,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: t.line,
    },
    chipNew: { backgroundColor: t.good, color: '#fff', borderColor: 'transparent' },
    chipSold: { backgroundColor: t.surface3, color: t.ink },
    chipCaution: {
      backgroundColor: t.warnWash,
      color: t.warn,
      borderColor: t.warn,
      textTransform: 'none',
      letterSpacing: 0,
      fontSize: 10.5,
    },

    cSpec: {
      minWidth: { default: 150, '@media (max-width: 840px)': 0 },
      '::before': { display: 'none' },
    },
    line: {
      display: { default: 'flex', '@media (max-width: 840px)': 'inline-flex' },
      gap: 7,
      alignItems: 'baseline',
      marginInlineEnd: { default: 0, '@media (max-width: 840px)': 14 },
    },
    k: {
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      color: t.faint,
      minWidth: 38,
      flexGrow: 0, flexShrink: 0,
    },

    cSeller: { minWidth: { default: 0, '@media (max-width: 840px)': 0 } },
    trust: { lineHeight: 1.3 },
    trustB: { display: 'block', fontFamily: t.mono, fontVariantNumeric: 'tabular-nums' },
    trustGood: { color: t.good },
    trustWarn: { color: t.warn },
    trustBad: { color: t.bad },
    trustPct: { fontSize: 11.5, color: t.muted },

    cWhere: { minWidth: { default: 120, '@media (max-width: 840px)': 0 } },
    source: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: t.accentInk,
    },
    hintTop: { marginBlockStart: 3 },
  });

  const TRUST = { good: s.trustGood, warn: s.trustWarn, bad: s.trustBad };
</script>

<script>
  import {
    money, gb, distance, percent, cpuLabel, storageDetail,
    isMemory, isMachine, isNew, addedAt, hasRealDate, seenAt, sellerTone, stated, threads, modelLabel,
    shipping, moneyCents,
  } from '../lib/format.js';

  let { rows, search, onfavourite } = $props();

  // L'anteprima ingrandita: url e posizione sullo schermo, calcolate dal
  // riquadro della miniatura sotto il puntatore.
  let zoom = $state(null);
  const ZOOM = 300;

  function openZoom(row, event) {
    if (!row.imageUrl) return;
    const r = event.currentTarget.getBoundingClientRect();
    const gap = 10;
    // a destra della miniatura se ci sta, altrimenti a sinistra
    const right = r.right + gap;
    const left = right + ZOOM <= window.innerWidth ? right : Math.max(gap, r.left - gap - ZOOM);
    // centrata sulla riga ma sempre dentro lo schermo
    const top = Math.min(
      Math.max(gap, r.top + r.height / 2 - ZOOM / 2),
      Math.max(gap, window.innerHeight - ZOOM - gap),
    );
    zoom = { url: row.imageUrl, left, top };
  }

  const closeZoom = () => { zoom = null; };

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
  <button type="button" onclick={() => setSort(key)}
    {...stylex.attrs(s.sorter, sort.key === key && s.sorterOn)}>
    {label}<span aria-hidden="true" {...stylex.attrs(s.arrow)}>{sort.key === key ? (sort.dir === 'asc' ? '▲' : '▼') : '⇅'}</span>
  </button>
{/snippet}

{#snippet notStated(text = 'non indicato')}
  <span {...stylex.attrs(ui.unstated)}>{text}</span>
{/snippet}

<div {...stylex.attrs(s.wrap)}>
  <table {...stylex.attrs(s.table)}>
    <thead {...stylex.attrs(s.thead)}>
      <tr>
        <th scope="col" {...stylex.attrs(s.th)} aria-sort={ariaSort('price')}>{@render sortButton('Prezzo', 'price')}</th>
        <th scope="col" {...stylex.attrs(s.th, s.thPlain)}>Macchina</th>
        <th scope="col" {...stylex.attrs(s.th)} aria-sort={ariaSort('year')}>{@render sortButton('Specifiche', 'year')}</th>
        <th scope="col" {...stylex.attrs(s.th)} aria-sort={ariaSort('reviews')}>{@render sortButton('Venditore', 'reviews')}</th>
        <th scope="col" {...stylex.attrs(s.th, s.thPlain)}>Dove</th>
      </tr>
    </thead>
    <tbody {...stylex.attrs(s.tbody)}>
      {#each sorted as r (r.id)}
        <tr {...stylex.attrs(s.tr, !!r.soldAt && s.trSold)}>
          <td data-label="Prezzo" {...stylex.attrs(s.td, s.cPrice, s.tdPriceMobile)}>
            <span {...stylex.attrs(ui.mono, s.price)}>{money(r.price)}</span>
            {#if stated(r.priceMax) && r.priceMax > r.price}
              <span {...stylex.attrs(s.was)}>prima {money(r.priceMax)}</span>
            {/if}
            {#if shipping(r) != null}
              <span
                {...stylex.attrs(s.ship)}
                title={r.shippingFrom
                  ? 'Costo minimo di spedizione: quello vero dipende dal corriere scelto.'
                  : "Costo di spedizione dichiarato dall'annuncio."}
              >
                {shipping(r) === 0 ? 'spedizione gratis' : `+ ${r.shippingFrom ? 'da ' : ''}${moneyCents(shipping(r))} sped.`}
              </span>
            {/if}
          </td>

          <td data-label="Macchina" {...stylex.attrs(s.td, s.cMachine)}>
            <div {...stylex.attrs(s.machineRow)}>
              {#if r.imageUrl}
                <span
                  role="presentation"
                  onmouseenter={(e) => openZoom(r, e)}
                  onmouseleave={closeZoom}
                  {...stylex.attrs(s.thumbWrap)}
                >
                  <img
                    src={r.imageUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    referrerpolicy="no-referrer"
                    onerror={(e) => (e.currentTarget.hidden = true)}
                    {...stylex.attrs(s.thumb)}
                  />
                </span>
              {/if}
              <button
                type="button"
                onclick={() => onfavourite?.(r)}
                aria-pressed={!!r.isFavourite}
                title={r.isFavourite ? 'Togli dai preferiti' : 'Metti tra i preferiti'}
                {...stylex.attrs(s.star, r.isFavourite && s.starOn)}
              >{r.isFavourite ? '★' : '☆'}</button>
              <div {...stylex.attrs(s.machineText)}>
              <a href={r.url} target="_blank" rel="noopener noreferrer" {...stylex.attrs(s.title)}>
              {r.title || '(annuncio senza titolo)'}
            </a>
            <div {...stylex.attrs(s.chips)}>
              {#if isNew(r) && !r.soldAt}<span {...stylex.attrs(s.chip, s.chipNew)}>nuovo oggi</span>{/if}
              {#if r.soldAt}<span {...stylex.attrs(s.chip, s.chipSold)}>venduto</span>{/if}
              {#if r.chassis && isMachine(r)}<span {...stylex.attrs(s.chip)}>{r.chassis}</span>{/if}
              {#if r.vendor}<span {...stylex.attrs(s.chip)}>{r.vendor}</span>{/if}
              {#if modelLabel(r)}<span {...stylex.attrs(s.chip)}>{modelLabel(r)}</span>{/if}
              {#each r.cautions ?? [] as c (c)}<span {...stylex.attrs(s.chip, s.chipCaution)}>{c}</span>{/each}
            </div>
            <div
              {...stylex.attrs(ui.hint, s.hintTop)}
              title={!hasRealDate(r)
                ? `Il marketplace non l'ha indicata. Noi lo abbiamo visto il ${seenAt(r)}.`
                : r.postedApprox
                  ? `Vinted la dà come tempo trascorso, quindi è ricostruita: ${seenAt(r)} il primo avvistamento.`
                  : "Data di pubblicazione dell'annuncio sul marketplace."}
            >
              {#if !hasRealDate(r)}
                data di pubblicazione non indicata
              {:else}
                pubblicato {r.postedApprox ? 'circa ' : ''}{addedAt(r)}
              {/if}
            </div>
              </div>
            </div>
          </td>

          <td data-label="Specifiche" {...stylex.attrs(s.td, s.cSpec)}>
            {#if isMemory(r)}
              <div {...stylex.attrs(s.line)}>
                <span {...stylex.attrs(s.k)}>Kit</span>
                {#if stated(r.memSticks) && stated(r.memPer)}
                  <span {...stylex.attrs(ui.mono)}>{r.memSticks} × {r.memPer} GB</span>
                {:else}{@render notStated()}{/if}
              </div>
              <div {...stylex.attrs(s.line)}>
                <span {...stylex.attrs(s.k)}>Totale</span>
                {#if gb(r.memTotal)}<span {...stylex.attrs(ui.mono)}>{gb(r.memTotal)}</span>{:else}{@render notStated()}{/if}
              </div>
              <div {...stylex.attrs(s.line)}>
                <span {...stylex.attrs(s.k)}>Freq.</span>
                {#if stated(r.memSpeed)}<span {...stylex.attrs(ui.mono)}>{r.memSpeed} MHz</span>{:else}{@render notStated()}{/if}
              </div>
            {:else if isMachine(r)}
              <div {...stylex.attrs(s.line)}>
                <span {...stylex.attrs(s.k)}>CPU</span>
                {#if cpuLabel(r)}
                  <span {...stylex.attrs(ui.mono)}>{cpuLabel(r)}</span>
                {:else}{@render notStated()}{/if}
              </div>
              <div {...stylex.attrs(s.line)}>
                <span {...stylex.attrs(s.k)}>RAM</span>
                {#if gb(r.ramGb)}<span {...stylex.attrs(ui.mono)}>{gb(r.ramGb)}</span>{:else}{@render notStated()}{/if}
              </div>
              <div {...stylex.attrs(s.line)}>
                <span {...stylex.attrs(s.k)}>Disco</span>
                {#if gb(r.storageGb)}
                  <span {...stylex.attrs(ui.mono)}>{gb(r.storageGb)}</span>
                {:else}{@render notStated()}{/if}
              </div>
              {#if storageDetail(r) || stated(r.year) || stated(r.generation) || threads(r)}
                <div {...stylex.attrs(ui.hint, s.hintTop)}>
                  {[
                    storageDetail(r),
                    stated(r.year) ? `modello ${r.year}` : null,
                    stated(r.generation) ? `${r.generation}ª gen` : null,
                    threads(r),
                  ].filter(Boolean).join(' · ')}
                </div>
              {/if}
            {:else}
              <div {...stylex.attrs(s.line)}>
                <span {...stylex.attrs(s.k)}>Stato</span>
                {#if r.condition}<span>{r.condition}</span>{:else}{@render notStated()}{/if}
              </div>
            {/if}
          </td>

          <td data-label="Venditore" {...stylex.attrs(s.td, s.cSeller, s.tdHalf)}>
            <div {...stylex.attrs(s.trust)}>
              <b {...stylex.attrs(s.trustB, TRUST[sellerTone(r)])}>{r.reviews ?? '?'} recension{r.reviews === 1 ? 'e' : 'i'}</b>
              {#if percent(r.positivePct)}
                <span {...stylex.attrs(s.trustPct)}>{percent(r.positivePct)} positive</span>
              {:else}
                <span {...stylex.attrs(ui.unstated)}>nessun punteggio</span>
              {/if}
            </div>
            {#if stated(r.reports)}<div {...stylex.attrs(ui.hint, s.hintTop)}>{r.reports} segnalazioni</div>{/if}
          </td>

          <td data-label="Dove" {...stylex.attrs(s.td, s.cWhere, s.tdHalf)}>
            <div {...stylex.attrs(s.source)}>{r.source}</div>
            {#if where(r)}
              <div>{where(r)}</div>
            {:else}
              <div>{@render notStated('posizione non indicata')}</div>
            {/if}
            {#if distance(r.distanceKm)}
              <div {...stylex.attrs(ui.hint, s.hintTop)}>{distance(r.distanceKm)} di distanza</div>
            {:else if hasCentre && where(r)}
              <div {...stylex.attrs(ui.hint, s.hintTop)}>{@render notStated('distanza non nota')}</div>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

{#if zoom}
  <img
    src={zoom.url}
    alt=""
    aria-hidden="true"
    referrerpolicy="no-referrer"
    {...stylex.attrs(s.zoom)}
    style="left: {zoom.left}px; top: {zoom.top}px"
  />
{/if}
