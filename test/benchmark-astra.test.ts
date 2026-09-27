import { afterAll, beforeAll, expect, test } from 'bun:test';
import { spawnSync } from 'child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { GptAdapter } from './helpers/providers/gpt';
import { formatJson, formatMarkdown, formatTable, type BenchmarkReport } from './helpers/benchmark-runner';

const ROOT = resolve(import.meta.dir, '..');
let workdir: string;
beforeAll(() => {
  workdir = mkdtempSync(join(tmpdir(), 'benchmark-astra-'));
  // Offline fake CLI: record exactly what the adapter sends, return bounded JSONL.
  writeFileSync(join(workdir, 'codex'), `#!${process.execPath}
import { writeFileSync } from 'fs';
writeFileSync(process.env.GSTACK_TEST_ARGS, JSON.stringify(process.argv.slice(2)));
console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'offline answer'}}));
console.log(JSON.stringify({type:'turn.completed',model:process.env.GSTACK_TEST_MODEL || undefined,usage:{input_tokens:100,output_tokens:20}}));
`, { mode: 0o755 });
});
afterAll(() => rmSync(workdir, { recursive: true, force: true }));

function runCli(args: string[]) {
  return spawnSync(process.execPath, ['bin/gstack-model-benchmark', ...args], {
    cwd: ROOT, encoding: 'utf8', timeout: 10_000,
  });
}

test('CLI distinguishes providers from model ID, including positional and equals forms', () => {
  const prompt = join(workdir, 'prompt.txt');
  writeFileSync(prompt, 'Offline benchmark prompt');
  for (const flag of [['--gpt-model', 'gpt-6-astra'], ['--gpt-model=gpt-6-astra']]) {
    const r = runCli(['--models', 'gpt', ...flag, prompt, '--dry-run']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('gpt_model:  gpt-6-astra');
    expect(r.stdout).toContain('Offline benchmark prompt');
    expect(r.stdout).toContain('not overridden');
    expect(r.stdout).toContain('no prompts sent');
  }
  for (const flags of [
    ['--gpt-model', 'gpt-6-astra'],
    ['--models', 'gpt', '--gpt-model='],
    ['--models', 'gpt', '--gpt-model', '--dry-run'],
  ]) expect(runCli(['--prompt', 'hi', '--dry-run', ...flags]).status).not.toBe(0);
});

test('Codex receives explicit model and read-only sandbox, never an inferred effort override', () => {
  for (const reported of ['', 'gpt-6-astra']) {
    const adapterPath = join(ROOT, 'test/helpers/providers/gpt.ts');
    const script = `import {GptAdapter} from ${JSON.stringify(adapterPath)};
      console.log(JSON.stringify(await new GptAdapter().run({prompt:'offline',workdir:${JSON.stringify(workdir)},timeoutMs:5000,model:'gpt-6-astra'})));`;
    const r = spawnSync(process.execPath, ['-e', script], {
      cwd: ROOT, encoding: 'utf8', timeout: 10_000,
      env: { ...process.env, PATH: `${workdir}:${process.env.PATH}`, GSTACK_TEST_ARGS: join(workdir, 'args.json'), GSTACK_TEST_MODEL: reported },
    });
    expect(r.status, r.stderr).toBe(0);
    const args = JSON.parse(readFileSync(join(workdir, 'args.json'), 'utf8'));
    expect(args.slice(args.indexOf('-m'), args.indexOf('-m') + 2)).toEqual(['-m', 'gpt-6-astra']);
    expect(args.slice(args.indexOf('-s'), args.indexOf('-s') + 2)).toEqual(['-s', 'read-only']);
    expect(args.join(' ')).not.toContain('reasoning_effort');
    const result = JSON.parse(r.stdout);
    expect(result.requestedModel).toBe('gpt-6-astra');
    expect(result.modelUsed).toBe(reported || 'unknown');
    expect(result.modelSource).toBe(reported ? 'provider' : 'unreported');
    expect(result.reasoningEffort).toBe('inherited (not reported)');
  }
});

test('unknown model/pricing cannot appear as a zero-cost or confirmed Astra run', () => {
  const adapter = new GptAdapter();
  expect(adapter.estimateCost({ input: 1000, output: 500 }, 'gpt-6-astra')).toBeUndefined();
  expect(adapter.estimateCost({ input: 1000, output: 500 })).toBeUndefined();
  expect(adapter.estimateCost({ input: 1000, output: 500 }, 'gpt-5.4')).toBeGreaterThan(0);
  const report: BenchmarkReport = { prompt: 'offline', workdir, startedAt: '2026-09-27', durationMs: 1, entries: [{
    provider: 'gpt', family: 'gpt', available: true, result: {
      output: 'ok', tokens: { input: 100, output: 20 }, durationMs: 1, toolCalls: 0,
      requestedModel: 'gpt-6-astra', modelUsed: 'unknown', modelSource: 'unreported',
    },
  }] };
  for (const formatted of [formatTable(report), formatMarkdown(report)]) {
    expect(formatted).toContain('unknown');
    expect(formatted).toContain('requested: gpt-6-astra');
    expect(formatted).toContain('actual model unreported');
    expect(formatted).not.toContain('$0.0000');
  }
  expect(JSON.parse(formatJson(report)).entries[0].costUsd).toBeUndefined();
});
