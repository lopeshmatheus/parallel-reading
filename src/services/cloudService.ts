import { db, storage } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getDB } from './storageService';

export interface CloudBookMetadata {
  id: string;
  title: string;
  storagePath: string;
  isCloudOnly: boolean;
}

export const uploadBookToCloud = async (file: File, userId: string, bookId: string, title: string): Promise<void> => {
  const storagePath = `users/${userId}/books/${bookId}.epub`;
  const storageRef = ref(storage, storagePath);
  
  // Upload to Firebase Storage
  await uploadBytes(storageRef, file);

  // Save metadata to Firestore
  const bookDocRef = doc(db, `users/${userId}/books`, bookId);
  await setDoc(bookDocRef, {
    id: bookId,
    title,
    storagePath,
    isCloudOnly: true
  });
};

export const getUserCloudBooks = async (userId: string): Promise<CloudBookMetadata[]> => {
  const booksRef = collection(db, `users/${userId}/books`);
  const snapshot = await getDocs(booksRef);
  return snapshot.docs.map(doc => doc.data() as CloudBookMetadata);
};

export const downloadBookFromCloud = async (storagePath: string): Promise<Blob> => {
  const storageRef = ref(storage, storagePath);
  const url = await getDownloadURL(storageRef);
  const response = await fetch(url);
  return await response.blob();
};

export const deleteBookFromCloud = async (userId: string, bookId: string): Promise<void> => {
  const bookDocRef = doc(db, `users/${userId}/books`, bookId);
  const bookDoc = await getDoc(bookDocRef);
  
  if (bookDoc.exists()) {
    const data = bookDoc.data() as CloudBookMetadata;
    // Delete from Storage
    if (data.storagePath) {
       const storageRef = ref(storage, data.storagePath);
       // catch error in case storage file was already deleted
       await deleteObject(storageRef).catch(console.error);
    }
  }
  
  // Delete from Firestore
  await deleteDoc(bookDocRef);
};

// -- Translations Syncing --

// Simple hash implementation for translation doc IDs
const hashCode = (str: string): string => {
  let hash = 0, i, chr;
  if (str.length === 0) return "0";
  for (i = 0; i < str.length; i++) {
    chr   = str.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(16);
};

export const syncTranslationToCloud = async (userId: string, original: string, translated: string, lang: string): Promise<void> => {
  const docId = hashCode(original);
  const translationRef = doc(db, `users/${userId}/translations`, docId);
  await setDoc(translationRef, {
    original,
    translated,
    lang,
    updatedAt: new Date().toISOString()
  }, { merge: true }).catch(console.error); // Do not await hard so it doesn't block UI
};

export const fetchCloudTranslations = async (userId: string): Promise<void> => {
  try {
    const translationsRef = collection(db, `users/${userId}/translations`);
    const snapshot = await getDocs(translationsRef);
    const localDb = await getDB();
    
    // Batch upsert to IndexedDB
    const tx = localDb.transaction('translations', 'readwrite');
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.original && data.translated && data.lang) {
        await tx.store.put({
          original: data.original,
          translated: data.translated,
          lang: data.lang
        });
      }
    }
    await tx.done;
    console.log(`Synced ${snapshot.docs.length} translations from cloud.`);
  } catch (error) {
    console.error('Failed to sync translations from cloud', error);
  }
};
