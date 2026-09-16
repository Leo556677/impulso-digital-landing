(() => {
  const STORAGE_KEY = 'odontoellu_requests_v1';
  const AUTH_KEY = 'odontoellu_panel_demo_auth';
  const login = document.querySelector('#panel-login');
  const app = document.querySelector('#panel-app');
  const form = document.querySelector('#login-form');
  const tableWrap = document.querySelector('#table-wrap');
  const filter = document.querySelector('#status-filter');
  const search = document.querySelector('#search');

  const read = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
  const write = data => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  const formatDate = value => {
    const [y,m,d]=value.split('-').map(Number);
    return new Date(y,m-1,d).toLocaleDateString('es-PE',{day:'2-digit',month:'short',year:'numeric'});
  };
  const statusLabel = value => ({pendiente:'Pendiente',confirmada:'Confirmada',rechazada:'Rechazada',cancelada:'Cancelada'}[value] || value);

  function showApp(){ login.hidden=true; app.hidden=false; render(); }
  function showLogin(){ login.hidden=false; app.hidden=true; }

  function render(){
    const q = (search.value || '').trim().toLowerCase();
    const f = filter.value;
    const rows = read().filter(x => (f==='todos' || x.status===f) && (!q || x.name.toLowerCase().includes(q) || x.phone.includes(q)));
    if(!rows.length){ tableWrap.innerHTML='<div class="empty-state"><strong>No hay solicitudes para mostrar.</strong><p>Registra una desde la landing para probar el panel.</p></div>'; return; }
    tableWrap.innerHTML = `<table><thead><tr><th>Fecha</th><th>Hora</th><th>Nombre</th><th>Celular</th><th>Estado</th><th>Registrada</th></tr></thead><tbody>${rows.map(r=>`<tr data-id="${r.id}"><td>${formatDate(r.date)}</td><td>${r.time}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.phone)}</td><td><select class="status-select" aria-label="Estado de ${escapeHtml(r.name)}"><option value="pendiente" ${r.status==='pendiente'?'selected':''}>Pendiente</option><option value="confirmada" ${r.status==='confirmada'?'selected':''}>Confirmada</option><option value="rechazada" ${r.status==='rechazada'?'selected':''}>Rechazada</option><option value="cancelada" ${r.status==='cancelada'?'selected':''}>Cancelada</option></select><div style="margin-top:.35rem"><span class="status-pill status-${r.status}">${statusLabel(r.status)}</span></div></td><td>${new Date(r.createdAt).toLocaleString('es-PE')}</td></tr>`).join('')}</tbody></table>`;
    tableWrap.querySelectorAll('.status-select').forEach(select => select.addEventListener('change', e => {
      const id = e.target.closest('tr').dataset.id;
      const data = read();
      const item = data.find(x=>x.id===id);
      if(item){ item.status=e.target.value; write(data); render(); }
    }));
  }
  function escapeHtml(value=''){ return value.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c])); }

  form.addEventListener('submit', e => { e.preventDefault(); const pin=document.querySelector('#demo-pin').value; if(pin==='2468'){ sessionStorage.setItem(AUTH_KEY,'1'); showApp(); } else { alert('PIN demo incorrecto. Usa 2468.'); } });
  document.querySelector('#logout').addEventListener('click',()=>{sessionStorage.removeItem(AUTH_KEY);showLogin();});
  filter.addEventListener('change',render); search.addEventListener('input',render);
  document.querySelector('#clear-demo').addEventListener('click',()=>{ if(confirm('¿Borrar todas las solicitudes demo guardadas en este navegador?')){ localStorage.removeItem(STORAGE_KEY); render(); } });

  if(sessionStorage.getItem(AUTH_KEY)==='1') showApp(); else showLogin();
})();
