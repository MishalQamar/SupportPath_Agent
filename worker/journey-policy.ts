export const FEATURED_QUESTION =
  'Find the Turn2us page explaining what Carer’s Allowance is. Stop on that page and show me its URL and the route you took.';

export const FEATURED_PAGE_PATH =
  '/get-support/information-for-your-situation/carer-s-allowance/what-is-carer-s-allowance';

export const FEATURED_ROUTE_PATHS = [
  '/get-support/information-for-your-situation',
  '/get-support/information-for-your-situation/carer',
  FEATURED_PAGE_PATH,
] as const;

export type JourneyStatus =
  | 'idle'
  | 'navigating'
  | 'found'
  | 'awaiting_takeover'
  | 'user_in_control'
  | 'complete'
  | 'error';

export type FormControl = {
  type: string;
  label: string;
  context: string;
};

export function isAllowedTurn2usUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'turn2us.org.uk' || url.hostname.endsWith('.turn2us.org.uk'))
    );
  } catch {
    return false;
  }
}

export function canAgentNavigate(status: JourneyStatus): boolean {
  return status === 'navigating';
}

export function canAgentRead(status: JourneyStatus): boolean {
  return status === 'navigating' || status === 'found';
}

export function isFeaturedQuestion(question: string): boolean {
  return question.trim().replace(/\s+/g, ' ') === FEATURED_QUESTION;
}

export function isFeaturedDestination(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'turn2us.org.uk' || url.hostname === 'www.turn2us.org.uk') &&
      url.pathname.replace(/\/$/, '').toLowerCase() === FEATURED_PAGE_PATH
    );
  } catch {
    return false;
  }
}

export function isNextFeaturedDestination(urlString: string, hopCount: number): boolean {
  try {
    const url = new URL(urlString);
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'turn2us.org.uk' || url.hostname === 'www.turn2us.org.uk') &&
      url.pathname.replace(/\/$/, '').toLowerCase() === FEATURED_ROUTE_PATHS[hopCount]
    );
  } catch {
    return false;
  }
}

export function requiresTakeover(
  urlString: string,
  controls: FormControl[],
): boolean {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return false;
  }

  if (
    /^(benefits-calculator|grants-search|pip)\.turn2us\.org\.uk$/i.test(url.hostname) ||
    /\/(calculator|grants-search|pip-helper|apply|application|sign-in|login|register)(\/|$)/i.test(url.pathname)
  ) {
    return true;
  }

  const ordinarySiteControls =
    /search|feedback|report a problem|tell us the problem|what would you like to report|newsletter|sign up|subscribe|cookie|was this page helpful/i;
  const privateField =
    /national insurance|date of birth|postcode|post code|income|earnings|savings|bank|account number|password|address|phone|medical|health condition/i;

  return controls.some(({ type, label, context }) => {
    if (ordinarySiteControls.test(context)) return false;
    if (/postcode|post code/i.test(label) && /search|find|local|town/i.test(`${label} ${context}`)) return false;
    if (type === 'password') return true;
    return privateField.test(label);
  });
}
