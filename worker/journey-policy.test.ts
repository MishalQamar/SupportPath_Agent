import { describe, expect, it } from 'vitest';
import {
  FEATURED_PAGE_PATH,
  FEATURED_QUESTION,
  canAgentNavigate,
  canAgentRead,
  isAllowedTurn2usUrl,
  isFeaturedDestination,
  isFeaturedQuestion,
  isNextFeaturedDestination,
  requiresTakeover,
} from './journey-policy';

describe('featured demo journey', () => {
  it('recognises only the focused example and stops on its exact destination', () => {
    expect(isFeaturedQuestion(`  ${FEATURED_QUESTION}  `)).toBe(true);
    expect(isFeaturedQuestion('Where can I find information about Carer’s Allowance?')).toBe(false);
    expect(isFeaturedDestination(`https://www.turn2us.org.uk${FEATURED_PAGE_PATH}/`)).toBe(true);
    expect(isFeaturedDestination('https://www.turn2us.org.uk/get-support/information-for-your-situation/carer/')).toBe(false);
  });

  it('only permits the next link in the verified three-step route', () => {
    const origin = 'https://www.turn2us.org.uk';
    const route = [
      '/get-support/information-for-your-situation',
      '/get-support/information-for-your-situation/carer',
      FEATURED_PAGE_PATH,
    ];
    route.forEach((path, hop) => {
      expect(isNextFeaturedDestination(`${origin}${path}/`, hop)).toBe(true);
      expect(isNextFeaturedDestination(`${origin}${path}/`, hop + 1)).toBe(false);
    });
    expect(isNextFeaturedDestination(`https://turn2us.org.uk.evil.test${FEATURED_PAGE_PATH}`, 2)).toBe(false);
  });
});

describe('browser boundaries', () => {
  it('accepts only HTTPS Turn2us URLs', () => {
    expect(isAllowedTurn2usUrl('https://www.turn2us.org.uk/get-support/')).toBe(true);
    expect(isAllowedTurn2usUrl('https://benefits-calculator.turn2us.org.uk/')).toBe(true);
    expect(isAllowedTurn2usUrl('http://www.turn2us.org.uk/')).toBe(false);
    expect(isAllowedTurn2usUrl('https://turn2us.org.uk.evil.test/')).toBe(false);
    expect(isAllowedTurn2usUrl('https://www.citizensadvice.org.uk/')).toBe(false);
  });

  it('blocks navigation after finding the page and all reading during handoff', () => {
    expect(canAgentNavigate('navigating')).toBe(true);
    expect(canAgentNavigate('found')).toBe(false);
    expect(canAgentRead('found')).toBe(true);
    expect(canAgentNavigate('awaiting_takeover')).toBe(false);
    expect(canAgentRead('awaiting_takeover')).toBe(false);
    expect(canAgentNavigate('user_in_control')).toBe(false);
    expect(canAgentRead('user_in_control')).toBe(false);
  });

  it('ignores ordinary site controls but detects interactive support tools and private fields', () => {
    const article = `https://www.turn2us.org.uk${FEATURED_PAGE_PATH}`;
    expect(requiresTakeover(article, [
      { type: 'search', label: 'Search Turn2us', context: 'Search Turn2us' },
      { type: 'email', label: 'Email', context: 'Report a problem with this page' },
    ])).toBe(false);
    expect(requiresTakeover(article, [
      { type: 'text', label: 'National Insurance number', context: 'Benefits application' },
    ])).toBe(true);
    expect(requiresTakeover('https://benefits-calculator.turn2us.org.uk/', [])).toBe(true);
  });
});
