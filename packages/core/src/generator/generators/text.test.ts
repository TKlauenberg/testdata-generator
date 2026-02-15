import { describe, it, expect } from 'bun:test';
import { createRNG } from '../rng';
import { word, words, sentence, paragraph } from './text';

function countSentenceWords(text: string): number {
  const withoutPeriod = text.endsWith('.') ? text.slice(0, -1) : text;
  if (withoutPeriod.length === 0) {
    return 0;
  }
  return withoutPeriod.split(' ').filter((token) => token.length > 0).length;
}

function splitParagraphSentences(text: string): string[] {
  return text
    .split('. ')
    .map((chunk, index, arr) => (index < arr.length - 1 ? `${chunk}.` : chunk))
    .filter((chunk) => chunk.length > 0);
}

describe('Text Generators', () => {
  describe('word()', () => {
    it('returns non-empty string', () => {
      const rng = createRNG(42);
      const value = word(rng);

      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    });

    it('is deterministic with same seed', () => {
      const rng1 = createRNG(12345);
      const rng2 = createRNG(12345);

      expect(word(rng1)).toBe(word(rng2));
    });
  });

  describe('words()', () => {
    it('returns exactly count tokens', () => {
      const rng = createRNG(77);
      const count = 8;
      const value = words(rng, count);

      expect(value.split(' ').length).toBe(count);
    });

    it('throws for invalid count', () => {
      const rng = createRNG(7);

      expect(() => words(rng, 0)).toThrow('count must be a positive integer');
      expect(() => words(rng, -2)).toThrow('count must be a positive integer');
      expect(() => words(rng, 1.5)).toThrow('count must be a positive integer');
    });
  });

  describe('sentence()', () => {
    it('respects explicit count', () => {
      const rng = createRNG(500);
      const value = sentence(rng, 6);

      expect(countSentenceWords(value)).toBe(6);
    });

    it('uses default range when count is omitted (5-15 words)', () => {
      const rng = createRNG(501);
      const value = sentence(rng);
      const count = countSentenceWords(value);

      expect(count).toBeGreaterThanOrEqual(5);
      expect(count).toBeLessThanOrEqual(15);
    });

    it('starts uppercase and ends with period', () => {
      const rng = createRNG(502);
      const value = sentence(rng, 7);

      expect(/^[A-Z]/.test(value)).toBe(true);
      expect(value.endsWith('.')).toBe(true);
    });

    it('throws for invalid explicit count', () => {
      const rng = createRNG(503);

      expect(() => sentence(rng, 0)).toThrow('wordCount must be a positive integer');
      expect(() => sentence(rng, -1)).toThrow('wordCount must be a positive integer');
      expect(() => sentence(rng, 2.2)).toThrow('wordCount must be a positive integer');
    });
  });

  describe('paragraph()', () => {
    it('respects explicit sentence count', () => {
      const rng = createRNG(900);
      const value = paragraph(rng, 4);

      expect(splitParagraphSentences(value).length).toBe(4);
    });

    it('uses default range when count is omitted (3-5 sentences)', () => {
      const rng = createRNG(901);
      const value = paragraph(rng);
      const count = splitParagraphSentences(value).length;

      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(5);
    });

    it('returns sentences with expected punctuation', () => {
      const rng = createRNG(902);
      const value = paragraph(rng, 3);
      const sentences = splitParagraphSentences(value);

      expect(sentences.every((item) => item.endsWith('.'))).toBe(true);
      expect(value.includes('. ')).toBe(true);
    });

    it('throws for invalid explicit sentence count', () => {
      const rng = createRNG(903);

      expect(() => paragraph(rng, 0)).toThrow('sentenceCount must be a positive integer');
      expect(() => paragraph(rng, -1)).toThrow('sentenceCount must be a positive integer');
      expect(() => paragraph(rng, 1.5)).toThrow('sentenceCount must be a positive integer');
    });
  });

  describe('determinism', () => {
    it('all public generators are deterministic with same seed', () => {
      const seed = 424242;

      const wordRng1 = createRNG(seed);
      const wordRng2 = createRNG(seed);
      expect(word(wordRng1)).toBe(word(wordRng2));

      const wordsRng1 = createRNG(seed);
      const wordsRng2 = createRNG(seed);
      expect(words(wordsRng1, 10)).toBe(words(wordsRng2, 10));

      const sentenceRng1 = createRNG(seed);
      const sentenceRng2 = createRNG(seed);
      expect(sentence(sentenceRng1, 9)).toBe(sentence(sentenceRng2, 9));

      const paragraphRng1 = createRNG(seed);
      const paragraphRng2 = createRNG(seed);
      expect(paragraph(paragraphRng1, 4)).toBe(paragraph(paragraphRng2, 4));
    });
  });
});