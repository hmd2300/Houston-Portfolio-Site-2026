// What the checks expect comes from the same content files the site is built
// from, so editing content never makes a check fail for the wrong reason.
const fs = require('fs'), path = require('path');
module.exports = REPO => {
  const j = f => JSON.parse(fs.readFileSync(path.join(REPO, f), 'utf8'));
  const C = { site: j('content/site.json'), home: j('content/home.json'), design: j('content/design.json'), photo: j('content/photo.json'),
              video: j('content/video.json'), nav: j('content/navigation.json'), pages: j('content/pages.json').pages };
  C.studies = j('content/case-studies.json').order.map(s => j(`content/studies/${s}.json`));
  C.all = [...C.pages, ...C.studies];
  C.path = id => C.all.find(p => p.id === id).path;
  C.solo = ['/404.html', '/privacy/', '/accessibility/', '/brand-standards/'];
  C.rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  C.html = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return C;
};
