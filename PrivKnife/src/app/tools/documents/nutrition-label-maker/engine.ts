import { jsPDF } from 'jspdf';
import {
  NutritionLabelMakerOptions,
  NutritionLabelMakerResult,
  NutritionLabelMetadata,
} from './types';

// FDA 2016 Daily Value Reference Standards
export const FDA_DAILY_VALUES = {
  totalFatG: 78,
  saturatedFatG: 20,
  cholesterolMg: 300,
  sodiumMg: 2300,
  totalCarbsG: 275,
  dietaryFiberG: 28,
  addedSugarsG: 50,
  proteinG: 50,
  vitaminDMcg: 20,
  calciumMg: 1300,
  ironMg: 18,
  potassiumMg: 4700,
};

/**
 * Validates options for nutrition label generator.
 */
export function validateNutritionOptions(
  options: NutritionLabelMakerOptions
): { valid: boolean; error?: string } {
  if (!options) {
    return { valid: false, error: 'Options are required' };
  }

  if (options.calories < 0) {
    return { valid: false, error: 'Calories cannot be negative' };
  }

  if (!options.servingSizeText || options.servingSizeText.trim().length === 0) {
    return { valid: false, error: 'Serving size is required' };
  }

  const nutrients = [
    options.totalFatG,
    options.saturatedFatG,
    options.transFatG,
    options.cholesterolMg,
    options.sodiumMg,
    options.totalCarbsG,
    options.dietaryFiberG,
    options.totalSugarsG,
    options.addedSugarsG,
    options.proteinG,
    options.vitaminDMcg,
    options.calciumMg,
    options.ironMg,
    options.potassiumMg,
  ];

  for (const n of nutrients) {
    if (n !== undefined && n < 0) {
      return { valid: false, error: 'Nutrient amounts cannot be negative' };
    }
  }

  return { valid: true };
}

/**
 * Calculates regulatory % Daily Values for nutrients based on FDA standards.
 */
export function calculateDailyValues(options: NutritionLabelMakerOptions): {
  totalFatDV: number;
  saturatedFatDV: number;
  cholesterolDV: number;
  sodiumDV: number;
  totalCarbsDV: number;
  dietaryFiberDV: number;
  addedSugarsDV: number;
  vitaminDDV: number;
  calciumDV: number;
  ironDV: number;
  potassiumDV: number;
} {
  const roundDV = (val: number, ref: number) => Math.round((val / ref) * 100);

  return {
    totalFatDV: roundDV(options.totalFatG, FDA_DAILY_VALUES.totalFatG),
    saturatedFatDV: roundDV(options.saturatedFatG, FDA_DAILY_VALUES.saturatedFatG),
    cholesterolDV: roundDV(options.cholesterolMg, FDA_DAILY_VALUES.cholesterolMg),
    sodiumDV: roundDV(options.sodiumMg, FDA_DAILY_VALUES.sodiumMg),
    totalCarbsDV: roundDV(options.totalCarbsG, FDA_DAILY_VALUES.totalCarbsG),
    dietaryFiberDV: roundDV(options.dietaryFiberG, FDA_DAILY_VALUES.dietaryFiberG),
    addedSugarsDV: roundDV(options.addedSugarsG, FDA_DAILY_VALUES.addedSugarsG),
    vitaminDDV: roundDV(options.vitaminDMcg, FDA_DAILY_VALUES.vitaminDMcg),
    calciumDV: roundDV(options.calciumMg, FDA_DAILY_VALUES.calciumMg),
    ironDV: roundDV(options.ironMg, FDA_DAILY_VALUES.ironMg),
    potassiumDV: roundDV(options.potassiumMg, FDA_DAILY_VALUES.potassiumMg),
  };
}

/**
 * Escapes XML/SVG special characters.
 */
function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates FDA Standard 2016 Nutrition Facts SVG.
 */
function generateFdaStandardSvg(options: NutritionLabelMakerOptions, w: number): string {
  const dvs = calculateDailyValues(options);
  const pad = 12;
  const innerW = w - pad * 2;
  let y = pad;

  const lines: string[] = [];
  const textLeft = pad;
  const textRight = w - pad;

  // Header Title
  lines.push(
    `<text x="${textLeft}" y="${y + 28}" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="34" letter-spacing="-0.5">Nutrition Facts</text>`
  );
  y += 36;

  // Servings per container
  if (options.servingsPerContainer) {
    lines.push(
      `<text x="${textLeft}" y="${y + 12}" font-family="Arial, Helvetica, sans-serif" font-size="13">${escapeXml(options.servingsPerContainer)} servings per container</text>`
    );
    y += 16;
  }

  // Serving size
  lines.push(
    `<text x="${textLeft}" y="${y + 14}" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="14">Serving size</text>`
  );
  lines.push(
    `<text x="${textRight}" y="${y + 14}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="14">${escapeXml(options.servingSizeText)}</text>`
  );
  y += 22;

  // 8pt thick bar
  lines.push(`<rect x="${pad}" y="${y}" width="${innerW}" height="9" fill="#000000" />`);
  y += 15;

  // Amount per serving
  lines.push(
    `<text x="${textLeft}" y="${y + 8}" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="11">Amount per serving</text>`
  );
  y += 12;

  // Calories banner
  lines.push(
    `<text x="${textLeft}" y="${y + 26}" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="28">Calories</text>`
  );
  lines.push(
    `<text x="${textRight}" y="${y + 28}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="38">${options.calories}</text>`
  );
  y += 34;

  // 4pt medium bar
  lines.push(`<rect x="${pad}" y="${y}" width="${innerW}" height="4" fill="#000000" />`);
  y += 10;

  // % Daily Value* header
  lines.push(
    `<text x="${textRight}" y="${y + 8}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="11">% Daily Value*</text>`
  );
  y += 14;

  const addNutrientRow = (
    label: string,
    amountStr: string,
    dv: number | null,
    boldLabel = false,
    indent = 0
  ) => {
    lines.push(
      `<line x1="${pad}" y1="${y}" x2="${textRight}" y2="${y}" stroke="#000000" stroke-width="1" />`
    );
    y += 13;
    const xPos = textLeft + indent;
    const weight = boldLabel ? 'bold' : 'normal';
    lines.push(
      `<text x="${xPos}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="12"><tspan font-weight="${weight}">${escapeXml(label)}</tspan> ${escapeXml(amountStr)}</text>`
    );
    if (dv !== null) {
      lines.push(
        `<text x="${textRight}" y="${y}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="12">${dv}%</text>`
      );
    }
    y += 4;
  };

  addNutrientRow('Total Fat', `${options.totalFatG}g`, dvs.totalFatDV, true);
  addNutrientRow('Saturated Fat', `${options.saturatedFatG}g`, dvs.saturatedFatDV, false, 14);
  addNutrientRow('Trans Fat', `${options.transFatG}g`, null, false, 14);
  addNutrientRow('Cholesterol', `${options.cholesterolMg}mg`, dvs.cholesterolDV, true);
  addNutrientRow('Sodium', `${options.sodiumMg}mg`, dvs.sodiumDV, true);
  addNutrientRow('Total Carbohydrate', `${options.totalCarbsG}g`, dvs.totalCarbsDV, true);
  addNutrientRow('Dietary Fiber', `${options.dietaryFiberG}g`, dvs.dietaryFiberDV, false, 14);
  addNutrientRow('Total Sugars', `${options.totalSugarsG}g`, null, false, 14);
  addNutrientRow(
    'Includes',
    `${options.addedSugarsG}g Added Sugars`,
    dvs.addedSugarsDV,
    false,
    28
  );
  addNutrientRow('Protein', `${options.proteinG}g`, null, true);

  // 8pt thick bar before micronutrients
  lines.push(`<rect x="${pad}" y="${y}" width="${innerW}" height="9" fill="#000000" />`);
  y += 15;

  addNutrientRow('Vitamin D', `${options.vitaminDMcg}mcg`, dvs.vitaminDDV);
  addNutrientRow('Calcium', `${options.calciumMg}mg`, dvs.calciumDV);
  addNutrientRow('Iron', `${options.ironMg}mg`, dvs.ironDV);
  addNutrientRow('Potassium', `${options.potassiumMg}mg`, dvs.potassiumDV);

  // 4pt bar before footnote
  lines.push(`<rect x="${pad}" y="${y}" width="${innerW}" height="4" fill="#000000" />`);
  y += 12;

  // Footnote text
  lines.push(
    `<text x="${textLeft}" y="${y + 8}" font-family="Arial, Helvetica, sans-serif" font-size="8.5" fill="#111827">` +
      `<tspan x="${textLeft}" dy="0">* The % Daily Value (DV) tells you how much a nutrient in</tspan>` +
      `<tspan x="${textLeft}" dy="11">a serving of food contributes to a daily diet. 2,000 calories</tspan>` +
      `<tspan x="${textLeft}" dy="11">a day is used for general nutrition advice.</tspan>` +
      `</text>`
  );
  y += 38;

  const totalHeight = y + pad;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${totalHeight}" width="${w}" height="${totalHeight}">
  <rect x="0" y="0" width="${w}" height="${totalHeight}" fill="#FFFFFF" stroke="#000000" stroke-width="2" />
  ${lines.join('\n  ')}
</svg>`;
}

/**
 * Generates EU 1169/2011 standard tabular nutrition declaration SVG.
 */
function generateEu1169Svg(options: NutritionLabelMakerOptions, w: number): string {
  const pad = 12;
  const innerW = w - pad * 2;
  let y = pad;

  const lines: string[] = [];
  const textLeft = pad;
  const textRight = w - pad;

  // Header Title
  lines.push(
    `<text x="${textLeft}" y="${y + 22}" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="20">Nutrition Declaration</text>`
  );
  y += 28;

  if (options.productName) {
    lines.push(
      `<text x="${textLeft}" y="${y + 12}" font-family="Arial, Helvetica, sans-serif" font-weight="600" font-size="12" fill="#4b5563">${escapeXml(options.productName)}</text>`
    );
    y += 18;
  }

  // Energy kJ and kcal
  const energyKcal = options.calories;
  const energyKj = Math.round(energyKcal * 4.184);
  const saltG = (options.sodiumMg * 2.5) / 1000;

  // Table header
  lines.push(`<rect x="${pad}" y="${y}" width="${innerW}" height="3" fill="#000000" />`);
  y += 14;

  lines.push(
    `<text x="${textLeft}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="11">Typical Values</text>`
  );
  lines.push(
    `<text x="${textRight}" y="${y}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="11">Per 100g / Portion</text>`
  );
  y += 8;

  const addEuRow = (label: string, valueStr: string, indent = 0) => {
    lines.push(
      `<line x1="${pad}" y1="${y}" x2="${textRight}" y2="${y}" stroke="#e5e7eb" stroke-width="1" />`
    );
    y += 14;
    lines.push(
      `<text x="${textLeft + indent}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="11">${escapeXml(label)}</text>`
    );
    lines.push(
      `<text x="${textRight}" y="${y}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-weight="600" font-size="11">${escapeXml(valueStr)}</text>`
    );
    y += 4;
  };

  addEuRow('Energy', `${energyKj} kJ / ${energyKcal} kcal`);
  addEuRow('Fat', `${options.totalFatG} g`);
  addEuRow('of which saturates', `${options.saturatedFatG} g`, 12);
  addEuRow('Carbohydrate', `${options.totalCarbsG} g`);
  addEuRow('of which sugars', `${options.totalSugarsG} g`, 12);
  addEuRow('Fibre', `${options.dietaryFiberG} g`);
  addEuRow('Protein', `${options.proteinG} g`);
  addEuRow('Salt', `${saltG.toFixed(2)} g`);

  // Footer bar
  lines.push(`<rect x="${pad}" y="${y}" width="${innerW}" height="2" fill="#000000" />`);
  y += 14;

  lines.push(
    `<text x="${textLeft}" y="${y + 8}" font-family="Arial, Helvetica, sans-serif" font-size="8.5" fill="#6b7280">` +
      `<tspan x="${textLeft}" dy="0">* Reference intake of an average adult (8400 kJ / 2000 kcal)</tspan>` +
      `</text>`
  );
  y += 24;

  const totalHeight = y + pad;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${totalHeight}" width="${w}" height="${totalHeight}">
  <rect x="0" y="0" width="${w}" height="${totalHeight}" fill="#FFFFFF" stroke="#111827" stroke-width="1.5" />
  ${lines.join('\n  ')}
</svg>`;
}

/**
 * Generates FDA Supplement Facts SVG.
 */
function generateSupplementFactsSvg(options: NutritionLabelMakerOptions, w: number): string {
  const pad = 12;
  const innerW = w - pad * 2;
  let y = pad;

  const lines: string[] = [];
  const textLeft = pad;
  const textRight = w - pad;

  // Header Title
  lines.push(
    `<text x="${textLeft}" y="${y + 26}" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="30">Supplement Facts</text>`
  );
  y += 34;

  // Serving info
  lines.push(
    `<text x="${textLeft}" y="${y + 12}" font-family="Arial, Helvetica, sans-serif" font-size="12">Serving Size ${escapeXml(options.servingSizeText)}</text>`
  );
  y += 16;
  if (options.servingsPerContainer) {
    lines.push(
      `<text x="${textLeft}" y="${y + 12}" font-family="Arial, Helvetica, sans-serif" font-size="12">Servings Per Container ${escapeXml(options.servingsPerContainer)}</text>`
    );
    y += 18;
  }

  // Heavy bar
  lines.push(`<rect x="${pad}" y="${y}" width="${innerW}" height="8" fill="#000000" />`);
  y += 14;

  // Subheaders
  lines.push(
    `<text x="${textLeft}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="11">Amount Per Serving</text>`
  );
  lines.push(
    `<text x="${textRight}" y="${y}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="11">% Daily Value</text>`
  );
  y += 6;

  const dvs = calculateDailyValues(options);
  const addSuppRow = (name: string, amt: string, dvStr: string) => {
    lines.push(
      `<line x1="${pad}" y1="${y}" x2="${textRight}" y2="${y}" stroke="#000000" stroke-width="1" />`
    );
    y += 13;
    lines.push(
      `<text x="${textLeft}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="11.5">${escapeXml(name)} ${escapeXml(amt)}</text>`
    );
    lines.push(
      `<text x="${textRight}" y="${y}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="11.5">${escapeXml(dvStr)}</text>`
    );
    y += 4;
  };

  addSuppRow('Calories', `${options.calories}`, '');
  addSuppRow('Vitamin D', `${options.vitaminDMcg} mcg`, `${dvs.vitaminDDV}%`);
  addSuppRow('Calcium', `${options.calciumMg} mg`, `${dvs.calciumDV}%`);
  addSuppRow('Iron', `${options.ironMg} mg`, `${dvs.ironDV}%`);
  addSuppRow('Potassium', `${options.potassiumMg} mg`, `${dvs.potassiumDV}%`);

  // Heavy bar
  lines.push(`<rect x="${pad}" y="${y}" width="${innerW}" height="6" fill="#000000" />`);
  y += 14;

  lines.push(
    `<text x="${textLeft}" y="${y + 8}" font-family="Arial, Helvetica, sans-serif" font-size="8.5" fill="#111827">* Percent Daily Values are based on a 2,000 calorie diet.</text>`
  );
  y += 20;

  const totalHeight = y + pad;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${totalHeight}" width="${w}" height="${totalHeight}">
  <rect x="0" y="0" width="${w}" height="${totalHeight}" fill="#FFFFFF" stroke="#000000" stroke-width="2" />
  ${lines.join('\n  ')}
</svg>`;
}

/**
 * Generates Dual Column FDA Nutrition Facts SVG.
 */
function generateDualColumnSvg(options: NutritionLabelMakerOptions, w: number): string {
  const pad = 12;
  const innerW = w - pad * 2;
  let y = pad;

  const lines: string[] = [];
  const textLeft = pad;
  const colServing = w - 120;
  const colContainer = w - pad;

  // Header Title
  lines.push(
    `<text x="${textLeft}" y="${y + 28}" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="34">Nutrition Facts</text>`
  );
  y += 36;

  lines.push(
    `<text x="${textLeft}" y="${y + 12}" font-family="Arial, Helvetica, sans-serif" font-size="12">${escapeXml(options.servingsPerContainer)} servings per container</text>`
  );
  y += 16;
  lines.push(
    `<text x="${textLeft}" y="${y + 12}" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="13">Serving size ${escapeXml(options.servingSizeText)}</text>`
  );
  y += 20;

  lines.push(`<rect x="${pad}" y="${y}" width="${innerW}" height="9" fill="#000000" />`);
  y += 14;

  // Dual Column Subheaders
  lines.push(
    `<text x="${colServing}" y="${y}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="10">Per serving</text>`
  );
  lines.push(
    `<text x="${colContainer}" y="${y}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="10">Per container</text>`
  );
  y += 6;

  // Calories
  lines.push(`<rect x="${pad}" y="${y}" width="${innerW}" height="3" fill="#000000" />`);
  y += 18;
  const servings = parseFloat(options.servingsPerContainer) || 2;
  const containerCal = Math.round(options.calories * servings);

  lines.push(
    `<text x="${textLeft}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="18">Calories</text>`
  );
  lines.push(
    `<text x="${colServing}" y="${y}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="18">${options.calories}</text>`
  );
  lines.push(
    `<text x="${colContainer}" y="${y}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="18">${containerCal}</text>`
  );
  y += 8;

  lines.push(`<rect x="${pad}" y="${y}" width="${innerW}" height="4" fill="#000000" />`);
  y += 12;

  const addDualRow = (name: string, amtServ: string, amtCont: string) => {
    lines.push(
      `<line x1="${pad}" y1="${y}" x2="${colContainer}" y2="${y}" stroke="#000000" stroke-width="1" />`
    );
    y += 13;
    lines.push(
      `<text x="${textLeft}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="11">${escapeXml(name)}</text>`
    );
    lines.push(
      `<text x="${colServing}" y="${y}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="11">${escapeXml(amtServ)}</text>`
    );
    lines.push(
      `<text x="${colContainer}" y="${y}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="11">${escapeXml(amtCont)}</text>`
    );
    y += 4;
  };

  addDualRow('Total Fat', `${options.totalFatG}g`, `${Math.round(options.totalFatG * servings)}g`);
  addDualRow(
    'Sodium',
    `${options.sodiumMg}mg`,
    `${Math.round(options.sodiumMg * servings)}mg`
  );
  addDualRow(
    'Total Carbohydrate',
    `${options.totalCarbsG}g`,
    `${Math.round(options.totalCarbsG * servings)}g`
  );
  addDualRow('Protein', `${options.proteinG}g`, `${Math.round(options.proteinG * servings)}g`);

  lines.push(`<rect x="${pad}" y="${y}" width="${innerW}" height="6" fill="#000000" />`);
  y += 16;

  const totalHeight = y + pad;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${totalHeight}" width="${w}" height="${totalHeight}">
  <rect x="0" y="0" width="${w}" height="${totalHeight}" fill="#FFFFFF" stroke="#000000" stroke-width="2" />
  ${lines.join('\n  ')}
</svg>`;
}

/**
 * Main SVG Generator router according to selected regulatory standard.
 */
export function generateNutritionLabelSvg(options: NutritionLabelMakerOptions): string {
  const w = options.labelWidthPx || 320;
  switch (options.regulatoryStandard) {
    case 'eu_standard_1169':
      return generateEu1169Svg(options, w);
    case 'fda_supplement_facts':
      return generateSupplementFactsSvg(options, w);
    case 'fda_dual_column':
      return generateDualColumnSvg(options, w);
    case 'fda_standard_2016':
    default:
      return generateFdaStandardSvg(options, w);
  }
}

/**
 * Builds vector PDF document of nutrition label using jsPDF.
 */
export function generateNutritionLabelPdf(options: NutritionLabelMakerOptions): ArrayBuffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: [360, 560],
  });

  const margin = 20;
  const width = 320;
  let y = margin + 24;

  // Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('Nutrition Facts', margin, y);
  y += 18;

  // Serving info
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  if (options.servingsPerContainer) {
    doc.text(`${options.servingsPerContainer} servings per container`, margin, y);
    y += 14;
  }
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Serving size  ${options.servingSizeText}`, margin, y);
  y += 16;

  // 8pt bar
  doc.setLineWidth(6);
  doc.line(margin, y, margin + width, y);
  y += 14;

  // Calories
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Amount per serving', margin, y);
  y += 14;

  doc.setFontSize(22);
  doc.text('Calories', margin, y);
  doc.text(`${options.calories}`, margin + width, y, { align: 'right' });
  y += 14;

  // 4pt bar
  doc.setLineWidth(3);
  doc.line(margin, y, margin + width, y);
  y += 12;

  // Daily values table
  doc.setFontSize(9);
  doc.text('% Daily Value*', margin + width, y, { align: 'right' });
  y += 8;

  const dvs = calculateDailyValues(options);
  const addPdfRow = (name: string, amt: string, dv: number | null, isBold = false) => {
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + width, y);
    y += 11;
    doc.setFont('Helvetica', isBold ? 'bold' : 'normal');
    doc.text(`${name} ${amt}`, margin, y);
    if (dv !== null) {
      doc.setFont('Helvetica', 'bold');
      doc.text(`${dv}%`, margin + width, y, { align: 'right' });
    }
    y += 4;
  };

  addPdfRow('Total Fat', `${options.totalFatG}g`, dvs.totalFatDV, true);
  addPdfRow('Saturated Fat', `${options.saturatedFatG}g`, dvs.saturatedFatDV);
  addPdfRow('Trans Fat', `${options.transFatG}g`, null);
  addPdfRow('Cholesterol', `${options.cholesterolMg}mg`, dvs.cholesterolDV, true);
  addPdfRow('Sodium', `${options.sodiumMg}mg`, dvs.sodiumDV, true);
  addPdfRow('Total Carbohydrate', `${options.totalCarbsG}g`, dvs.totalCarbsDV, true);
  addPdfRow('Dietary Fiber', `${options.dietaryFiberG}g`, dvs.dietaryFiberDV);
  addPdfRow('Total Sugars', `${options.totalSugarsG}g`, null);
  addPdfRow('Protein', `${options.proteinG}g`, null, true);

  // 8pt bar
  doc.setLineWidth(6);
  doc.line(margin, y, margin + width, y);
  y += 14;

  addPdfRow('Vitamin D', `${options.vitaminDMcg}mcg`, dvs.vitaminDDV);
  addPdfRow('Calcium', `${options.calciumMg}mg`, dvs.calciumDV);
  addPdfRow('Iron', `${options.ironMg}mg`, dvs.ironDV);
  addPdfRow('Potassium', `${options.potassiumMg}mg`, dvs.potassiumDV);

  // Footnote
  doc.setLineWidth(3);
  doc.line(margin, y, margin + width, y);
  y += 12;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    '* The % Daily Value (DV) tells you how much a nutrient in a serving contributes to a daily diet.',
    margin,
    y
  );

  return doc.output('arraybuffer');
}

/**
 * Main engine processing function: exports SVG, PDF, or PNG Blob.
 */
export async function processNutritionLabel(
  options: NutritionLabelMakerOptions
): Promise<NutritionLabelMakerResult> {
  const validation = validateNutritionOptions(options);
  if (!validation.valid) {
    return {
      success: false,
      blob: new Blob([], { type: 'application/octet-stream' }),
      svgString: '',
      fileName: '',
      fileSize: 0,
      mimeType: 'application/octet-stream',
      error: validation.error,
    };
  }

  try {
    const svgString = generateNutritionLabelSvg(options);
    const format = options.exportFormat || 'svg';
    const baseName = options.productName
      ? options.productName.toLowerCase().replace(/[^a-z0-9]+/g, '_')
      : 'nutrition_label';

    let outBlob: Blob;
    let mimeType: string;
    let extension: string;

    switch (format) {
      case 'pdf': {
        const pdfBuffer = generateNutritionLabelPdf(options);
        outBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
        mimeType = 'application/pdf';
        extension = 'pdf';
        break;
      }
      case 'svg':
      default: {
        outBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        mimeType = 'image/svg+xml';
        extension = 'svg';
        break;
      }
    }

    const fileName = `${baseName}_${options.regulatoryStandard}.${extension}`;
    const metadata: NutritionLabelMetadata = {
      standard: options.regulatoryStandard,
      calories: options.calories,
      servingSize: options.servingSizeText,
      servingsPerContainer: options.servingsPerContainer,
      format,
      widthPx: options.labelWidthPx || 320,
      heightPx: 560,
    };

    return {
      success: true,
      blob: outBlob,
      svgString,
      fileName,
      fileSize: outBlob.size,
      mimeType,
      metadata,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      blob: new Blob([], { type: 'application/octet-stream' }),
      svgString: '',
      fileName: '',
      fileSize: 0,
      mimeType: 'application/octet-stream',
      error: errorMsg,
    };
  }
}
