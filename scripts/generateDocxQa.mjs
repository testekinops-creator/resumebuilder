import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { TEMPLATES } from '../src/data/templates.js';
import { getTemplatePresentation } from '../src/utils/resumePresentation.js';
import { prepareDOCXExport } from '../src/utils/pdfGenerator.js';
import { createDocxFixture, DOCX_FIXTURE_SIZES } from './fixtures/docxResumeFixtures.mjs';

function argument(name, fallback) {
  const position = process.argv.indexOf(name);
  return position < 0 ? fallback : process.argv[position + 1];
}

const sizes = argument('--sizes', 'small,medium,large').split(',');
const ids = argument('--templates', TEMPLATES.map(item => item.id).join(',')).split(',');
if (sizes.some(size => !DOCX_FIXTURE_SIZES.includes(size))) throw new Error('Unknown fixture size.');
if (ids.some(id => !TEMPLATES.some(template => template.id === id))) throw new Error('Unknown template ID.');
const output = resolve(argument('--out', 'tmp/docx-fidelity/current'));
const manifest = [];
for (const size of sizes) {
  const directory = resolve(output, size);
  await mkdir(directory, { recursive: true });
  for (const templateId of ids) {
    const state = createDocxFixture(templateId, size);
    const presentation = getTemplatePresentation(state);
    const artifact = await prepareDOCXExport({ state });
    const path = resolve(directory, templateId + '.docx');
    await writeFile(path, Buffer.from(await artifact.blob.arrayBuffer()));
    manifest.push({ templateId, name: presentation.template.name, fixture: size,
      path: relative(output, path).replaceAll('\\', '/'), signature: presentation.signature,
      columns: presentation.capabilities.columns, header: presentation.capabilities.header.variant,
      heading: presentation.capabilities.heading.variant, colors: presentation.colors,
      font: presentation.fontFamily, bodyFontPx: presentation.bodyFontPx,
      sectionOrder: presentation.layout.sectionOrder, bytes: artifact.size,
    });
    process.stdout.write(size + '/' + templateId + '.docx (' + artifact.size + ' bytes)\n');
  }
}
await writeFile(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
process.stdout.write('Generated ' + manifest.length + ' editable DOCX fixtures in ' + output + '\n');
