<script module>
  import * as stylex from '@stylexjs/stylex';
  import { t } from '../lib/tokens.stylex.js';
  import { ui } from '../lib/ui.stylex.js';

  const s = stylex.create({
    place: { position: 'relative', display: 'flex', flexDirection: 'column', gap: 4 },
    row: { position: 'relative', display: 'flex', alignItems: 'center' },
    input: { paddingInlineEnd: 30 },
    clear: {
      position: 'absolute',
      insetInlineEnd: 2,
      fontSize: 17,
      lineHeight: 1,
      paddingBlock: 2,
      paddingInline: 7,
    },
    list: {
      position: 'absolute',
      zIndex: 40,
      insetInlineStart: 0,
      insetInlineEnd: 0,
      top: '100%',
      marginBlock: 3, marginBlockEnd: 0,
      marginInline: 0,
      padding: 4,
      listStyle: 'none',
      backgroundColor: t.surface,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: t.lineStrong,
      borderRadius: t.radiusSm,
      boxShadow: t.shadow,
      maxHeight: 240,
      overflowY: 'auto',
    },
    option: {
      paddingBlock: 6,
      paddingInline: 9,
      borderRadius: 5,
      cursor: 'pointer',
      fontSize: 13,
    },
    optionOn: { backgroundColor: t.accentWash, color: t.accentInk },
    warnHint: { color: t.warn },
  });
</script>

<script>
  import { api } from '../lib/gql.js';

  // place/lat/lon travel together: a typed string with no coordinates is not a
  // usable centre for a radius, so typing clears the fix and only a pick from
  // the list restores one.
  let { place = $bindable(''), lat = $bindable(null), lon = $bindable(null) } = $props();

  let items = $state([]);
  let open = $state(false);
  let active = $state(-1);
  let busy = $state(false);

  let timer = null;
  let seq = 0;
  let listId = `places-${Math.random().toString(36).slice(2, 8)}`;

  const close = () => { open = false; active = -1; };

  function cancel() {
    clearTimeout(timer);
    // Bumping the sequence orphans any reply still in flight.
    seq += 1;
  }

  async function lookup(q) {
    cancel();
    const mine = seq;
    busy = true;
    try {
      const found = await api.places(q);
      if (mine !== seq) return;          // a newer keystroke won
      items = Array.isArray(found) ? found : [];
      active = -1;
      open = items.length > 0;
    } catch {
      // An aborted or failed lookup is not worth a banner; the field simply
      // offers nothing.
      items = [];
      close();
    } finally {
      if (mine === seq) busy = false;
    }
  }

  function onInput(event) {
    place = event.currentTarget.value;
    lat = null;
    lon = null;
    cancel();
    const q = place.trim();
    if (q.length < 2) { items = []; close(); return; }
    timer = setTimeout(() => lookup(q), 280);
  }

  function choose(index) {
    const hit = items[index];
    if (!hit) return;
    place = hit.label;
    lat = hit.lat;
    lon = hit.lon;
    items = [];
    close();
  }

  function onKeydown(event) {
    if (event.key === 'Escape') { cancel(); close(); return; }
    if (!open || !items.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      active = active >= items.length - 1 ? 0 : active + 1;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      active = active <= 0 ? items.length - 1 : active - 1;
    } else if (event.key === 'Enter') {
      if (active >= 0) { event.preventDefault(); choose(active); }
    } else if (event.key === 'Tab') {
      close();
    }
  }

  function clearPlace() {
    cancel();
    place = '';
    lat = null;
    lon = null;
    items = [];
    close();
  }
</script>

<div {...stylex.attrs(s.place)}>
  <div {...stylex.attrs(s.row)}>
    <input
      type="text"
      role="combobox"
      autocomplete="off"
      spellcheck="false"
      aria-expanded={open}
      aria-controls={listId}
      aria-autocomplete="list"
      aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
      placeholder="start typing a town"
      value={place}
      oninput={onInput}
      onkeydown={onKeydown}
      onblur={() => setTimeout(close, 140)}
      onfocus={() => { if (items.length) open = true; }}
      {...stylex.attrs(ui.input, s.input)}
    />
    {#if place}
      <button type="button" onclick={clearPlace} title="clear the centre"
        {...stylex.attrs(ui.button, ui.quiet, s.clear)}>×</button>
    {/if}
  </div>

  {#if open}
    <ul id={listId} role="listbox" {...stylex.attrs(s.list)}>
      {#each items as item, i (item.label)}
        <li
          id="{listId}-{i}"
          role="option"
          aria-selected={i === active}
          onmousedown={(e) => { e.preventDefault(); choose(i); }}
          onmouseenter={() => (active = i)}
          {...stylex.attrs(s.option, i === active && s.optionOn)}
        >{item.label}</li>
      {/each}
    </ul>
  {/if}

  {#if busy}
    <span {...stylex.attrs(ui.hint)}>looking…</span>
  {:else if place && lat == null}
    <span {...stylex.attrs(ui.hint, s.warnHint)}>no coordinates — pick a town from the list for a radius to work</span>
  {:else if lat != null}
    <span {...stylex.attrs(ui.hint, ui.mono)}>{lat.toFixed(3)}, {lon.toFixed(3)}</span>
  {:else}
    <span {...stylex.attrs(ui.hint)}>optional — sets the centre for the radius and biases Wallapop</span>
  {/if}
</div>
