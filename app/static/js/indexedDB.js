// ==============================
// indexedDB.js
// ==============================
const DB_NAME = 'destajos-db';
const DB_VERSION = 1; // si cambias estructuras, sube este número
export const STORE_QUEUE = 'queue';
export const STORE_EMPLEADOS = 'empleados';
export const STORE_DESTAJOS = 'destajos';
export const STORE_USUARIOS = 'usuarios';

/**
 * Abre la conexión a IndexedDB
 */
export function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'local_id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_EMPLEADOS)) {
        db.createObjectStore(STORE_EMPLEADOS, { keyPath: 'numeroDocumento' });
      }
      if (!db.objectStoreNames.contains(STORE_DESTAJOS)) {
        db.createObjectStore(STORE_DESTAJOS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_USUARIOS)) {
        db.createObjectStore(STORE_USUARIOS, { keyPath: 'id' });
      }
    };

    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Agregar un registro
 */
export async function idbAdd(db, store, item) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).add(item);
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e);
  });
}

/**
 * Agregar o actualizar varios registros
 */
export async function idbAddMany(db, store, items) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const st = tx.objectStore(store);
    items.forEach(item => st.put(item)); // put = add o update
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e);
  });
}

/**
 * Obtener todos los registros de un store
 */
export async function idbGetAll(db, store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e);
  });
}

/**
 * Limpiar un store completo
 */
export async function idbClear(db, store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e);
  });
}
