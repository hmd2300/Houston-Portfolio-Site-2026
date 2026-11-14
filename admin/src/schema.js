/* ---------- what can be edited, and the rules for each thing ----------
   The whole admin is drawn from this description. A node has fields (single values) and parts.
   A part is a group (a named set of fields, with parts of its own) or a list (things that can be
   added, removed and reordered). A list item is edited in the side panel, or, when it has a node of
   its own (a footer column), opens as its own screen. */
const DASH = String.fromCharCode(0x2014);
const mk = type => (k, label, o) => ({ k, label, type, ...o });
const Txt = mk('text'), Long = mk('long'), Lines = mk('lines'), Paras = mk('paras'), Each = mk('list'), Img = mk('image'), Yt = mk('youtube'), Url = mk('url'), Bool = mk('bool'), Alt = mk('alt'), Sel = mk('select'), Chips = mk('chips');
const G = (key, label, o) => ({ kind: 'group', key, label, ...o });
const L = (key, label, one, o) => ({ kind: 'list', key, label, one, ...o });
const first = s => String(s || '').replace(/\s*\n\s*/g, ' ').trim();
const BREAK = 'Press Return where the line should break.';

const F = {
  alt: Alt('alt', 'Description', { hint: 'One plain sentence saying what the image shows. Screen readers read it aloud, and Google uses it.' }),
  spec: Bool('spec', 'Mark as spec work', { yes: 'marked as spec work', no: 'no longer marked as spec work' }),
  eyebrow: Txt('eyebrow', 'Small label above', { max: 40 }),
  roles: Chips('roles', 'Credits', { one: 'credit', hint: 'Pick from the list, or start typing. The closest credit you have used before shows up, and Enter adds it.',
    suggest: () => [...new Set([...cur.video.featured, ...cur.video.films, ...cur.video.series].flatMap(x => x.roles || []))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })) }),
  path: { k: 'path', label: 'Web address', type: 'path', hint: 'Change this and the old address redirects on its own.' },
  seoTitle: Txt('seoTitle', 'Browser tab and search title', { max: 60, hint: 'Google cuts titles off at about 60 characters.' }),
  seoDesc: Long('seoDescription', 'Search description', { max: 160, hint: 'The grey text under the title in Google. About 160 characters shows.' }),
};
const pageTop = G('page', 'Top of the page', { fields: [{ k: 'heading', label: 'Page heading', type: 'heading', hint: 'The big word at the top of the page. Checked against the real type at six screen sizes.' }, Long('lede', 'Intro paragraph')] });
const gallery = (key, label, folder, o) => L(key, label, 'image', { view: 'image', add: 'images', folder, fields: [F.alt, F.spec], blank: { alt: '', spec: false }, sub: it => it.spec ? 'Spec work' : '', ...o });

const PAGE_DEST = [['home', 'Home page'], ['design', 'Page: Design'], ['photo', 'Page: Photo'], ['video', 'Page: Video'], ['case-studies', 'Page: Case Studies'], ['about', 'Home section: About'], ['contact', 'Home section: Contact'], ['faq', 'Home section: FAQ']];
const footDest = () => [...PAGE_DEST, ...cur.studies.items.filter(s => !s.hidden).map(s => [s.id, 'Case study: ' + (s.card.title || 'Untitled')]), ['email', 'Your email'], ['instagram', 'Your Instagram'], ['linkedin', 'Your LinkedIn'], ['latestFilm', 'Your latest film']];
const destName = (v, list) => (list.find(d => d[0] === v) || ['', 'Nothing chosen'])[1];
const link = (label, dest, max) => ({ fields: [Sel('to', 'Goes to', { options: dest }), Txt('label', label, { max })], blank: { to: '', label: '' }, name: it => it.label, sub: it => destName(it.to, typeof dest === 'function' ? dest() : dest) });

const FOOTCOL = { lede: 'One column of links in the footer.', fields: [Txt('heading', 'Column heading', { max: 18 })], parts: [L('links', 'Links', 'link', { view: 'rows', min: 1, max: 6, ...link('Name in the footer', footDest, 24) })] };

const homeRow = (key, label, title, parts) => G(key, label, { cols: true, fields: [F.eyebrow, Txt('title', 'Heading', { max: 14 }), Txt('more', 'Button label', { max: 28 })], parts });
const SECTIONS = [
  G('home', 'Home', { lede: 'Everything on the home page, top to bottom.', parts: [
    L('slides', 'Hero slideshow', 'slide', { view: 'image', add: 'images', folder: 'Home', hero: true, minEdge: 2000, min: 1, max: 8, note: 'The full-screen images behind your name. Wide images work best.', fields: [{ k: 'focus', k2: 'phone', label: 'What stays in frame', type: 'focus', say: 'wide-screen framing moved' }, { k: 'phone', type: 'focus', label: 'Phone crop', part: true, say: 'phone crop moved' }], blank: { focus: 50, phone: 50 } }),
    G('heroMeta', 'Hero corner text', { cols: true, fields: [Txt('location', 'Location', { max: 28 }), Txt('mark', 'Mark', { max: 28 }), Txt('since', 'Since', { max: 28 })] }),
    homeRow('design', 'Design row', 'Design', [gallery('picks', 'Featured design', 'Home', { min: 4, max: 12 })]),
    homeRow('photo', 'Photo row', 'Photo', [gallery('picks', 'Featured photos', 'Home', { min: 4, max: 12 })]),
    homeRow('video', 'Video row', 'Video', [G('feature', 'Featured film', { cols: true, fields: [Yt('youtube', 'YouTube video', { hint: 'Paste the link, or just the video ID.' }), Txt('alt', 'Description of the still')] })]),
    G('about', 'About', { fields: [F.eyebrow, Txt('title', 'Heading', { max: 24 }), Paras('paragraphs', 'Text', { hint: 'Leave an empty line between paragraphs.' }), Txt('cta', 'Button label', { max: 28 })],
      parts: [G('portrait', 'Portrait', { fields: [Img('image', 'Photo', { folder: 'Home' }), Alt('alt', 'Description'), Txt('caption', 'Caption', { max: 40 })] })] }),
    G('contact', 'Contact', { cols: true, fields: [F.eyebrow, Txt('heading', 'Heading', { max: 24 })] }),
    G('faq', 'FAQ', { cols: true, fields: [F.eyebrow, Lines('title', 'Heading', { hint: BREAK })], parts: [
      L('items', 'Questions', 'question', { view: 'rows', min: 1, fields: [Txt('question', 'Question', { max: 90 }), Long('answer', 'Answer'), Bool('emailButton', 'End the answer with an Email me button', { yes: 'now ends with an Email me button', no: 'no longer ends with an Email me button' })], blank: { question: '', answer: '', emailButton: false }, name: it => it.question })] }),
  ] }),
  G('design', 'Design', { top: { list: 'items', label: 'Add images' }, lede: 'The Design page. Images show in this order.', parts: [pageTop, gallery('items', 'Images', 'Design', { min: 1 })] }),
  G('photo', 'Photo', { top: { list: 'items', label: 'Add images' }, lede: 'The Photo page. Images show in this order.', parts: [pageTop, gallery('items', 'Images', 'Photo', { min: 1 })] }),
  G('video', 'Video', { top: { list: 'films', label: 'Add film' }, lede: 'What plays at the top of the Video page, and the order of everything under it.', parts: [pageTop,
    L('featured', 'Featured films', 'featured film', { view: 'film', min: 1, max: 2, note: 'The large players at the top.', fields: [Yt('youtube', 'YouTube video', { hint: 'Paste the link, or just the video ID.' }), Txt('title', 'Title'), Txt('alt', 'Description of the still'), Txt('flag', 'Corner flag', { optional: true, max: 20, hint: 'Optional. Example: Most recent' }), F.roles], blank: { youtube: '', title: '', alt: '', flag: '', roles: [] }, sub: it => (it.roles || []).join(' · ') }),
    G('filmsHead', 'Film grid heading', { cols: true, fields: [Txt('heading', 'Heading', { max: 30 }), Txt('note', 'Note beside it', { max: 40 })] }),
    L('films', 'Film grid', 'film', { view: 'film', min: 1, note: 'The order here is the order on the page.', fields: [Yt('youtube', 'YouTube video', { hint: 'Paste the link, or just the video ID.' }), Txt('title', 'Title'), F.roles], blank: { youtube: '', title: '', roles: [] }, sub: it => (it.roles || []).join(' · ') }),
    G('seriesHead', 'Playlist heading', { cols: true, fields: [Txt('heading', 'Heading', { max: 30 }), Txt('note', 'Note beside it', { max: 40 })] }),
    L('series', 'Playlists', 'playlist', { view: 'rows', fields: [Txt('title', 'Title'), Url('url', 'Playlist link'), Txt('brand', 'Brand', { max: 24 }), { k: 'count', label: 'Number of videos', type: 'number' }, Long('blurb', 'Write-up'), Each('thumbs', 'Four videos shown in the stack', { rule: 'yt4', hint: 'One YouTube link or video ID per line. Exactly four.' }), F.roles], blank: { title: '', url: '', brand: '', count: 1, blurb: '', thumbs: [], roles: [] }, sub: it => `${it.count} videos` }),
  ] }),
  G('navigation', 'Menu', { rule: true, lede: 'The main menu and the footer links. Links follow a page if its address changes.', parts: [
    L('menu', 'Main menu', 'menu item', { view: 'rows', min: 1, max: 10, ...link('Name in the menu', PAGE_DEST, 18) }),
    L('footer', 'Footer columns', 'column', { view: 'rows', fixed: true, note: 'Tap a column to edit its links.', node: () => FOOTCOL, name: it => it.heading, sub: it => it.links.map(l => l.label).join(' · ') })] }),
  G('pages', 'Pages', { lede: 'Web addresses, and how each page shows up in Google and in a browser tab.', two: true, parts:
    [['home', 'Home'], ['design', 'Design'], ['photo', 'Photo'], ['video', 'Video'], ['case-studies', 'Case Studies']].map(([k, n]) => G(k, n, { fields: [...(k === 'home' ? [] : [F.path]), F.seoTitle, F.seoDesc] })) }),
  G('settings', 'Settings', { lede: 'Details used across the whole site.', two: true, parts: [
    G('you', 'You', { fields: [Txt('name', 'Name', { max: 40 }), Txt('jobTitle', 'What you do', { max: 70 }), Long('bio', 'Short bio', { max: 220, hint: 'Used by Google, not shown on a page.' })] }),
    G('links', 'Contact links', { fields: [Txt('email', 'Email address', { rule: 'email' }), Url('instagram', 'Instagram link'), Txt('instagramHandle', 'Instagram handle', { max: 32 }), Url('linkedin', 'LinkedIn link')] }),
    G('footer', 'Footer', { fields: [Long('footerLine', 'Line under your name', { max: 180 }), Txt('footerCta', 'Button label', { max: 24 })] }),
    G('share', 'Sharing', { fields: [Img('shareImage', 'Image shown when a link is shared', { folder: 'Social Share', share: true, hint: 'The picture in a text message or a LinkedIn post. Wide works best, around 1200 by 630.' }), Yt('latestFilm', 'Latest film', { hint: 'Used by the Latest film link in the footer.' })] }),
    G('search', 'Search', { fields: [Chips('knowsAbout', 'Topics you are known for', { hint: 'Helps Google place you. Type one, then press Enter or tap Add.' }), Txt('locality', 'City', { max: 40 }), Txt('region', 'State', { max: 20 })] }),
  ] }),
];
const norm = n => { n.fields = n.fields || []; n.parts = n.parts || []; n.parts.forEach(norm); if (n.kind === 'list' && !n.node) n.leaf = { fields: n.fields, parts: [] }; return n; };
SECTIONS.forEach(norm); norm(FOOTCOL);
const ROOT = { fields: [], parts: SECTIONS };
