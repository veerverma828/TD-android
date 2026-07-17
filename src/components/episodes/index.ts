import type { ComponentType } from 'react';
import { EpisodeLayout } from '@/contexts/SettingsContext';
import { EpisodeSelectorProps } from './types';
import { EpisodeSelectorVerticalRail } from './EpisodeSelectorVerticalRail';
import { EpisodeSelectorNumberedGrid } from './EpisodeSelectorNumberedGrid';
import { EpisodeSelectorCardCarousel } from './EpisodeSelectorCardCarousel';
import { EpisodeSelectorAccordion } from './EpisodeSelectorAccordion';
import { EpisodeSelectorSplitRail } from './EpisodeSelectorSplitRail';

export type { EpisodeSelectorProps } from './types';

export const EPISODE_SELECTORS: Record<EpisodeLayout, ComponentType<EpisodeSelectorProps>> = {
  verticalRail: EpisodeSelectorVerticalRail,
  numberedGrid: EpisodeSelectorNumberedGrid,
  cardCarousel: EpisodeSelectorCardCarousel,
  accordionStack: EpisodeSelectorAccordion,
  splitRail: EpisodeSelectorSplitRail,
};
