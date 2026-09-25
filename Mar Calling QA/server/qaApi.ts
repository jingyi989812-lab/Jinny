/**
 * Local QA API — runs INSIDE the Vite dev server (see vite.config.ts), never in the browser.
 *
 *   GET  /api/health    → { keyConfigured, model }            (never returns the key)
 *   POST /api/evaluate  → ClaudeJudgementResponse + usage
 *
 * The Anthropic API key is read from .env.local (ANTHROPIC_API_KEY) on every request,
 * so adding or rotating the key does not require restarting the app.
 * For production, move this handler behind real authentication on a server.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import Anthropic from '@anthropic-ai/sdk';
import { getFramework } from '@/config/frameworks';
import { buildOutputSchema, buildSystemPrompt, buildUserPrompt, type ClaudeJudgementResponse } from '@/services/qaEvaluator/prompt';
import { parseTranscript } from '@/services/qaEvaluator/transcriptParser';
import type { EvaluationInput } from '@/types/call';

export const MODEL = 'claude-opus-5';
export const EFFORT = 'high' as const;

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readJson<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 2_000_000) throw new Error('Request too large');
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T;
}

export async function handle(req: IncomingMessage, res: ServerResponse, apiKey: string | undefined): Promise<void> {
  const url = req.url ?? '';

  if (req.method === 'GET' && url.startsWith('/health')) {
    send(res, 200, { keyConfigured: Boolean(apiKey && apiKey.startsWith('sk-ant-')), model: MODEL });
    return;
  }

  if (req.method === 'POST' && url.startsWith('/evaluate')) {
    if (!apiKey) {
      send(res, 503, { error: 'No Anthropic API key found. Run: npm run set-key' });
      return;
    }
    let input: EvaluationInput;
    try {
      input = await readJson<EvaluationInput>(req);
    } catch {
      send(res, 400, { error: 'Invalid request body' });
      return;
    }
    const framework = getFramework(input.frameworkId);
    const transcript = parseTranscript(input.transcript, input.staffName);
    if (transcript.lines.length < 3) {
      send(res, 400, { error: 'Transcript too short to evaluate' });
      return;
    }

    const client = new Anthropic({ apiKey });
    try {
      const stream = client.beta.messages.stream({
        model: MODEL,
        max_tokens: 32000,
        thinking: { type: 'adaptive' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: [{ type: 'text', text: buildSystemPrompt(framework), cache_control: { type: 'ephemeral' } }],
        messages: [
          {
            role: 'user',
            content: buildUserPrompt(transcript, {
              Consultant: input.staffName,
              'Call date': input.callDate,
              Language: input.language,
            }),
          },
        ],
        output_config: { effort: EFFORT, format: { type: 'json_schema', schema: buildOutputSchema(framework) } },
      });
      const message = await stream.finalMessage();

      if (message.stop_reason === 'refusal') {
        send(res, 422, { error: 'The model declined to evaluate this transcript.' });
        return;
      }
      if (message.stop_reason === 'max_tokens') {
        send(res, 502, { error: 'The evaluation was cut off (max tokens). Try again.' });
        return;
      }
      const text = message.content.find((b) => b.type === 'text');
      if (!text || text.type !== 'text') {
        send(res, 502, { error: 'No evaluation returned' });
        return;
      }
      const data = JSON.parse(text.text) as ClaudeJudgementResponse;
      send(res, 200, {
        ...data,
        model: message.model,
        usage: {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
          cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
          cacheWriteTokens: message.usage.cache_creation_input_tokens ?? 0,
        },
      });
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) send(res, 401, { error: 'The API key was rejected. Run npm run set-key to enter it again.' });
      else if (err instanceof Anthropic.PermissionDeniedError) send(res, 403, { error: 'This API key does not have access to the model.' });
      else if (err instanceof Anthropic.RateLimitError) send(res, 429, { error: 'Rate limited — wait a moment and try again.' });
      else if (err instanceof Anthropic.APIError) send(res, 502, { error: `Claude API error ${err.status ?? ''}: ${err.message}`.trim() });
      else send(res, 500, { error: err instanceof Error ? err.message : 'Evaluation failed' });
    }
    return;
  }

  send(res, 404, { error: 'Not found' });
}
