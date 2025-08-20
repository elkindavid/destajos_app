// ==============================
// IndexedDB helpers
// ==============================
const DB_NAME = 'destajos-db';
const DB_VERSION = 2; // 👈 subimos versión para forzar recreación
const STORE_QUEUE = 'queue';
const STORE_EMPLEADOS = 'empleados';
const STORE_DESTAJOS = 'destajos';
const STORE_USUARIOS = 'usuarios';

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      console.log("⚡ Actualizando estructura de IndexedDB...");

      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'local_id', autoIncrement: true });
        console.log("🗂️ Store creada:", STORE_QUEUE);
      }
      if (!db.objectStoreNames.contains(STORE_EMPLEADOS)) {
        db.createObjectStore(STORE_EMPLEADOS, { keyPath: 'documento' }); // 👈 aseguramos clave
        console.log("🗂️ Store creada:", STORE_EMPLEADOS);
      }
      if (!db.objectStoreNames.contains(STORE_DESTAJOS)) {
        db.createObjectStore(STORE_DESTAJOS, { keyPath: 'id' });
        console.log("🗂️ Store creada:", STORE_DESTAJOS);
      }
      if (!db.objectStoreNames.contains(STORE_USUARIOS)) {
        db.createObjectStore(STORE_USUARIOS, { keyPath: 'id' });
        console.log("🗂️ Store creada:", STORE_USUARIOS);
      }
    };

    req.onsuccess = (e) => {
      console.log("✅ IndexedDB abierto correctamente");
      resolve(e.target.result);
    };
    req.onerror = (e) => {
      console.error("❌ Error abriendo IndexedDB", e.target.error);
      reject(e.target.error);
    };
  });
}

async function idbAdd(db, store, item) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).add(item);
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e);
  });
}

async function idbAddMany(db, store, items) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const st = tx.objectStore(store);
    items.forEach(item => st.put(item)); // put = add o update
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e);
  });
}

async function idbGetAll(db, store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e);
  });
}

async function idbClear(db, store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e);
  });
}

// ==============================
// Inicialización de IndexedDB y cache de empleados
// ==============================
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const db = await idbOpen();

    if (navigator.onLine) {
      const empleados = await API.get("/api/employees");
      await idbAddMany(db, STORE_EMPLEADOS, empleados);
      console.log("✅ Empleados sincronizados en IndexedDB");
    } else {
      console.log("📴 Sin internet, se usará IndexedDB");
    }
  } catch (err) {
    console.error("❌ Error inicializando IndexedDB", err);
  }
});

// ==============================
// API helpers
// ==============================
const API = {
  async get(url){
    const r = await fetch(url, {credentials:'same-origin'});
    if(!r.ok) throw new Error('Error API');
    return r.json();
  },
  async post(url, data){
    const r = await fetch(url, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'same-origin',
      body: JSON.stringify(data)
    });
    return r.json();
  },
  async put(url, data){
    const r = await fetch(url, {
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      credentials:'same-origin',
      body: JSON.stringify(data)
    });
    return r.json();
  },
  async del(url){
    const r = await fetch(url, {method:'DELETE', credentials:'same-origin'});
    return r.json();
  }
};

// ==============================
// Sync offline → server
// ==============================
async function trySync(){
  if(!navigator.onLine) return;
  const db = await idbOpen();
  const items = await idbGetAll(db, STORE_QUEUE);
  if(items.length === 0) return;
  const payload = items.map(({local_id, ...rest})=>rest);
  try {
    await API.post('/api/sync', payload);
    await idbClear(db, STORE_QUEUE);
    console.log('✅ Sincronizado', payload.length);
  } catch(e){
    console.warn('⚠️ Sync fallo', e);
  }
}

window.addEventListener('online', trySync);
document.addEventListener('visibilitychange', ()=> {
  if(document.visibilityState === 'visible') trySync();
});

// ==============================
// Helpers
// ==============================
function todayISO(){
  const d = new Date();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// ==============================
// Alpine data: Formulario destajos
// ==============================
window.destajosForm = function(){
  return {
    empleados: [],
    destajos: [],
    empleado_nombre: '',
    empleado_documento: '',
    destajo_text: '',
    destajo_id: null,
    cantidad: 1,
    fecha: todayISO(),
    status: '',
    
    async searchEmpleado() {
      console.log("🔍 Buscando Empleado:", this.empleado_nombre);

      const q = this.empleado_nombre || this.empleado_documento;
      if (!q || q.length < 2) return;

      try {
        const db = await idbOpen();
        let data;

        if (navigator.onLine) {
          const res = await fetch(`/api/employees?q=${encodeURIComponent(q)}`);
          if (!res.ok) throw new Error('HTTP error ' + res.status);
          data = await res.json();
          await idbAddMany(db, STORE_EMPLEADOS, data);
        } else {
          data = await idbGetAll(db, STORE_EMPLEADOS);
          data = data.filter(e =>
            (e.nombre && e.nombre.toLowerCase().includes(q.toLowerCase())) ||
            (e.numeroDocumento && e.numeroDocumento.includes(q))
          );
        }

        this.empleados = data;

        const seleccionado = data.find(e =>
          e.nombre?.trim().toLowerCase() === this.empleado_nombre.trim().toLowerCase() ||
          e.nombreCompleto?.trim().toLowerCase() === this.empleado_nombre.trim().toLowerCase()
        );

      } catch (err) {
        console.error("⚠️ Error buscando empleado", err);
      }
    },

    asignarDocumento() {
      if (!this.empleados || this.empleados.length === 0) return;

      const seleccionado = this.empleados.find(e =>
        e.nombre.trim().toLowerCase() === this.empleado_nombre.trim().toLowerCase()
      );

      if (seleccionado) {
        this.empleado_documento = seleccionado.documento;
        console.log("🆔 Documento asignado:", this.empleado_documento);
      } else {
        this.empleado_documento = '';
        console.log("❌ No se encontró documento para:", this.empleado_nombre);
      }
    },

    async searchDestajo(){
      const q = this.destajo_text;
      if(!q || q.length < 2) return;
      try {
        this.destajos = await API.get('/api/destajos?q='+encodeURIComponent(q));
        const hit = this.destajos.find(d => d.concepto === this.destajo_text);
        if(hit){ this.destajo_id = hit.id; }
      } catch(e){}
    },
    async submit(){
      const payload = {
        empleado_documento: this.empleado_documento,
        empleado_nombre: this.empleado_nombre,
        destajo_id: this.destajo_id,
        cantidad: this.cantidad,
        fecha: this.fecha
      };
      const db = await idbOpen();
      if(navigator.onLine){
        try {
          await API.post('/api/registros', payload);
          this.status = 'Guardado en servidor';
        } catch(e){
          this.status = 'Error servidor, encolado offline';
          await idbAdd(db, STORE_QUEUE, payload);
        }
      } else {
        await idbAdd(db, STORE_QUEUE, payload);
        this.status = 'Guardado offline (pendiente de sincronizar)';
      }
    }
  }
}

// ==============================
// Alpine data: Vista consultar
// ==============================
window.consultarView = function(){
  return {
    documento: '',
    desde: '',
    hasta: '',
    registros: [],
    backup: new Map(),
    async buscar(){
      const p = new URLSearchParams();
      if(this.documento) p.set('documento', this.documento);
      if(this.desde) p.set('desde', this.desde);
      if(this.hasta) p.set('hasta', this.hasta);
      try {
        this.registros = await API.get('/api/registros?'+p.toString());
      } catch(e) {
        alert('Error consultando');
      }
    },
    editar(r){
      this.backup.set(r.id, JSON.parse(JSON.stringify(r)));
      r._edit = true;
    },
    cancelar(r){
      const orig = this.backup.get(r.id);
      if(orig){
        Object.assign(r, orig);
        this.backup.delete(r.id);
      }
      r._edit = false;
    },
    async guardar(r){
      const payload = { fecha: r.fecha, cantidad: r.cantidad, destajo_id: r.destajo_id };
      try {
        await API.put('/api/registros/'+r.id, payload);
        r._edit = false;
      } catch(e){
        alert('No se pudo guardar');
      }
    },
    async eliminar(id){
      if(!confirm('¿Eliminar registro?')) return;
      await API.del('/api/registros/'+id);
      this.registros = this.registros.filter(x=>x.id!==id);
    }
  }
}

// Inicializa la primera sincronización
trySync();

// Registrar Alpine
document.addEventListener('alpine:init', () => {
  Alpine.data('destajosForm', destajosForm);
  Alpine.data('consultarView', consultarView);
});
