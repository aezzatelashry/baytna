import { describe, expect, test } from 'vitest';

import { isYoutubeUrl, parseAssistantReply } from './assistant';

const meals = new Set(['kabsa', 'foul']);

describe('parseAssistantReply', () => {
  test('keeps the reply text and every well-formed action', () => {
    const parsed = parseAssistantReply(
      {
        reply: ' تمام ',
        actions: [
          { type: 'add_item', name: 'لبن', category: 'dairy', price: 7.5 },
          { type: 'remove_item', name: 'بصل' },
          { type: 'set_budget', price: 600 },
          { type: 'set_meal', date: '2026-11-15', slot: 'lunch', mealId: 'kabsa' },
        ],
        videos: [],
      },
      meals,
    );

    expect(parsed.reply).toBe('تمام');
    expect(parsed.actions).toEqual([
      { type: 'add_item', name: 'لبن', category: 'dairy', estPrice: 7.5 },
      { type: 'remove_item', name: 'بصل' },
      { type: 'set_budget', amount: 600 },
      { type: 'set_meal', date: '2026-11-15', slot: 'lunch', mealId: 'kabsa' },
    ]);
  });

  test('adds an item without a price when the price is missing or not positive', () => {
    const parsed = parseAssistantReply(
      { reply: '', actions: [{ type: 'add_item', name: 'لبن', category: 'dairy', price: 0 }] },
      meals,
    );

    expect(parsed.actions).toEqual([{ type: 'add_item', name: 'لبن', category: 'dairy', estPrice: null }]);
  });

  test('drops unknown action types, unknown meals, bad dates and impossible budgets', () => {
    const parsed = parseAssistantReply(
      {
        reply: 'x',
        actions: [
          { type: 'delete_everything' },
          { type: 'add_item', name: '', category: 'dairy' },
          { type: 'add_item', name: 'لبن', category: 'weapons' },
          { type: 'set_meal', date: '2026-11-15', slot: 'lunch', mealId: 'pizza' },
          { type: 'set_meal', date: 'tomorrow', slot: 'lunch', mealId: 'kabsa' },
          { type: 'set_budget', price: -5 },
          { type: 'set_budget', price: 9999999 },
          null,
        ],
      },
      meals,
    );

    expect(parsed.actions).toEqual([]);
  });

  test('keeps a preference to remember and trims a very long one', () => {
    const parsed = parseAssistantReply(
      { reply: 'x', actions: [{ type: 'remember', name: 'ما بنحبش الكزبرة' }, { type: 'remember', name: 'ط'.repeat(500) }] },
      meals,
    );

    expect(parsed.actions[0]).toEqual({ type: 'remember', note: 'ما بنحبش الكزبرة' });
    expect(parsed.actions[1]).toEqual({ type: 'remember', note: 'ط'.repeat(120) });
  });

  test('keeps only YouTube links', () => {
    const parsed = parseAssistantReply(
      {
        reply: 'x',
        videos: [
          { title: 'كبسة', channel: 'قناة', url: 'https://www.youtube.com/watch?v=abc' },
          { title: 'قصير', channel: '', url: 'https://youtu.be/abc' },
          { title: 'مزيف', channel: 'x', url: 'https://youtube.com.evil.test/watch' },
          { title: 'غير آمن', channel: 'x', url: 'http://www.youtube.com/watch?v=abc' },
          { title: '', channel: 'x', url: 'https://www.youtube.com/watch?v=abc' },
        ],
      },
      meals,
    );

    expect(parsed.videos.map((video) => video.title)).toEqual(['كبسة', 'قصير']);
  });

  test('returns an empty reply for a payload that is not an object', () => {
    expect(parseAssistantReply(null, meals)).toEqual({ reply: '', actions: [], videos: [] });
    expect(parseAssistantReply('hello', meals)).toEqual({ reply: '', actions: [], videos: [] });
  });
});

describe('isYoutubeUrl', () => {
  test('rejects text that is not a URL', () => {
    expect(isYoutubeUrl('youtube')).toBe(false);
  });
});
