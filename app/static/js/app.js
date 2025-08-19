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

// Offline queue using IndexedDB
const DB_NAME = 'destajos-db';
const STORE = 'queue';

async function trySync(){
  if(!navigator.onLine) return;
  const db = await idbOpen(DB_NAME, STORE);
  const items = await idbGetAll(db, STORE);
  if(items.length === 0) return;
  const payload = items.map(({local_id, ...rest})=>rest);
  try {
    await API.post('/api/sync', payload);
    await idbClear(db, STORE);
    console.log('Sincronizado', payload.length);
  } catch(e){
    console.warn('Sync fallo', e);
  }
}

window.addEventListener('online', trySync);
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState === 'visible') trySync();
});

function todayISO(){
  const d = new Date();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${d.getFullYear()}-${m}-${day}`;
}

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

      if ((!this.empleado_nombre || this.empleado_nombre.length < 2) &&
          (!this.empleado_documento || this.empleado_documento.length < 2)) {
        console.log("❌ Muy corto, no busco");
        return;
      }

      try {
        const q = this.empleado_nombre || this.empleado_documento;
        const res = await fetch(`/api/employees?q=${encodeURIComponent(q)}`);
        
        if (!res.ok) {
          throw new Error(`Error HTTP: ${res.status}`);
        }

        const data = await res.json(); 
        this.empleados = data;

        // 🔄 Si ya seleccionó uno, busco y completo el otro campo
        if (this.empleado_nombre) {
          const emp = this.empleados.find(e => e.nombre === this.empleado_nombre);
          if (emp) this.empleado_documento = emp.documento;
        }
        if (this.empleado_documento) {
          const emp = this.empleados.find(e => e.documento === this.empleado_documento);
          if (emp) this.empleado_nombre = emp.nombre;
        }

      } catch (err) {
        console.error("⚠️ Error buscando empleado", err);
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
      if(navigator.onLine){
        try {
          await API.post('/api/registros', payload);
          this.status = 'Guardado en servidor';
        } catch(e){
          this.status = 'Error servidor, encolado offline';
          const db = await idbOpen(DB_NAME, STORE);
          await idbAdd(db, STORE, payload);
        }
      } else {
        const db = await idbOpen(DB_NAME, STORE);
        await idbAdd(db, STORE, payload);
        this.status = 'Guardado offline (pendiente de sincronizar)';
      }
    }
  }
}

// ✅ Registrar con Alpine después de definir la función
document.addEventListener('alpine:init', () => {
    Alpine.data('destajosForm', destajosForm);
});

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

trySync();
