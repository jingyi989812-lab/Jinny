/**
 * COACHING LENS — mindset checks and customer objections.
 *
 * Adapted from the MARCOM manager's "CSC Case Study / AI Call Review" tool,
 * which splits every coaching moment into a 思维 (mindset) or 方法 (method)
 * problem and tags the customer's objection so repeats can be counted.
 *
 * Our ICC scorecard already covers 方法. This file adds the two things it does
 * not: the mindset behind the method, and what the customer actually pushed
 * back with. Both are UNSCORED — the score still comes from the ICC framework.
 */
import type { SourceRef } from '@/types/framework';

export const LENS_SOURCE: SourceRef = {
  document: 'PLACEHOLDER',
  note: 'MARCOM manager\'s CSC Case Study tool (思维 Mindset / 方法 Method framework, objection list). Not from the ICC reference documents.',
};

export interface MindsetCheck {
  id: string;
  label: string;
  labelZh: string;
  emoji: string;
  /** What the habit looks like in a call. */
  tell: string;
  /** The direction to move in, as the manager's framework puts it. */
  shift: string;
  coaching: string;
}

/** 思维 Mindset — the habit underneath the technique. */
export const MINDSET_CHECKS: MindsetCheck[] = [
  {
    id: 'price_mindset',
    label: 'Price mindset',
    labelZh: '价格思维',
    emoji: '💸',
    tell: 'The price or promotion came out before the customer\'s need was understood.',
    shift: '价格 → 价值 · price → value',
    coaching: 'Find the concern and what it costs her first; quote the price once it answers something she already told you.',
  },
  {
    id: 'one_shot',
    label: 'One-shot closing',
    labelZh: '一次成交思维',
    emoji: '🎯',
    tell: 'The customer hedged and the call ended with no next step agreed.',
    shift: '一次成交 → 持续 Follow Up · one close → a follow-up rhythm',
    coaching: 'A "let me think" is the start of the follow-up, not the end of the call — agree the next contact before hanging up.',
  },
  {
    id: 'pitch_before_need',
    label: 'Pitching before listening',
    labelZh: '还不知道需求就介绍',
    emoji: '📣',
    tell: 'The treatment was explained before any question about the customer\'s own skin.',
    shift: '一直介绍 → 先了解需求',
    coaching: 'Ask what is bothering her and why it matters to her, then explain only the part that answers it.',
  },
];

export interface ObjectionType {
  id: string;
  label: string;
  labelZh: string;
  emoji: string;
  /** Matched against customer lines only. */
  pattern: RegExp;
  /** What usually works, per the manager's framework. */
  response: string;
}

/** The pushbacks the team actually meets, in the manager's own categories. */
export const OBJECTIONS: ObjectionType[] = [
  {
    id: 'family',
    label: 'Asking for family / family not interested',
    labelZh: '帮家人问 · 家人没兴趣',
    emoji: '👨‍👩‍👧',
    pattern: /(帮|幫)(我)?(家人|妈妈|媽媽|母亲|母親|姐姐|妹妹|朋友|女儿|女兒)(问|問)|我(妈妈|媽媽|姐姐|妹妹|女儿|女兒|朋友)(要|想|没有兴趣|沒有興趣|不要)|for my (mother|mom|mum|sister|friend|daughter)|(家人|她)(没有兴趣|沒有興趣|不要|不想)/i,
    response: 'Speak to the person who will come. Ask who it is for, then offer to explain it to her directly.',
  },
  {
    id: 'skin_safety',
    label: 'Worried it damages / thins the skin',
    labelZh: '担心伤皮肤 · 变薄',
    emoji: '🛡️',
    pattern: /(伤|傷)(到)?(皮肤|皮膚)|(变|變)薄|(皮肤|皮膚).{0,4}(薄|敏感|受(伤|傷))|damage.{0,10}skin|thin(ner)?.{0,10}skin|会不会痛|會不會痛|副作用/i,
    response: 'Name the mechanism — gentle light, no downtime — and let the doctor\'s assessment carry the reassurance.',
  },
  {
    id: 'skincare_enough',
    label: 'Thinks skincare is enough',
    labelZh: '觉得 skincare 就够',
    emoji: '🧴',
    pattern: /(擦|搽|用)(药|藥|护肤|護膚|保养|保養|skincare|cream|产品|產品).{0,8}(就|可以|够|夠)|skincare.{0,10}enough|我(自己)?(有)?(在)?(擦|搽|用).{0,6}(护肤|護膚|保养|保養)/i,
    response: 'Explain what surface products cannot reach — pigment sits deeper — without dismissing what she already does.',
  },
  {
    id: 'price_only',
    label: 'Only asks about price / promo',
    labelZh: '只问价钱 · Promotion',
    emoji: '💰',
    pattern: /(多少(钱|錢)|几多(钱|錢)|價錢|价钱|how much|(有|有没有|有沒有).{0,4}(promo|promotion|优惠|優惠|折扣|discount)|(便宜|平)一(点|點)|cheaper)/i,
    response: 'Answer the number, then move straight back to what she wants fixed — price without value is a comparison game.',
  },
  {
    id: 'think_about_it',
    label: 'Needs to think / ask husband',
    labelZh: '要考虑 · 问老公',
    emoji: '🤔',
    pattern: /(考(虑|慮)|想一想|想想|再看看|再(说|說))|(问|問)(一下)?(我)?(老公|先生|丈夫|家人)|ask my (husband|family)|let me think/i,
    response: 'Ask what specifically she wants to weigh up, then agree a day to follow up — do not leave it open.',
  },
  {
    id: 'no_time',
    label: 'No time / too far',
    labelZh: '没时间 · 太远',
    emoji: '🕒',
    pattern: /(没有|沒有|无|無)(空|时间|時間)|不得(空|闲|閒)|太远|太遠|很远|很遠|路程|塞车|塞車|(busy|no time|too far)/i,
    response: 'Offer two specific slots around her schedule, and name the nearest outlet before she has to ask.',
  },
];
