export interface PrintableCard {
  qrDataUrl: string;
  code?: string | null;
  name?: string | null;
}

/**
 * Opens a clean print window with one or more QR cards — each shows the QR
 * image plus its printed code, so the code can be typed at check-in.
 */
export function printQrCards(cards: PrintableCard[], title = 'IRON GYM') {
  const list = cards.filter((c) => c.qrDataUrl);
  if (!list.length) return;

  const items = list
    .map(
      (c) => `
      <figure class="card">
        <img src="${c.qrDataUrl}" alt="${c.code ?? ''}" />
        ${c.code ? `<figcaption class="code">${c.code}</figcaption>` : ''}
        ${c.name ? `<figcaption class="name">${c.name}</figcaption>` : ''}
      </figure>`,
    )
    .join('');

  const w = window.open('', '_blank', 'width=720,height=900');
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; padding: 24px; font-family: system-ui, sans-serif; color: #000; }
      h1 { font-size: 14px; letter-spacing: .18em; text-transform: uppercase; margin: 0 0 16px; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
      .card { margin: 0; border: 2px solid #000; border-radius: 8px; padding: 10px;
              display: flex; flex-direction: column; align-items: center; gap: 6px;
              break-inside: avoid; }
      .card img { width: 100%; height: auto; }
      .code { font: 700 15px ui-monospace, monospace; letter-spacing: .12em; }
      .name { font-size: 12px; color: #333; }
      @media print { body { padding: 0; } .grid { gap: 10px; } }
    </style></head>
    <body>
      <h1>${title}</h1>
      <div class="grid">${items}</div>
      <script>
        window.addEventListener('load', () => {
          const imgs = [...document.images];
          Promise.all(imgs.map(i => i.complete ? 0 : new Promise(r => (i.onload = i.onerror = r))))
            .then(() => { window.focus(); window.print(); });
        });
      </script>
    </body></html>`);
  w.document.close();
}
