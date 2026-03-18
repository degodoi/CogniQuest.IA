import { get, set } from 'idb-keyval';
import { HistoryItem } from '../types';

const HISTORY_KEY = 'cogniquest_history_db';

export const getHistory = async (): Promise<HistoryItem[]> => {
  try {
    const history = await get<HistoryItem[]>(HISTORY_KEY);
    return history || [];
  } catch (error) {
    console.error("Error reading history from IndexedDB:", error);
    return [];
  }
};

export const saveHistoryItem = async (item: HistoryItem): Promise<void> => {
  try {
    const history = await getHistory();
    const updatedHistory = [item, ...history];
    await set(HISTORY_KEY, updatedHistory);
  } catch (error) {
    console.error("Error saving history to IndexedDB:", error);
  }
};

export const clearHistory = async (): Promise<void> => {
  try {
    await set(HISTORY_KEY, []);
  } catch (error) {
    console.error("Error clearing history in IndexedDB:", error);
  }
};
