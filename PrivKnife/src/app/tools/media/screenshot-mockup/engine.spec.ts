import { describe, expect, it } from 'vitest';
import {
  calculateDeviceScreenBounds,
  calculateImageFit,
  calculatePerspectiveTransform,
  getCanvasDimensions,
  getDeviceDimensions,
} from './engine';
import { CANVAS_SIZES, DEVICE_SPECS } from './test-fixtures';
import { AnglePreset, CanvasSizePreset, DeviceType } from './types';

describe('App Screenshot Mockup Studio Engine (Seam 1 & 2)', () => {
  describe('getCanvasDimensions', () => {
    it('returns standard dimensions for 1x scale across all size presets', () => {
      const presets: CanvasSizePreset[] = [
        'twitter-landscape',
        'social-square',
        'app-store-portrait',
        'dribbble',
        'product-hunt',
      ];

      for (const preset of presets) {
        const dim = getCanvasDimensions(preset, 1);
        expect(dim.width).toBe(CANVAS_SIZES[preset].width);
        expect(dim.height).toBe(CANVAS_SIZES[preset].height);
        expect(dim.aspectRatio).toBeCloseTo(CANVAS_SIZES[preset].aspectRatio, 2);
      }
    });

    it('multiplies dimensions accurately for 2x and 4x retina export scales', () => {
      const dim2x = getCanvasDimensions('twitter-landscape', 2);
      expect(dim2x.width).toBe(3840);
      expect(dim2x.height).toBe(2160);

      const dim4x = getCanvasDimensions('social-square', 4);
      expect(dim4x.width).toBe(4800);
      expect(dim4x.height).toBe(4800);
    });
  });

  describe('getDeviceDimensions & calculateDeviceScreenBounds', () => {
    it('returns authentic specifications for all supported device types', () => {
      const devices: DeviceType[] = ['phone', 'tablet', 'laptop', 'browser'];

      for (const dev of devices) {
        const specs = getDeviceDimensions(dev);
        expect(specs.width).toBe(DEVICE_SPECS[dev].width);
        expect(specs.height).toBe(DEVICE_SPECS[dev].height);
        expect(specs.bezelWidth).toBeGreaterThan(0);
        expect(specs.cornerRadius).toBeGreaterThan(0);
      }
    });

    it('calculates screen bounds strictly inside chassis bezels for mobile phone', () => {
      const phoneSpecs = getDeviceDimensions('phone');
      const screen = calculateDeviceScreenBounds('phone');

      expect(screen.x).toBe(phoneSpecs.bezelWidth);
      expect(screen.y).toBe(phoneSpecs.bezelWidth);
      expect(screen.width).toBe(phoneSpecs.width - 2 * phoneSpecs.bezelWidth);
      expect(screen.height).toBe(phoneSpecs.height - 2 * phoneSpecs.bezelWidth);
      expect(screen.cornerRadius).toBe(phoneSpecs.cornerRadius - phoneSpecs.bezelWidth);
    });

    it('calculates browser window screen bounds with titlebar offset for traffic lights', () => {
      const browser = getDeviceDimensions('browser');
      const screen = calculateDeviceScreenBounds('browser');

      // Title bar is 38px
      expect(screen.y).toBeGreaterThanOrEqual(36);
      expect(screen.width).toBe(browser.width - 2 * browser.bezelWidth);
      expect(screen.height).toBeLessThan(browser.height);
    });
  });

  describe('calculatePerspectiveTransform', () => {
    it('returns identity-like affine values for front angle preset', () => {
      const transform = calculatePerspectiveTransform('front');

      expect(transform.skewX).toBe(0);
      expect(transform.skewY).toBe(0);
      expect(transform.rotationRad).toBe(0);
      expect(transform.scaleX).toBe(1);
      expect(transform.scaleY).toBe(1);
    });

    it('applies negative skew and positive pitch for isometric-left preset', () => {
      const transform = calculatePerspectiveTransform('isometric-left');

      expect(transform.skewX).toBeLessThan(0);
      expect(transform.skewY).toBeGreaterThan(0);
      expect(transform.scaleX).toBeGreaterThan(0);
      expect(transform.scaleY).toBeGreaterThan(0);
    });

    it('applies positive skew and negative pitch for isometric-right preset', () => {
      const transform = calculatePerspectiveTransform('isometric-right');

      expect(transform.skewX).toBeGreaterThan(0);
      expect(transform.skewY).toBeLessThan(0);
      expect(transform.scaleX).toBeGreaterThan(0);
      expect(transform.scaleY).toBeGreaterThan(0);
    });

    it('applies rotation and tilt for dynamic tilt preset', () => {
      const transform = calculatePerspectiveTransform('tilt-dynamic');

      expect(transform.rotationRad).not.toBe(0);
      expect(Math.abs(transform.skewX)).toBeGreaterThan(0);
    });

    it('applies vertical elevation for float preset', () => {
      const transform = calculatePerspectiveTransform('float');

      expect(transform.translateY).toBeLessThan(0); // Floating upwards
      expect(transform.skewX).toBe(0);
      expect(transform.skewY).toBe(0);
    });
  });

  describe('calculateImageFit', () => {
    it('centers and crops screenshot to fill target screen in cover mode', () => {
      // User uploads 1080x1920 (9:16) screenshot onto 362x816 screen
      const fit = calculateImageFit(1080, 1920, 362, 816, 'cover');

      expect(fit.dx).toBe(0);
      expect(fit.dy).toBe(0);
      expect(fit.dWidth).toBe(362);
      expect(fit.dHeight).toBe(816);
      expect(fit.sWidth).toBeGreaterThan(0);
      expect(fit.sHeight).toBeGreaterThan(0);
    });

    it('scales screenshot proportionally to fit entirely in contain mode', () => {
      // User uploads square 1000x1000 image onto 362x816 screen
      const fit = calculateImageFit(1000, 1000, 362, 816, 'contain');

      expect(fit.dWidth).toBe(362);
      expect(fit.dHeight).toBe(362);
      expect(fit.dy).toBe((816 - 362) / 2); // vertically centered
    });

    it('stretches screenshot directly to screen bounds in stretch mode', () => {
      const fit = calculateImageFit(800, 600, 362, 816, 'stretch');

      expect(fit.sx).toBe(0);
      expect(fit.sy).toBe(0);
      expect(fit.sWidth).toBe(800);
      expect(fit.sHeight).toBe(600);
      expect(fit.dx).toBe(0);
      expect(fit.dy).toBe(0);
      expect(fit.dWidth).toBe(362);
      expect(fit.dHeight).toBe(816);
    });
  });
});
