export type QuestionAssessment =
  | { kind: 'ok' }
  | { kind: 'close_browser' }
  | { kind: 'choose_topic'; message: string }
  | { kind: 'invalid'; message: string };

const SUPPORT_TOPICS = [
  ['energy and water bills', /\b(energy|electricity|gas|water)\b/i],
  ['free school meals', /\b(free school meals?|school meals?)\b/i],
  ['school uniform costs', /\b(school uniforms?|uniform costs?)\b/i],
  ['childcare costs', /\b(childcare|nursery)\b/i],
  ['Carer’s Allowance', /\bcarer['’]?s allowance\b/i],
  ['Universal Credit', /\b(universal credit|UC)\b/i],
  ['PIP', /\b(PIP|personal independence payment)\b/i],
  ['housing', /\b(rent|housing|mortgage|landlord|evict(?:ion|ed)?|tenan(?:cy|t)|homeless(?:ness)?)\b/i],
  ['Council Tax', /\bcouncil tax\b/i],
  ['debt', /\b(debt|arrears)\b/i],
  ['food costs', /\b(food|groceries)\b/i],
  ['grants', /\bgrants?\b/i],
  ['pensions', /\b(pension|retirement)\b/i],
  ['bereavement', /\b(bereavement|funeral)\b/i],
  ['immigration support', /\b(immigration|asylum|migrant)\b/i],
  ['study support', /\b(student|studying|education)\b/i],
  ['work and unemployment', /\b(unemployment|unemployed|redundancy|job loss|employment|employer|wages?|dismissal|workplace)\b/i],
  ['cost of living', /\bcost of living\b/i],
  ['disability support', /\b(disability|disabled|illness|injury)\b/i],
  ['support for carers', /\b(carer|caring for someone)\b/i],
  ['child benefits', /\b(child benefit|bringing up a child)\b/i],
  ['benefit decisions', /\b(appeal|mandatory reconsideration|benefit decision)\b/i],
  ['adviser services', /\b(adviser|advisor)\b/i],
  ['prison support', /\b(prison|prisoner|on remand)\b/i],
  ['care homes', /\bcare home\b/i],
] as const;

const PERSONAL_DETAILS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b[A-Z]{2}\s?\d{6}\s?[A-D]\b/i,
  /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i,
  /\b(?:\+44\s?7\d{3}|07\d{3})(?:[\s-]?\d){6}\b/,
  /\b(?:\d[\s-]?){13,19}\b/,
  /\bmy\s+(?:password|pin|account number|sort code|address|date of birth)\b/i,
];

export function assessQuestion(input: string): QuestionAssessment {
  const question = input.trim();
  if (!question) {
    return { kind: 'invalid', message: 'Ask one question about the support you want to find.' };
  }
  if (/^(please\s+)?(close|end)\s+(the\s+)?browser[.!]?$/i.test(question)) {
    return { kind: 'close_browser' };
  }
  if (question.length > 600) {
    return { kind: 'invalid', message: 'Please shorten this to one support question.' };
  }
  if (PERSONAL_DETAILS.some((pattern) => pattern.test(question))) {
    return {
      kind: 'invalid',
      message: 'Please remove personal details such as contact information, account numbers or identifiers, then ask one general support question.',
    };
  }
  if (
    /https?:\/\//i.test(question) ||
    /\b(ignore (?:all |previous |system |developer )?instructions|reveal (?:the )?(?:system|developer) prompt|override (?:the )?rules|act as (?:a |an )?different)\b/i.test(question)
  ) {
    return {
      kind: 'invalid',
      message: 'Please ask an advice question in your own words. SupportPath only follows links on Turn2us.',
    };
  }

  const matchedTopics = SUPPORT_TOPICS
    .filter(([, pattern]) => pattern.test(question))
    .map(([topic]) => topic);
  const topics = matchedTopics
    .filter((topic) => !(
      (topic === 'support for carers' && matchedTopics.includes('Carer’s Allowance')) ||
      (topic === 'disability support' && matchedTopics.includes('PIP')) ||
      (topic === 'grants' && matchedTopics.length > 1) ||
      (topic === 'cost of living' && matchedTopics.length > 1) ||
      (topic === 'adviser services' && matchedTopics.length > 1) ||
      (topic === 'benefit decisions' && matchedTopics.length > 1)
    ));

  const separateRequests = /\b(?:and|also|plus|then)\s+(?:(?:please|can you)\s+)?(?:what|who|where|when|why|how|can|could|do|does|is|are|will|would|should|find|tell|explain|check|compare|look)\b/i.test(question);
  if ((question.match(/\?/g)?.length ?? 0) > 1 || topics.length > 1 || separateRequests) {
    return {
      kind: 'choose_topic',
      message: topics.length > 1
        ? 'You mentioned more than one topic. Which would you like to explore first?'
        : 'You asked more than one question. Which would you like to explore first?',
    };
  }
  if (topics.length === 0) {
    const supportIntent = /\b(turn2us|benefits?|grants?|support|financial|money|costs?|bills?|payments?|claims?|allowance|advice)\b/i.test(question);
    const tooBroad = /^i\s+need\s+help[.!?]?$/i.test(question);
    if (supportIntent && !tooBroad) return { kind: 'ok' };
    return {
      kind: 'invalid',
      message: tooBroad
        ? 'Please name one benefit or support need you want to explore first.'
        : 'SupportPath can help find financial support information on Turn2us. Ask about one need, such as benefits, rent, debt or energy bills.',
    };
  }
  return { kind: 'ok' };
}
