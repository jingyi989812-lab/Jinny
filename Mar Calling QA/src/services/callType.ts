/**
 * Estimates the call type from transcript cues. Always labelled "estimated";
 * a QA reviewer can correct it on the report. Defaults to "new lead" (the
 * call type the ICC reference reports evaluate) when no cue is found.
 */
import type { CallType } from '@/types/framework';
import { parseTranscript } from './qaEvaluator/transcriptParser';

const EXISTING =
  /(第[二三四五六七八九十幾几\d]+次(的)?(護理|护理|療程|疗程|treatment|session)?|(second|third|next|remaining) (session|treatment)|還有幾次|还有几次|上次(做|來|来)(的)?(護理|护理|療程|疗程)|last (session|treatment|visit)|你(已經|已经)(做|來|来)過|continue (your )?treatment|(package|配套).{0,6}(balance|remaining|剩)|會員|会员)/i;
const FOLLOW_UP =
  /(上次(跟你|和你|打給你|打给你|講|讲|說|说)|你上次(說|说|講|讲)|I (called|spoke to|talked to) you (before|last)|we spoke (before|last)|last time (we|I) (called|spoke|talked)|you said you (will|would|want to) (think|consider|check)|remind(er)? (you )?(about|of) (your )?appointment|提醒你.{0,6}(預約|预约|appointment)|confirm your appointment|確認你的預約|确认你的预约|再打給你|再打给你|又打給你|又打给你|(幫你|帮你|有)?保留.{0,8}(skin ?c|set|套)|(postpone|reschedule|改期).{0,20}(appointment|預約|预约)?|(appointment|預約|预约).{0,12}(postpone|reschedule|改期))/i;

export interface CallTypeEstimate {
  callType: CallType;
  reason: string;
}

export function estimateCallType(transcript: string): CallTypeEstimate {
  const { lines } = parseTranscript(transcript);
  const hit = (re: RegExp) => lines.find((l) => re.test(l.text));
  const quote = (t: string) => (t.length > 80 ? `${t.slice(0, 77)}…` : t);
  const existing = hit(EXISTING);
  if (existing) return { callType: 'existing_customer', reason: `Estimated from: “${quote(existing.text)}”` };
  const follow = hit(FOLLOW_UP);
  if (follow) return { callType: 'follow_up', reason: `Estimated from: “${quote(follow.text)}”` };
  return { callType: 'new_lead', reason: 'No follow-up or existing-customer cues found — treated as a new lead call.' };
}
