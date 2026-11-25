/**
 * Sanitizes an html2canvas cloned document so Tailwind CSS v4 modern color functions
 * (oklch, oklab, lab, lch, color-mix) are converted to exact sRGB rgba(...) values
 * before html2canvas's legacy CSS parser reads styles.
 *
 * Runs strictly on the temporary cloned iframe document — never modifies the live app DOM.
 */

const UNSUPPORTED_COLOR_FN_TEST = /\b(?:oklch|oklab|lab|lch|color-mix|color)\s*\(/i;

const colorCache = new Map<string, string>();
let converterCtx: CanvasRenderingContext2D | null = null;

function getConverterCtx(): CanvasRenderingContext2D | null {
  if (converterCtx) return converterCtx;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 1;
  c.height = 1;
  converterCtx = c.getContext('2d', { willReadFrequently: true });
  return converterCtx;
}

/**
 * Uses the browser's native Canvas 2D color engine to convert any modern CSS Color 4
 * expression (oklch, oklab, lab, lch, color-mix) into exact rgba(r, g, b, a).
 */
export function convertCssColorToRgba(rawColor: string, fallback = 'rgba(17, 24, 39, 1)'): string {
  const key = rawColor.trim();
  if (!key) return fallback;
  const cached = colorCache.get(key);
  if (cached) return cached;

  const ctx = getConverterCtx();
  if (!ctx) return fallback;

  try {
    ctx.clearRect(0, 0, 1, 1);
    // Sentinel ensures we can detect if a value is completely unparseable
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillStyle = key;
    ctx.fillRect(0, 0, 1, 1);
    const data = ctx.getImageData(0, 0, 1, 1).data;
    const alpha = Math.round((data[3] / 255) * 1000) / 1000;
    const rgba = `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${alpha})`;
    colorCache.set(key, rgba);
    return rgba;
  } catch {
    colorCache.set(key, fallback);
    return fallback;
  }
}

/**
 * Replaces balanced-parenthesis occurrences of unsupported color functions
 * (including nested parentheses inside color-mix(...)) inside any CSS text string.
 */
function replaceUnsupportedColorFunctionsInCss(cssText: string): string {
  if (!UNSUPPORTED_COLOR_FN_TEST.test(cssText)) return cssText;

  const fnRegex = /\b(?:oklch|oklab|lab|lch|color-mix|color)\s*\(/gi;
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fnRegex.exec(cssText)) !== null) {
    const start = match.index;
    if (start < lastIndex) continue;

    // Walk balanced parentheses to capture the full expression
    let depth = 0;
    let i = match.index + match[0].length - 1; // at '('
    for (; i < cssText.length; i++) {
      const ch = cssText[i];
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }

    const fullExpr = cssText.slice(start, i);
    result += cssText.slice(lastIndex, start);

    // If the expression contains unresolved CSS var(), substitute a safe neutral color
    if (/\bvar\s*\(/i.test(fullExpr)) {
      result += 'rgba(17, 24, 39, 1)';
    } else {
      result += convertCssColorToRgba(fullExpr);
    }

    lastIndex = i;
    fnRegex.lastIndex = i;
  }

  result += cssText.slice(lastIndex);
  return result;
}

const COLOR_STYLE_PROPS: Array<{ jsProp: keyof CSSStyleDeclaration; cssProp: string }> = [
  { jsProp: 'color', cssProp: 'color' },
  { jsProp: 'backgroundColor', cssProp: 'background-color' },
  { jsProp: 'borderTopColor', cssProp: 'border-top-color' },
  { jsProp: 'borderRightColor', cssProp: 'border-right-color' },
  { jsProp: 'borderBottomColor', cssProp: 'border-bottom-color' },
  { jsProp: 'borderLeftColor', cssProp: 'border-left-color' },
  { jsProp: 'outlineColor', cssProp: 'outline-color' },
  { jsProp: 'textDecorationColor', cssProp: 'text-decoration-color' },
  { jsProp: 'fill', cssProp: 'fill' },
  { jsProp: 'stroke', cssProp: 'stroke' },
];

/**
 * Pass this function to html2canvas's `onclone` option.
 */
export function sanitizeHtml2CanvasClone(clonedDoc: Document, clonedEl?: HTMLElement): void {
  try {
    // 1. Ensure clean light baseline on cloned document root (clears Tailwind oklch classes on html/body)
    clonedDoc.documentElement.className = '';
    clonedDoc.documentElement.style.backgroundColor = '#FFFFFF';
    clonedDoc.documentElement.style.color = '#111827';
    if (clonedDoc.body) {
      clonedDoc.body.className = '';
      clonedDoc.body.style.backgroundColor = '#FFFFFF';
      clonedDoc.body.style.color = '#111827';
      clonedDoc.body.style.margin = '0';
      clonedDoc.body.style.padding = '0';
    }

    // 2. Sanitize all <style> elements in the cloned document
    const styleTags = Array.from(clonedDoc.querySelectorAll('style'));
    for (const styleTag of styleTags) {
      if (styleTag.textContent && UNSUPPORTED_COLOR_FN_TEST.test(styleTag.textContent)) {
        styleTag.textContent = replaceUnsupportedColorFunctionsInCss(styleTag.textContent);
      }
    }

    // 3. Sanitize same-origin <link rel="stylesheet"> (e.g. Vite-bundled Tailwind v4 CSS)
    //    while keeping Google Fonts stylesheets completely intact
    const linkTags = Array.from(clonedDoc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
    for (const link of linkTags) {
      const href = link.getAttribute('href') || '';
      if (href.includes('fonts.googleapis.com') || href.includes('fonts.gstatic.com')) {
        continue;
      }

      try {
        // Match the live stylesheet from the main document to extract rules safely
        const liveSheet = Array.from(document.styleSheets).find(
          s => s.href && (s.href === link.href || s.href.endsWith(href))
        );
        if (liveSheet && liveSheet.cssRules) {
          let combinedCss = '';
          for (let i = 0; i < liveSheet.cssRules.length; i++) {
            combinedCss += liveSheet.cssRules[i].cssText + '\n';
          }
          if (UNSUPPORTED_COLOR_FN_TEST.test(combinedCss)) {
            const replacement = clonedDoc.createElement('style');
            replacement.textContent = replaceUnsupportedColorFunctionsInCss(combinedCss);
            link.parentNode?.insertBefore(replacement, link);
            link.remove();
          }
        }
      } catch {
        // Cross-origin stylesheet cannot be inspected; remove only if non-font
      }
    }

    // 4. Final defensive pass over computed styles on root + target subtree (HTMLElement & SVGElement)
    const win = clonedDoc.defaultView || window;
    const nodesToCheck: Element[] = [];
    if (clonedDoc.documentElement) nodesToCheck.push(clonedDoc.documentElement);
    if (clonedDoc.body) nodesToCheck.push(clonedDoc.body);

    const root = clonedEl || clonedDoc.body;
    if (root) {
      nodesToCheck.push(root);
      const descendants = root.querySelectorAll('*');
      for (let i = 0; i < descendants.length; i++) {
        nodesToCheck.push(descendants[i]);
      }
    }

    for (const el of nodesToCheck) {
      const styleTarget = (el as HTMLElement | SVGElement).style;
      if (!styleTarget) continue;
      const computed = win.getComputedStyle(el);
      for (const { jsProp, cssProp } of COLOR_STYLE_PROPS) {
        const val = String(computed[jsProp] || '');
        if (val && UNSUPPORTED_COLOR_FN_TEST.test(val)) {
          styleTarget.setProperty(cssProp, convertCssColorToRgba(val), 'important');
        }
      }
      const boxShadow = computed.boxShadow;
      if (boxShadow && UNSUPPORTED_COLOR_FN_TEST.test(boxShadow)) {
        styleTarget.setProperty('box-shadow', replaceUnsupportedColorFunctionsInCss(boxShadow), 'important');
      }
      const bgImage = computed.backgroundImage;
      if (bgImage && UNSUPPORTED_COLOR_FN_TEST.test(bgImage)) {
        styleTarget.setProperty('background-image', replaceUnsupportedColorFunctionsInCss(bgImage), 'important');
      }
    }
  } catch (err) {
    console.warn('[html2canvasSafeClone] Non-fatal clone sanitization warning:', err);
  }
}
