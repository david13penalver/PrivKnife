export const ACRONYM_VECTOR = 'XMLHttpRequest2Id';
export const SPANISH_SLUG_VECTOR = '¡Hola España & Café 2026!';
export const GERMAN_SLUG_VECTOR = 'Straße & Über';
export const BATCH_IDENTIFIERS = 'firstName\nLAST_NAME\n\nXMLParser';
export const SURROGATE_SAMPLE = 'A🚀Bé';

/**
 * Historic unassigned slots in Unicode Mathematical Alphanumeric Symbols (U+1D400..U+1D551)
 * that must NEVER appear in transformed outputs because they were moved to Letterlike Symbols.
 */
export const UNASSIGNED_MATH_HOLES: readonly number[] = [
  0x1d455, // italic h -> U+210E
  0x1d49d, // script B -> U+212C
  0x1d4a0, // script E -> U+2130
  0x1d4a1, // script F -> U+2131
  0x1d4a3, // script H -> U+210B
  0x1d4a4, // script I -> U+2110
  0x1d4a7, // script L -> U+2112
  0x1d4a8, // script M -> U+2133
  0x1d4ad, // script R -> U+211B
  0x1d4ba, // script e -> U+212F
  0x1d4bc, // script g -> U+210A
  0x1d4c4, // script o -> U+2134
  0x1d506, // fraktur C -> U+212D
  0x1d50b, // fraktur H -> U+210C
  0x1d50c, // fraktur I -> U+2111
  0x1d515, // fraktur R -> U+211C
  0x1d51d, // fraktur Z -> U+2128
  0x1d53a, // double-struck C -> U+2102
  0x1d53f, // double-struck H -> U+210D
  0x1d545, // double-struck N -> U+2115
  0x1d547, // double-struck P -> U+2119
  0x1d548, // double-struck Q -> U+211A
  0x1d549, // double-struck R -> U+211D
  0x1d551, // double-struck Z -> U+2124
];
