import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assertBrowserHealthy, assertManifest, validateArtifact } from './smoke.mjs';
import { assertCoverageFiles } from './coverage-manifest.mjs';

describe('QA harness catches seeded failures', () => {
  it('detects an omitted canonical tool and duplicate routes', () => {
    assert.throws(() => assertManifest([{ id: 'one', route: '/tools/one' }], 2), /expected 2/);
    assert.throws(() => assertManifest([{ id: 'one', route: '/tools/one' }, { id: 'two', route: '/tools/one' }], 2), /Duplicate/);
  });
  it('detects advertising containers and placeholder copy', () => {
    assert.throws(() => assertBrowserHealthy({ httpStatus: 200, pageErrors: [], failedRequests: [], adSlots: 1 }), /advertising slot/);
    assert.throws(() => assertBrowserHealthy({ httpStatus: 200, pageErrors: [], failedRequests: [], advertisingCopy: true }), /advertising placeholder/);
  });
  it('detects a browser exception and network failure', () => {
    assert.throws(() => assertBrowserHealthy({ httpStatus: 200, pageErrors: ['seeded exception'], failedRequests: [] }), /seeded exception/);
    assert.throws(() => assertBrowserHealthy({ httpStatus: 200, pageErrors: [], failedRequests: [{ url: '/broken', error: 'seeded' }] }), /request failed/);
  });
  it('detects missing, empty and malformed exports, and accepts correct signatures', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'privknife-validator-'));
    try {
      const file = path.join(dir, 'output.pdf');
      assert.throws(() => validateArtifact(path.join(dir, 'missing.pdf'), 'pdf'));
      fs.writeFileSync(file, Buffer.alloc(0)); assert.throws(() => validateArtifact(file, 'pdf'), /empty/);
      fs.writeFileSync(file, 'not a pdf'); assert.throws(() => validateArtifact(file, 'pdf'), /signature/);
      fs.writeFileSync(file, '%PDF-1.7'); assert.equal(validateArtifact(file, 'pdf').extension, 'pdf');
      const stl = Buffer.alloc(134); stl.writeUInt32LE(1, 80);
      for (let offset = 84; offset < 132; offset += 4) stl.writeFloatLE(offset === 84 ? 1 : 0, offset);
      const stlFile = path.join(dir, 'valid.stl'); fs.writeFileSync(stlFile, stl);
      assert.equal(validateArtifact(stlFile, 'stl').bytes, 134);
      stl.writeFloatLE(Number.NaN, 100); fs.writeFileSync(stlFile, stl);
      assert.throws(() => validateArtifact(stlFile, 'stl'), /Non-finite STL vertex/);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});


describe('coverage manifest protects tool executable files', () => {
  it('fails when an engine or worker is absent from the coverage summary', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'privknife-coverage-'));
    const tool = path.join(dir, 'sample'); fs.mkdirSync(tool);
    fs.writeFileSync(path.join(tool, 'engine.ts'), 'export const run = () => true;');
    fs.writeFileSync(path.join(tool, 'worker.ts'), 'export {};');
    try {
      assert.throws(() => assertCoverageFiles(dir, { total: {} }), /omits 2 required executable tool files/);
      const report = { total: {}, [path.join(tool, 'engine.ts')]: {}, [path.join(tool, 'worker.ts')]: {} };
      assert.equal(assertCoverageFiles(dir, report), 2);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});
