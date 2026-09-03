import assert from 'node:assert/strict';
import test from 'node:test';
import { Editor } from '@tiptap/core';
import { Fragment, Slice } from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';
import {
  convertSelectionToList,
  normalizePastedPlainText,
  normalizePastedSlice,
  removeEmptyListItemsInSelection,
} from '../src/utils/richTextListNormalization.js';

function paragraph(text = '', marks) {
  return text
    ? { type: 'paragraph', content: [{ type: 'text', text, ...(marks ? { marks } : {}) }] }
    : { type: 'paragraph' };
}

function listItem(text = '') {
  return { type: 'listItem', content: [paragraph(text)] };
}

function createEditor(content) {
  return new Editor({
    element: null,
    extensions: [StarterKit.configure({
      bulletList: { keepMarks: true },
      orderedList: { keepMarks: true },
    })],
    content: { type: 'doc', content },
  });
}

function listTexts(editor) {
  const list = editor.getJSON().content[0];
  return list.content.map(item => item.content[0].content?.map(child => child.text || '\n').join('') || '');
}

function nodeText(node) {
  if (typeof node?.text === 'string') return node.text;
  if (!node?.content) return '';
  return node.content.map(nodeText).join('');
}

test('plain-text paste collapses blank and whitespace-only lines without flattening real paragraphs', () => {
  assert.equal(
    normalizePastedPlainText('\n\u00A0\t\n• Delivered reliable work.\n\n\n2. Collaborated with stakeholders.\r\n● Improved documentation.\n\n'),
    'Delivered reliable work.\nCollaborated with stakeholders.\nImproved documentation.',
  );
  assert.equal(normalizePastedPlainText('Designed testing\nacross web and mobile.'), 'Designed testing\nacross web and mobile.');
});

test('pasted ProseMirror slices drop empty paragraphs/items while preserving inline marks and soft breaks', () => {
  const editor = createEditor([paragraph('Seed')]);
  const { schema } = editor;
  const bold = schema.marks.bold.create();
  const p = (...content) => schema.nodes.paragraph.create(null, content);
  const li = (...content) => schema.nodes.listItem.create(null, content);
  const list = (...content) => schema.nodes.bulletList.create(null, content);
  const slice = new Slice(Fragment.fromArray([
    p(schema.text('\u00A0\t')),
    p(schema.text('• '), schema.text('Marked point', [bold])),
    p(schema.text('Designed and executed testing'), schema.nodes.hardBreak.create(), schema.text('across web and mobile.')),
    p(schema.nodes.hardBreak.create()),
    list(
      li(p(schema.text('Manual Testing'))),
      li(p(schema.text('  '))),
      li(p(schema.text('Jira'))),
    ),
  ]), 0, 0);

  const normalized = normalizePastedSlice(slice);
  assert.equal(slice.content.childCount, 5, 'the original clipboard slice remains unchanged');
  assert.equal(normalized.content.childCount, 3);

  const first = normalized.content.child(0);
  assert.equal(first.textContent, 'Marked point');
  assert.equal(first.firstChild.marks[0].type.name, 'bold');

  const softBreakParagraph = normalized.content.child(1);
  assert.equal(softBreakParagraph.childCount, 3);
  assert.equal(softBreakParagraph.child(1).type.name, 'hardBreak');

  const normalizedList = normalized.content.child(2);
  assert.equal(normalizedList.childCount, 2);
  assert.deepEqual(
    [normalizedList.child(0).textContent, normalizedList.child(1).textContent],
    ['Manual Testing', 'Jira'],
  );
  editor.destroy();
});

test('toolbar conversion creates one bullet per real paragraph and ignores leading, trailing, and repeated blanks', () => {
  const editor = createEditor([
    paragraph('\u00A0'),
    paragraph('• Delivered reliable work.'),
    paragraph(),
    paragraph('\t'),
    paragraph('2. Collaborated with stakeholders.'),
    paragraph('● Improved documentation.'),
    paragraph(),
  ]);

  editor.commands.selectAll();
  convertSelectionToList(editor, 'bullet');
  assert.equal(editor.getJSON().content[0].type, 'bulletList');
  assert.deepEqual(listTexts(editor), [
    'Delivered reliable work.',
    'Collaborated with stakeholders.',
    'Improved documentation.',
  ]);
  editor.destroy();
});

test('list conversion preserves hard breaks and inline marks, and switches list types without changing content', () => {
  const editor = createEditor([{
    type: 'paragraph',
    content: [
      { type: 'text', text: '• ' },
      { type: 'text', text: 'Designed and executed testing', marks: [{ type: 'bold' }] },
      { type: 'hardBreak' },
      { type: 'text', text: 'across web and mobile.' },
    ],
  }]);

  editor.commands.selectAll();
  convertSelectionToList(editor, 'bullet');
  let list = editor.getJSON().content[0];
  assert.equal(list.type, 'bulletList');
  assert.equal(list.content.length, 1);
  assert.equal(list.content[0].content[0].content[1].type, 'hardBreak');
  assert.equal(list.content[0].content[0].content[0].marks[0].type, 'bold');
  assert.deepEqual(listTexts(editor), ['Designed and executed testing\nacross web and mobile.']);

  editor.commands.selectAll();
  convertSelectionToList(editor, 'ordered');
  list = editor.getJSON().content[0];
  assert.equal(list.type, 'orderedList');
  assert.deepEqual(listTexts(editor), ['Designed and executed testing\nacross web and mobile.']);

  editor.commands.selectAll();
  convertSelectionToList(editor, 'bullet');
  assert.equal(editor.getJSON().content[0].type, 'bulletList');
  assert.deepEqual(listTexts(editor), ['Designed and executed testing\nacross web and mobile.']);
  editor.destroy();
});

test('conversion affects only selected paragraphs and normalizes existing empty list items only during that conversion', () => {
  const editor = createEditor([
    paragraph('Outside before'),
    paragraph('1. Selected point'),
    paragraph('Outside after'),
  ]);
  const beforeSize = editor.state.doc.child(0).nodeSize;
  const selectedSize = editor.state.doc.child(1).content.size;
  editor.commands.setTextSelection({ from: beforeSize + 1, to: beforeSize + 1 + selectedSize });
  convertSelectionToList(editor, 'ordered');
  assert.deepEqual(editor.getJSON().content.map(node => node.type), ['paragraph', 'orderedList', 'paragraph']);
  assert.deepEqual(editor.getJSON().content.map(nodeText), [
    'Outside before',
    'Selected point',
    'Outside after',
  ]);
  editor.destroy();

  const listEditor = createEditor([{
    type: 'bulletList',
    content: [listItem('Manual Testing'), listItem(), listItem('Jira')],
  }]);
  listEditor.commands.selectAll();
  convertSelectionToList(listEditor, 'bullet');
  assert.deepEqual(listEditor.getJSON().content.map(node => node.type), ['paragraph', 'paragraph']);
  assert.deepEqual(listEditor.getJSON().content.map(nodeText), ['Manual Testing', 'Jira']);
  listEditor.destroy();
});

test('blank list items outside the selected conversion range are left untouched', () => {
  const editor = createEditor([{
    type: 'bulletList',
    content: [listItem('Selected item'), listItem(), listItem('Outside item')],
  }]);
  let selectedTextStart;
  let selectedTextEnd;

  editor.state.doc.descendants((node, position) => {
    if (node.isText && node.text === 'Selected item') {
      selectedTextStart = position;
      selectedTextEnd = position + node.nodeSize;
    }
  });
  editor.commands.setTextSelection({ from: selectedTextStart, to: selectedTextEnd });
  editor.commands.command(({ tr }) => {
    removeEmptyListItemsInSelection(tr);
    return true;
  });

  const list = editor.getJSON().content[0];
  assert.equal(list.content.length, 3);
  assert.equal(list.content[1].content[0].content, undefined);
  assert.equal(list.content[2].content[0].content[0].text, 'Outside item');
  editor.destroy();
});

test('selected inner blanks are removed without touching adjacent list items, and all-blank lists do not survive', () => {
  const editor = createEditor([{
    type: 'bulletList',
    content: [listItem(), listItem('First selected'), listItem(), listItem('Second selected'), listItem()],
  }]);
  let from;
  let to;
  editor.state.doc.descendants((node, position) => {
    if (node.isText && node.text === 'First selected') from = position;
    if (node.isText && node.text === 'Second selected') to = position + node.nodeSize;
  });
  editor.commands.setTextSelection({ from, to });
  editor.commands.command(({ tr }) => {
    removeEmptyListItemsInSelection(tr);
    return true;
  });
  let list = editor.getJSON().content[0];
  assert.deepEqual(list.content.map(nodeText), ['', 'First selected', 'Second selected', '']);
  editor.destroy();

  const blankListEditor = createEditor([{
    type: 'bulletList',
    content: [listItem(), listItem()],
  }]);
  blankListEditor.commands.selectAll();
  convertSelectionToList(blankListEditor, 'bullet');
  assert.deepEqual(blankListEditor.getJSON(), { type: 'doc', content: [{ type: 'paragraph' }] });
  blankListEditor.destroy();
});

test('a partial selection never strips an unselected list marker prefix', () => {
  const editor = createEditor([paragraph('• Keep this marker')]);
  editor.commands.setTextSelection({ from: 1, to: 2 });
  convertSelectionToList(editor, 'bullet');
  assert.deepEqual(editor.getJSON(), {
    type: 'doc',
    content: [{ type: 'bulletList', content: [listItem('• Keep this marker')] }],
  });
  editor.destroy();
});

test('temporary empty items survive editing, then a second Enter exits the list', () => {
  const editor = createEditor([paragraph('First point'), paragraph('Second point')]);
  editor.commands.selectAll();
  convertSelectionToList(editor, 'bullet');

  let end;
  editor.state.doc.descendants((node, position) => {
    if (node.isText && node.text === 'Second point') end = position + node.nodeSize;
  });
  editor.commands.setTextSelection({ from: end, to: end });

  assert.equal(editor.commands.splitListItem('listItem'), true);
  let document = editor.getJSON();
  assert.equal(document.content[0].content.length, 3);
  assert.deepEqual(document.content[0].content.at(-1).content, [{ type: 'paragraph' }]);

  assert.equal(editor.commands.splitListItem('listItem'), false);
  assert.equal(editor.commands.liftEmptyBlock(), true);
  document = editor.getJSON();
  assert.deepEqual(document.content.map(node => node.type), ['bulletList', 'paragraph']);
  assert.equal(document.content[0].content.length, 2);
  assert.deepEqual(document.content[1], { type: 'paragraph' });
  editor.destroy();
});
