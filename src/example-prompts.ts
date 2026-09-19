import { FEATURED_QUESTION } from '../worker/journey-policy';

export const EXAMPLE_PROMPTS = [
  {
    title: 'What is Carer’s Allowance?',
    description: 'Understand one benefit',
    icon: 'heart',
    prompt: FEATURED_QUESTION,
  },

  {
    title: 'Free school meals',
    description: 'Explore help with school costs',
    icon: 'family',
    prompt:
      'Find a Turn2us page about free school meals. Stop on the first relevant page.',
  },
  {
    title: 'Help with rent',
    description: 'Explore housing support',
    icon: 'wallet',
    prompt:
      'Find a Turn2us page about help with rent. Stop on the first relevant page.',
  },
] as const;
