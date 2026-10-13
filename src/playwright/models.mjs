export const models = {
  'apertus-1.5-8b': { provider: 'apertus' },
  'llama-3.1-8b': { provider: 'huggingface', model: 'meta-llama/Llama-3.1-8B-Instruct:featherless-ai' },
  'qwen3-8b': { provider: 'huggingface', model: 'Qwen/Qwen3-8B:featherless-ai' },
  'gpt-6-luna': { provider: 'openai', model: 'gpt-6-luna' },
  'gpt-6.1-sol': { provider: 'openai', model: 'gpt-6.1-sol' },
  'qwen3-32b': { provider: 'huggingface', model: 'Qwen/Qwen3-32B' },
  'mistral-small-3.1-24b': { provider: 'huggingface', model: 'mistralai/Mistral-Small-3.1-24B-Instruct-2503',
    baseUrl: 'https://router.huggingface.co/featherless-ai/v1' },
};

export function modelEnvironment(slug, source = process.env) {
  const profile = models[slug];
  if (!profile) throw new Error(`Choose MODEL from: ${Object.keys(models).join(', ')}`);
  const env = { ...source, BENCHMARK_MEASUREMENTS: 'true', BENCHMARK_REQUIRE_MEASUREMENTS: 'true',
    BENCHMARK_MODEL_SLUG: slug, PLANNER_MAX_CONCURRENT_REQUESTS: '1', LLM_MAX_CONCURRENT_REQUESTS: '1' };
  if ((source.REPAIR_MEMORY_MODE ?? 'off') !== 'off')
    throw new Error('This campaign requires REPAIR_MEMORY_MODE=off; a frozen memory comparison is separate work.');
  if (profile.provider === 'openai') {
    if (!source.OPENAI_API_KEY?.trim()) throw new Error('Provide OPENAI_API_KEY in the server environment.');
    env.LLM_PROVIDER = 'openai'; env.LLM_MODEL = profile.model;
    env.OPENAI_REASONING_EFFORT = source.OPENAI_REASONING_EFFORT?.trim() || (slug === 'gpt-6-luna' ? 'none' : 'low');
    if (slug === 'gpt-6.1-sol' && !['low', 'medium', 'high', 'xhigh', 'max'].includes(env.OPENAI_REASONING_EFFORT))
      throw new Error('GPT-6.1 Sol requires reasoning effort low, medium, high, xhigh or max.');
  } else if (profile.provider === 'huggingface') {
    if (!source.HF_TOKEN?.trim()) throw new Error('Provide HF_TOKEN in the server environment.');
    env.LLM_PROVIDER = 'apertus'; env.APERTUS_PROVIDER = 'huggingface';
    env.LLM_MODEL = source.BENCHMARK_HF_MODEL?.trim() || profile.model;
    env.APERTUS_HF_MODEL = env.LLM_MODEL;
    const configuredBase = source.APERTUS_HF_BASE_URL?.trim().replace(/\/+$/, '');
    if (profile.baseUrl && (!configuredBase || configuredBase === 'https://router.huggingface.co/v1'))
      env.APERTUS_HF_BASE_URL = profile.baseUrl;
  } else {
    env.LLM_PROVIDER = 'apertus';
    if (source.APERTUS_PROVIDER === 'huggingface' && !source.HF_TOKEN?.trim())
      throw new Error('Hosted Apertus requires HF_TOKEN.');
  }
  return env;
}
