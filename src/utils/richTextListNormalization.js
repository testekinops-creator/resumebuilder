import { Fragment, Slice } from '@tiptap/pm/model';

// Treat plain-text list markers as formatting, never as resume content. The
// expression deliberately requires whitespace after the marker so a genuine
// hyphenated word is left intact.
const LIST_MARKER_PREFIX = /^[\s\u00A0]*(?:(?:[-•●]\s+)|(?:\d+[.)]\s+))+/u;
const BLANK_TEXT = /[\s\u00A0]/gu;

export function isBlankRichText(value) {
  return String(value ?? '').replace(BLANK_TEXT, '') === '';
}

function hasMeaningfulContent(node) {
  let meaningful = false;

  node.descendants(child => {
    if (child.isText) {
      if (!isBlankRichText(child.text)) {
        meaningful = true;
        return false;
      }
      return true;
    }
    // Images and other leaf content are meaningful even when textContent is
    // empty. Hard breaks alone are intentionally not meaningful: a <p><br>
    // pasted from Word/PDF is an accidental blank paragraph.
    if (child.isLeaf && child.type.name !== 'hardBreak') {
      meaningful = true;
      return false;
    }
    return !meaningful;
  });

  return meaningful;
}

function stripLeadingListMarker(textblock) {
  const firstChild = textblock.firstChild;
  if (!firstChild?.isText) return textblock;

  const marker = firstChild.text?.match(LIST_MARKER_PREFIX);
  if (!marker) return textblock;

  const remaining = firstChild.text.slice(marker[0].length);
  const children = [];
  if (remaining) children.push(textblock.type.schema.text(remaining, firstChild.marks));
  for (let index = 1; index < textblock.childCount; index += 1) children.push(textblock.child(index));
  return textblock.copy(Fragment.fromArray(children));
}

function normalizePastedNode(node) {
  if (node.isText) return node;

  const normalizedContent = normalizePastedFragment(node.content);
  let normalized = node.copy(normalizedContent);

  if (normalized.isTextblock) {
    normalized = stripLeadingListMarker(normalized);
    return hasMeaningfulContent(normalized) ? normalized : null;
  }

  // Empty list items are meaningful while a user is composing a list, but a
  // pasted/converted document should not create them. This runs only during
  // paste or explicit toolbar conversion—not on normal typing updates.
  if (normalized.type.name === 'listItem' && !hasMeaningfulContent(normalized)) return null;
  if ((normalized.type.name === 'bulletList' || normalized.type.name === 'orderedList') && !normalized.childCount) return null;

  return normalized;
}

function normalizePastedFragment(fragment) {
  const nodes = [];
  fragment.forEach(node => {
    const normalized = normalizePastedNode(node);
    if (normalized) nodes.push(normalized);
  });
  return Fragment.fromArray(nodes);
}

/**
 * Shared paste normalization for every RichTextEditor instance. It removes
 * artificial blank paragraphs and duplicate list markers without flattening
 * inline marks, links, or hard breaks.
 */
export function normalizePastedSlice(slice) {
  const content = normalizePastedFragment(slice.content);
  if (!content.size) return Slice.empty;

  // Preserve the parser's intended open depths wherever possible, while
  // clamping them if blank nodes at an edge were removed.
  const maxOpen = Slice.maxOpen(content);
  return new Slice(
    content,
    Math.min(slice.openStart, maxOpen.openStart),
    Math.min(slice.openEnd, maxOpen.openEnd),
  );
}

/** Normalizes clipboard text before ProseMirror creates paragraph nodes. */
export function normalizePastedPlainText(text) {
  return String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter(line => !isBlankRichText(line))
    .map(line => line.replace(LIST_MARKER_PREFIX, ''))
    .join('\n');
}

/**
 * Remove textual bullet/number prefixes only from paragraphs whose opening
 * position is inside the selection. That leaves text before/after a partial
 * selection untouched while preserving marks on the remaining text.
 */
export function stripListMarkersInSelection(tr, selection = tr.selection) {
  const changes = [];

  tr.doc.nodesBetween(selection.from, selection.to, (node, position) => {
    if (!node.isTextblock || selection.from > position + 1) return;
    const firstChild = node.firstChild;
    if (!firstChild?.isText) return;
    const marker = firstChild.text?.match(LIST_MARKER_PREFIX);
    if (!marker) return;
    const markerFrom = position + 1;
    const markerTo = markerFrom + marker[0].length;
    if (selection.to < markerTo) return;
    changes.push({
      from: markerFrom,
      to: markerTo,
    });
  });

  // Apply from bottom to top so each source position still points to the
  // original selected paragraph.
  changes.sort((left, right) => right.from - left.from).forEach(change => {
    tr.delete(change.from, change.to);
  });

  return tr;
}

function isFullySelected(node, position, selection) {
  const contentStart = position + 1;
  const contentEnd = position + node.nodeSize - 1;
  return selection.from <= contentStart && selection.to >= contentEnd;
}

function removeNodeRanges(tr, ranges) {
  // An empty parent list item subsumes an empty nested list item. Keep the
  // outermost range so deleting in reverse never leaves a stale position.
  const outermost = ranges.filter(range => !ranges.some(other => (
    other.from < range.from && other.to >= range.to
  )));

  outermost
    .sort((left, right) => right.from - left.from)
    .forEach(range => tr.delete(range.from, range.to));
}

/**
 * Drop blank, root-level paragraphs only when their entire document range is
 * selected. This is what lets leading, trailing, and repeated empty lines
 * disappear during bulk conversion without changing blank lines around the
 * selected content.
 */
export function removeBlankTextblocksInSelection(tr, selection = tr.selection) {
  const removals = [];

  tr.doc.nodesBetween(selection.from, selection.to, (node, position, parent) => {
    if (
      node.isTextblock
      && parent.type.name === 'doc'
      && !hasMeaningfulContent(node)
      && isFullySelected(node, position, selection)
    ) {
      removals.push({ from: position, to: position + node.nodeSize });
      return false;
    }
    return true;
  });

  removeNodeRanges(tr, removals);
  return tr;
}

/**
 * Prune only empty list items wholly covered by the active conversion range.
 * It is intentionally invoked by the toolbar command, never by editor
 * updates, so Enter can still create a temporary empty list item while the
 * user types.
 */
export function removeEmptyListItemsInSelection(tr, selection = tr.selection) {
  const removals = [];

  tr.doc.nodesBetween(selection.from, selection.to, (node, position) => {
    if (
      (node.type.name === 'bulletList' || node.type.name === 'orderedList')
      && !hasMeaningfulContent(node)
      && isFullySelected(node, position, selection)
    ) {
      removals.push({ from: position, to: position + node.nodeSize });
      return false;
    }
    if (
      node.type.name === 'listItem'
      && !hasMeaningfulContent(node)
      && isFullySelected(node, position, selection)
    ) {
      removals.push({ from: position, to: position + node.nodeSize });
      return false;
    }
    return true;
  });

  removeNodeRanges(tr, removals);
  return tr;
}

function selectionHasMeaningfulContent(doc, selection) {
  let meaningful = false;

  doc.nodesBetween(selection.from, selection.to, node => {
    if (node.isText && !isBlankRichText(node.text)) {
      meaningful = true;
      return false;
    }
    if (node.isLeaf && node.type.name !== 'hardBreak') {
      meaningful = true;
      return false;
    }
    return !meaningful;
  });

  return meaningful;
}

/**
 * Normalizes the selected content, then delegates structural list work to
 * Tiptap. StarterKit's native list commands retain normal toggle, conversion,
 * Enter-twice exit, Tab, Shift+Tab, and Backspace behavior.
 */
export function convertSelectionToList(editor, type) {
  if (!editor) return false;

  // A mounted toolbar click needs focus restored before the list command. The
  // view check also keeps this shared helper usable in non-DOM regression
  // tests without changing browser behavior.
  if (editor.editorView?.dom?.isConnected) editor.commands.focus();

  const hadCursorOnlySelection = editor.state.selection.empty;
  let canConvertSelection = hadCursorOnlySelection;

  // Run cleanup as its own transaction before using Tiptap's native command.
  // That preserves its expected toggle behavior for an already-active list
  // and avoids merging neighboring list items while a transaction is mid-edit.
  const normalized = editor.commands.command(({ tr }) => {
    stripListMarkersInSelection(tr);
    removeBlankTextblocksInSelection(tr);
    removeEmptyListItemsInSelection(tr);
    canConvertSelection = hadCursorOnlySelection || selectionHasMeaningfulContent(tr.doc, tr.selection);
    return true;
  });

  if (!normalized || !canConvertSelection) return normalized;

  return type === 'ordered'
    ? editor.commands.toggleOrderedList()
    : editor.commands.toggleBulletList();
}
