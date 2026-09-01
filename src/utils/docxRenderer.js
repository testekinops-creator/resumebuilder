import {
  AlignmentType, BookmarkEnd, BookmarkStart, BorderStyle, Document, ExternalHyperlink, Footer, HeightRule, HorizontalPositionRelativeFrom, LevelFormat,
  LineRuleType, PageBorderOffsetFrom, Paragraph, ShadingType, Table, TableCell,
  TableLayoutType, TableRow, Tab, TabStopType, TextRun, TextWrappingType, VerticalAlignTable, VerticalAnchor, VerticalPositionRelativeFrom, WidthType, WpsShapeRun,
} from 'docx';
import { getTemplatePresentation, resolvePresentationColor } from './resumePresentation.js';
import { getCustomResumeSection } from './resumeSections.js';
import { formatResumeDateRange, formatResumeMonth } from './resumeDates.js';
import { sanitizeDocxState } from './docxContent.js';

// CSS pixels are the shared design unit. Word uses twips for geometry and
// half-points for text, not CSS pixels or browser device pixels.
const twips = pixels => Math.max(0, Math.round(Number(pixels || 0) * 15));
const halfPoints = pixels => Math.max(1, Math.round(Number(pixels || 11) * 1.5));
const NO_BORDER = Object.freeze({ style: BorderStyle.NONE, size: 0, color: 'FFFFFF' });
const NO_BORDERS = Object.freeze(Object.fromEntries(
  ['top', 'bottom', 'left', 'right', 'insideHorizontal', 'insideVertical'].map(key => [key, NO_BORDER]),
));
const ZERO_MARGINS = Object.freeze({ top: 0, bottom: 0, left: 0, right: 0 });
const STYLE = Object.freeze({
  body: 'ResumeBody', heading: 'ResumeHeading', title: 'ResumeEntryTitle',
  metadata: 'ResumeMetadata', contact: 'ResumeContact', bullet: 'ResumeBullet',
});
// eslint-disable-next-line no-control-regex -- XML 1.0 forbids these control characters.
const INVALID_XML_CONTROLS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;
const cleanText = value => typeof value === 'string' || typeof value === 'number'
  ? String(value).replace(INVALID_XML_CONTROLS, '').replace(/\s+/g, ' ').trim()
  : '';
const transformText = (value, transform) => transform === 'uppercase'
  ? value.toUpperCase() : transform === 'lowercase' ? value.toLowerCase() : value;

/** A deliberate Word/mobile font fallback, independent of the application theme. */
export function wordFontFamily(value) {
  const first = String(value || 'Arial').split(',')[0].trim().replace(/^['"]|['"]$/g, '');
  const safe = {
    arial: 'Arial', calibri: 'Calibri', aptos: 'Aptos', verdana: 'Verdana',
    'trebuchet ms': 'Trebuchet MS', georgia: 'Georgia', garamond: 'Garamond',
    'palatino linotype': 'Palatino Linotype', 'times new roman': 'Times New Roman',
    cambria: 'Cambria', 'courier new': 'Courier New', helvetica: 'Arial', inter: 'Arial',
  };
  return safe[first.toLowerCase()] || 'Arial';
}

function decodeEntities(text) {
  const names = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    ndash: '–', mdash: '—', bull: '•', copy: '©', reg: '®', hellip: '…' };
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] !== '#') return names[entity.toLowerCase()] ?? match;
    const code = entity[1].toLowerCase() === 'x' ? Number.parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    const xmlCharacter = code === 9 || code === 10 || code === 13 || (code >= 0x20 && code <= 0xd7ff)
      || (code >= 0xe000 && code <= 0xfffd) || (code >= 0x10000 && code <= 0x10ffff);
    return Number.isInteger(code) && xmlCharacter
      ? String.fromCodePoint(code) : '';
  });
}

function safeLink(value) {
  const text = cleanText(value);
  return /^(https?:\/\/|mailto:|tel:)/i.test(text) ? text : '';
}

/**
 * The editor emits a small, well-defined rich-text vocabulary. Parse that same
 * vocabulary in Node and the browser, retaining paragraph/list order and inline
 * emphasis. A DOMParser-only path previously made fixtures differ from downloads.
 */
export function docxRichTextBlocks(html) {
  const source = String(html || '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  const blocks = [];
  const lists = [];
  const listItems = [];
  const inline = [];
  let runs = [];
  let listItem = null;
  let listSequence = 0;
  const flush = () => {
    const text = runs.map(run => run.text).join('').replace(/\s+/g, ' ').trim();
    if (text && !/^(undefined|null|NaN|Invalid Date)$/i.test(text)) {
      if (runs[0]) runs[0].text = runs[0].text.replace(/^\s+/, '');
      if (runs.at(-1)) runs.at(-1).text = runs.at(-1).text.replace(/\s+$/, '');
      blocks.push({ runs: runs.filter(run => run.text || run.softBreak), text, ...(listItem || {}) });
      if (listItem) listItem.continuation = true;
    }
    runs = [];
  };
  for (const token of source.match(/<[^>]+>|[^<]+/g) || []) {
    if (token[0] !== '<') {
      const text = decodeEntities(token).replace(/\s+/g, ' ');
      if (text) runs.push({ text, ...Object.assign({}, ...inline.map(item => item.style)) });
      continue;
    }
    const match = token.match(/^<\s*(\/?)\s*([a-z][\w-]*)/i);
    if (!match) continue;
    const closing = Boolean(match[1]);
    const tag = match[2].toLowerCase();
    if (tag === 'ul' || tag === 'ol') {
      flush();
      if (closing) lists.pop();
      else lists.push({ list: tag === 'ol' ? 'decimal' : 'bullet', listId: ++listSequence });
      continue;
    }
    if (tag === 'li') {
      flush();
      if (closing) listItems.pop();
      else listItems.push({ ...(lists.at(-1) || { list: 'bullet', listId: ++listSequence }),
        level: Math.min(4, Math.max(0, lists.length - 1)), continuation: false });
      listItem = listItems.at(-1) || null;
      continue;
    }
    if (tag === 'br') {
      if (!closing) runs.push({ text: '\n', softBreak: true });
      continue;
    }
    if (/^(p|div|h[1-6]|blockquote)$/.test(tag)) {
      flush();
      continue;
    }
    if (['strong', 'b', 'em', 'i', 'u', 'a'].includes(tag)) {
      if (closing) {
        const index = inline.findLastIndex(item => item.tag === tag);
        if (index !== -1) inline.splice(index, 1);
      } else {
        const href = token.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
        const style = tag === 'strong' || tag === 'b' ? { bold: true }
          : tag === 'em' || tag === 'i' ? { italics: true }
            : tag === 'u' ? { underline: true }
              : { href: safeLink(decodeEntities(href?.[1] || href?.[2] || href?.[3] || '')) };
        inline.push({ tag, style });
      }
    }
  }
  flush();
  return blocks;
}

function color(ctx, value, fallback = ctx.textColor) {
  return String(resolvePresentationColor(ctx.presentation, value || fallback) || fallback || '#333333').replace('#', '').toUpperCase();
}

function shading(ctx, value) {
  return value ? { type: ShadingType.CLEAR, fill: color(ctx, value) } : undefined;
}

function border(ctx, definition) {
  if (!definition?.widthPx) return NO_BORDER;
  return {
    style: definition.style === 'double' ? BorderStyle.DOUBLE : BorderStyle.SINGLE,
    size: Math.max(2, Math.round(definition.widthPx * 6)), color: color(ctx, definition.color), space: 0,
  };
}

function lineSpacing(ctx, pixels = ctx.fontPx, multiplier = ctx.presentation.lineHeight) {
  return { line: twips(pixels * multiplier), lineRule: LineRuleType.AT_LEAST, beforeAutoSpacing: false, afterAutoSpacing: false };
}

function run(ctx, text, options = {}) {
  const { fontPx = ctx.fontPx, fontFamily = ctx.font, color: ink = ctx.textColor, characterSpacingPx, ...rest } = options;
  return new TextRun({
    text: String(text ?? ''), font: wordFontFamily(fontFamily), size: halfPoints(fontPx),
    color: color(ctx, ink), characterSpacing: characterSpacingPx === undefined ? undefined : Math.round(characterSpacingPx * 15),
    ...rest,
  });
}

function paragraph(ctx, text, options = {}) {
  const { afterPx = ctx.presentation.spacing.paragraphPx, beforePx = 0,
    fontPx = ctx.fontPx, multiplier = ctx.presentation.lineHeight,
    runOptions = {}, children, measureText = children ? undefined : text, ...rest } = options;
  const result = new Paragraph({
    style: STYLE.body, contextualSpacing: false, widowControl: true,
    spacing: { before: twips(beforePx), after: twips(afterPx), ...lineSpacing(ctx, fontPx, multiplier) },
    children: children || [run(ctx, text, { fontPx, ...runOptions })], ...rest,
  });
  if (typeof measureText === 'string') {
    // A deliberately conservative bound, not a substitute for Word pagination.
    // Only tiny simple cards may use this to stay together; unknown/rich table
    // content is always left breakable. Count wide characters and tracking.
    const widthPx = (ctx.width - (rest.indent?.left || 0) - (rest.indent?.right || 0)) / 15;
    const charWidth = fontPx * 1.5 + Math.max(0, ctx.presentation.headingLetterSpacingPx);
    const charactersPerLine = Math.max(1, Math.floor(widthPx / charWidth));
    const lines = measureText.split('\n').reduce((count, line) => count + Math.max(1, Math.ceil([...line].length / charactersPerLine)), 0);
    ctx.shared.paragraphMetrics.set(result, { text: measureText,
      heightPx: beforePx + afterPx + lines * fontPx * multiplier * 1.05 });
  }
  return result;
}

function emptyParagraph() {
  return new Paragraph({ keepNext: false, keepLines: false,
    spacing: { before: 0, after: 0, line: 1, lineRule: LineRuleType.EXACT },
    children: [new TextRun({ text: '', size: 1 })] });
}

function flowGap(pixels) {
  return new Paragraph({ keepNext: true, spacing: { before: 0, after: 0, line: Math.max(1, twips(pixels)), lineRule: LineRuleType.EXACT },
    children: [new TextRun({ text: '', size: 1 })] });
}

function separateTables(children) {
  return children.flatMap((child, index) => child instanceof Table && children[index - 1] instanceof Table
    ? [emptyParagraph(), child] : [child]);
}

function cell(ctx, width, children, { margins = ZERO_MARGINS, fill, pattern, borders, columnSpan, rowSpan, verticalAlign = VerticalAlignTable.TOP, flowing = false } = {}) {
  const content = children.length ? separateTables(children) : [emptyParagraph()];
  // Word promotes a first-cell paragraph's keep-with-next to its entire row.
  // A breakable anchor lets long rails, cards, and narratives start in the
  // available page space while keeping the actual headings with their text.
  if (flowing) content.unshift(emptyParagraph());
  // Word requires a terminal paragraph in each cell. Give it an explicit tiny
  // line box rather than letting a trailing nested table acquire Normal spacing.
  if (!(content.at(-1) instanceof Paragraph)) content.push(emptyParagraph());
  // Unspecified cell borders inherit the table edges. Explicit `none` on every
  // cell suppresses the masthead's top/bottom rules in Word and mobile viewers.
  return new TableCell({ width: { size: width, type: WidthType.DXA }, margins,
    shading: pattern ? { type: ShadingType.THIN_VERTICAL_STRIPE, color: color(ctx, pattern.color), fill: color(ctx, fill || '#FFFFFF') }
      : shading(ctx, fill), borders, columnSpan, rowSpan, verticalAlign, children: content });
}

function table(widths, rows, { indent = 0, borders = NO_BORDERS, minimumHeightPx = 0, keepTogether = false } = {}) {
  const exact = widths.map(value => Math.max(1, Math.round(value)));
  return new Table({
    width: { size: exact.reduce((sum, value) => sum + value, 0), type: WidthType.DXA },
    indent: { size: Math.round(indent), type: WidthType.DXA }, columnWidths: exact,
    layout: TableLayoutType.FIXED, borders, margins: ZERO_MARGINS,
    rows: rows.map(children => new TableRow({ children,
      ...(minimumHeightPx ? { height: { value: twips(minimumHeightPx), rule: HeightRule.ATLEAST } } : {}),
      ...(keepTogether ? { cantSplit: true } : {}),
    })),
  });
}

function richParagraphs(ctx, html) {
  const blocks = docxRichTextBlocks(html);
  const listRefs = new Map();
  return blocks.map(block => {
    let numbering;
    if (block.list && !block.continuation) {
      if (block.list === 'decimal' && !listRefs.has(block.listId)) listRefs.set(block.listId, ++ctx.shared.listInstance);
      numbering = { reference: listReference(ctx, block.list),
        level: block.level || 0, instance: block.list === 'decimal' ? listRefs.get(block.listId) : 0 };
    }
    const children = block.runs.map(item => {
      if (item.softBreak) return new TextRun({ break: 1 });
      const text = run(ctx, item.text, { bold: item.bold, italics: item.italics,
        underline: item.underline ? {} : undefined });
      return item.href ? new ExternalHyperlink({ link: item.href, children: [text] }) : text;
    });
    return paragraph(ctx, '', {
      children, measureText: block.text, style: numbering ? STYLE.bullet : STYLE.body, numbering,
      indent: block.list ? { left: twips(20 + (block.level || 0) * 14), hanging: numbering ? twips(10) : 0 } : undefined,
      afterPx: numbering ? ctx.presentation.spacing.listPx : ctx.presentation.spacing.paragraphPx,
    });
  });
}

function bulletParagraph(ctx, text, options = {}) {
  return paragraph(ctx, text, { style: STYLE.bullet,
    numbering: { reference: listReference(ctx, 'bullet'), level: 0 },
    indent: { left: twips(16), hanging: twips(9) },
    afterPx: ctx.presentation.spacing.listPx, ...options });
}

function listReference(ctx, kind) {
  return `resume-${ctx.isSolid ? 'sidebar-' : ''}${kind}`;
}

function contactParts(state, definition) {
  const contact = state.contact;
  const links = [contact.linkedIn, contact.website,
    ...state.websites.filter(site => site.addToHeader === true).map(site => site.url)]
    .filter(value => safeLink(value));
  const fields = {
    email: contact.email ? [{ text: contact.email, href: `mailto:${contact.email}` }] : [],
    phone: contact.phone ? [{ text: contact.phone }] : [],
    location: [contact.city, contact.country].filter(Boolean).length
      ? [{ text: [contact.city, contact.country].filter(Boolean).join(', ') }] : [],
    links: links.map(href => ({ text: href.replace(/^https?:\/\//, ''), href })),
  };
  return definition.contactOrder.flatMap(key => fields[key] || []);
}

function contactParagraphs(ctx, state, definition) {
  const parts = contactParts(state, definition);
  if (!parts.length) return [];
  const fontPx = ctx.fontPx * definition.contactFontScale;
  const options = { color: definition.contactColor, fontPx, fontFamily: definition.contactFontFamily || ctx.font };
  const inline = definition.contactLayout.startsWith('inline') || definition.contactLayout === 'separate-band';
  const alignment = definition.contactLayout.includes('center') || definition.contactLayout === 'separate-band'
    ? AlignmentType.CENTER : definition.contactLayout.includes('right') ? AlignmentType.RIGHT : AlignmentType.LEFT;
  const linkedRun = part => part.href
    ? new ExternalHyperlink({ link: part.href, children: [run(ctx, part.text, options)] }) : run(ctx, part.text, options);
  if (inline) {
    return [paragraph(ctx, '', { style: STYLE.contact, alignment, fontPx, beforePx: definition.contactBeforePx || 0,
      multiplier: definition.contactLineHeight, afterPx: 0, children: parts.flatMap((part, index) => [
        ...(index ? [run(ctx, definition.contactSeparator || '   ', options)] : []), linkedRun(part),
      ]) })];
  }
  return parts.map((part, index) => paragraph(ctx, '', { style: STYLE.contact, alignment, fontPx,
    multiplier: definition.contactLineHeight,
    beforePx: index === 0 ? definition.contactBeforePx || 0 : 0,
    afterPx: index === parts.length - 1 ? 0 : definition.contactGapPx,
    children: [linkedRun(part)],
    ...(definition.contactBullet ? { numbering: { reference: listReference(ctx, 'contact'), level: 0 }, indent: { left: twips(16), hanging: twips(10) } } : {}),
  }));
}

function headerIdentity(ctx, state, definition) {
  const name = [state.contact.firstName, state.contact.surname].filter(Boolean).join(' ') || 'Your Name';
  const headline = state.workHistory[0]?.jobTitle
    || (definition.headlineFromEducation ? state.education[0]?.fieldOfStudy : '')
    || definition.headlineFallback;
  const center = definition.align === 'center' && (definition.contactLayout.includes('center') || definition.contactLayout === 'separate-band');
  const namePx = ctx.presentation.bodyFontPx * definition.nameScale;
  const paragraphs = [paragraph(ctx, transformText(name, definition.nameTransform), {
    alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
    fontPx: namePx, multiplier: definition.nameLineHeight, afterPx: 0, keepNext: true,
    runOptions: { fontFamily: definition.nameFontFamily || ctx.font,
      color: definition.nameColor, bold: definition.nameWeight >= 600,
      characterSpacingPx: definition.nameLetterSpacingPx ?? namePx * (definition.nameLetterSpacingEm || 0) },
  })];
  if (definition.showHeadline && headline) paragraphs.push(paragraph(ctx, transformText(headline, definition.headlineTransform), {
    alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
    beforePx: definition.headlineMarginTopPx, afterPx: 0, keepNext: true,
    fontPx: ctx.fontPx * definition.headlineScale, multiplier: 1.4,
    runOptions: { color: definition.headlineColor, bold: definition.headlineWeight >= 600,
      characterSpacingPx: ctx.fontPx * definition.headlineScale * (definition.headlineLetterSpacingEm || 0) },
  }));
  return paragraphs;
}

function offsetHeaderShadow(ctx, headerTable, width, indent, definition) {
  const offset = twips(definition.offsetPx);
  // The masthead spans the first two rows. Only its 14px decorative top-right
  // cutout is fixed; the second row grows to the full native header text height.
  // The bottom strip is outside the header, matching an offset CSS shadow.
  return new Table({
    width: { size: width + offset, type: WidthType.DXA }, indent: { size: indent, type: WidthType.DXA },
    columnWidths: [offset, width - offset, offset], layout: TableLayoutType.FIXED,
    borders: NO_BORDERS, margins: ZERO_MARGINS,
    rows: [
      new TableRow({ height: { value: offset, rule: HeightRule.EXACT }, children: [
        cell(ctx, width, [headerTable], { columnSpan: 2, rowSpan: 2 }), cell(ctx, offset, []),
      ] }),
      new TableRow({ children: [cell(ctx, offset, [], { fill: definition.color })] }),
      new TableRow({ height: { value: offset, rule: HeightRule.ATLEAST }, children: [
        cell(ctx, offset, []), cell(ctx, width, [], { columnSpan: 2, fill: definition.color }),
      ] }),
    ],
  });
}

function header(ctx, state) {
  const definition = ctx.presentation.capabilities.header;
  if (definition.identityInSidebar) return [];
  const pageWidth = ctx.shared.pageWidth - twips(ctx.shared.canvasInsetPx * 2);
  const margin = ctx.presentation.pageMarginPx;
  const inset = definition.fullBleed ? 0 : (definition.horizontalInsetPx ?? margin * definition.horizontalInsetMultiplier);
  const leftInset = definition.leftInsetMultiplier === undefined ? inset : margin * definition.leftInsetMultiplier;
  const width = pageWidth - twips(leftInset + inset);
  const headerIndent = definition.shadow ? 0 : twips(ctx.shared.canvasInsetPx + leftInset);
  const innerPadding = definition.fullBleed
    ? (definition.horizontalInsetPx ?? margin * definition.horizontalInsetMultiplier)
    : definition.paddingHorizontalPx;
  const top = definition.paddingTopPx ?? margin * (definition.paddingTopMultiplier || 1);
  const bottom = definition.paddingBottomPx ?? margin;
  const margins = { top: twips(top), bottom: twips(bottom), left: twips(innerPadding), right: twips(innerPadding) };
  const outerBorders = { ...NO_BORDERS, top: border(ctx, definition.top), bottom: border(ctx, definition.bottom), left: border(ctx, definition.left) };
  if (definition.outline) for (const edge of ['top', 'bottom', 'left', 'right']) outerBorders[edge] = border(ctx, definition.outline);
  const content = headerIdentity(ctx, state, definition);
  const contacts = contactParagraphs(ctx, state, { ...definition,
    contactBeforePx: ['stacked-right', 'body-column', 'separate-band'].includes(definition.contactLayout) ? 0 : definition.contactMarginTopPx,
  });
  let headingTable;
  if (definition.contactLayout === 'stacked-right') {
    const contactFraction = definition.contactFraction || 0.38;
    const monoOnLeft = definition.monogram?.startsWith('left');
    const monoSize = definition.monogramSizePx;
    const monoGap = definition.columnGapPx;
    const monoLeft = monoOnLeft ? innerPadding : monoGap;
    const monoRight = monoOnLeft ? definition.monogramMarginRightPx + monoGap : monoGap;
    const monogramWidth = definition.monogram ? twips(monoSize + monoLeft + monoRight) : 0;
    const available = width - monogramWidth;
    const contactWidth = Math.round(available * contactFraction);
    const identityWidth = available - contactWidth;
    const identityMargins = { ...margins, right: twips(12), left: monoOnLeft ? 0 : twips(definition.paddingLeftPx ?? innerPadding) };
    const contactMargins = { ...margins, left: twips(12) };
    const columns = [identityWidth, contactWidth];
    const cells = [
      cell(ctx, identityWidth, content, { margins: identityMargins, fill: definition.identityFill || definition.fill }),
      cell(ctx, contactWidth, contacts, { margins: contactMargins, fill: definition.fill }),
    ];
    if (definition.monogram) {
      const mono = paragraph(ctx, [state.contact.firstName, state.contact.surname].filter(Boolean).join(' ').charAt(0).toUpperCase() || 'R', {
        alignment: AlignmentType.CENTER, fontPx: ctx.fontPx * 1.75, afterPx: 0, multiplier: 1,
        runOptions: { bold: true, color: definition.monogram.endsWith('solid') ? '#FFFFFF' : '$heading' },
      });
      const monoTile = table([twips(monoSize)], [[cell(ctx, twips(monoSize), [mono], {
        fill: definition.monogram.endsWith('solid') ? '$accent' : undefined, verticalAlign: VerticalAlignTable.CENTER,
      })]], { minimumHeightPx: monoSize,
        borders: { ...NO_BORDERS, ...Object.fromEntries(['top', 'bottom', 'left', 'right'].map(edge => [edge, border(ctx, { widthPx: 2, color: '$divider' })])) },
      });
      const monoCell = cell(ctx, monogramWidth, [monoTile], {
        margins: { ...margins, left: twips(monoLeft), right: twips(monoRight) }, fill: definition.fill, verticalAlign: VerticalAlignTable.CENTER,
      });
      const index = monoOnLeft ? 0 : 1;
      columns.splice(index, 0, monogramWidth); cells.splice(index, 0, monoCell);
    }
    if (definition.identityFill) {
      columns[0] = Math.round(width * definition.identityFraction);
      columns[1] = width - columns[0];
      cells[0] = cell(ctx, columns[0], content, { margins: identityMargins, fill: definition.identityFill });
      cells[1] = cell(ctx, columns[1], contacts, { margins: contactMargins });
    }
    headingTable = table(columns, [cells], { indent: headerIndent, borders: outerBorders });
  } else {
    if (!['body-column', 'separate-band'].includes(definition.contactLayout) && contacts.length) {
      // Spacing belongs to the contact paragraph, never an empty spacer row.
      content.push(...contacts);
    }
    headingTable = table([width], [[cell(ctx, width, content, { margins, fill: definition.fill })]], { indent: headerIndent, borders: outerBorders });
  }
  const result = [];
  if (definition.outerTopPx || ctx.shared.canvasInsetPx) result.push(paragraph(ctx, '', {
    afterPx: 0, fontPx: 1, multiplier: 1, beforePx: (definition.outerTopPx || 0) + ctx.shared.canvasInsetPx,
  }));
  result.push(definition.shadow
    ? offsetHeaderShadow(ctx, headingTable, width, twips(ctx.shared.canvasInsetPx + leftInset), definition.shadow)
    : headingTable);
  if (definition.contactLayout === 'separate-band' && contacts.length) {
    result.push(table([pageWidth], [[cell(ctx, pageWidth, contacts, {
      fill: definition.contactFill, margins: { top: twips(definition.contactPaddingPx), bottom: twips(definition.contactPaddingPx), left: twips(margin), right: twips(margin) },
    })]], { indent: twips(ctx.shared.canvasInsetPx) }));
  }
  return result;
}

function sectionHeading(ctx, title, id, index, custom = false, first = false) {
  const definition = custom ? ctx.presentation.capabilities.customHeading : ctx.presentation.capabilities.heading;
  const fontPx = ctx.fontPx * (ctx.inSidebar ? definition.sidebarFontScale : definition.fontScale);
  const ink = ctx.inSidebar && ctx.isSolid ? definition.sidebarColor || '#FFFFFF' : definition.color;
  const ruleColor = ctx.inSidebar && ctx.isSolid ? definition.sidebarBorderColor || '#FFFFFF' : definition.borderColor;
  const borders = {};
  if (definition.borderWidthPx) borders.bottom = border(ctx, { widthPx: definition.borderWidthPx, color: ruleColor, style: definition.borderStyle });
  if (definition.top) borders.top = border(ctx, definition.top);
  if (definition.left) borders.left = border(ctx, definition.left);
  if (definition.outline && !definition.inline) for (const edge of ['left', 'right', 'top', 'bottom']) borders[edge] = border(ctx, definition.outline);
  const label = transformText(title, definition.transform);
  let prefix = definition.prefix ? `${definition.prefix} ` : '';
  let suffix = definition.suffix ? ` ${definition.suffix}` : '';
  if (definition.marker === 'number') prefix = `${String(index + 1).padStart(2, '0')}  `;
  if (definition.marker === 'diamond') prefix = '◆  ';
  if (definition.marker === 'bar') prefix = '━  ';
  if (definition.marker === 'crest') { prefix = '—  '; suffix = '  —'; }
  if (definition.marker === 'short-rule') suffix = '  ━';
  const inlinePadding = definition.inline ? ' ' : '';
  const headingRunOptions = {
    fontPx, fontFamily: definition.fontFamily || ctx.font, bold: definition.weight >= 600,
    color: ink, characterSpacingPx: definition.letterSpacingPx ?? (definition.letterSpacingEm === undefined
      ? ctx.presentation.headingLetterSpacingPx : fontPx * definition.letterSpacingEm),
    shading: definition.inline ? shading(ctx, definition.fill) : undefined,
    border: definition.inline && definition.outline ? border(ctx, definition.outline) : undefined,
  };
  const titleRuns = [
    ...(prefix ? [run(ctx, `${inlinePadding}${prefix}`, { ...headingRunOptions,
      color: definition.markerColor || ink, fontFamily: definition.marker === 'number' ? 'Courier New' : headingRunOptions.fontFamily })] : []),
    run(ctx, `${prefix ? '' : inlinePadding}${label}${suffix ? '' : inlinePadding}`, headingRunOptions),
    ...(suffix ? [
      ...(definition.suffixAlignment === 'right' ? [new TextRun({ children: [new Tab()] })] : []),
      run(ctx, `${suffix}${inlinePadding}`, headingRunOptions),
    ] : []),
  ];
  const bookmarkNumber = ++ctx.shared.bookmarkId;
  const bookmarkBase = `section_${String(id).replace(/[^a-zA-Z0-9_]/g, '_')}`;
  let bookmarkId = bookmarkBase.length <= 40 && !ctx.shared.bookmarkNames.has(bookmarkBase)
    ? bookmarkBase : `${bookmarkBase.slice(0, 32)}_${bookmarkNumber}`;
  let disambiguation = 0;
  while (ctx.shared.bookmarkNames.has(bookmarkId)) bookmarkId = `${bookmarkBase.slice(0, 28)}_${bookmarkNumber}_${++disambiguation}`;
  ctx.shared.bookmarkNames.add(bookmarkId);
  const padding = definition.paddingPx || [definition.paddingTopPx || 0, 0, definition.paddingBottomPx || 0, definition.paddingLeftPx || 0];
  const leftIndent = padding[3] + (definition.offsetLeftPx || 0);
  if (definition.offsetLeftPx && borders.left) borders.left = { ...borders.left, space: Math.round(Math.abs(definition.offsetLeftPx) * 0.75) };
  const sectionRule = definition.sectionTop && !(first && definition.omitFirstSectionTop);
  if (sectionRule) borders.top = border(ctx, definition.sectionTop);
  return paragraph(ctx, '', {
    style: STYLE.heading, measureText: `${prefix}${label}${suffix}`, fontPx, multiplier: definition.lineHeight || 1.25, keepNext: true,
    alignment: definition.alignment === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
    beforePx: (first ? ctx.leadingSectionGapPx || 0 : ctx.sectionGapPx ?? ctx.presentation.spacing.sectionPx) + (sectionRule ? definition.sectionPaddingTopPx || 0 : 0) + padding[0],
    afterPx: (definition.gapPx ?? ctx.presentation.spacing.headingPx) + padding[2],
    indent: { left: Math.round(leftIndent * 15), right: twips(padding[1]) },
    tabStops: definition.suffixAlignment === 'right' ? [{ type: TabStopType.RIGHT, position: ctx.width - twips(padding[1]) }] : undefined,
    border: Object.keys(borders).length ? borders : undefined,
    shading: definition.inline ? undefined : shading(ctx, definition.fill),
    // docx 9.7's Bookmark wrapper resets its numeric generator per instance.
    // Use the public markers with a document-scoped counter for valid pairs.
    children: [new BookmarkStart(bookmarkId, bookmarkNumber), ...titleRuns, new BookmarkEnd(bookmarkNumber)],
  });
}

function entryIdentity(ctx, title, date, definition, { beforePx = 0, education = false } = {}) {
  const titleText = transformText(cleanText(title), definition.titleTransform);
  const titlePx = ctx.fontPx * definition.titleScale;
  const datePx = ctx.fontPx * definition.dateScale;
  const titleColor = ctx.isSolid ? '#FFFFFF' : definition.titleColor || ctx.textColor;
  const dateColor = ctx.isSolid ? '#FFFFFF' : definition.dateColor || ctx.textColor;
  const titleOptions = { style: STYLE.title, fontPx: titlePx, multiplier: 1.4, afterPx: definition.titleAfterPx ?? 4, beforePx, keepNext: true,
    runOptions: { bold: definition.titleWeight >= 600, color: titleColor, fontFamily: definition.titleFontFamily || ctx.font,
      characterSpacingPx: titlePx * (definition.titleLetterSpacingEm || 0) } };
  const dateOptions = { style: STYLE.metadata, fontPx: datePx, multiplier: 1.4, afterPx: 4, keepNext: true,
    runOptions: { color: dateColor, bold: definition.dateWeight >= 600, italics: definition.dateItalic,
      fontFamily: definition.dateFontFamily || ctx.font } };
  const dateStyle = education && definition.educationDateStyle ? definition.educationDateStyle : definition.dateStyle;
  const titleParagraph = paragraph(ctx, titleText, titleOptions);
  if (!date) return [titleParagraph];
  if (['below-title', 'below-subtitle', 'metadata-inline', 'subtitle-right', 'identity-column'].includes(dateStyle)) return [titleParagraph];
  if (dateStyle === 'inline-center') {
    return [paragraph(ctx, '', { ...titleOptions, alignment: AlignmentType.CENTER, children: [
      run(ctx, titleText, { fontPx: titlePx, bold: true, color: titleColor }),
      run(ctx, `   ${date}`, { fontPx: datePx, color: dateColor }),
    ] })];
  }
  const leftDate = dateStyle === 'left-column';
  const dateWidth = leftDate
    ? Math.min(Math.round(ctx.width * 0.46), Math.max(twips(definition.dateMinimumWidthPx || 0), Math.round(ctx.width * (definition.dateFraction || 0.3))))
    : Math.round(ctx.width * (ctx.width < 3400 ? 0.43 : 0.35));
  const titleWidth = ctx.width - dateWidth;
  const titleCell = cell(ctx, titleWidth, [titleParagraph], { margins: { ...ZERO_MARGINS, right: leftDate ? 0 : twips(10), left: leftDate ? twips(10) : 0 } });
  const datePadding = definition.datePaddingPx || [0, 0, 0, 0];
  const dateCell = cell(ctx, dateWidth, [paragraph(ctx, date, { ...dateOptions,
    beforePx: beforePx + datePadding[0], afterPx: 4 + datePadding[2],
    indent: { left: twips(datePadding[3]), right: twips(datePadding[1]) },
    alignment: leftDate ? AlignmentType.LEFT : AlignmentType.RIGHT,
    border: definition.dateOutline ? Object.fromEntries(['top', 'bottom', 'left', 'right'].map(edge => [edge, border(ctx, definition.dateOutline)])) : undefined,
  })]);
  return table(leftDate ? [dateWidth, titleWidth] : [titleWidth, dateWidth], [leftDate ? [dateCell, titleCell] : [titleCell, dateCell]]);
}

function decoratedBlock(ctx, children, definition) {
  if (!children.length) return [];
  const outline = definition.sectionOutline;
  const padding = definition.sectionPaddingPx ?? definition.paddingPx ?? 0;
  if (!outline && !definition.fill && !definition.left && !definition.top && !definition.bottom) return children;
  const borders = { ...NO_BORDERS, left: border(ctx, definition.left), top: border(ctx, definition.top), bottom: border(ctx, definition.bottom) };
  if (outline) for (const edge of ['top', 'bottom', 'left', 'right']) borders[edge] = border(ctx, outline);
  const outerLeft = twips(definition.marginLeftPx || 0);
  // Word clips a nested table's outside stroke at the containing cell's right
  // edge. Reserve that stroke inside the available width (CSS border-box does
  // this too), instead of losing the right edge of main-column outlined cards.
  const width = ctx.width - outerLeft - twips(outline?.widthPx || 0);
  const metrics = children.map(child => child instanceof Paragraph ? ctx.shared.paragraphMetrics.get(child) : null);
  const heightLimit = Math.min(120, (ctx.presentation.capabilities.page.heightPx
    - (ctx.presentation.capabilities.page.bodyBottomPx ?? ctx.presentation.pageMarginPx)) * 0.12);
  const contentHeight = metrics.reduce((height, item) => height + (item?.heightPx || 0), 0)
    + (definition.paddingTopPx ?? padding) + (definition.paddingBottomPx ?? padding) + 1;
  // A small, measured text-only card can move as a unit instead of leaving its
  // empty border/anchor at a page foot. Never lock a large section, a nested
  // table, or unknown content: those must retain independent page flow.
  const keepTogether = children.length <= 4 && metrics.every(item => item && item.text.length <= 180)
    && metrics.reduce((length, item) => length + (item?.text.length || 0), 0) <= 360
    && contentHeight <= heightLimit;
  return [table([width], [[cell(ctx, width, children, {
    fill: definition.fill, borders, flowing: true,
    margins: { top: twips(definition.paddingTopPx ?? padding), bottom: twips(definition.paddingBottomPx ?? padding),
      left: twips(definition.paddingLeftPx ?? padding), right: twips(definition.paddingRightPx ?? padding) },
  })]], { indent: outerLeft, keepTogether })];
}

function entryParagraphs(ctx, entry, index, education = false) {
  const entryDefinition = ctx.presentation.capabilities.entry;
  const definition = education ? { ...entryDefinition, ...entryDefinition.education } : entryDefinition;
  const date = education ? formatResumeMonth(entry.graduationDate)
    : formatResumeDateRange(entry.startDate, entry.endDate, entry.currentJob);
  const field = name => name === 'degree' ? entry.degree || entry.level : entry[name];
  const title = education ? definition.titleFields.map(field).filter(Boolean).join(definition.titleSeparator) : entry.jobTitle;
  const subtitleParts = education ? definition.subtitleFields.map(field) : [entry.employer, entry.location];
  let subtitle = subtitleParts.filter(Boolean).join(definition.subtitleSeparator);
  if (education && definition.locationSuffixSeparator && entry.location) {
    subtitle += `${subtitle ? definition.locationSuffixSeparator : ''}${entry.location}`;
  }
  const description = education ? definition.includeCoursework ? entry.coursework : '' : entry.description;
  if (!title && !date && !subtitle && !docxRichTextBlocks(description).length) return [];
  const entryGap = index ? definition.gapPx ?? ctx.presentation.spacing.entryPx : 0;
  const decorated = Boolean(definition.sectionOutline || definition.fill || definition.left || definition.top || definition.bottom);
  const gap = decorated ? 0 : entryGap;
  const basePadding = definition.sectionPaddingPx ?? definition.paddingPx ?? 0;
  const horizontalInset = (definition.paddingLeftPx ?? basePadding) + (definition.paddingRightPx ?? basePadding)
    + (definition.marginLeftPx || 0) + (definition.sectionOutline?.widthPx || 0);
  const innerCtx = { ...ctx, width: Math.max(300, ctx.width - twips(horizontalInset)) };
  const subtitleOptions = { style: STYLE.metadata, fontPx: ctx.fontPx * definition.subtitleScale, multiplier: 1.4,
    afterPx: definition.subtitleAfterPx, keepNext: Boolean(description),
    runOptions: { color: ctx.isSolid ? '#FFFFFF' : definition.subtitleColor,
      bold: definition.subtitleWeight >= 600, italics: definition.subtitleItalic } };
  const dateOptions = { style: STYLE.metadata, fontPx: ctx.fontPx * definition.dateScale, multiplier: 1.4,
    afterPx: definition.dateAfterPx || 4, keepNext: Boolean(description),
    runOptions: { color: ctx.isSolid ? '#FFFFFF' : definition.dateColor || ctx.textColor,
      bold: definition.dateWeight >= 600, italics: definition.dateItalic } };
  let content;
  const dateStyle = education && definition.educationDateStyle ? definition.educationDateStyle : definition.dateStyle;
  if (dateStyle === 'metadata-inline') {
    content = [
      paragraph(innerCtx, (definition.metadataOrder === 'date-subtitle' ? [date, subtitle] : [subtitle, date]).filter(Boolean).join(' | '),
        { ...subtitleOptions, beforePx: gap, keepNext: true }),
      paragraph(innerCtx, transformText(title, definition.titleTransform), { style: STYLE.title, fontPx: ctx.fontPx * definition.titleScale,
        multiplier: 1.4, afterPx: definition.titleAfterPx || 5, keepNext: Boolean(description),
        runOptions: { bold: true, color: ctx.isSolid ? '#FFFFFF' : definition.titleColor || ctx.textColor } }),
      ...richParagraphs(innerCtx, description),
    ];
  } else if (dateStyle === 'identity-column') {
    const identityWidth = Math.round(innerCtx.width * definition.identityFraction);
    const narrativeWidth = innerCtx.width - identityWidth;
    content = [table([identityWidth, narrativeWidth], [[
      cell(innerCtx, identityWidth, [
        ...[entryIdentity({ ...innerCtx, width: identityWidth - twips(9) }, title, '', definition, { beforePx: gap })].flat(),
        ...(date ? [paragraph(innerCtx, date, dateOptions)] : []),
      ], { margins: { ...ZERO_MARGINS, right: twips(9) }, flowing: true }),
      cell(innerCtx, narrativeWidth, [
        ...(subtitle ? [paragraph(innerCtx, subtitle, { ...subtitleOptions, beforePx: gap })] : []),
        ...richParagraphs({ ...innerCtx, width: narrativeWidth - twips(9) }, description),
      ], { margins: { ...ZERO_MARGINS, left: twips(9) }, flowing: true }),
    ]])];
  } else {
    content = [entryIdentity(innerCtx, title, date, definition, { beforePx: gap, education })].flat();
    if (dateStyle === 'below-title' && date) content.push(paragraph(innerCtx, date, { ...dateOptions, beforePx: definition.dateBeforePx || 0 }));
    if (dateStyle === 'subtitle-right' && date) {
      const dateWidth = Math.round(innerCtx.width * 0.36);
      content.push(table([innerCtx.width - dateWidth, dateWidth], [[
        cell(innerCtx, innerCtx.width - dateWidth, [paragraph(innerCtx, subtitle, subtitleOptions)]),
        cell(innerCtx, dateWidth, [paragraph(innerCtx, date, { ...dateOptions, alignment: AlignmentType.RIGHT })]),
      ]]));
    } else if (subtitle) content.push(paragraph(innerCtx, subtitle, { ...subtitleOptions,
      alignment: definition.alignment === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT }));
    if (dateStyle === 'below-subtitle' && date) content.push(paragraph(innerCtx, date, dateOptions));
    content.push(...richParagraphs(innerCtx, description));
  }
  return [...(decorated && entryGap ? [flowGap(entryGap)] : []), ...decoratedBlock(ctx, content, definition)];
}

function skillParagraph(ctx, skill, { chip = false, plain = false } = {}) {
  const text = skill.name;
  const children = [run(ctx, text, { fontPx: ctx.fontPx * 0.93 })];
  if (skill.rating !== undefined) children.push(run(ctx, `  ${skill.rating}/5`, {
    fontPx: ctx.fontPx * 0.9, color: ctx.isSolid ? '#FFFFFF' : '$accent',
  }));
  const options = { children, fontPx: ctx.fontPx * 0.93, multiplier: 1.4, afterPx: ctx.presentation.spacing.listPx };
  if (chip) return paragraph(ctx, '', { ...options,
    border: Object.fromEntries(['top', 'bottom', 'left', 'right'].map(edge => [edge, border(ctx, { widthPx: 1, color: '$divider' })])),
    indent: { left: twips(6), right: twips(6) }, beforePx: 4, afterPx: 4 });
  return plain ? paragraph(ctx, '', options) : bulletParagraph(ctx, '', options);
}

function skills(ctx, state) {
  const definition = ctx.presentation.capabilities.skills;
  const named = state.skills.ratings.filter(item => item.name);
  let values = named.map(item => ({ name: item.name,
    ...(state.skills.showRatings === true ? { rating: Math.min(5, Math.max(1, Math.round(Number(item.rating) || 1))) } : {}),
  }));
  let variant = ctx.inSidebar ? definition.sidebarVariant : definition.variant;
  if (!named.length) {
    const blocks = docxRichTextBlocks(state.skills.textContent);
    if (!blocks.length) return [];
    if (blocks.some(block => !block.list)) return richParagraphs(ctx, state.skills.textContent);
    values = blocks.map(block => ({ name: block.text }));
    variant = ctx.inSidebar ? definition.sidebarTextVariant : definition.textVariant;
  }
  if (!values.length) return [];
  if (variant === 'list' || variant === 'plain') return values.map(skill => skillParagraph(ctx, skill, { plain: variant === 'plain' }));
  let count = variant === 'three-columns' ? 3 : variant === 'auto-columns' ? values.length >= 5 && ctx.width > twips(330) ? 3 : 2 : 2;
  if (variant === 'inline' || variant === 'chips') count = Math.min(ctx.width > twips(400) ? 3 : 2, values.length);
  if (ctx.width < twips(170)) count = 1;
  const widths = Array.from({ length: count }, (_, index) => Math.floor(ctx.width / count) + (index === count - 1 ? ctx.width % count : 0));
  const rows = [];
  for (let index = 0; index < values.length; index += count) {
    rows.push(widths.map((width, offset) => cell(ctx, width, values[index + offset]
      ? [skillParagraph({ ...ctx, width: width - twips(10) }, values[index + offset], { chip: variant === 'chips' })] : [],
    { margins: { ...ZERO_MARGINS, right: offset < count - 1 ? twips(10) : 0 } })));
  }
  return [table(widths, rows)];
}

/** Simple content grids remain native table cells with predictable widths. */
function contentGrid(ctx, items, definition, renderItem) {
  if (!items.length) return [];
  const gap = twips(definition.gapPx || 0);
  const minWidth = twips(definition.minColumnWidthPx || 150);
  const count = Math.min(items.length, Math.max(1, Math.floor((ctx.width + gap) / (minWidth + gap))));
  if (count === 1) return items.flatMap(item => renderItem(ctx, item));
  const widths = Array.from({ length: count }, (_, index) => Math.floor(ctx.width / count) + (index === count - 1 ? ctx.width % count : 0));
  const rows = [];
  for (let index = 0; index < items.length; index += count) {
    rows.push(widths.map((width, offset) => {
      const right = offset === count - 1 ? 0 : gap;
      const item = items[index + offset];
      return cell(ctx, width, item ? renderItem({ ...ctx, width: width - right }, item) : [],
        { margins: { ...ZERO_MARGINS, right } });
    }));
  }
  return [table(widths, rows)];
}

function simpleContent(ctx, state, id) {
  const definition = ctx.presentation.capabilities.content[id];
  const gap = ctx.inSidebar ? definition.sidebarGapPx ?? definition.gapPx : definition.gapPx;
  const indent = ctx.inSidebar ? definition.sidebarIndentPx ?? definition.indentPx : definition.indentPx;
  const variant = ctx.inSidebar ? definition.sidebarVariant || definition.variant : definition.variant;
  const listOptions = { afterPx: gap, indent: { left: twips(indent), hanging: twips(Math.min(10, indent)) } };
  if (id === 'websites') return state.websites.filter(site => site.url).map(site => {
    const link = safeLink(site.url);
    const children = [link ? new ExternalHyperlink({ link, children: [run(ctx, site.url)] }) : run(ctx, site.url)];
    return variant === 'plain' ? paragraph(ctx, '', { children, afterPx: gap })
      : bulletParagraph(ctx, '', { children, ...listOptions });
  });
  if (id === 'languages') {
    const items = state.languages.filter(item => item.language);
    const renderItem = (itemCtx, item) => [variant === 'list'
      ? bulletParagraph(itemCtx, item.language, listOptions) : paragraph(itemCtx, item.language, { afterPx: gap })];
    return variant === 'grid' ? contentGrid(ctx, items, definition, renderItem) : items.flatMap(item => renderItem(ctx, item));
  }
  const details = Object.entries(definition.labels).map(([key, label]) => ({ label, value: state.personalDetails[key] })).filter(item => item.value);
  const renderDetail = (itemCtx, item) => variant === 'stacked-labels'
    ? [paragraph(itemCtx, transformText(item.label, definition.labelTransform), {
      fontPx: ctx.fontPx * definition.labelScale, afterPx: 1, keepNext: true, runOptions: { bold: true },
    }), paragraph(itemCtx, item.value, { afterPx: gap })]
    : [paragraph(itemCtx, '', { children: [run(itemCtx, `${item.label}: `, { bold: true }), run(itemCtx, item.value)], afterPx: gap })];
  return variant === 'inline-grid' ? contentGrid(ctx, details, definition, renderDetail) : details.flatMap(item => renderDetail(ctx, item));
}

function sectionContent(ctx, state, id) {
  const custom = getCustomResumeSection(state, id);
  if (custom) return richParagraphs(ctx, custom.content);
  switch (id) {
    case 'summary': return richParagraphs(ctx, state.summary.content);
    case 'workHistory': return state.workHistory.flatMap((item, index) => entryParagraphs(ctx, item, index));
    case 'education': return state.education.flatMap((item, index) => entryParagraphs(ctx, item, index, true));
    case 'skills': return skills(ctx, state);
    case 'certifications': return richParagraphs(ctx, state.certifications.content);
    case 'websites':
    case 'languages':
    case 'personalDetails': return simpleContent(ctx, state, id);
    default: return [];
  }
}

function sectionList(ctx, state, ids, indexOffset = 0) {
  const result = [];
  let visible = 0;
  ids.forEach((id, index) => {
    const custom = getCustomResumeSection(state, id);
    const definition = custom ? ctx.presentation.capabilities.customHeading : ctx.presentation.capabilities.heading;
    const padding = definition.sectionPaddingPx || 0;
    const innerCtx = { ...ctx, width: Math.max(300, ctx.width - twips(padding * 2 + (definition.sectionOutline?.widthPx || 0))),
      ...(definition.sectionOutline ? { sectionGapPx: 0 } : {}) };
    const content = sectionContent(innerCtx, state, id);
    if (!content.length) return;
    const title = state.design.sectionTitles?.[id] || custom?.title || definition.labels[id] || 'Additional Information';
    const heading = sectionHeading(innerCtx, title, id, indexOffset + index, Boolean(custom), visible === 0);
    ctx.shared.sections.push({ id, title, column: ctx.column, index: indexOffset + index });
    if (definition.sectionOutline && visible > 0) result.push(flowGap(ctx.presentation.spacing.sectionPx));
    result.push(...decoratedBlock(ctx, [heading, ...content], {
      sectionOutline: definition.sectionOutline, sectionPaddingPx: definition.sectionPaddingPx,
    }));
    visible++;
  });
  return result;
}

function timelineMarkers(ctx, rail) {
  return Array.from({ length: rail.markerCount }, (_, index) => {
    const diameter = index ? 9 : 16;
    const box = diameter + 8;
    const glyph = new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0, line: twips(box), lineRule: LineRuleType.EXACT },
      children: [run(ctx, index ? '○' : '●', { fontPx: diameter * 1.4,
        color: index ? rail.color : '$accent', shading: shading(ctx, '#FFFFFF') })],
    });
    // Only these small, nonessential circle glyphs leave their 2px rail cell.
    // Native anchored decorations let the continuous shaded rule flow across
    // pages without clipping markers or putting any resume text in a shape.
    const marker = new WpsShapeRun({
      type: 'wps', children: [glyph], transformation: { width: box, height: box },
      outline: { type: 'noFill' },
      altText: { id: String(++ctx.shared.decorationId), name: `Timeline marker ${index + 1}`, description: 'Decorative timeline circle' },
      bodyProperties: { margins: ZERO_MARGINS, noAutoFit: true, verticalAnchor: VerticalAnchor.CENTER },
      floating: { layoutInCell: false, allowOverlap: true, behindDocument: false,
        horizontalPosition: { relative: HorizontalPositionRelativeFrom.CHARACTER, offset: Math.round((rail.ruleWidthPx - box) / 2 * 9525) },
        verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, offset: -4 * 9525 },
        wrap: { type: TextWrappingType.NONE },
      },
    });
    return new Paragraph({ keepNext: false,
      spacing: { before: index ? twips(2) : 0, after: index === rail.markerCount - 1 ? 0 : twips(rail.markerGapPx),
        line: twips(diameter), lineRule: LineRuleType.EXACT },
      children: [marker],
    });
  });
}

function body(ctx, state) {
  const { capabilities, layout, pageMarginPx } = ctx.presentation;
  const { columns, page, header: headerDefinition } = capabilities;
  let inset = (page.horizontalInsetPx ?? pageMarginPx * page.horizontalInsetMultiplier) + ctx.shared.canvasInsetPx;
  let width = ctx.shared.pageWidth - twips(inset * 2);
  if (page.bodyMaxWidthPx) {
    // CSS max-width includes the body's padding (global border-box sizing).
    const maxWidth = twips(Math.max(20, page.bodyMaxWidthPx - pageMarginPx * 2));
    inset += Math.max(0, (width - maxWidth) / 30);
    width = Math.min(width, maxWidth);
  }
  const bodyTop = Math.max(0, (page.bodyTopPx ?? pageMarginPx) - (headerDefinition.shadow?.offsetPx || 0));
  if (columns.count === 1) {
    const leftExtra = twips(pageMarginPx * (page.bodyLeftMultiplier - 1));
    const content = sectionList({ ...ctx, width: width - leftExtra, column: 'main' }, state, layout.sectionOrder);
    return content.length ? [table([width], [[cell(ctx, width, content, {
      margins: { ...ZERO_MARGINS, top: twips(bodyTop), left: leftExtra }, flowing: true,
    })]], { indent: twips(inset) })] : [];
  }
  const result = [];
  const ids = { sidebar: [...layout.columns.sidebar], main: [...layout.columns.main] };
  if (columns.summaryAboveColumns && ids.sidebar.includes('summary')) {
    const summary = sectionList({ ...ctx, width, column: 'full-width' }, state, ['summary']);
    if (summary.length) result.push(table([width], [[cell(ctx, width, summary, { margins: { ...ZERO_MARGINS, top: twips(pageMarginPx) }, flowing: true })]], { indent: twips(inset) }));
    ids.sidebar = ids.sidebar.filter(id => id !== 'summary');
  }
  const available = width - twips(columns.gapPx);
  const sidebarWidth = Math.round(available * columns.sidebarFraction);
  const mainWidth = available - sidebarWidth;
  const sidebarLeft = columns.sidebarPosition !== 'right';
  const top = columns.timelineRail ? 0 : columns.topPaddingPx ?? bodyTop;
  // The timeline starts with the content, not at the masthead's bottom rule.
  // A shared flow spacer moves all three rails without padding a shaded cell.
  if (columns.timelineRail) result.push(flowGap(columns.topPaddingPx ?? bodyTop));
  const sidePadding = columns.sidebarPaddingPx;
  const sideInner = columns.innerSidebarPaddingPx ?? (columns.innerInsetMultiplier ? pageMarginPx * columns.innerInsetMultiplier : 0);
  const mainInner = columns.innerMainPaddingPx ?? (columns.innerInsetMultiplier ? pageMarginPx * columns.innerInsetMultiplier : 0);
  const sidebarMargins = sidePadding ? { top: twips(sidePadding[0]), right: twips(sidePadding[1]), bottom: twips(sidePadding[2]), left: twips(sidePadding[3]) }
    : { top: twips(top), bottom: 0, left: sidebarLeft ? 0 : twips(sideInner), right: sidebarLeft ? twips(sideInner) : 0 };
  const mainMargins = { top: twips(top), bottom: 0, left: sidebarLeft ? twips(mainInner) : 0, right: sidebarLeft ? 0 : twips(mainInner) };
  if (columns.fullBleed) {
    const sideInset = pageMarginPx * (columns.sidebarInsetMultiplier || 1);
    sidebarMargins.left = twips(sideInset); sidebarMargins.right = twips(sideInset); sidebarMargins.top = twips(pageMarginPx);
    mainMargins.left = twips(pageMarginPx); mainMargins.right = twips(pageMarginPx); mainMargins.top = twips(pageMarginPx);
  }
  const stripeWidth = columns.sidebarInsetStripe
    ? Math.min(twips(columns.sidebarInsetStripe.widthPx), sidebarMargins.left) : 0;
  const sidebarContentWidth = sidebarWidth - stripeWidth;
  sidebarMargins.left -= stripeWidth;
  const sidebarCtx = { ...ctx, inSidebar: true, isSolid: columns.sidebarStyle === 'solid', column: 'sidebar',
    fontPx: ctx.fontPx * columns.sidebarFontScale,
    textColor: columns.sidebarColor || ctx.textColor,
    width: sidebarContentWidth - sidebarMargins.left - sidebarMargins.right };
  const mainCtx = { ...ctx, column: 'main', width: mainWidth - mainMargins.left - mainMargins.right };
  const sidebarContent = [];
  const mainContent = [];
  if (headerDefinition.identityInSidebar) {
    sidebarContent.push(...headerIdentity(sidebarCtx, state, headerDefinition),
      ...contactParagraphs(sidebarCtx, state, { ...headerDefinition, contactBeforePx: headerDefinition.contactMarginTopPx }));
    sidebarCtx.leadingSectionGapPx = headerDefinition.paddingBottomPx || 0;
  }
  if (headerDefinition.contactLayout === 'body-column') {
    const targetCtx = columns.contactColumn === 'main' ? mainCtx : sidebarCtx;
    const target = columns.contactColumn === 'main' ? mainContent : sidebarContent;
    const contacts = contactParagraphs(targetCtx, state, headerDefinition);
    if (contacts.length) {
      target.push(sectionHeading(targetCtx, headerDefinition.contactLabel || 'Contact', 'contact', -1, false, true), ...contacts);
    }
  }
  sidebarContent.push(...sectionList(sidebarCtx, state, ids.sidebar, sidebarLeft ? 0 : ids.main.length));
  mainContent.push(...sectionList(mainCtx, state, ids.main, sidebarLeft ? ids.sidebar.length : 0));
  const sideBorders = {};
  const mainBorders = {};
  if (columns.divider) sideBorders[sidebarLeft ? 'right' : 'left'] = border(ctx, columns.divider);
  if (columns.sidebarOutline) for (const edge of ['top', 'bottom', 'left', 'right']) sideBorders[edge] = border(ctx, columns.sidebarOutline);
  if (columns.semanticSidebarIsWide && columns.divider) {
    delete sideBorders.right;
    mainBorders.left = border(ctx, columns.divider);
  }
  const sideCell = columns.sidebarTopMarginPx
    ? cell(sidebarCtx, sidebarContentWidth, [table([sidebarContentWidth], [[cell(sidebarCtx, sidebarContentWidth, sidebarContent,
      { margins: sidebarMargins, borders: sideBorders, fill: columns.sidebarFill, flowing: true })]])],
    { margins: { ...ZERO_MARGINS, top: twips(columns.sidebarTopMarginPx) }, flowing: true })
    : cell(sidebarCtx, sidebarContentWidth, sidebarContent, { margins: sidebarMargins, borders: sideBorders, fill: columns.sidebarFill, flowing: true });
  const mainCell = cell(mainCtx, mainWidth, mainContent, {
    margins: mainMargins, borders: mainBorders, pattern: columns.mainGrid, flowing: true,
  });
  const sideWidths = stripeWidth ? [stripeWidth, sidebarContentWidth] : [sidebarWidth];
  const sideCells = stripeWidth ? [cell(ctx, stripeWidth, [], { fill: columns.sidebarInsetStripe.color }), sideCell] : [sideCell];
  const widths = sidebarLeft ? [...sideWidths, mainWidth] : [mainWidth, ...sideWidths];
  const cells = sidebarLeft ? [...sideCells, mainCell] : [mainCell, ...sideCells];
  if (columns.gapPx) {
    const gapWidth = twips(columns.gapPx);
    const gapIndex = sidebarLeft ? sideWidths.length : 1;
    widths.splice(gapIndex, 0, gapWidth);
    const rail = columns.timelineRail;
    if (rail) {
      const ruleWidth = twips(rail.ruleWidthPx);
      const leftGap = Math.floor((gapWidth - ruleWidth) / 2);
      widths.splice(gapIndex, 1, leftGap, ruleWidth, gapWidth - leftGap - ruleWidth);
      const markers = timelineMarkers(ctx, rail);
      cells.splice(gapIndex, 0, cell(ctx, leftGap, []), cell(ctx, ruleWidth, markers, { fill: rail.color }),
        cell(ctx, gapWidth - leftGap - ruleWidth, []));
    } else cells.splice(gapIndex, 0, cell(ctx, gapWidth, []));
  }
  // One explicitly breakable row gives each rail its own uninterrupted flow.
  // Index-pairing unrelated section chunks introduced giant gaps. There are no
  // exact heights, floating tables, or cantSplit locks on this dynamic body.
  if (columns.topMarginPx) result.push(paragraph(ctx, '', { fontPx: 1, multiplier: 1, afterPx: 0, beforePx: columns.topMarginPx }));
  result.push(table(widths, [cells], { indent: twips(inset), borders: { ...NO_BORDERS, top: border(ctx, columns.top) } }));
  return result;
}

function documentStyles(ctx) {
  const defaultRun = { font: ctx.font, size: halfPoints(ctx.fontPx), color: color(ctx, ctx.textColor) };
  const defaultParagraph = { contextualSpacing: false, spacing: { before: 0, after: 0, ...lineSpacing(ctx) }, widowControl: true };
  return {
    default: { document: { run: defaultRun, paragraph: defaultParagraph } },
    paragraphStyles: [
      { id: 'Normal', name: 'Normal', default: true, run: defaultRun, paragraph: defaultParagraph },
      ...Object.entries(STYLE).map(([role, id]) => ({ id, name: `Resume ${role}`, basedOn: 'Normal', next: STYLE.body,
        quickFormat: true, run: defaultRun,
        paragraph: { ...defaultParagraph, ...(role === 'heading' ? { keepNext: true, outlineLevel: 0 } : {}) },
      })),
    ],
  };
}

function documentNumbering(ctx) {
  return { config: [false, true].flatMap(sidebar => ['bullet', 'decimal', 'contact'].map(kind => ({
    reference: `resume-${sidebar ? 'sidebar-' : ''}${kind}`,
    levels: Array.from({ length: 5 }, (_, level) => ({
      level, format: kind === 'decimal' ? LevelFormat.DECIMAL : LevelFormat.BULLET,
      text: kind === 'decimal' ? `%${level + 1}.` : '•', alignment: AlignmentType.LEFT,
      style: { run: { font: ctx.font, size: halfPoints(ctx.fontPx * (sidebar ? ctx.presentation.capabilities.columns.sidebarFontScale : 1)),
        color: color(ctx, sidebar ? '#FFFFFF' : kind === 'contact' ? '$accent' : ctx.textColor) },
        paragraph: { indent: { left: twips(20 + level * 14), hanging: twips(10) },
          spacing: { before: 0, after: twips(ctx.presentation.spacing.listPx), ...lineSpacing(ctx) } },
      },
    })),
  }))) };
}

function pageBorders(ctx, state) {
  const page = ctx.presentation.capabilities.page;
  const userWidth = { thin: 1, medium: 2, thick: 4 }[state.design.pageBorder];
  // An added outer border must never replace the template's intrinsic frame.
  // Coincident same-color edge strokes (Leadership Brief) form one wider rule.
  const intrinsic = page.borderWidthPx;
  const coincident = intrinsic && !page.borderInsetPx && color(ctx, page.borderColor) === color(ctx, '$accent');
  const width = intrinsic ? coincident ? Math.max(intrinsic, userWidth || 0) : intrinsic : userWidth;
  if (!width) return undefined;
  const definition = { ...border(ctx, { widthPx: width, color: intrinsic ? page.borderColor : '$accent' }),
    space: Math.max(0, Math.min(31, Math.round((intrinsic ? page.borderInsetPx : 0) * 0.75))) };
  return { pageBorders: { offsetFrom: PageBorderOffsetFrom.PAGE },
    pageBorderTop: definition, pageBorderBottom: definition, pageBorderLeft: definition, pageBorderRight: definition };
}

function additionalPageFrame(ctx, state) {
  const page = ctx.presentation.capabilities.page;
  const width = { thin: 1, medium: 2, thick: 4 }[state.design.pageBorder];
  if (!width || !page.borderWidthPx) return undefined;
  if (!page.borderInsetPx && color(ctx, page.borderColor) === color(ctx, '$accent')) return undefined;
  // Word has one pgBorders set. A second, empty native outline in a repeating
  // footer preserves the user's independent outer ring without moving text or
  // replacing Developer/Bordeaux's inset frame. No document content is inside it.
  // Keep the complete stroke just inside the physical page. Word clips a WPS
  // outline whose centerline sits on the page boundary, while the preview's
  // CSS border is fully inside its border-box.
  const inset = width;
  const frame = new WpsShapeRun({
    type: 'wps', children: [emptyParagraph()],
    transformation: { width: page.widthPx - inset * 2, height: page.heightPx - inset * 2 },
    outline: { type: 'solidFill', solidFillType: 'rgb', value: color(ctx, '$accent'), width: Math.round(width * 9525) },
    altText: { id: String(++ctx.shared.decorationId), name: 'Resume outer page border', description: 'Decorative additional page frame' },
    bodyProperties: { margins: ZERO_MARGINS, noAutoFit: true },
    floating: { layoutInCell: false, allowOverlap: true, behindDocument: false,
      horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: Math.round(inset * 9525) },
      verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: Math.round(inset * 9525) },
      wrap: { type: TextWrappingType.NONE },
    },
  });
  return { default: new Footer({ children: [new Paragraph({
    spacing: { before: 0, after: 0, line: 1, lineRule: LineRuleType.EXACT }, children: [frame],
  })] }) };
}

/** Build the actual editable Word document from the exact selected capabilities. */
export function buildResumeDOCX(inputState) {
  const state = sanitizeDocxState(inputState);
  const presentation = getTemplatePresentation(state);
  const page = presentation.capabilities.page;
  const shared = { sections: [], listInstance: 0, bookmarkId: 0, decorationId: 0, bookmarkNames: new Set(), paragraphMetrics: new WeakMap(),
    canvasInsetPx: (page.outerMarginPx || 0) + (page.frameConsumesSpace ? page.borderWidthPx : 0),
    pageWidth: twips(page.widthPx) };
  const ctx = { presentation, shared, width: shared.pageWidth,
    font: wordFontFamily(presentation.fontFamily), fontPx: presentation.bodyFontPx,
    textColor: presentation.capabilities.bodyColor, column: 'main', inSidebar: false, isSolid: false };
  // Adjacent Word tables can be coalesced by a viewer, which erases a header's
  // bottom rule. A one-twip paragraph keeps semantic blocks distinct without
  // introducing a visible spacer or changing their fixed column widths.
  const children = separateTables([...header(ctx, state), ...body(ctx, state), emptyParagraph()]);
  const metadata = {
    ResumeTemplateId: presentation.templateId,
    ResumeTemplateSignature: presentation.signature,
    ResumeLayout: presentation.capabilities.columns.count === 1 ? 'single-column' : `sidebar-${presentation.capabilities.columns.sidebarPosition}`,
    ResumeSidebarFraction: String(presentation.capabilities.columns.sidebarFraction),
    ResumeSectionOrder: JSON.stringify(shared.sections),
    ResumeColors: JSON.stringify(presentation.colors),
    ResumeFont: ctx.font,
    ResumeBodyFontPx: String(presentation.bodyFontPx),
  };
  return new Document({
    creator: 'Resume Builder', lastModifiedBy: 'Resume Builder',
    title: [state.contact.firstName, state.contact.surname, 'Resume'].filter(Boolean).join(' '),
    subject: presentation.template.name, description: `Editable ${presentation.template.name} resume`,
    customProperties: Object.entries(metadata).map(([name, value]) => ({ name, value })),
    compatabilityModeVersion: 15,
    compatibility: { doNotAutofitConstrainedTables: true, growAutofit: false, doNotUseHTMLParagraphAutoSpacing: true },
    styles: documentStyles(ctx), numbering: documentNumbering(ctx),
    sections: [{
      properties: { page: {
        size: { width: shared.pageWidth, height: twips(presentation.capabilities.page.heightPx) },
        // The preview has an edge-to-edge A4 canvas. Insets belong to the
        // shared header/body/rail definitions, not an extra generic Word margin.
        margin: { top: 0, right: 0, bottom: twips(presentation.capabilities.page.bodyBottomPx ?? presentation.pageMarginPx), left: 0, header: 0, footer: 0 },
        borders: pageBorders(ctx, state),
      } }, footers: additionalPageFrame(ctx, state), children,
    }],
  });
}
