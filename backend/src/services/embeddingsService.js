const env = require('../config/env');
const config = { apiKey: env.OPENAI_API_KEY, baseURL: env.OPENAI_BASE_URL || undefined };

function isReady() {
  return !!config.apiKey;
}

async function embed(text) {
  if (!isReady()) {
    return { success: false, data: null, error: 'OPENAI_API_KEY not configured' };
  }
  try {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI(config);
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return { success: true, data: response.data[0].embedding };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

async function embedBatch(texts) {
  if (!isReady()) {
    return { success: false, data: null, error: 'OPENAI_API_KEY not configured' };
  }
  try {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI(config);
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });
    return { success: true, data: response.data.map(d => d.embedding) };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const na = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const nb = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return na && nb ? dot / (na * nb) : 0;
}

module.exports = { embed, embedBatch, cosineSimilarity, isReady };
