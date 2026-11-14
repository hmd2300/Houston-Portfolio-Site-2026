// Reads the pixel size of an image straight from its header. No dependencies.
import fs from 'node:fs';

export function imageSize(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const head = Buffer.alloc(64);
    fs.readSync(fd, head, 0, 64, 0);
    // PNG
    if (head.readUInt32BE(0) === 0x89504e47) return { w: head.readUInt32BE(16), h: head.readUInt32BE(20) };
    // WebP
    if (head.toString('ascii', 0, 4) === 'RIFF' && head.toString('ascii', 8, 12) === 'WEBP') {
      const kind = head.toString('ascii', 12, 16);
      if (kind === 'VP8 ') return { w: head.readUInt16LE(26) & 0x3fff, h: head.readUInt16LE(28) & 0x3fff };
      if (kind === 'VP8L') { const b = head.readUInt32LE(21); return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 }; }
      if (kind === 'VP8X') return { w: head.readUIntLE(24, 3) + 1, h: head.readUIntLE(27, 3) + 1 };
    }
    // JPEG: walk the segments to the first start-of-frame marker
    if (head[0] === 0xff && head[1] === 0xd8) {
      const size = fs.fstatSync(fd).size; const b = Buffer.alloc(4); let pos = 2;
      while (pos < size) {
        fs.readSync(fd, b, 0, 4, pos);
        if (b[0] !== 0xff) { pos++; continue; }
        const m = b[1];
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
          const d = Buffer.alloc(5); fs.readSync(fd, d, 0, 5, pos + 4);
          return { w: d.readUInt16BE(3), h: d.readUInt16BE(1) };
        }
        pos += 2 + b.readUInt16BE(2);
      }
    }
    return null;
  } finally { fs.closeSync(fd); }
}
