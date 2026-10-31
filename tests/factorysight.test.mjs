import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeImageDataUrl, validateFactorySight, validateInspectionFields } from '../factorysight-validation.mjs';

const validFinding = {
  title: 'Possible surface mark', category: 'surface_anomaly', evidence: 'A dark linear mark is visible.',
  comparison: 'The mark appears in image B and not image A.', verification: 'Inspect the surface under controlled lighting.',
  uncertainty: 'medium', bbox: [100, 120, 700, 800]
};
function pngDataUrl(width = 80, height = 80) {
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/Z7sAAAAASUVORK5CYII=', 'base64');
  bytes.writeUInt32BE(width, 16); bytes.writeUInt32BE(height, 20);
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

test('accepts a canonical supported image data URL', () => {
  assert.equal(decodeImageDataUrl(pngDataUrl()).mime, 'image/png');
});

test('rejects non-image data URLs and oversized images', () => {
  assert.throws(() => decodeImageDataUrl('data:text/plain;base64,dGVzdA=='), { status: 400 });
  assert.throws(() => decodeImageDataUrl(`data:image/png;base64,${Buffer.alloc(32).toString('base64')}`, 16), { status: 413 });
  assert.throws(() => decodeImageDataUrl(pngDataUrl(20, 20)), { status: 400 });
});

test('accepts an empty candidate list without calling it a pass', () => {
  assert.deepEqual(validateFactorySight({ findings: [] }), { findings: [] });
});

test('validates candidate evidence, qualitative uncertainty, and normalized boxes', () => {
  assert.equal(validateFactorySight({ findings: [validFinding] }).findings[0].category, 'surface_anomaly');
  assert.throws(() => validateFactorySight({ findings: [{ ...validFinding, bbox: [900, 0, 200, 800] }] }));
  assert.throws(() => validateFactorySight({ findings: [{ ...validFinding, uncertainty: '92%' }] }));
});

test('trims bounded inspection fields and rejects invalid inputs', () => {
  assert.deepEqual(validateInspectionFields({ productType: ' Bracket ', profile: 'surface', note: ' note ' }),
    { productType: 'Bracket', profile: 'surface', note: 'note' });
  assert.throws(() => validateInspectionFields({ productType: '', profile: 'surface', note: '' }), { status: 400 });
});
