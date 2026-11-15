import type {
  AspectRatioOption,
  CropTransform,
  OverlayConfig,
  PhotoAdjustments,
} from '../types/studio';

export function getDimensionsForRatio(ratio: AspectRatioOption, baseWidth = 1080): { width: number; height: number } {
  switch (ratio) {
    case '1:1':
      return { width: baseWidth, height: baseWidth };
    case '4:5':
      return { width: baseWidth, height: Math.round((baseWidth * 5) / 4) };
    case '9:16':
      return { width: baseWidth, height: Math.round((baseWidth * 16) / 9) };
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'));
    img.src = src;
  });
}

export async function extractCompressedBase64(
  src: string,
  maxEdge = 1024
): Promise<{ base64: string; mimeType: string }> {
  const img = await loadImage(src);
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('캔버스 컨텍스트를 생성할 수 없습니다.');
  ctx.drawImage(img, 0, 0, w, h);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
  const base64 = dataUrl.split(',')[1] ?? '';
  return { base64, mimeType: 'image/jpeg' };
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 2
): number {
  if (!text.trim()) return 0;
  const chars = Array.from(text.trim());
  const lines: string[] = [];
  let current = '';

  for (const ch of chars) {
    if (ch === '\n') {
      lines.push(current);
      current = '';
      continue;
    }
    const test = current + ch;
    if (ctx.measureText(test).width > maxWidth && current.length > 0) {
      lines.push(current);
      current = ch;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  const clipped = lines.slice(0, maxLines);
  clipped.forEach((line, idx) => {
    ctx.fillText(line, x, y + idx * lineHeight);
  });
  return clipped.length;
}

function applySharpnessConvolution(ctx: CanvasRenderingContext2D, width: number, height: number, amount: number) {
  if (amount <= 2) return;
  const strength = Math.min(0.65, (amount / 50) * 0.55);
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = imageData.data;
  const out = new Uint8ClampedArray(src.length);

  const stride = width * 4;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * stride + x * 4;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        out[idx] = src[idx];
        out[idx + 1] = src[idx + 1];
        out[idx + 2] = src[idx + 2];
        out[idx + 3] = src[idx + 3];
        continue;
      }

      const up = idx - stride;
      const down = idx + stride;
      const left = idx - 4;
      const right = idx + 4;

      for (let c = 0; c < 3; c++) {
        const center = src[idx + c];
        const avgNeighbors = (src[up + c] + src[down + c] + src[left + c] + src[right + c]) * 0.25;
        const sharpened = center + (center - avgNeighbors) * strength * 2.2;
        out[idx + c] = sharpened < 0 ? 0 : sharpened > 255 ? 255 : sharpened;
      }
      out[idx + 3] = src[idx + 3];
    }
  }

  imageData.data.set(out);
  ctx.putImageData(imageData, 0, 0);
}

export interface RenderStudioParams {
  canvas: HTMLCanvasElement;
  image: HTMLImageElement;
  aspectRatio: AspectRatioOption;
  adjustments: PhotoAdjustments;
  transform: CropTransform;
  overlay: OverlayConfig;
  showOriginal?: boolean;
  outputWidth?: number;
  applyConvolution?: boolean;
}

export function renderStudioCanvas({
  canvas,
  image,
  aspectRatio,
  adjustments,
  transform,
  overlay,
  showOriginal = false,
  outputWidth = 720,
  applyConvolution = false,
}: RenderStudioParams): void {
  const { width, height } = getDimensionsForRatio(aspectRatio, outputWidth);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext('2d', { willReadFrequently: applyConvolution });
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);

  const isPoster = !showOriginal && overlay.template === 'poster';
  const isLightTheme = overlay.theme === 'light';

  // Background fill
  if (isPoster) {
    ctx.fillStyle = isLightTheme ? '#F5F4F0' : '#14161A';
  } else {
    ctx.fillStyle = '#14161A';
  }
  ctx.fillRect(0, 0, width, height);

  // Define photo drawing viewport (poster leaves gallery margin)
  const padX = isPoster ? Math.round(width * 0.065) : 0;
  const padTop = isPoster ? Math.round(width * 0.115) : 0;
  const padBottom = isPoster ? Math.round(height * 0.165) : 0;
  const photoW = width - padX * 2;
  const photoH = height - padTop - padBottom;

  // Compute cover-fit scale
  const imgRatio = image.naturalWidth / image.naturalHeight;
  const boxRatio = photoW / photoH;
  let drawW = photoW;
  let drawH = photoH;
  if (imgRatio > boxRatio) {
    drawH = photoH;
    drawW = photoH * imgRatio;
  } else {
    drawW = photoW;
    drawH = photoW / imgRatio;
  }

  const zoom = showOriginal ? 1 : transform.zoom;
  const rotation = showOriginal ? 0 : (transform.rotation * Math.PI) / 180;
  const offsetX = showOriginal ? 0 : transform.offsetX * (photoW * 0.45);
  const offsetY = showOriginal ? 0 : transform.offsetY * (photoH * 0.45);

  ctx.save();
  ctx.beginPath();
  if (isPoster) {
    const r = Math.round(width * 0.015);
    ctx.roundRect(padX, padTop, photoW, photoH, r);
  } else {
    ctx.rect(padX, padTop, photoW, photoH);
  }
  ctx.clip();

  // Apply CSS-compatible tonal filters
  if (!showOriginal) {
    const b = 100 + adjustments.brightness;
    const c = 100 + adjustments.contrast;
    const s = 100 + adjustments.saturation;
    ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
  } else {
    ctx.filter = 'none';
  }

  const cx = padX + photoW / 2 + offsetX;
  const cy = padTop + photoH / 2 + offsetY;
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.scale(zoom, zoom);
  ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  ctx.filter = 'none';

  // Color temperature (warmth) overlay
  if (!showOriginal && adjustments.warmth !== 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(padX, padTop, photoW, photoH);
    ctx.clip();
    const intensity = Math.abs(adjustments.warmth) / 100;
    if (adjustments.warmth > 0) {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = `rgba(255, 168, 76, ${Math.min(0.45, intensity * 1.15)})`;
    } else {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = `rgba(86, 165, 255, ${Math.min(0.45, intensity * 1.15)})`;
    }
    ctx.fillRect(padX, padTop, photoW, photoH);
    ctx.restore();
  }

  // Optional pixel-level sharpening (on export or when requested)
  if (!showOriginal && applyConvolution && adjustments.sharpness > 0) {
    applySharpnessConvolution(ctx, width, height, adjustments.sharpness);
  }

  // Vignette overlay inside photo frame
  if (!showOriginal && adjustments.vignette > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(padX, padTop, photoW, photoH);
    ctx.clip();
    const vCx = padX + photoW / 2;
    const vCy = padTop + photoH / 2;
    const outerR = Math.hypot(photoW, photoH) * 0.56;
    const innerR = outerR * 0.42;
    const grad = ctx.createRadialGradient(vCx, vCy, innerR, vCx, vCy, outerR);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(10,12,16,${Math.min(0.72, (adjustments.vignette / 50) * 0.58)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(padX, padTop, photoW, photoH);
    ctx.restore();
  }

  // If comparing original, stop before drawing editorial overlays
  if (showOriginal || overlay.template === 'clean') {
    return;
  }

  const s = width / 1080; // scale factor relative to 1080px reference
  const fScale = overlay.fontScale || 1;
  const fontFamily = '"Noto Sans KR", "Plus Jakarta Sans", sans-serif';
  const displayFont = '"Plus Jakarta Sans", "Noto Sans KR", sans-serif';

  if (overlay.template === 'editorial') {
    // Bottom measured contrast scrim
    const scrimH = Math.round(height * 0.42);
    const grad = ctx.createLinearGradient(0, height - scrimH, 0, height);
    if (isLightTheme) {
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.55, 'rgba(255,255,255,0.72)');
      grad.addColorStop(1, 'rgba(247,247,245,0.95)');
    } else {
      grad.addColorStop(0, 'rgba(12,14,18,0)');
      grad.addColorStop(0.55, 'rgba(12,14,18,0.62)');
      grad.addColorStop(1, 'rgba(12,14,18,0.92)');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, height - scrimH, width, scrimH);

    // Subtle top scrim if store mark is shown
    if (overlay.showStoreMark) {
      const topGrad = ctx.createLinearGradient(0, 0, 0, Math.round(180 * s));
      topGrad.addColorStop(0, isLightTheme ? 'rgba(255,255,255,0.65)' : 'rgba(12,14,18,0.58)');
      topGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, width, Math.round(180 * s));

      ctx.save();
      ctx.fillStyle = isLightTheme ? '#111315' : '#FFFFFF';
      ctx.font = `700 ${Math.round(24 * s)}px ${displayFont}`;
      ctx.textBaseline = 'top';
      ctx.fillText('MILLET', Math.round(56 * s), Math.round(48 * s));

      const milletW = ctx.measureText('MILLET').width;
      ctx.fillStyle = '#C8102E';
      ctx.fillRect(Math.round(56 * s + milletW + 16 * s), Math.round(52 * s), Math.round(3 * s), Math.round(20 * s));

      ctx.fillStyle = isLightTheme ? 'rgba(17,19,21,0.8)' : 'rgba(255,255,255,0.88)';
      ctx.font = `600 ${Math.round(22 * s)}px ${fontFamily}`;
      ctx.fillText('김포모아점', Math.round(56 * s + milletW + 32 * s), Math.round(49 * s));
      ctx.restore();
    }

    // Bottom Typography
    const marginX = Math.round(56 * s);
    const maxTextW = width - marginX * 2;
    let cursorY = height - Math.round(56 * s);

    ctx.save();
    ctx.textBaseline = 'bottom';

    if (overlay.badgeText.trim()) {
      ctx.fillStyle = '#C8102E';
      const badgeFontSize = Math.round(24 * s * fScale);
      ctx.font = `700 ${badgeFontSize}px ${fontFamily}`;
      ctx.fillText(overlay.badgeText.trim(), marginX, cursorY);
      cursorY -= Math.round(42 * s * fScale);
    }

    if (overlay.subcopy.trim()) {
      ctx.fillStyle = isLightTheme ? 'rgba(17,19,21,0.78)' : 'rgba(255,255,255,0.85)';
      const subSize = Math.round(28 * s * fScale);
      ctx.font = `500 ${subSize}px ${fontFamily}`;
      ctx.fillText(overlay.subcopy.trim(), marginX, cursorY);
      cursorY -= Math.round(48 * s * fScale);
    }

    if (overlay.headline.trim()) {
      ctx.fillStyle = isLightTheme ? '#111315' : '#FFFFFF';
      const headSize = Math.round(56 * s * fScale);
      const lineH = Math.round(68 * s * fScale);
      ctx.font = `700 ${headSize}px ${fontFamily}`;
      // Measure lines first to position upwards cleanly
      ctx.textBaseline = 'top';
      const testChars = Array.from(overlay.headline.trim());
      const lines: string[] = [];
      let cur = '';
      for (const ch of testChars) {
        if (ctx.measureText(cur + ch).width > maxTextW && cur.length > 0) {
          lines.push(cur);
          cur = ch;
        } else {
          cur += ch;
        }
      }
      if (cur) lines.push(cur);
      const visibleLines = lines.slice(0, 2);
      const blockTop = cursorY - visibleLines.length * lineH + Math.round(10 * s);
      visibleLines.forEach((line, idx) => {
        ctx.fillText(line, marginX, blockTop + idx * lineH);
      });
    }

    ctx.restore();
  } else if (overlay.template === 'poster') {
    const fg = isLightTheme ? '#111315' : '#FFFFFF';
    const muted = isLightTheme ? '#5A5E66' : 'rgba(255,255,255,0.72)';
    const marginX = padX;

    // Header above photo
    ctx.save();
    ctx.textBaseline = 'middle';
    const topCenterY = Math.round(padTop * 0.52);

    ctx.fillStyle = fg;
    ctx.font = `800 ${Math.round(26 * s)}px ${displayFont}`;
    ctx.fillText('MILLET', marginX, topCenterY);

    if (overlay.showStoreMark) {
      ctx.fillStyle = muted;
      ctx.font = `500 ${Math.round(21 * s)}px ${fontFamily}`;
      ctx.textAlign = 'right';
      ctx.fillText('밀레김포모아점 공식 큐레이션', width - marginX, topCenterY);
    }
    ctx.restore();

    // Footer below photo
    const footerTop = padTop + photoH + Math.round(28 * s);
    ctx.save();
    ctx.textBaseline = 'top';
    ctx.fillStyle = fg;
    const headSize = Math.round(42 * s * fScale);
    ctx.font = `700 ${headSize}px ${fontFamily}`;
    const drawnLines = drawWrappedText(
      ctx,
      overlay.headline || '밀레 아웃도어 컬렉션',
      marginX,
      footerTop,
      width - marginX * 2 - Math.round(180 * s),
      Math.round(50 * s * fScale),
      1
    );

    if (overlay.subcopy.trim()) {
      ctx.fillStyle = muted;
      ctx.font = `500 ${Math.round(24 * s * fScale)}px ${fontFamily}`;
      ctx.fillText(
        overlay.subcopy.trim(),
        marginX,
        footerTop + drawnLines * Math.round(54 * s * fScale)
      );
    }

    if (overlay.badgeText.trim()) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#C8102E';
      ctx.font = `700 ${Math.round(26 * s * fScale)}px ${fontFamily}`;
      ctx.fillText(overlay.badgeText.trim(), width - marginX, footerTop + Math.round(8 * s));
    }
    ctx.restore();
  } else if (overlay.template === 'spec') {
    // Top subtle store mark
    if (overlay.showStoreMark) {
      ctx.save();
      const pillX = Math.round(44 * s);
      const pillY = Math.round(44 * s);
      ctx.fillStyle = isLightTheme ? 'rgba(255,255,255,0.92)' : 'rgba(17,19,21,0.88)';
      ctx.fillRect(pillX, pillY, Math.round(280 * s), Math.round(54 * s));
      ctx.fillStyle = '#C8102E';
      ctx.fillRect(pillX, pillY, Math.round(6 * s), Math.round(54 * s));

      ctx.fillStyle = isLightTheme ? '#111315' : '#FFFFFF';
      ctx.font = `700 ${Math.round(21 * s)}px ${fontFamily}`;
      ctx.textBaseline = 'middle';
      ctx.fillText('MILLET · 김포모아점', pillX + Math.round(22 * s), pillY + Math.round(28 * s));
      ctx.restore();
    }

    // Architectural bottom bar
    const barMargin = Math.round(44 * s);
    const barH = Math.round(186 * s * fScale);
    const barY = height - barMargin - barH;
    const barW = width - barMargin * 2;

    ctx.save();
    ctx.fillStyle = isLightTheme ? 'rgba(250,250,248,0.94)' : 'rgba(18,20,24,0.9)';
    ctx.fillRect(barMargin, barY, barW, barH);
    ctx.strokeStyle = isLightTheme ? 'rgba(17,19,21,0.12)' : 'rgba(255,255,255,0.16)';
    ctx.lineWidth = Math.max(1, Math.round(2 * s));
    ctx.strokeRect(barMargin, barY, barW, barH);

    // Crimson accent line on top of bar
    ctx.fillStyle = '#C8102E';
    ctx.fillRect(barMargin, barY, Math.round(110 * s), Math.round(5 * s));

    const innerX = barMargin + Math.round(36 * s);
    ctx.textBaseline = 'top';
    ctx.fillStyle = isLightTheme ? '#111315' : '#FFFFFF';
    ctx.font = `700 ${Math.round(40 * s * fScale)}px ${fontFamily}`;
    drawWrappedText(
      ctx,
      overlay.headline || '알파인 퍼포먼스 기어',
      innerX,
      barY + Math.round(32 * s),
      barW - Math.round(72 * s),
      Math.round(48 * s * fScale),
      1
    );

    ctx.fillStyle = isLightTheme ? '#4B5563' : 'rgba(255,255,255,0.78)';
    ctx.font = `500 ${Math.round(23 * s * fScale)}px ${fontFamily}`;
    ctx.fillText(
      overlay.subcopy.trim() || '밀레김포모아점 매장에서 직접 확인하세요',
      innerX,
      barY + Math.round(98 * s * fScale)
    );

    if (overlay.badgeText.trim()) {
      ctx.textAlign = 'right';
      ctx.fillStyle = isLightTheme ? '#C8102E' : '#F87171';
      ctx.font = `700 ${Math.round(23 * s * fScale)}px ${fontFamily}`;
      ctx.fillText(overlay.badgeText.trim(), barMargin + barW - Math.round(36 * s), barY + Math.round(98 * s * fScale));
    }

    ctx.restore();
  }
}
