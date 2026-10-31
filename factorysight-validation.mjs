import { imageSize } from 'image-size';

export function decodeImageDataUrl(value, maxBytes = 5 * 1024 * 1024) {
  const match = typeof value === 'string' && value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) throw Object.assign(new Error('Choose a JPEG, PNG, or WebP image.'), { status: 400 });
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > maxBytes || bytes.toString('base64') !== match[2]) {
    throw Object.assign(new Error('The processed image exceeds the size limit.'), { status: 413 });
  }
  let dimensions;
  try { dimensions = imageSize(bytes); } catch { throw Object.assign(new Error('Image bytes are invalid.'), { status: 400 }); }
  const actualMime = ({ jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' })[dimensions.type];
  if (actualMime !== match[1]) throw Object.assign(new Error('Image content does not match its declared type.'), { status: 400 });
  if (dimensions.width < 80 || dimensions.height < 80 || dimensions.width > 12000 || dimensions.height > 12000) {
    throw Object.assign(new Error('Image dimensions must be between 80 and 12,000 pixels per side.'), { status: 400 });
  }
  return { mime: match[1], dataUrl: value, bytes, width: dimensions.width, height: dimensions.height };
}

export function validateFactorySight(data) {
  const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
  if (!data || !Array.isArray(data.findings) || data.findings.length > 8) throw new Error('Meta returned findings outside the expected format.');
  const findings = data.findings.map((item) => {
    const box = item?.bbox;
    if (!text(item.title, 100) || !['surface_anomaly','missing_component','placement','deformation','other'].includes(item.category)
      || !text(item.evidence, 320) || !text(item.comparison, 320) || !text(item.verification, 320)
      || !['high','medium','low','insufficient'].includes(item.uncertainty)
      || !Array.isArray(box) || box.length !== 4 || !box.every((n) => Number.isInteger(n) && n >= 0 && n <= 1000)
      || box[0] >= box[2] || box[1] >= box[3]) throw new Error('Meta returned a finding outside the expected limits.');
    return { title: item.title.trim(), category: item.category, evidence: item.evidence.trim(), comparison: item.comparison.trim(),
      verification: item.verification.trim(), uncertainty: item.uncertainty, bbox: box };
  });
  return { findings };
}

export function validateInspectionFields(body) {
  if (!body || typeof body.productType !== 'string' || !body.productType.trim() || body.productType.length > 60
    || typeof body.profile !== 'string' || !body.profile.trim() || body.profile.length > 80
    || typeof body.note !== 'string' || body.note.length > 300) throw Object.assign(new Error('Provide valid product, profile, and note fields.'), { status: 400 });
  return { productType: body.productType.trim(), profile: body.profile.trim(), note: body.note.trim() };
}
