import { SvgOptimizerCleanerOptions } from './types';

export const DEFAULT_SVG_OPTIONS: SvgOptimizerCleanerOptions = {
  floatPrecision: 2,
  stripMetadataComments: true,
  cleanupIds: true,
  collapseUselessGroups: true,
  convertColorsToHex: true,
  removeDimensionsForViewBox: true,
  codeExportFormat: 'svg',
  componentName: 'CustomSvgIcon',
};

export const SAMPLE_BLOATED_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generator: Adobe Illustrator 25.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     xmlns:sketch="http://www.bohemiancoding.com/sketch/ns"
     xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
     version="1.1" id="Layer_1" x="0.000000px" y="0.000000px"
     width="200.000000px" height="200.000000px" viewBox="0 0 200 200"
     enable-background="new 0 0 200 200" xml:space="preserve">
  <metadata>
    <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
      <rdf:Description rdf:about="" />
    </rdf:RDF>
  </metadata>
  <title>PrivKnife Test Icon</title>
  <desc>Bloated test vector asset</desc>
  <defs>
    <!-- empty defs -->
  </defs>
  <g id="OuterGroup">
    <g id="InnerUselessGroup">
      <path id="path-1" fill="rgb(255, 255, 255)" stroke="#000000" stroke-width="2.000000"
            d="M 10.123456,20.654321 L 45.987654,50.111222 C 55.555555,65.777777 75.888888,85.999999 120.123456,150.234567 Z" />
      <circle cx="100.876543" cy="100.432198" r="40.555555" fill="#ffffff" />
    </g>
  </g>
</svg>`;

export const SAMPLE_SIMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" fill="red" />
</svg>`;

export const SAMPLE_INVALID_SVG = `This is not an SVG markup at all.`;
