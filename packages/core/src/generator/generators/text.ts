import type { RNG } from '../rng';

const MIN_SENTENCE_WORDS = 5;
const MAX_SENTENCE_WORDS = 15;
const MIN_PARAGRAPH_SENTENCES = 3;
const MAX_PARAGRAPH_SENTENCES = 5;

export const COMMON_WORDS: readonly string[] = [
  'about', 'above', 'across', 'action', 'active', 'actor', 'actual', 'adapt', 'admin', 'after',
  'again', 'agent', 'agree', 'ahead', 'alert', 'allow', 'alpha', 'among', 'angel', 'angle',
  'apply', 'array', 'asset', 'audio', 'audit', 'avoid', 'award', 'aware', 'basic', 'batch',
  'begin', 'below', 'bench', 'black', 'block', 'board', 'boost', 'bound', 'brain', 'brand',
  'break', 'brief', 'bring', 'broad', 'build', 'buyer', 'cable', 'cache', 'carry', 'cause',
  'chain', 'chair', 'chart', 'check', 'chief', 'child', 'claim', 'class', 'clean', 'clear',
  'click', 'clock', 'close', 'cloud', 'coach', 'coast', 'color', 'count', 'cover', 'craft',
  'crash', 'create', 'credit', 'cross', 'crowd', 'cycle', 'daily', 'dance', 'data', 'debug',
  'decide', 'deep', 'delay', 'delta', 'design', 'detail', 'device', 'dialog', 'digital', 'direct',
  'divide', 'doctor', 'domain', 'draft', 'drama', 'dream', 'drive', 'early', 'earth', 'eight',
  'email', 'empty', 'enable', 'energy', 'engine', 'enjoy', 'enter', 'entry', 'equal', 'error',
  'event', 'exact', 'exist', 'extra', 'faith', 'false', 'fault', 'field', 'fifth', 'final',
  'first', 'focus', 'force', 'forum', 'frame', 'fresh', 'front', 'fruit', 'fully', 'fund',
  'future', 'giant', 'given', 'global', 'grant', 'graph', 'great', 'green', 'group', 'guard',
  'guide', 'happy', 'heart', 'heavy', 'hello', 'honey', 'hotel', 'house', 'human', 'ideal',
  'image', 'index', 'input', 'issue', 'joint', 'judge', 'known', 'label', 'large', 'laser',
  'later', 'layer', 'learn', 'leave', 'legal', 'level', 'light', 'limit', 'local', 'logic',
  'login', 'loyal', 'lucky', 'magic', 'major', 'maker', 'march', 'match', 'maybe', 'media',
  'metal', 'meter', 'micro', 'minor', 'model', 'money', 'month', 'motor', 'mouse', 'music',
  'narrow', 'native', 'never', 'night', 'noise', 'north', 'novel', 'nurse', 'offer', 'often',
  'order', 'other', 'owner', 'panel', 'paper', 'party', 'patch', 'peace', 'phase', 'phone',
  'photo', 'piece', 'pilot', 'pitch', 'place', 'plain', 'plane', 'plant', 'plate', 'point',
  'power', 'press', 'price', 'prime', 'print', 'prior', 'prize', 'proof', 'proud', 'prove',
  'quick', 'quiet', 'quote', 'radio', 'raise', 'range', 'rapid', 'ratio', 'reach', 'ready',
  'reply', 'reset', 'right', 'river', 'robot', 'route', 'royal', 'rural', 'scale', 'scene',
  'scope', 'score', 'screen', 'search', 'secure', 'sense', 'serve', 'setup', 'share', 'shift',
  'short', 'signal', 'silver', 'simple', 'single', 'smart', 'smooth', 'social', 'solid', 'solve',
  'sound', 'south', 'space', 'speed', 'spice', 'split', 'sport', 'staff', 'stage', 'stand',
  'start', 'state', 'steel', 'still', 'stock', 'store', 'story', 'study', 'style', 'suite',
  'super', 'sweet', 'table', 'taken', 'taste', 'teach', 'theme', 'thing', 'think', 'third',
  'tight', 'title', 'today', 'topic', 'total', 'touch', 'tower', 'track', 'trade', 'trend',
  'trial', 'trust', 'truth', 'twice', 'under', 'union', 'unity', 'upper', 'usage', 'usual',
  'value', 'video', 'visit', 'voice', 'waste', 'watch', 'water', 'wheel', 'where', 'which',
  'while', 'white', 'whole', 'woman', 'world', 'write', 'wrong', 'young', 'youth', 'zone',
] as const;

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
}

export function word(rng: RNG): string {
  const index = rng.nextIntRange(0, COMMON_WORDS.length - 1);
  return COMMON_WORDS[index];
}

export function words(rng: RNG, count: number): string {
  assertPositiveInteger(count, 'count');

  const parts: string[] = [];
  for (let index = 0; index < count; index++) {
    parts.push(word(rng));
  }

  return parts.join(' ');
}

export function sentence(rng: RNG, wordCount?: number): string {
  if (wordCount !== undefined) {
    assertPositiveInteger(wordCount, 'wordCount');
  }

  const count = wordCount ?? rng.nextIntRange(MIN_SENTENCE_WORDS, MAX_SENTENCE_WORDS);
  const text = words(rng, count);
  const capitalized = text.charAt(0).toUpperCase() + text.slice(1);

  return `${capitalized}.`;
}

export function paragraph(rng: RNG, sentenceCount?: number): string {
  if (sentenceCount !== undefined) {
    assertPositiveInteger(sentenceCount, 'sentenceCount');
  }

  const count = sentenceCount ?? rng.nextIntRange(MIN_PARAGRAPH_SENTENCES, MAX_PARAGRAPH_SENTENCES);
  const parts: string[] = [];

  for (let index = 0; index < count; index++) {
    parts.push(sentence(rng));
  }

  return parts.join(' ');
}