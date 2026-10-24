// Starter routines for first-run setup. Generic step names, no products: people add their own.
import type { Step } from '@/db/types';

type Seed = Omit<Step, 'id' | 'product'> & { product?: string };

export type StarterId = 'simple' | 'classic' | 'full';

export const STARTERS: { id: StarterId; name: string; blurb: string; steps: Seed[] }[] = [
  {
    id: 'simple',
    name: 'Simple',
    blurb: 'The basics that make the biggest difference: cleanse, moisturise, sunscreen, water.',
    steps: [
      { slot: 'am', name: 'Brush teeth', note: '2 minutes', on: 'every', essential: true },
      { slot: 'am', name: 'Face wash', note: 'Lukewarm water, pat dry', on: 'every', essential: true },
      { slot: 'am', name: 'Moisturiser', note: 'Pea-sized amount', on: 'every' },
      {
        slot: 'am',
        name: 'Sunscreen',
        note: 'SPF 30+, two finger lengths for face and neck',
        on: 'every',
        essential: true,
      },
      { slot: 'pm', name: 'Brush teeth', note: '2 minutes', on: 'every', essential: true },
      { slot: 'pm', name: 'Face wash', note: 'Take off sunscreen and the day', on: 'every', essential: true },
      { slot: 'pm', name: 'Moisturiser', note: 'A little more than the morning', on: 'every' },
      {
        slot: 'health',
        name: 'Water',
        note: 'Spread through the day',
        on: 'every',
        type: 'water',
        goal: 2500,
        essential: true,
      },
    ],
  },
  {
    id: 'classic',
    name: 'Classic',
    blurb: 'A full morning and night, hair washing on wash days and gentle exfoliation after.',
    steps: [
      { slot: 'am', name: 'Brush teeth', note: '2 minutes', on: 'every', essential: true },
      { slot: 'am', name: 'Face wash', note: 'Lukewarm water, pat dry', on: 'every', essential: true },
      { slot: 'am', name: 'Vitamin C serum', note: 'A few drops before moisturiser', on: 'every' },
      { slot: 'am', name: 'Moisturiser', note: 'Pea-sized amount', on: 'every' },
      {
        slot: 'am',
        name: 'Face sunscreen',
        note: 'SPF 30+, last step, reapply outdoors every 2 h',
        on: 'every',
        essential: true,
      },
      { slot: 'am', name: 'Deodorant', note: '', on: 'every', essential: true },
      { slot: 'pm', name: 'Brush teeth', note: '2 minutes', on: 'every', essential: true },
      { slot: 'pm', name: 'Shower', note: '', on: 'every', essential: true },
      { slot: 'pm', name: 'Shampoo', note: 'Massage the scalp, rinse well', on: 'shampoo' },
      { slot: 'pm', name: 'Conditioner', note: 'Mid-lengths to ends', on: 'shampoo' },
      { slot: 'pm', name: 'Face wash', note: 'Take off sunscreen and the day', on: 'every', essential: true },
      { slot: 'pm', name: 'Face exfoliant', note: 'AHA/BHA, skip if skin is irritated', on: 'exfoliate' },
      { slot: 'pm', name: 'Moisturiser', note: 'A little more than the morning', on: 'every' },
      { slot: 'pm', name: 'Lip balm', note: '', on: 'every' },
      {
        slot: 'health',
        name: 'Water',
        note: 'Spread through the day',
        on: 'every',
        type: 'water',
        goal: 2500,
        essential: true,
      },
      { slot: 'health', name: 'Multivitamin', note: 'With food', on: 'every' },
    ],
  },
  {
    id: 'full',
    name: 'Full',
    blurb: 'Everything: face, body and hair care, plus sun protection for the body.',
    steps: [
      { slot: 'am', name: 'Brush teeth', note: '2 minutes', on: 'every', essential: true },
      { slot: 'am', name: 'Face wash', note: 'Lukewarm water, pat dry', on: 'every', essential: true },
      { slot: 'am', name: 'Vitamin C serum', note: 'A few drops before moisturiser', on: 'every' },
      { slot: 'am', name: 'Eye cream', note: 'Ring finger, gentle taps', on: 'every' },
      { slot: 'am', name: 'Moisturiser', note: 'Pea-sized amount', on: 'every' },
      {
        slot: 'am',
        name: 'Face sunscreen',
        note: 'SPF 30+, last step, reapply outdoors every 2 h',
        on: 'every',
        essential: true,
      },
      { slot: 'am', name: 'Body sunscreen', note: 'Arms, neck and anything the sun sees', on: 'every' },
      { slot: 'am', name: 'Deodorant', note: '', on: 'every', essential: true },
      { slot: 'am', name: 'Hair styling', note: '', on: 'every' },
      { slot: 'pm', name: 'Brush teeth', note: '2 minutes', on: 'every', essential: true },
      { slot: 'pm', name: 'Floss', note: '', on: 'every' },
      { slot: 'pm', name: 'Shower', note: '', on: 'every', essential: true },
      { slot: 'pm', name: 'Shampoo', note: 'Massage the scalp, rinse well', on: 'shampoo' },
      { slot: 'pm', name: 'Conditioner', note: 'Mid-lengths to ends', on: 'shampoo' },
      { slot: 'pm', name: 'Body exfoliant', note: 'Elbows, knees and rough spots', on: 'exfoliate' },
      { slot: 'pm', name: 'Face wash', note: 'Take off sunscreen and the day', on: 'every', essential: true },
      { slot: 'pm', name: 'Face exfoliant', note: 'AHA/BHA, skip if skin is irritated', on: 'exfoliate' },
      { slot: 'pm', name: 'Moisturiser', note: 'A little more than the morning', on: 'every' },
      { slot: 'pm', name: 'Body lotion', note: 'Right after the shower', on: 'every' },
      { slot: 'pm', name: 'Hair oil', note: 'A few drops on the ends', on: 'shampoo' },
      { slot: 'pm', name: 'Lip balm', note: '', on: 'every' },
      {
        slot: 'health',
        name: 'Water',
        note: 'Spread through the day',
        on: 'every',
        type: 'water',
        goal: 3000,
        essential: true,
      },
      { slot: 'health', name: 'Multivitamin', note: 'With food', on: 'every' },
      { slot: 'health', name: 'Vitamin D', note: 'With your biggest meal', on: 'every' },
    ],
  },
];

/** Fresh step list with new ids. */
export const starterSteps = (id: StarterId): Step[] =>
  STARTERS.find((x) => x.id === id)!.steps.map((x) => ({
    ...x,
    product: x.product ?? '',
    id: 's' + Math.random().toString(36).slice(2, 9),
  }));
