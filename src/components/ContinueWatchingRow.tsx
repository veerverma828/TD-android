import { Carousel } from './Carousel';
import { ContinueWatchingItem } from '@/hooks/useContinueWatching';
import { CONTINUE_WATCHING_SOURCE_COLORS } from '@/constants/continueWatching';

interface ContinueWatchingRowProps {
  items: ContinueWatchingItem[];
  onPressItem: (item: ContinueWatchingItem) => void;
  onLongPressItem: (item: ContinueWatchingItem) => void;
}

export function ContinueWatchingRow({ items, onPressItem, onLongPressItem }: ContinueWatchingRowProps) {
  const itemById = new Map(items.map((item) => [item.contentId, item]));

  const data = items.map((item) => {
    const episodeLabel = item.season != null && item.episode != null ? `S${item.season} E${item.episode}` : undefined;
    return {
      id: item.contentId,
      title: item.title,
      subtitle: item.isNext ? [episodeLabel, 'Next episode'].filter(Boolean).join(' · ') : episodeLabel,
      imageUrl: item.poster || '',
      // Synthesized "next episode" cards have no real watch progress — an empty
      // bar would read as a bug, so omit it entirely rather than show 0%.
      progress: item.isNext ? undefined : item.progress,
    };
  });

  return (
    <Carousel
      title="Continue Watching"
      data={data}
      getProgressColor={(carouselItem) => {
        const item = itemById.get(carouselItem.id);
        return item ? CONTINUE_WATCHING_SOURCE_COLORS[item.source] : undefined;
      }}
      onPressItem={(carouselItem) => {
        const item = itemById.get(carouselItem.id);
        if (item) onPressItem(item);
      }}
      onLongPressItem={(carouselItem) => {
        const item = itemById.get(carouselItem.id);
        if (item) onLongPressItem(item);
      }}
    />
  );
}
