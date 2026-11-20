import { DEFAULT_FUNNEL_SCOOP_OPTIONS, FunnelScoopOptions } from './types';

export const funnel = { ...DEFAULT_FUNNEL_SCOOP_OPTIONS };
export const scoop: FunnelScoopOptions = { ...funnel, mode: 'measuring_scoop' };
export const largeScoop = { ...scoop, targetVolumeMl: 100 };
export const cloggedFunnel = { ...funnel, spoutOuterDiameterMm: 7, wallThicknessMm: 2.5 };
