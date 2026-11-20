import { ToolDefinition } from '../../../core/models/tool.model';

export const knobDialHandwheelMakerTool: ToolDefinition = {
  id: 'knob-dial-handwheel-maker',
  name: 'Parametric Replacement Knob, Dial & Captive-Nut Thumbscrew Maker',
  category: '3d',
  description:
    'Design D-shaft appliance dials, splined synth knobs, and captive DIN 934 M3-M8 hex-nut clamping handwheels with fluted grips and dual-color indicators.',
  keywords: [
    'knob generator',
    'd-shaft',
    'handwheel',
    'thumbscrew',
    'captive nut',
    'splined knob',
    '3d print',
    'stl',
    '3mf',
  ],
  icon: '🎛️',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./knob-dial-handwheel-maker.component').then(
      (m) => m.KnobDialHandwheelMakerComponent
    ),
};
