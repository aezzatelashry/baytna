import { describe, expect, test } from 'vitest';

import { cookIdeas, isOnHand, wordsOnHand, type Cookable } from './cook';

function dish(id: string, names: string[]): Cookable {
  return { id, name: id, ingredients: names.map((name) => ({ name, qty: 1, unit: '', category: 'produce' as const })) };
}

const dishes = [
  dish('شكشوكة', ['بيض', 'طماطم', 'بصل', 'خبز']),
  dish('بيض وجبنة', ['بيض', 'جبنة بيضاء', 'خبز']),
  dish('كبسة', ['دجاج', 'أرز', 'بصل', 'طماطم']),
  dish('سلطة فواكه', ['موز', 'تفاح', 'برتقال']),
];

describe('wordsOnHand', () => {
  test('reads a typed list with Arabic or Latin commas and new lines', () => {
    const words = wordsOnHand('بيض، طماطم,\nجبنة');

    expect([...words]).toEqual(['بيض', 'طماطم', 'جبنة']);
  });

  test('reads a spoken sentence joined with "و"', () => {
    const words = wordsOnHand('عندي بيض وطماطم وجبنة ورز');

    expect(words.has('طماطم')).toBe(true);
    expect(words.has('جبنة')).toBe(true);
    expect(words.has('رز')).toBe(true);
  });

  test('keeps a word that really starts with "و", like ورق عنب', () => {
    expect(wordsOnHand('ورق عنب').has('ورق')).toBe(true);
  });

  test('is empty for blank input', () => {
    expect(wordsOnHand('  \n ').size).toBe(0);
  });
});

describe('isOnHand', () => {
  test('matches on the main word, so cheese covers white cheese', () => {
    const onHand = wordsOnHand('جبنة');

    expect(isOnHand('جبنة بيضاء', onHand)).toBe(true);
    expect(isOnHand('بيض', onHand)).toBe(false);
  });
});

describe('cookIdeas', () => {
  test('puts what can be cooked now first, then what is short of one thing', () => {
    const ideas = cookIdeas('بيض وجبنة وخبز وطماطم', dishes);

    expect(ideas.map((idea) => idea.dish.id)).toEqual(['بيض وجبنة', 'شكشوكة']);
    expect(ideas[0].missing).toEqual([]);
    expect(ideas[1].missing).toEqual(['بصل']);
  });

  test('leaves out dishes short of more than two things or with nothing on hand', () => {
    const ideas = cookIdeas('بيض', dishes);

    expect(ideas.map((idea) => idea.dish.id)).toEqual(['بيض وجبنة']);
    expect(ideas[0].missing).toEqual(['جبنة بيضاء', 'خبز']);
  });

  test('suggests nothing when nothing was said', () => {
    expect(cookIdeas('', dishes)).toEqual([]);
  });

  test('between two ready dishes, prefers the one that uses more of what is there', () => {
    const ready = [dish('صغيرة', ['بيض']), dish('كبيرة', ['بيض', 'خبز', 'طماطم'])];

    expect(cookIdeas('بيض، خبز، طماطم', ready).map((idea) => idea.dish.id)).toEqual(['كبيرة', 'صغيرة']);
  });
});
