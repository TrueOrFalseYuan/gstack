import { describe, expect, test } from 'bun:test';
import { ALL_MODEL_NAMES, resolveModel, validateModel } from '../scripts/models';
import { generateModelOverlay } from '../scripts/resolvers/model-overlay';
import type { TemplateContext } from '../scripts/resolvers/types';
import { HOST_PATHS } from '../scripts/resolvers/types';

function makeCtx(model: string): TemplateContext {
  return {
    skillName: 'test-skill',
    tmplPath: 'test.tmpl',
    host: 'codex',
    paths: HOST_PATHS.codex,
    preambleTier: 2,
    model,
  };
}

describe('GPT-5.6 Sol model routing', () => {
  test('recognizes exact names and Sol aliases without catching Terra or Luna', () => {
    expect(resolveModel('gpt-5.6-sol')).toBe('gpt-5.6-sol');
    expect(resolveModel('gpt-5.6')).toBe('gpt-5.6-sol');
    expect(resolveModel('gpt-5.6-sol-latest')).toBe('gpt-5.6-sol');
    expect(resolveModel('gpt-5.6-terra')).toBe('gpt');
    expect(resolveModel('gpt-5.6-luna')).toBe('gpt');
  });

  test('is a validated public model family', () => {
    expect(ALL_MODEL_NAMES).toContain('gpt-5.6-sol');
    expect(validateModel('gpt-5.6-sol')).toBeNull();
  });
});

describe('GPT-5.6 Sol behavioral overlay', () => {
  const out = generateModelOverlay(makeCtx('gpt-5.6-sol'));

  test('preserves xhigh while requiring concise execution', () => {
    expect(out).toContain('Model-Specific Behavioral Patch (gpt-5.6-sol)');
    expect(out).toContain('`xhigh`');
    expect(out).toContain('Reason deeply; execute tersely');
    expect(out).toContain('one short line');
  });

  test('does not inherit the verbose generic GPT decision format', () => {
    expect(out).not.toContain('ELI10');
    expect(out).not.toContain('AskUserQuestion Format');
    expect(out).not.toContain('Pros / cons:');
  });
});
