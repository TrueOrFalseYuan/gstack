import { describe, expect, test } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { generatePreamble } from '../scripts/resolvers/preamble';
import type { TemplateContext } from '../scripts/resolvers/types';
import { HOST_PATHS } from '../scripts/resolvers/types';

const ROOT = path.resolve(import.meta.dir, '..');

function makeCtx(): TemplateContext {
  return {
    skillName: 'investigate',
    tmplPath: 'investigate/SKILL.md.tmpl',
    host: 'codex',
    paths: HOST_PATHS.codex,
    preambleTier: 2,
    model: 'gpt-5.6-sol',
    interactive: true,
  };
}

describe('Codex GPT-5.6 Sol preamble budget and compatibility', () => {
  const out = generatePreamble(makeCtx());

  test('keeps the common Codex preamble within the frozen reduction budget', () => {
    expect(Buffer.byteLength(out, 'utf8')).toBeLessThanOrEqual(35_270);
  });

  test('keeps the native question contract within 3 KB', () => {
    const start = out.indexOf('## request_user_input Format');
    const end = out.indexOf('## Artifacts Sync', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(Buffer.byteLength(out.slice(start, end), 'utf8')).toBeLessThanOrEqual(3_000);
  });

  test('uses Codex-native plan and model contracts without Claude runtime probes', () => {
    expect(out).toContain('Model-Specific Behavioral Patch (gpt-5.6-sol)');
    expect(out).toContain('<proposed_plan>');
    expect(out).not.toContain('CONDUCTOR_SESSION');
    expect(out).not.toContain('mcp__conductor__');
    expect(out).not.toContain('CLAUDE_PLAN_FILE');
    expect(out).not.toContain('ExitPlanMode');
  });
});

describe('generated Codex investigate skill', () => {
  const skillPath = path.join(ROOT, '.agents', 'skills', 'gstack-investigate', 'SKILL.md');
  const out = fs.readFileSync(skillPath, 'utf8');

  test('is at least 20% smaller than the frozen v1.60.1 baseline', () => {
    expect(Buffer.byteLength(out, 'utf8')).toBeLessThanOrEqual(46_552);
  });

  test('contains only the Codex interaction and plan vocabulary', () => {
    expect(out).toContain('Model-Specific Behavioral Patch (gpt-5.6-sol)');
    expect(out).toContain('request_user_input');
    expect(out).not.toContain('AskUserQuestion');
    expect(out).not.toContain('mcp__conductor__');
    expect(out).not.toContain('CLAUDE_PLAN_FILE');
    expect(out).not.toContain('ExitPlanMode');
  });
});

describe('all generated Codex skills', () => {
  const skillsRoot = path.join(ROOT, '.agents', 'skills');
  const skillFiles = fs.readdirSync(skillsRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name.startsWith('gstack'))
    .map(entry => path.join(skillsRoot, entry.name, 'SKILL.md'))
    .filter(file => fs.existsSync(file));

  test('do not retain Claude-only interaction or plan-mode signals', () => {
    expect(skillFiles.length).toBeGreaterThan(40);
    for (const file of skillFiles) {
      const out = fs.readFileSync(file, 'utf8');
      expect(out).not.toContain('AskUserQuestion');
      expect(out).not.toContain('mcp__conductor__');
      expect(out).not.toContain('CONDUCTOR_SESSION');
      expect(out).not.toContain('CLAUDE_PLAN_FILE');
      expect(out).not.toContain('ExitPlanMode');
    }
  });

  test('use the GPT-5.6 Sol overlay by default', () => {
    for (const file of skillFiles) {
      const out = fs.readFileSync(file, 'utf8');
      if (out.includes('## Model-Specific Behavioral Patch')) {
        expect(out).toContain('## Model-Specific Behavioral Patch (gpt-5.6-sol)');
      }
    }
  });
});
