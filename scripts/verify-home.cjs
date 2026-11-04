const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const path = require('node:path');
const projectRoot = path.resolve(__dirname, '..');
const frontendRoot = path.join(projectRoot, 'frontend');

// La referencia es el estado local anterior a esta tarea, no el commit de Git.
const rows = JSON.parse(fs.readFileSync(path.join(projectRoot, 'docs/evidence/inicio-baseline-hashes.json'), 'utf8').replace(/^\uFEFF/, ''));
const exceptions = new Map([
  ['PublicHeader.tsx', 'Control de sesión autorizado en seguimiento; revisar diff'],
  ['ProductCard.tsx', 'Enlace autorizado; revisar diff'],
  ['globals.css', 'Separación autorizada: estilos administrativos trasladados a erp; revisar diff'],
]);
const results = rows.map(row => {
  const relative = row.Path.replace(/^.*[\\/]Cafeteria[\\/]/, '').replaceAll('\\', '/');
  const file = path.join(frontendRoot, relative);
  assert.ok(fs.existsSync(file), `frontend/${relative}: archivo ausente`);
  if (exceptions.has(path.basename(relative))) return { file: `frontend/${relative}`, status: exceptions.get(path.basename(relative)) };
  const actual = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
  assert.equal(actual, row.Hash, `${relative}: cambió respecto a Inicio original`);
  return { file: `frontend/${relative}`, status: 'Idéntico byte por byte' };
});
console.log(JSON.stringify(results, null, 2));
console.log('No sustituye comparación visual en escritorio/móvil.');
