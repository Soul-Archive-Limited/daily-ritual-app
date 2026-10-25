// Free, private AI features on Apple's on-device model. Nothing leaves the device.
import { errorCode, isAvailable, respond, type UnavailableReason } from 'on-device-ai';
import { useEffect, useState } from 'react';

import type { Review } from '@/db/types';

/** Every request starts with these: skincare only, short, never medical advice. */
const RULES = `You are the coach inside Daily Ritual, an app for a personal skincare, haircare, sun protection, hydration and wellbeing routine.
Only help with those topics and with the person's own routine, products and logs shown to you.
If asked about anything else, reply in one sentence that you can only help with their routine.
Be warm, specific and brief. Use their own step and product names. Plain sentences or short dash bullets, no headings, no markdown.
Never diagnose. For anything that sounds medical (a rash that won't settle, pain, an infection, sudden changes), suggest seeing a dermatologist or doctor in one short line.
Do not invent product facts you are unsure of.`;

/** True when Apple Intelligence can answer on this device; AI buttons are hidden otherwise. */
export function useOnDeviceAI() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    isAvailable()
      .then((a) => setOk(a.available))
      .catch(() => setOk(false));
  }, []);
  return ok;
}

/** Whether Apple Intelligence can answer here, and if not, why (for the Ask Lune screen). */
export function useAIStatus() {
  const [st, setSt] = useState<{ checked: boolean; ok: boolean; reason?: UnavailableReason }>({ checked: false, ok: false });
  useEffect(() => {
    isAvailable()
      .then((a) => setSt({ checked: true, ok: a.available, reason: a.reason }))
      .catch(() => setSt({ checked: true, ok: false, reason: 'unknown' }));
  }, []);
  return st;
}

/** What to do when Apple Intelligence can't answer on this phone. */
export function unavailableText(reason?: UnavailableReason) {
  switch (reason) {
    case 'osTooOld':
      return 'Asking me needs iOS 26 or later. Update your iPhone in Settings › General › Software Update.';
    case 'deviceNotEligible':
      return 'Asking me needs an iPhone that runs Apple Intelligence (iPhone 15 Pro or newer). Everything else in the app works the same.';
    case 'appleIntelligenceNotEnabled':
      return 'Turn on Apple Intelligence in Settings › Apple Intelligence & Siri, then come back. It’s free and stays on your phone.';
    case 'modelNotReady':
      return 'Apple Intelligence is still downloading to your iPhone. Keep it on Wi-Fi and charging, then try again soon.';
    default:
      return 'Apple Intelligence isn’t available on this iPhone right now.';
  }
}

/** A friendly sentence for a failed request. */
export function aiErrorText(e: unknown) {
  switch (errorCode(e)) {
    case 'unavailable':
      return 'Apple Intelligence isn’t available right now. Check it’s turned on in Settings.';
    case 'guardrailViolation':
      return 'I can only help with your routine, skin, hair and health habits.';
    case 'exceededContextWindowSize':
      return 'That was too much to read at once. Try a shorter question.';
    case 'cancelled':
      return '';
    default:
      return 'Couldn’t get an answer. Try again.';
  }
}

/** Answer a question about the person's own routine. */
export const askCoach = (context: string, question: string) =>
  respond({
    instructions: RULES,
    prompt: `Their data:\n${context}\n\nQuestion: ${question.trim().slice(0, 500)}\n\nAnswer in under 120 words.`,
    maxTokens: 300,
    temperature: 0.4,
  });

/** Three short bullets about this month's usual weather and what to adjust. */
export const climateTips = (place: string, month: string, routine: string) =>
  respond({
    instructions: RULES,
    prompt: `In 3 short dash bullets (under 60 words in total), describe the usual weather in ${place} in ${month} (heat, humidity, rain, dryness) and what to adjust in this routine because of it. If you are not sure about the climate there, say so briefly and give general advice.\nRoutine: ${routine}`,
    maxTokens: 160,
    temperature: 0.3,
  });

/** This week's review, written into the reviews table. */
export async function weeklyReview(context: string, week: string): Promise<Review> {
  const text = await respond({
    instructions: RULES,
    prompt: `Write a short weekly review of this routine for the week starting ${week}. Compare with the week before where useful.\n\n${context}\n\nReply with exactly these lines and nothing else:\nHEADLINE: one sentence\nWELL: up to 3 short items separated by " ; "\nSLIPPED: up to 3 short items separated by " ; "\nSKIN: one sentence or "-"\nBODY: one sentence or "-"\nFOCUS: one concrete thing to focus on next week`,
    maxTokens: 400,
    temperature: 0.3,
  });
  const get = (k: string) => (text.match(new RegExp(`^\\s*${k}:\\s*(.+)$`, 'im'))?.[1] ?? '').trim().replace(/^-$/, '');
  const list = (k: string) =>
    get(k)
      .split(/\s*;\s*/)
      .map((x) => x.replace(/^[-•]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 3);
  return {
    week,
    at: Date.now(),
    headline: get('HEADLINE').slice(0, 240) || text.trim().split('\n')[0].slice(0, 240),
    wins: list('WELL'),
    slips: list('SLIPPED'),
    skin: get('SKIN').slice(0, 240),
    body: get('BODY').slice(0, 240),
    focus: get('FOCUS').slice(0, 200),
  };
}

export type ProductGuess = {
  step: string;
  slot: 'am' | 'pm' | 'health';
  when: 'every' | 'shampoo' | 'optional';
  tip: string;
};

/** Suggest where a new product fits. The person confirms before anything changes. */
export async function placeProduct(name: string, routine: string): Promise<ProductGuess | null> {
  const text = await respond({
    instructions: RULES,
    prompt: `A product called "${name.slice(0, 120)}" is being added. Based only on its name, suggest where it fits in this routine.\nRoutine: ${routine}\n\nReply with exactly these lines:\nSTEP: short step name (e.g. Face sunscreen)\nROUTINE: morning, night or health\nWHEN: every day, wash days or only if needed\nTIP: one short how-to or clash warning`,
    maxTokens: 120,
    temperature: 0.2,
  });
  const get = (k: string) => (text.match(new RegExp(`^\\s*${k}:\\s*(.+)$`, 'im'))?.[1] ?? '').trim();
  const r = get('ROUTINE').toLowerCase();
  const w = get('WHEN').toLowerCase();
  const step = get('STEP');
  if (!step) return null;
  return {
    step: step.slice(0, 40),
    slot: r.startsWith('night') ? 'pm' : r.startsWith('health') ? 'health' : 'am',
    when: w.startsWith('wash') ? 'shampoo' : w.startsWith('only') ? 'optional' : 'every',
    tip: get('TIP').slice(0, 160),
  };
}
