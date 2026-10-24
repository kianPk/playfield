/**
 * Build a live "IP phone" canvas for the playfield billboard:
 * visitor IP + country name + flag.
 */

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function fetchVisitorGeo() {
  const endpoints = [
    async () => {
      const res = await fetch('https://ipwho.is/');
      const data = await res.json();
      if (!data || data.success === false) throw new Error('ipwho failed');
      return {
        ip: data.ip,
        country: data.country || 'Unknown',
        countryCode: (data.country_code || '').toUpperCase(),
        city: data.city || '',
        region: data.region || '',
        postal: data.postal || '',
        isp: (data.connection && data.connection.isp) || '',
        flagEmoji: (data.flag && data.flag.emoji) || '',
      };
    },
    async () => {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (!data || data.error) throw new Error('ipapi failed');
      return {
        ip: data.ip,
        country: data.country_name || 'Unknown',
        countryCode: (data.country_code || '').toUpperCase(),
        city: data.city || '',
        region: data.region || '',
        postal: data.postal || '',
        isp: data.org || '',
        flagEmoji: '',
      };
    },
  ];

  for (const run of endpoints) {
    try {
      return await run();
    } catch (e) {
      // try next
    }
  }
  return {
    ip: '—',
    country: 'Unknown',
    countryCode: '',
    city: '',
    region: '',
    postal: '',
    isp: '',
    flagEmoji: '',
  };
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export async function paintVisitorIpScreen(geo) {
  const W = 512;
  const H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Phone chrome / bezel
  ctx.fillStyle = '#1a1a1a';
  roundRect(ctx, 18, 18, W - 36, H - 36, 48);
  ctx.fill();

  // Screen
  ctx.fillStyle = '#2b2b2b';
  roundRect(ctx, 40, 70, W - 80, H - 140, 28);
  ctx.fill();

  // Notch
  ctx.fillStyle = '#111';
  roundRect(ctx, W / 2 - 55, 82, 110, 18, 10);
  ctx.fill();

  const pink = '#ff6bb5';
  const soft = '#f0a8d0';
  let y = 140;

  ctx.fillStyle = pink;
  ctx.font = 'bold 28px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  wrapText(ctx, 'Your connection details', W / 2, y, W - 120, 34);
  y += 70;

  ctx.fillStyle = soft;
  ctx.font = '18px Helvetica, Arial, sans-serif';
  ctx.fillText('Live visitor IP · geo lookup', W / 2, y);
  y += 50;

  // Search-looking bar (decorative)
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 70, y, W - 220, 44, 10);
  ctx.fill();
  ctx.fillStyle = '#666';
  ctx.font = '16px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(geo.ip || 'detecting…', 86, y + 28);
  ctx.fillStyle = pink;
  roundRect(ctx, W - 140, y, 70, 44, 10);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Live', W - 105, y + 28);
  y += 90;

  // Big IP line
  ctx.fillStyle = pink;
  ctx.font = 'bold 26px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  wrapText(ctx, `Your IP is ${geo.ip}`, W / 2, y, W - 100, 32);
  y += 90;

  // Card
  ctx.fillStyle = '#232323';
  roundRect(ctx, 70, y, W - 140, 420, 16);
  ctx.fill();

  const flagCode = (geo.countryCode || '').toLowerCase();
  let flagImg = null;
  if (flagCode && flagCode.length === 2) {
    flagImg = await loadImage(`https://flagcdn.com/w160/${flagCode}.png`);
  }

  const rows = [
    ['IP', geo.ip],
    ['City', geo.city || '—'],
    ['Region', geo.region || '—'],
    ['Country', geo.country || '—'],
    ['ZIP', geo.postal || '—'],
    ['ISP', geo.isp || '—'],
  ];

  let rowY = y + 36;
  ctx.textAlign = 'left';
  for (const [label, value] of rows) {
    ctx.fillStyle = soft;
    ctx.font = 'bold 18px Helvetica, Arial, sans-serif';
    ctx.fillText(label, 96, rowY);

    if (label === 'Country') {
      const textX = 220;
      if (flagImg) {
        const fw = 42;
        const fh = Math.round((fw * flagImg.height) / flagImg.width);
        ctx.drawImage(flagImg, textX, rowY - fh + 4, fw, fh);
        ctx.fillStyle = pink;
        ctx.font = '20px Helvetica, Arial, sans-serif';
        ctx.fillText(`${geo.flagEmoji ? geo.flagEmoji + ' ' : ''}${value}`, textX + fw + 12, rowY);
      } else {
        ctx.fillStyle = pink;
        ctx.font = '20px Helvetica, Arial, sans-serif';
        ctx.fillText(`${geo.flagEmoji ? geo.flagEmoji + ' ' : ''}${value}`, textX, rowY);
      }
    } else {
      ctx.fillStyle = pink;
      ctx.font = '20px Helvetica, Arial, sans-serif';
      const clipped = String(value).length > 22 ? String(value).slice(0, 21) + '…' : String(value);
      ctx.fillText(clipped, 220, rowY);
    }
    rowY += 62;
  }

  // Bottom strip with country + flag badge
  y = H - 200;
  ctx.fillStyle = '#1e1e1e';
  roundRect(ctx, 70, y, W - 140, 90, 14);
  ctx.fill();

  if (flagImg) {
    ctx.drawImage(flagImg, 92, y + 22, 64, 42);
  }
  ctx.fillStyle = pink;
  ctx.font = 'bold 22px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(geo.country || 'Unknown', 172, y + 40);
  ctx.fillStyle = soft;
  ctx.font = '16px Helvetica, Arial, sans-serif';
  ctx.fillText(
    `${geo.flagEmoji ? geo.flagEmoji + '  ' : ''}${geo.countryCode || ''}`.trim(),
    172,
    y + 68
  );

  return canvas;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(' ');
  let line = '';
  let yy = y;
  for (let n = 0; n < words.length; n++) {
    const test = line + words[n] + ' ';
    if (ctx.measureText(test).width > maxWidth && n > 0) {
      ctx.fillText(line, x, yy);
      line = words[n] + ' ';
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, yy);
  return yy;
}

export async function createVisitorIpTexture(THREE) {
  const geo = await fetchVisitorGeo();
  const canvas = await paintVisitorIpScreen(geo);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  if (THREE.sRGBEncoding !== undefined) texture.encoding = THREE.sRGBEncoding;
  texture.needsUpdate = true;
  return { texture, geo };
}
