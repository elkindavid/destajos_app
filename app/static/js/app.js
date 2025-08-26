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
        db.createObjectStore(STORE_EMPLEADOS, { keyPath: 'documento' }); 
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
    errores: {},   // 👈 aquí guardamos los errores

    validar() {
      this.errores = {}; // limpiar errores

      if (!this.empleado_nombre.trim()) {
        this.errores.empleado_nombre = "Debe seleccionar un empleado.";
      }

      if (!this.empleado_documento.trim()) {
        this.errores.empleado_documento = "No se asignó documento al empleado.";
      }

      if (!this.destajo_text.trim() || !this.destajo_id) {
        this.errores.destajo = "Debe seleccionar un destajo válido.";
      }

      if (!this.cantidad || this.cantidad < 1) {
        this.errores.cantidad = "La cantidad debe ser mayor o igual a 1.";
      }

      if (!this.fecha) {
        this.errores.fecha = "Debe seleccionar una fecha.";
      }

      // Devuelve true si no hay errores
      return Object.keys(this.errores).length === 0;
    },

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

      if (!this.validar()) {
        this.status = "⚠️ Corrige los errores antes de guardar.";
        return;
      }

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
    destajos: [],
    destajosMap: new Map(),
    backup: new Map(),
    ready: false,

    // Inicializar destajos
    async init() {
      try {
        // 1️⃣ Inicializar fechas por defecto
        const today = new Date();
        this.desde = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`; // primer día del mes
        this.hasta = today.toISOString().split('T')[0]; // hoy

        // 2️⃣ Cargar destajos
        const d = await API.get("/api/destajos");
        this.destajos = d;
        // Forzar claves numéricas
        d.forEach(x => this.destajosMap.set(Number(x.id), x.concepto));
        this.ready = true;

        this.buscar();

        console.log("🟢 Destajos cargados:", this.destajos);  // <--- aquí
      } catch (e) {
        console.error("No se pudieron cargar los destajos", e);
      }
    },

    async buscar(){
      if (!this.ready) return;

      const p = new URLSearchParams();
      if(this.documento) p.set('documento', this.documento);
      if(this.desde) p.set('desde', this.desde);
      if(this.hasta) p.set('hasta', this.hasta);

      try {
        this.registros = await API.get('/api/registros?'+p.toString());
        this.registros.forEach(r => r.destajo_id = Number(r.destajo_id));
      } catch(e) {
        console.warn("⚠️ No se pudo consultar el backend, usando cache local", e);

        // Cargar desde IndexedDB como fallback
        const db = await idb.openDB('destajosDB', 1);
        this.registros = await db.getAll('registros');
      }
    },

    editar(r) {
      // Guardamos copia del registro para posible cancelación
      this.backup.set(r.id, JSON.parse(JSON.stringify(r)));

      // Función que activa edición y asigna valor
      const activarEdicion = () => {
        r._edit = true; // activar el select
        this.$nextTick(() => {
          // Forzamos que r.destajo_id sea un número y coincida con las opciones
          r.destajo_id = Number(r.destajo_id);
          console.log("✅ Editando registro:", r.id, "destajo_id:", r.destajo_id);
        });
      };

      // Si la lista aún no está cargada
      if (!this.destajos || this.destajos.length === 0) {
        console.log("⏳ Destajos no cargados, esperando...");
        this.loadDestajos().then(() => {
          activarEdicion(); // activamos edición una vez cargados
        });
      } else {
        activarEdicion(); // si ya están cargados, activamos de inmediato
      }
    },

    async loadDestajos() {
      const data = await fetch('/api/destajos').then(r => r.json());
      this.destajos = data;
    },

    cancelar(r){
      const orig = this.backup.get(r.id);
      if(orig){
        Object.assign(r, orig);
        this.backup.delete(r.id);
      }
      r._edit = false;
      this.registros = [...this.registros]; // actualizar fila
    },

    async guardar(r) {
      // --- Validación ---
      if (!r.fecha) {
        alert("⚠️ Debe ingresar una fecha.");
        return;
      }

      if (!r.cantidad || Number(r.cantidad) < 1) {
        alert("⚠️ La cantidad debe ser mayor o igual a 1.");
        return;
      }

      if (!r.destajo_id || Number(r.destajo_id) <= 0) {
        alert("⚠️ Debe seleccionar un destajo válido.");
        return;
      }

      const payload = {
        fecha: r.fecha,
        cantidad: Number(r.cantidad),
        destajo_id: Number(r.destajo_id)
      };

      try {
        await API.put(`/api/registros/${r.id}`, payload);

        // Salir de modo edición
        r._edit = false;

        // Actualizar backup
        this.backup.set(r.id, JSON.parse(JSON.stringify(r)));

        // Forzar actualización de Alpine
        this.registros = [...this.registros];

        console.log("✅ Registro actualizado", r);
      } catch (e) {
        alert("❌ No se pudo guardar en servidor");
        console.error(e);
      }
    },

    async eliminar(id){
      if(!confirm('¿Eliminar registro?')) return;
      try {
        await API.del('/api/registros/'+id);
        this.registros = this.registros.filter(x=>x.id!==id);
      } catch(e){
        alert('No se pudo eliminar');
      }
    }
  }
}

// Inicializa la primera sincronización
trySync();

// Registrar Alpine
document.addEventListener('alpine:init', () => {
  Alpine.data('consultarView', consultarView);
  Alpine.data('destajosForm', destajosForm);
});
