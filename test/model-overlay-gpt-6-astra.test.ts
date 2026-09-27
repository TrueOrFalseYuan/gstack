import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { spawnSync } from 'child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, existsSync, writeFileSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { resolveModel, validateModel } from '../scripts/models';
import { isCodexAstra, selectAstraVariants } from '../scripts/resolvers/astra';
import { generatePreamble } from '../scripts/resolvers/preamble';
import { HOST_PATHS, type TemplateContext } from '../scripts/resolvers/types';
import { discoverTemplates, discoverSectionTemplates } from '../scripts/discover-skills';
import codex from '../hosts/codex';

const ROOT = resolve(import.meta.dir, '..');
const ctx: TemplateContext = {
  skillName: 'ship', tmplPath: 'ship/SKILL.md.tmpl', host: 'codex',
  model: 'gpt-6-astra', paths: HOST_PATHS.codex, preambleTier: 2,
};

test('Astra is opt-in and does not capture sibling models or change Sol defaults', () => {
  expect(validateModel('gpt-6-astra')).toBeNull();
  for (const model of ['gpt-6-astra', 'gpt-6-astra-latest']) expect(resolveModel(model)).toBe('gpt-6-astra');
  for (const model of ['gpt-6', 'gpt-6-sol', 'gpt-6-luna', 'gpt-6-astral']) expect(resolveModel(model)).toBe('gpt');
  expect(codex.defaultModel).toBe('gpt-5.6-sol');
  expect(isCodexAstra({ ...ctx, host: 'claude' })).toBe(false);
  expect(isCodexAstra({ ...ctx, model: 'gpt-5.6-sol' })).toBe(false);
});

test('template alternatives preserve exact legacy bytes and reject broken policies', () => {
  const source = 'before\n<!-- codex-astra -->\nAstra\n<!-- otherwise -->\nlegacy\n<!-- /codex-astra -->\nafter\n';
  expect(selectAstraVariants(source, ctx)).toBe('before\nAstra\nafter\n');
  expect(selectAstraVariants(source, { ...ctx, model: 'gpt-5.6-sol' })).toBe('before\nlegacy\nafter\n');
  expect(selectAstraVariants(source, { ...ctx, host: 'claude' })).toBe('before\nlegacy\nafter\n');
  for (const invalid of [
    '<!-- otherwise -->\n', '<!-- /codex-astra -->\n', '<!-- codex-astra -->\nunclosed',
    '<!-- codex-astra -->\n<!-- codex-astra -->\n',
    '<!-- codex-astra -->\n<!-- /codex-astra -->\n',
  ]) expect(() => selectAstraVariants(invalid, ctx)).toThrow();
  // Validate every main/section template, including ones not reached by Codex.
  for (const { tmpl } of [...discoverTemplates(ROOT), ...discoverSectionTemplates(ROOT)]) {
    for (const c of [ctx, { ...ctx, model: 'gpt-5.6-sol' }]) {
      expect(selectAstraVariants(readFileSync(join(ROOT, tmpl), 'utf8'), c)).not.toContain('<!-- codex-astra -->');
    }
  }
});

test('Astra preamble establishes native authorization, tool and plan-mode contracts', () => {
  const out = generatePreamble(ctx);
  expect(out).toContain('not a change to the runtime model');
  expect(out).toContain('Do not re-request');
  expect(out).toContain('request_user_input_async');
  expect(out).toContain('elapsed time as an answer');
  expect(out).toContain('Do not execute');
  expect(out).toContain('perform the work sequentially');
  expect(out).not.toContain('If a skill says STOP');
  expect(out.length).toBeLessThan(8500);
});

describe('Astra generation and freshness', () => {
  let out: string;
  let originalSkill: string;
  const generate = (args: string[]) => spawnSync(process.execPath, ['scripts/gen-skill-docs.ts', ...args], {
    cwd: ROOT, encoding: 'utf8', timeout: 30_000,
  });
  const skill = (name: string) => readFileSync(join(out, name === 'gstack' ? name : `gstack-${name}`, 'SKILL.md'), 'utf8');
  const section = (name: string) => readFileSync(join(out, `gstack-${name}`, 'sections/review-sections.md'), 'utf8');
  beforeAll(() => {
    out = mkdtempSync(join(tmpdir(), 'gstack-astra-test-'));
    originalSkill = readFileSync(join(ROOT, 'ship/SKILL.md'), 'utf8');
    const result = generate(['--host', 'codex', '--model', 'gpt-6-astra', '--out-dir', out]);
    expect(result.status, result.stderr).toBe(0);
  });
  afterAll(() => rmSync(out, { recursive: true, force: true }));

  test('generates every supported skill, metadata and referenced section without touching defaults', () => {
    const skills = readdirSync(out).filter(name => existsSync(join(out, name, 'SKILL.md')));
    expect(skills).toHaveLength(discoverTemplates(ROOT).length - codex.generation.skipSkills!.length);
    expect(existsSync(join(out, 'gstack-codex'))).toBe(false);
    let references = 0;
    for (const name of skills) {
      const content = readFileSync(join(out, name, 'SKILL.md'), 'utf8');
      expect(content).not.toMatch(/\{\{\w+(?::[^}]+)?\}\}/);
      expect(content).not.toContain('<!-- otherwise -->');
      expect(content).not.toContain('model_reasoning_effort=');
      expect(content).not.toContain('Every diff gets both Claude');
      expect(content).toContain('--host codex --model gpt-6-astra');
      expect(existsSync(join(out, name, 'agents/openai.yaml'))).toBe(true);
      for (const match of content.matchAll(/`sections\/([^`]+\.md)`/g)) {
        expect(existsSync(join(out, name, 'sections', match[1]))).toBe(true);
        references++;
      }
    }
    expect(references).toBeGreaterThanOrEqual(discoverSectionTemplates(ROOT).length);
    expect(skill('ship')).not.toContain('## JSONL artifact');
    expect(readFileSync(join(ROOT, 'ship/SKILL.md'), 'utf8')).toBe(originalSkill);
  });

  test('removes conflicting gates while retaining domain and safety boundaries', () => {
    for (const name of ['plan-ceo-review', 'plan-eng-review', 'plan-design-review', 'plan-devex-review']) {
      const text = section(name);
      expect(text).not.toContain('One issue = one');
      expect(text).not.toContain('call request_user_input individually');
      expect(text).not.toContain('JSONL artifact (always write');
      expect(text).toContain('Material decisions');
      expect(text).toContain('Implementation Tasks');
    }
    expect(skill('ios-fix')).not.toContain('user pick the one to fix');
    expect(skill('retro')).toContain('zero activity');
    expect(skill('context-restore')).toContain('continue the next authorized item');
    expect(skill('spec')).toContain('Spawn only when');
    expect(skill('spec')).toContain('redaction');
    expect(skill('spec')).not.toContain('Codex (a second AI');
    expect(skill('review')).toContain('Independent check');
    expect(skill('review')).toContain('self-review');
    expect(skill('spec')).not.toContain('treat as\n   `inactive`');
    expect(skill('upgrade')).not.toContain('git reset --hard origin/main');
    expect(skill('freeze')).toContain('instruction-level');
    expect(skill('guard')).toContain('symlink');
    expect(skill('qa-only')).toContain('report');
    expect(skill('autoplan')).toContain('sequential');
  });

  test('dry-run neither creates an absent output directory nor repairs stale metadata', () => {
    const missing = join(out, 'absent');
    expect(generate(['--host', 'codex', '--model', 'gpt-6-astra', '--out-dir', missing, '--dry-run']).status).toBe(1);
    expect(existsSync(missing)).toBe(false);
    const args = ['--host', 'codex', '--model', 'gpt-6-astra', '--out-dir', out, '--dry-run'];
    const metadata = join(out, 'gstack-ship/agents/openai.yaml');
    const original = readFileSync(metadata, 'utf8');
    const before = statSync(metadata).mtimeMs;
    expect(generate(args).status).toBe(0);
    expect(statSync(metadata).mtimeMs).toBe(before);
    writeFileSync(metadata, 'stale metadata\n');
    const stale = generate(args);
    expect(stale.status).toBe(1);
    expect(stale.stdout).toContain('STALE: gstack-ship/SKILL.md');
    expect(readFileSync(metadata, 'utf8')).toBe('stale metadata\n');
    writeFileSync(metadata, original);
  });
});
