export interface Artisan {
  id: string;
  name: string;
  age: number;
  location: string;
  state: string;
  craft_specialization: string;
  craft_role: string;
  experience: string;
  impact_statement: string;
  image: string;
  background_story: string;
  motivation: string;
  dream: string;
  craft_details: string;
  materials: string;
  making_time: string;
  eco_friendly_practices: string;
  hub: string;
  message: string;
  favorite_quote: string;
  fun_fact: string;
  contact?: string;
}

import artisansData from './artisans.json';
export const ALL_ARTISANS: Artisan[] = artisansData as Artisan[];
