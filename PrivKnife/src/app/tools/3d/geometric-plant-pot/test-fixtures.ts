import { GeometricPlantPotOptions, PresetPlanter } from './types';

export const DEFAULT_PLANTER_OPTIONS: GeometricPlantPotOptions = {
  aestheticStyle: 'twisted_polygon',
  polygonSides: 6,
  twistAngleDeg: 60,
  topDiameterMm: 90,
  bottomDiameterMm: 70,
  heightMm: 85,
  wallThicknessMm: 2.4,
  planterType: 'self_watering_insert',
  wickHoleDiameterMm: 8,
  waterSpoutOpening: true,
  explodedView: false,
};

export const LOW_POLY_FACETED_OPTIONS: GeometricPlantPotOptions = {
  aestheticStyle: 'low_poly_faceted',
  polygonSides: 7,
  twistAngleDeg: 0,
  topDiameterMm: 100,
  bottomDiameterMm: 75,
  heightMm: 90,
  wallThicknessMm: 2.5,
  planterType: 'drainage_with_saucer',
  wickHoleDiameterMm: 6,
  waterSpoutOpening: false,
  explodedView: false,
};

export const FLUTED_MINIMAL_OPTIONS: GeometricPlantPotOptions = {
  aestheticStyle: 'vertical_flutes',
  polygonSides: 12,
  twistAngleDeg: 0,
  topDiameterMm: 85,
  bottomDiameterMm: 65,
  heightMm: 80,
  wallThicknessMm: 2.2,
  planterType: 'decorative_cover',
  wickHoleDiameterMm: 8,
  waterSpoutOpening: false,
  explodedView: false,
};

export const SMOOTH_PLANTER_OPTIONS: GeometricPlantPotOptions = {
  aestheticStyle: 'smooth_minimal',
  polygonSides: 32,
  twistAngleDeg: 0,
  topDiameterMm: 110,
  bottomDiameterMm: 85,
  heightMm: 100,
  wallThicknessMm: 2.8,
  planterType: 'self_watering_insert',
  wickHoleDiameterMm: 10,
  waterSpoutOpening: true,
  explodedView: false,
};

export const INVALID_OPTIONS_DIAMETER_ZERO: GeometricPlantPotOptions = {
  ...DEFAULT_PLANTER_OPTIONS,
  topDiameterMm: 0,
};

export const INVALID_OPTIONS_HEIGHT_TOO_SMALL: GeometricPlantPotOptions = {
  ...DEFAULT_PLANTER_OPTIONS,
  heightMm: 15,
};

export const INVALID_OPTIONS_SIDES_LOW: GeometricPlantPotOptions = {
  ...DEFAULT_PLANTER_OPTIONS,
  polygonSides: 2,
};

export const PLANTER_PRESETS: PresetPlanter[] = [
  {
    id: 'twisted_hex_self_watering',
    name: 'Hexagonal Spiral Self-Watering Planter',
    description: 'Modern 90mm twisted hexagon planter with internal 120ml water reservoir and cotton wick hole.',
    options: {
      aestheticStyle: 'twisted_polygon',
      polygonSides: 6,
      twistAngleDeg: 60,
      topDiameterMm: 90,
      bottomDiameterMm: 70,
      heightMm: 85,
      planterType: 'self_watering_insert',
      waterSpoutOpening: true,
    },
  },
  {
    id: 'low_poly_gem_saucer',
    name: 'Low-Poly Faceted Succulent Pot & Saucer',
    description: '100mm diamond-faceted geometric succulent bowl with bottom drainage and matching saucer.',
    options: {
      aestheticStyle: 'low_poly_faceted',
      polygonSides: 7,
      topDiameterMm: 100,
      bottomDiameterMm: 75,
      heightMm: 80,
      planterType: 'drainage_with_saucer',
    },
  },
  {
    id: 'fluted_neoclassical_cover',
    name: 'Neoclassical Fluted Cachepot',
    description: '85mm elegant fluted ribbed cover pot tailored for standard nursery plastic pots.',
    options: {
      aestheticStyle: 'vertical_flutes',
      polygonSides: 12,
      topDiameterMm: 85,
      bottomDiameterMm: 65,
      heightMm: 80,
      planterType: 'decorative_cover',
    },
  },
  {
    id: 'spiral_cylinder_self_watering',
    name: 'Twisted Decagon Herb Planter',
    description: '110mm ten-sided spiraling planter with sub-irrigation basket for kitchen basil and herbs.',
    options: {
      aestheticStyle: 'twisted_polygon',
      polygonSides: 10,
      twistAngleDeg: 90,
      topDiameterMm: 110,
      bottomDiameterMm: 85,
      heightMm: 100,
      planterType: 'self_watering_insert',
      waterSpoutOpening: true,
    },
  },
];
