/**
 * Organisation-level lists used by forms and filters.
 * The ICC 秘籍 playbook lists the clinic regions as Penang, JB and KL. Individual
 * outlet names (e.g. "BM", SS2, Puchong) are not listed in any document yet.
 */
export const BRAND = {
  name: 'UR KLINIK',
  product: 'MARCOM QA',
  appName: 'MARCOM Calling QA',
  headline: 'Every Call Creates a Brighter Tomorrow',
  tagline: 'Listen • Learn • Improve • Grow',
  secondary: ['Better conversations.', 'Better customer experiences.', 'Better people.'],
};

export const OUTLETS = ['Penang', 'Kuala Lumpur', 'Johor Bahru', 'BM'];
export const OUTLETS_ARE_PLACEHOLDER = true;

export const LEAD_SOURCES = ['Facebook Ads', 'Instagram Ads', 'Website Form', 'TikTok', 'Referral'];
export const LANGUAGES = ['English', 'Mandarin', 'Cantonese', 'Malay', 'Mixed (EN / 中文)', 'Mixed (EN / BM)'];
export const REVIEWERS = ['MARCOM QA Lead', 'CSC Supervisor', 'Management'];

/** "Today" for the prototype. Real deployments use the system clock. */
export const TODAY_ISO = new Date().toISOString().slice(0, 10);
