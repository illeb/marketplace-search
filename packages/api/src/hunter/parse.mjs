// Spec extraction. Six manual sweeps' worth of corrections live in here; the
// comments mark the ones that silently cost whole categories of listing.

const GEN_BY_MODEL = {
  // Dell OptiPlex: last two digits encode the generation. The pre-Skylake models
  // are listed so a generation floor excludes them rather than letting them pass
  // as "generation unknown". The three-digit names are older still: 0 means the
  // Core 2 era, which predates the Core i numbering entirely. Leaving these out
  // let 2011 machines into searches as "generation unknown".
  '320':0,'330':0,'360':0,'380':0,'580':0,'740':0,'745':0,'755':0,'760':0,'780':0,'960':0,
  '980':1, '390':2,'790':2,'990':2,
  '3010':3,'7010':3,'9010':3, '3020':4,'7020':4,'9020':4, '3030':5,'7030':5,'9030':5,
  '3040':6,'5040':6,'7040':6, '3050':7,'5050':7,'7050':7, '3060':8,'5060':8,'7060':8,
  '3070':9,'5070':9,'7070':9, '3080':10,'5080':10,'7080':10, '3090':10,'5090':10,'7090':10,
  // Lenovo ThinkCentre
  'm700s':6,'m700q':6,'m900s':6,'m900q':6, 'm710s':7,'m710q':7,'m910s':7,'m910q':7,
  'm720s':8,'m720q':8,'m920s':8,'m920q':8, 'm70s':10,'m70q':10,'m75s':10,'m75q':10,
  'm80s':10,'m80q':10,'m90s':10,'m90q':10,
  // Written without the chassis letter, and the Haswell-era names that never had one.
  'm72e':3, 'm73':4,'m83':4,'m93':4, 'm700':6,'m900':6, 'm710':7,'m910':7,
  'm720':8,'m920':8, 'm70':10,'m75':10,'m80':10,'m90':10,
  // HP
  'elitedesk800g2':6,'elitedesk800g3':7,'elitedesk800g4':8,'elitedesk800g5':9,
  'elitedesk800g6':10,'elitedesk800g8':11,'elitedesk800g9':12,
  'prodesk600g2':6,'prodesk600g3':7,'prodesk600g4':8,'prodesk600g5':9,'prodesk600g6':10,'prodesk600g7':11,
  'prodesk400g3':6,'prodesk400g4':7,'prodesk400g5':8,'prodesk400g6':10,'prodesk400g7':11,
};
// Launch year per Intel generation, so an age limit can be expressed in years
// rather than in a vendor's own numbering. 0 is the Core 2 era.
const YEAR_BY_GEN = { 0:2008, 1:2010, 2:2011, 3:2012, 4:2013, 5:2015, 6:2015, 7:2016,
                      8:2017, 9:2018, 10:2020, 11:2021, 12:2022, 13:2023, 14:2023 };
// AMD Ryzen: the leading digit of the part number is the series, and each series
// is a year. Needed because these machines carry no Intel generation at all and
// were being dropped as "generation unknown".
const YEAR_BY_RYZEN = { 1:2017, 2:2018, 3:2019, 4:2020, 5:2021, 6:2022, 7:2023, 8:2024 };
// The AMD variants of the same chassis, by launch year.
const YEAR_BY_AMD_MODEL = {
  'm715q':2018, 'm75q':2020, 'm75s':2020, 'm75t':2020,
  'elitedesk705g4':2018, 'elitedesk705g5':2019, 'elitedesk805g6':2020,
  'prodesk405g4':2019, 'prodesk405g6':2020,
};

/**
 * Which silicon a machine carries. The processor name settles it when the
 * advert gives one; otherwise the chassis name does, because these models were
 * only ever sold with AMD. Anything else that parsed at all is Intel.
 */
export function vendorOf(spec) {
  if (!spec) return null;
  if (/^(ryzen|athlon)/i.test(spec.cpu || '')) return 'AMD';
  if (YEAR_BY_AMD_MODEL[spec.model] != null) return 'AMD';
  if (spec.cpu || spec.generation != null) return 'Intel';
  return null;
}

const GEN_BY_ESPRIMO = {
  '556':6,'756':6,'956':6, '557':7,'757':7,'957':7, '538':8,'558':8,'758':8,'958':8,
  '5010':10,'7010':10,'9010':10, '5011':11,'7011':11,'9011':11, '6012':12,'7012':12,
};
// DDR3-era boards: a 16 GB ceiling on memory nobody makes any more
export const DDR3_MODELS = new Set(['3040','5040','7040','prodesk400g2','elitedesk800g1']);

// Dell never built a Micro chassis for these: the form factor arrives with the
// 9020 Micro in 2014. On an older model "micro PC" is the seller calling it
// small, not a form factor, and it was putting 2011 machines into Micro-only
// searches.
const DELL_NO_MICRO = new Set(['320','330','360','380','390','580','740','745','755','760','780','790','960','980','990']);
// Dell reused the 3010/7010/9010 names in 2023 for a line that does have a
// Micro, so those are only vetoed when a real processor number dates the
// machine to 2012. An inferred generation is not enough — it comes from the
// model name, which is the ambiguity itself.
const DELL_REUSED = new Set(['3010','7010','9010']);

// Whole words. Every entry here really is a word, because a trailing \b after a
// truncated stem can never match: "ventol\b" fails on "ventola", which is how
// fans, adapters and power supplies parsed as machines for six sweeps. Stems
// live in ACCESSORY_STEM below, anchored only at the front.
const ACCESSORY = /\b(mobile|portatil|portable|notebook|laptop|heatsink|cooler|caddy|staffa|bracket|presa i\/?o|porta i\/?o|pannello frontale|front i\/?o|io shield|mascherina|supporto per disco|supporto disco|porta ?disco|slitta|disk bracket|drive bay|mainboard|motherboard|mb\s+(?:matx|m-atx|atx|itx)|scheda madre|carte m[eè]re|netzteil|power supply|psu|riser|pannello|front panel|cavo|cable|per pezzi|for parts|pour pièces|pour pieces|para piezas|für teile|defekt|ricambi|spare|vesa|antenna|wifi card|scheda wifi|telaio|case only|retro|vintage|monitor|tastiera|mouse|expansion module|modulo di espansione|docking)\b/i;
const ACCESSORY_STEM = /\b(k[uü]hlk|l[uü]fter|dissipat|ventol|alimentat|adattat|raffredd)/i;
// A title that leads with a component is selling that component. "cpu" is left
// out on purpose: in Spanish adverts "CPU sobremesa" is the whole machine.
const ACCESSORY_LEAD = /^\s*(processore?|processor|prozessor|fonte|ram|memoria|m[ée]moire|ssd|hdd|hard disk|disco|scheda|carte|modulo|module|kit|licenza|licencia|lizenz)\b/i;
const AIO = /\baio\b|all-in-one|all in one|tutto-in-uno/i;
// A title that offers something *for* a machine is selling the part, not the
// machine: "Kit WiFi Interno per Dell OptiPlex Micro" was priced into a
// shortlist of computers at 30 euro. The preposition has to sit directly on the
// brand, so "mini pc per ufficio Dell OptiPlex" is untouched.
const PART_FOR = /\b(?:per|pour|para|for|f[uü]r|compatibile con|compatible (?:avec|con|with))\s+(?:il\s+|la\s+|le\s+|los\s+|las\s+)?(?:dell|hp|lenovo|fujitsu|optiplex|thinkcentre|elitedesk|prodesk|esprimo)\b/i;

const CORES = { 6:'4C/4T', 7:'4C/4T', 8:'6C/6T', 9:'6C/6T', 10:'6C/12T', 11:'6C/12T', 12:'6C/12T' };
export function coreString(cpu, cpuNum, gen) {
  const n = String(cpuNum || '').replace(/[TSKF]+$/i, '');
  const g = n ? (n.length === 5 ? +n.slice(0, 2) : +n[0]) : gen;
  if (cpu === 'i3') return g >= 10 ? '4C/8T' : '4C/4T';
  if (cpu === 'i7') return g >= 10 ? '8C/16T' : (g >= 8 ? '8C/8T' : '4C/8T');
  return CORES[g] || '—';
}

/** Memory adverts: must be FOR memory, not a machine that contains some. */
export function parseMemory(title, desc) {
  const t = title || '';
  const IS_RAM = /\b(ram|memoria|memory|dimm|banchi|banco)\b/i;
  const NOT_RAM = /\b(pc|computer|desktop|workstation|scheda madre|motherboard|cpu|processore|ssd|nvme|hard disk|monitor|gpu|scheda video|alimentat|case|tower|optiplex|thinkcentre|elitedesk|prodesk|esprimo|nuc)\b/i;
  if (!IS_RAM.test(t) || NOT_RAM.test(t)) return null;
  const T = (t + ' ## ' + (desc || '')).toLowerCase();
  if (!/ddr4/.test(T)) return null;
  if (/so-?dimm|sodimm|notebook|laptop|portatil|macbook|imac/.test(T)) return null;   // laptop memory
  if (/\becc\b|registered|rdimm|lrdimm|\bserver\b|xeon\b|buffered/.test(T)) return null; // server memory
  const tl = t.toLowerCase();
  let sticks = null, per = null, total = null;
  const kit = tl.match(/(\d)\s*[x×]\s*(\d{1,2})\s*gb/) || tl.match(/(\d{1,2})\s*gb\s*[\(\[]?\s*(\d)\s*[x×]/);
  if (kit) {
    if (/gb\s*[\(\[]?\s*\d\s*[x×]/.test(kit[0])) { total = +kit[1]; sticks = +kit[2]; per = total / sticks; }
    else { sticks = +kit[1]; per = +kit[2]; total = sticks * per; }
  } else {
    const g = [...tl.matchAll(/(\d{1,2})\s*gb/g)].map(m => +m[1]).filter(n => [4, 8, 16, 32].includes(n));
    if (g.length) { total = Math.max(...g); per = total; sticks = 1; }
  }
  if (!total || total < 4 || total > 128) return null;
  const sp = (T.match(/(?:^|\D)(2133|2400|2666|2933|3000|3200|3600)(?:\D|$)/) || [])[1];
  return { kind: 'memory', memTotal: total, memSticks: sticks, memPer: per, memSpeed: sp ? +sp : null };
}

/** Machines: brand, model, chassis, processor, memory, storage. */
/* ---- linee di prodotto ----------------------------------------------------
 * Senza una di queste il parser non riconosce una macchina e l'annuncio sparisce
 * in silenzio, quindi è questa tabella a decidere cosa l'app riesce a trovare.
 * Partiva con quattro marche, e chi cercava un Acer Veriton non trovava niente:
 * 38 annunci su 39 buttati, "ACER VERITON X2611G i5 RAM 8Gb SSD" compreso.
 *
 * Qualche nome è anche una parola comune in italiano — "cubi", "terra",
 * "shuttle" — e quelli vogliono la marca accanto, o un mobile a cubi diventa
 * un mini PC.
 * ------------------------------------------------------------------------ */
const FAMILIES = [
  [/optiplex/, 'Dell'],
  [/thinkcentre/, 'Lenovo'],
  [/elitedesk|prodesk/, 'HP'],
  [/esprimo/, 'Fujitsu'],
  [/veriton/, 'Acer'],
  [/expertcenter|\basus\b[^|\n]{0,24}\b(?:pb|pn)\s?-?\s?\d{2,3}/, 'Asus'],
  [/\bmsi\b[^|\n]{0,24}\bcubi\b|\bcubi\b[^|\n]{0,24}\bmsi\b/, 'MSI'],
  [/\bxpc\b|\bshuttle\b[^|\n]{0,24}\b(?:slim|ds\d|sh\d|nc\d)/, 'Shuttle'],
  [/\bterra\s*pc\b|\bwortmann\b/, 'Terra'],
];

const familyOf = (T) => FAMILIES.find(([re]) => re.test(T))?.[1] ?? null;

export function parseMachine(title, desc) {
  const t = (title || '').replace(/\s+/g, ' ').trim();
  if (ACCESSORY.test(t) || ACCESSORY_STEM.test(t) || ACCESSORY_LEAD.test(t)
      || AIO.test(t) || PART_FOR.test(t)) return null;

  // Tiered pricing: the headline is the stripped build and the body lists the
  // upgrades with their surcharges. Eighteen of these turned up in one sweep.
  // The body must then be kept out of the specification entirely: one 50 euro
  // barebones advert whose options read "RAM 4/8/16/32 Gb -> +12/+25/+50/+100 €"
  // and "Intel i7-6700 +50€" was being recorded as a 50 euro i7 with 32 GB.
  // The title is what the headline price actually buys.
  const tiered = [...(desc || '').matchAll(/\d{2,4}\s*€/g)].length >= 2
    || /con\s*\d+\s*€\s*in\s*piu|con\s*\d+\s*€\s*posso/i.test(desc || '');
  const T = (tiered ? t : t + ' ## ' + (desc || '')).toLowerCase();
  const conf = {};
  const o = { kind: 'machine' };

  o.family = familyOf(T);
  if (!o.family) return null;

  if (o.family === 'Dell') o.model = (T.match(/optiplex\D{0,8}(30[1-9]0|50[1-9]0|70[1-9]0|90[1-3]0|320|330|360|380|390|580|740|745|755|760|780|790|960|980|990)/) || [])[1];
  // ThinkCentre. The chassis letter is optional: "M700 Tiny" is written as often
  // as "M700q", and requiring the suffix left most of the Lenovo market with no
  // model and therefore no generation. The Haswell-era names (M73, M93p) have no
  // suffix at all.
  if (o.family === 'Lenovo') {
    const m = T.match(/\bm\s?(715|7[0125]0|9[0125]0|6[0129]5|70|75|80|90|72e|73|83|93)\s?p?\s?([sqtx])?\b/);
    o.model = m ? 'm' + m[1] + (m[2] || '') : undefined;
  }
  if (o.family === 'HP') { const m = T.match(/(elitedesk|prodesk)\s*(\d{3})?\s*g\s?(\d)/);
    if (m) o.model = m[1] + (m[2] || (m[1] === 'elitedesk' ? '800' : '600')) + 'g' + m[3]; }
  let esprimoLetter;
  if (o.family === 'Fujitsu') { const m = T.match(/esprimo\s*([dqgpek])\s*[- ]?\s*(\d{3,4})/);
    if (m) { o.model = 'Esprimo ' + m[1].toUpperCase() + m[2]; esprimoLetter = m[1]; o.esprimoGen = GEN_BY_ESPRIMO[m[2]]; } }

  // Le linee aggiunte dopo. Acer codifica il formato nella lettera come fa
  // Fujitsu — N è il mini da un litro, X il piccolo, M il tower, Z il tutto in
  // uno — e le altre tre sono mini per costruzione: un Cubi o uno XPC slim in
  // formato tower non esistono. Serve perché quasi nessun annuncio scrive
  // "micro" accanto a "Veriton N4640G": il formato è nel nome, non nel testo.
  let impliedChassis;
  if (o.family === 'Acer') {
    const m = T.match(/veriton\s*([nxmlz])\s?-?\s?(\d{3,4})/);
    if (m) { o.model = 'Veriton ' + m[1].toUpperCase() + m[2]; }
    const letter = m?.[1] ?? (T.match(/veriton\s*([nxmlz])\b/) || [])[1];
    impliedChassis = { n: 'Micro', x: 'SFF', l: 'SFF', m: 'Tower', z: 'AIO' }[letter];
  }
  if (o.family === 'Asus') {
    const m = T.match(/\b(pb|pn)\s?-?\s?(\d{2,3})/);
    if (m) o.model = m[1].toUpperCase() + m[2];
    if (m || /mini ?pc/.test(T)) impliedChassis = 'Micro';
  }
  if (o.family === 'MSI') { o.model = (T.match(/cubi\s*([a-z]?\d{1,2})/) || [])[1]; impliedChassis = 'Micro'; }
  if (o.family === 'Shuttle') { o.model = (T.match(/\b((?:ds|sh|nc)\d{2,3}[a-z]?)\b/) || [])[1]; impliedChassis = 'Micro'; }

  // Chassis. Roughly a third of adverts never say, and dropping those silently
  // cost a quarter of the market until it was caught — so 'Unstated' is a state.
  // Read it from a copy with the audio-jack prose removed: "micro" is French and
  // Italian for microphone, so "prises casque et micro" in a ports list was
  // enough to file a French tower under Micro.
  const C = T.replace(/\bmicro(?:phone|fono|fonico)\b/g, ' ')
    .replace(/\b(?:casque|cuffie?|jack|audio|usb|hdmi|vga|line.?in)\b[^.;|\n]{0,60}?\bmicro\b/g, ' ')
    .replace(/\bmicro\b[^.;|\n]{0,20}?\b(?:casque|cuffie?|jack|audio)\b/g, ' ');
  // Bare "Mini" is HP's and Lenovo's own shorthand ("800 G2 Mini"), but it also
  // begins "mini tower" and "mini DisplayPort", so it is read only when one of
  // those does not follow.
  // Sellers glue the form factor onto the model: "optiplex 790sff" has no word
  // boundary before "sff", so \bsff\b missed it and the machine landed in
  // Unstated. A digit on either side is allowed, a letter is not.
  const MICRO = /(?<![a-z])(mff|micro|tiny|usff|desktop mini|mini ?pc|dm)(?![a-z])|\bmini\b(?!\s*-?\s*(?:tower|tour|torre|atx|itx|display|dp\b|jack|hdmi|usb|sd\b|pci|serveur))/;
  const TOWER = /(?<![a-z])(torre|tower|minitower|micro ?tower|mt|twr|tour)(?![a-z])/;
  const SFF   = /(?<![a-z])(sff|small form factor|desktop small)(?![a-z])/;
  // HP's USDT is an ultra-slim desktop of about 2.6 litres, not the 1-litre
  // Desktop Mini. Sellers still title it "Mini PC", which put an 84 W G1 into a
  // micro-only shortlist. It is checked before Micro because the word "mini"
  // almost always appears alongside it.
  o.chassis = /\b(usdt|ultra.?slim|slim ?desktop)\b/.test(C) ? 'SFF'
    : SFF.test(C) ? 'SFF'
    : MICRO.test(C) ? 'Micro'
    : TOWER.test(C) ? 'Tower'
    : esprimoLetter ? ({ d: 'SFF', e: 'SFF', q: 'Micro', g: 'Micro', p: 'Tower', k: 'AIO' }[esprimoLetter] || 'Unstated')
    : impliedChassis ?? (/[sq]$/.test(o.model || '') ? (o.model.endsWith('s') ? 'SFF' : 'Micro') : 'Unstated');
  conf.chassis = SFF.test(C) || MICRO.test(C) || TOWER.test(C) ? 'stated'
    : o.chassis === 'Unstated' ? 'unknown' : 'inferred-from-model';

  // Processor. The S/K/F suffixes were missing at first, which let 4th-generation
  // machines through as "generation unknown".
  const cpus = [...T.matchAll(/\bi([3579])[\s\-_]*(\d{4,5})\s?(t|te|s|k|kf|f)?\b/g)]
    .map(m => ({ tier: +m[1], num: m[2] + (/^t/.test(m[3] || '') ? 'T' : ''),
                 gen: m[2].length === 5 ? +m[2].slice(0, 2) : +m[2][0] }));
  if (cpus.length) {
    const b = cpus.sort((a, z) => z.gen - a.gen || z.tier - a.tier)[0];
    o.cpu = 'i' + b.tier; o.cpuNum = b.num; o.generation = b.gen; conf.cpu = 'exact';
  } else {
    const tier = /\bi([3579])\b/.exec(T); if (tier) { o.cpu = 'i' + tier[1]; conf.cpu = 'tier-only'; }
    const g = /(\d{1,2})\s*(?:th|a|ª|°|e|eme|ème)?\s*(?:gen|generazione|generation|génération|generación)/.exec(T);
    if (g) { o.generation = +g[1]; conf.generation = 'stated'; }
    const floor = GEN_BY_MODEL[o.model] ?? o.esprimoGen;
    if (o.generation == null && floor != null) { o.generation = floor; conf.generation = 'inferred-from-model'; }
  }

  // AMD. These chassis exist in Ryzen versions that carry no Intel generation,
  // so without this they all read as "processor unknown" and fell out of every
  // search with a generation floor.
  if (!o.cpu) {
    const ry = T.match(/\bryzen\s*([3579])\s*(?:pro\s*)?(\d{4})\s*(ge|g|e|u|x|xt)?\b/);
    if (ry) {
      o.cpu = 'Ryzen ' + ry[1];
      o.cpuNum = ry[2] + (ry[3] ? ry[3].toUpperCase() : '');
      o.year = YEAR_BY_RYZEN[+ry[2][0]] ?? null;
      conf.cpu = 'exact';
    } else if (/\bryzen\s*([3579])\b/.test(T)) {
      o.cpu = 'Ryzen ' + T.match(/\bryzen\s*([3579])\b/)[1];
      conf.cpu = 'tier-only';
    } else if (/\bathlon\b/.test(T)) {
      o.cpu = 'Athlon'; conf.cpu = 'tier-only';
    }
  }

  // Age. One axis that works for both vendors: the Intel generation maps to a
  // launch year, the Ryzen series maps to a launch year, and the AMD chassis
  // names carry one of their own when the advert never names the processor.
  if (o.year == null) {
    o.year = (o.generation != null ? YEAR_BY_GEN[o.generation] : null)
          ?? YEAR_BY_AMD_MODEL[o.model] ?? null;
    if (o.year != null) conf.year = o.generation != null ? 'from-generation' : 'from-model';
  } else { conf.year = 'from-processor'; }

  // Withdraw a Micro reading from a model that never had one.
  if (o.chassis === 'Micro' && o.family === 'Dell' && o.model
      && (DELL_NO_MICRO.has(o.model)
          || (DELL_REUSED.has(o.model) && conf.cpu === 'exact' && o.generation <= 3))) {
    o.chassis = TOWER.test(C) ? 'Tower' : 'Unstated';
    conf.chassis = 'no-micro-variant';
  }

  // Memory. Single-digit sizes ("8Go") were missed by an early two-digit rule.
  const RAM_OK = new Set([4, 8, 12, 16, 24, 32, 64]);
  const kw = /(?:ram|ddr\d|memoria|mémoire|memory|geheugen|arbeitsspeicher)\D{0,16}(\d{1,2})\s*(?:gb|go|gigas)|(\d{1,2})\s*(?:gb|go|gigas)\s*(?:de\s*)?(?:ddr\d?|ram|di ram|memoria)/.exec(T);
  const kwRam = kw ? +(kw[1] || kw[2]) : 0;
  const small = [...T.matchAll(/(\d{1,2})\s*(?:gb|go|gigas)\b/g)].map(m => +m[1]).filter(n => RAM_OK.has(n));
  o.ram = RAM_OK.has(kwRam) ? kwRam : Math.max(0, ...small);
  conf.ram = RAM_OK.has(kwRam) ? 'labelled' : (small.length ? 'guessed' : 'unknown');

  // Storage. Taking the largest capacity reports a spinning disk as an SSD, so
  // each capacity is attributed to its nearest storage keyword instead.
  const CAP_OK = new Set([120,128,180,200,238,240,250,256,320,400,480,500,512,750,960,1000,1024,2000,2048]);
  const withUnit = [...T.matchAll(/(\d{3,4})\s*(?:gb|go|gigas)\b|(\d(?:[.,]\d)?)\s*(?:tb|to)\b/g)]
    .map(m => ({ v: m[1] ? +m[1] : Math.round(parseFloat(m[2].replace(',', '.')) * 1024), i: m.index }));
  const bare = [...T.matchAll(/\b(\d{3,4})\b/g)].map(m => ({ v: +m[1], i: m.index }))
    .filter(s => CAP_OK.has(s.v) && /ssd|nvme|m\.?2|hdd|disco|almacenamiento|archiviazione|storage|opslag|festplatte/
      .test(T.slice(Math.max(0, s.i - 14), s.i + 16)));
  const caps = [...withUnit, ...bare].filter(s => s.v >= 120 && s.v <= 2048);
  const marks = [...T.matchAll(/ssd|nvme|m\.2|hdd|hard disk|disco duro|festplatte/g)]
    .map(m => ({ kind: /hdd|hard disk|disco duro|festplatte/.test(m[0]) ? 'hdd' : 'ssd', i: m.index }));
  const nearest = s => { let best = null, d0 = 1e9;
    for (const k of marks) { const d = Math.abs(k.i - s.i); if (d < d0 && d <= 30) { d0 = d; best = k.kind; } }
    return best; };
  o.ssd = Math.max(0, ...caps.filter(s => nearest(s) === 'ssd').map(s => s.v));
  o.hdd = Math.max(0, ...caps.filter(s => nearest(s) === 'hdd').map(s => s.v));
  // Largest drive of any type. Filtering on the SSD alone discarded machines whose
  // advert never says which kind of disk it is.
  o.storage = Math.max(o.ssd, o.hdd, 0, ...caps.map(s => s.v));
  conf.storage = o.ssd || o.hdd ? 'attributed' : (caps.length ? 'type unknown' : 'unknown');

  o.tiered = tiered;

  o.ddr3 = DDR3_MODELS.has(o.model);
  o.confidence = conf;
  return o;
}

/** Anything that is not a computer or a memory module: no spec extraction at all. */
export function parseOther(title, desc) {
  const t = (title || '').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  return { kind: 'other',
    tiered: [...(desc || '').matchAll(/\d{2,4}\s*€/g)].length >= 2
         || /con\s*\d+\s*€\s*in\s*piu|con\s*\d+\s*€\s*posso/i.test(desc || ''),
    confidence: {} };
}

export function parseListing(title, desc, kind = 'other') {
  if (kind === 'memory') return parseMemory(title, desc);
  if (kind === 'computer') return parseMachine(title, desc);
  return parseOther(title, desc);
}
