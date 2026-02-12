import { UploadedFile, HistoryItem, Question } from '../types';

const DB_NAME = 'AprovaJK_DB';
const DB_VERSION = 2; // Incremented version
const STORE_FILES = 'files';
const STORE_HISTORY = 'history';
const STORE_ERRORS = 'errors'; // New store for wrong questions

// Helper to open DB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        db.createObjectStore(STORE_HISTORY, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_ERRORS)) {
        db.createObjectStore(STORE_ERRORS, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const saveFile = async (file: UploadedFile): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_FILES, 'readwrite');
    const store = transaction.objectStore(STORE_FILES);
    // Ensure ID exists
    const fileToSave = { ...file, id: file.name + '-' + Date.now(), dateAdded: Date.now() };
    const request = store.put(fileToSave);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getFiles = async (): Promise<UploadedFile[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_FILES, 'readonly');
    const store = transaction.objectStore(STORE_FILES);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deleteFile = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_FILES, 'readwrite');
    const store = transaction.objectStore(STORE_FILES);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const saveHistory = async (item: Omit<HistoryItem, 'id'>): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_HISTORY, 'readwrite');
    const store = transaction.objectStore(STORE_HISTORY);
    const request = store.add(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getHistory = async (): Promise<HistoryItem[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_HISTORY, 'readonly');
    const store = transaction.objectStore(STORE_HISTORY);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// --- ERROR BANK FUNCTIONS ---

export const saveErrorQuestion = async (question: Question): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_ERRORS, 'readwrite');
    const store = transaction.objectStore(STORE_ERRORS);
    // Use put to avoid duplicates if the same question ID exists (update it)
    const request = store.put(question); 

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getErrorQuestions = async (): Promise<Question[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_ERRORS, 'readonly');
    const store = transaction.objectStore(STORE_ERRORS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const removeErrorQuestion = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_ERRORS, 'readwrite');
    const store = transaction.objectStore(STORE_ERRORS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};