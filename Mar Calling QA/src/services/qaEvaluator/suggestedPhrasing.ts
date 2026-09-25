/**
 * SUGGESTED PHRASING — generated coaching examples.
 *
 * These are NOT quotes from real calls and NOT from the reference documents,
 * except where marked "(CSC Call Template script)". The UI must always label
 * them "Suggested phrasing".
 */
import type { DetectorId } from '@/types/framework';

export const SUGGESTED_PHRASING: Partial<Record<DetectorId, string>> = {
  warm_greeting: 'Hello! Hope you\'re having a lovely day 😊',
  agent_name: 'Hi, this is [Your Name] calling from U.R. Klinik.',
  brand_name: 'Hi, this is [Your Name] calling from U.R. Klinik.',
  call_purpose: "I'm following up on the enquiry you left on our [Facebook] page about [concern].",
  customer_name: 'Hi [Customer name], thank you for taking my call!',
  icebreaker_compliment: 'Thanks for picking up — you sound so cheerful today!',
  connection_recovery: "Ah, the line is finally clear — thank you for your patience! Let's start properly.",
  concern_probe: 'Could you tell me a little about what\'s bothering you most about your skin right now?',
  clarify_vague: 'When you say sensitive, is it more redness, peeling, or stinging?',
  mirror_concern: "So what I'm hearing is that your pores and redness have been bothering you for a while, and nothing has really worked yet.",
  duration_probe: 'How long have you had this problem?',
  previous_treatment: 'What have you tried before, and how did your skin respond?',
  lifestyle: 'What does your daily routine look like — sunscreen, cleanser, and how much time you spend outdoors?',
  emotional_pain: 'How does it affect you day to day — for example when you go out or take photos?',
  ai_skin_analysis: "The first step is our AI Skin Analysis, so we can see exactly what's happening beneath the surface before recommending anything.",
  light_system: 'Our 3-light therapy uses three different lights, each one targeting a different skin need.',
  light_purpose: 'One light calms redness, one targets acne bacteria, and one supports repair — so each works on a different part of your concern.',
  concern_to_solution: 'Because you mentioned redness after lasers, the light therapy is gentle and focuses on calming and repairing first.',
  root_cause: 'When skin goes through many strong treatments, the barrier can weaken — that\'s often why it flushes easily.',
  differentiation_testimonial: 'Many customers with a similar history have seen their redness settle after a few sessions.',
  clinic_experience: "We've been focusing on this concern for many years, so you're in experienced hands.",
  clinic_branches: 'Our nearest outlet to you is [Outlet], so it\'s very convenient.',
  doctor_credibility: 'Our doctor will personally review your AI skin report with you.',
  no_obligation: "You're not committing to anything, just come and let the doctor take a look. (CSC Call Template script)",
  trial_risk_reduction: "The trial is a small first step — you'll see how your skin responds before deciding anything bigger.",
  empathy: "I completely understand — after trying so many things, it's natural to feel unsure.",
  hesitation_incentive: 'I understand! Just so you know, if you book this week you\'ll also receive the free skincare gift — shall I hold a slot for you?',
  promo_deadline: 'This promotion is only available within the next 2 weeks.',
  skincare_gift: "If you book within the promotion period, you'll also receive a free skincare gift to use at home.",
  limited_slots: 'We only have a few trial slots each week, so I\'d love to secure one for you.',
  clear_offer: 'The trial includes the AI Skin Analysis and one session, and you\'ll receive a free skincare gift.',
  availability_probe: 'I have Tuesday at 11am or Thursday at 3pm — which suits you better?',
  two_options: 'I have Tuesday at 11am or Thursday at 3pm — which suits you better?',
  appointment_confirmed: "Great — I've booked you for Thursday at 3pm at our [Outlet]. I'll send you a WhatsApp reminder the day before.",
  recap_next_steps: 'Just arrive 10 minutes early, and I\'ll WhatsApp you the location and a reminder the day before.',
  no_handoff_close: "Let me lock in your slot first, and then I'll ask my senior colleague to prepare for your visit.",
  natural_flow: 'Does that make sense so far? What do you think?',
  confidence: 'Based on what you shared, I recommend starting with the AI Skin Analysis and a trial session.',
};
