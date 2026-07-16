import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

import { MetaItem } from '@/services/cinemeta';

const MY_LIST_KEY = 'my_list_items';

interface MyListContextValue {
  list: MetaItem[];
  loaded: boolean;
  isInList: (id: string, type: string) => boolean;
  toggle: (item: MetaItem) => void;
}

const MyListContext = createContext<MyListContextValue>({
  list: [],
  loaded: false,
  isInList: () => false,
  toggle: () => {},
});

const keyFor = (id: string, type: string) => `${type}:${id}`;

export function MyListProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<MetaItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(MY_LIST_KEY).then((raw) => {
      if (raw) {
        try {
          setList(JSON.parse(raw));
        } catch {
          // ignore corrupt storage
        }
      }
      setLoaded(true);
    });
  }, []);

  const isInList = useCallback(
    (id: string, type: string) => list.some((i) => keyFor(i.id, i.type) === keyFor(id, type)),
    [list]
  );

  const toggle = useCallback((item: MetaItem) => {
    setList((prev) => {
      const exists = prev.some((i) => keyFor(i.id, i.type) === keyFor(item.id, item.type));
      const next = exists
        ? prev.filter((i) => keyFor(i.id, i.type) !== keyFor(item.id, item.type))
        : [item, ...prev];
      AsyncStorage.setItem(MY_LIST_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return (
    <MyListContext.Provider value={{ list, loaded, isInList, toggle }}>
      {children}
    </MyListContext.Provider>
  );
}

export function useMyList() {
  return useContext(MyListContext);
}
