const setupDefs = [
  { key: 'rules', title: 'Reglas de reserva', subtitle: 'Cómo recibes las citas', icon: '1' },
  { key: 'resources', title: 'Quién atiende', subtitle: 'Personas y recursos', icon: '2' },
  { key: 'schedules', title: 'Horarios registrados', subtitle: 'Días y horas disponibles', icon: '3' },
  { key: 'links', title: 'Servicios asignados', subtitle: 'Quién realiza cada servicio', icon: '4' }
];

const setupGrid = document.querySelector('main.wrap > .grid');
let activeSetupTab = 'rules';

function activateSetupTab(key, options = {}) {
  if (!setupDefs.some(item => item.key === key)) key = 'rules';
  activeSetupTab = key;

  document.querySelectorAll('.setup-nav-button').forEach(button => {
    const active = button.dataset.setupTab === key;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  document.querySelectorAll('.form-panel').forEach(panel => {
    const active = panel.dataset.formPanel === key;
    panel.classList.toggle('active', active);
    panel.hidden = !active;
  });

  const panel = document.querySelector(`.form-panel[data-form-panel="${key}"]`);
  if (options.scroll && panel) {
    requestAnimationFrame(() => {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

function buildSetupWorkspace() {
  if (!setupGrid || document.getElementById('setupWorkspace')) return;

  const panels = Array.from(setupGrid.children).filter(el => el.classList.contains('card'));
  if (panels.length < 4) return;

  const workspace = document.createElement('section');
  workspace.id = 'setupWorkspace';
  workspace.className = 'setup-workspace';
  workspace.setAttribute('aria-label', 'Configuración de agenda');

  const side = document.createElement('aside');
  side.className = 'setup-sidebar';
  side.innerHTML = `
    <div class="setup-sidebar-head">
      <span class="setup-sidebar-kicker">CONFIGURACIÓN</span>
      <strong>Tu agenda paso a paso</strong>
      <small>Elige una categoría para ver o modificar sus datos.</small>
    </div>
    <div class="setup-nav" role="tablist" aria-label="Categorías de agenda">
      ${setupDefs.map(item => `
        <button class="setup-nav-button" type="button" role="tab" aria-selected="false" data-setup-tab="${item.key}">
          <span class="setup-nav-number">${item.icon}</span>
          <span class="setup-nav-copy"><b>${item.title}</b><small>${item.subtitle}</small></span>
          <span class="setup-nav-arrow" aria-hidden="true">›</span>
        </button>`).join('')}
    </div>`;

  const detail = document.createElement('div');
  detail.className = 'setup-detail';

  setupGrid.parentNode.insertBefore(workspace, setupGrid);
  workspace.append(side, detail);
  detail.appendChild(setupGrid);
  setupGrid.classList.add('form-panels');

  panels.slice(0, 4).forEach((panel, index) => {
    const def = setupDefs[index];
    panel.classList.add('form-panel');
    panel.dataset.formPanel = def.key;
    panel.id = `form-panel-${def.key}`;
    panel.setAttribute('role', 'tabpanel');
  });

  side.querySelectorAll('.setup-nav-button').forEach(button => {
    button.addEventListener('click', () => activateSetupTab(button.dataset.setupTab));
  });

  activateSetupTab(activeSetupTab);
}

buildSetupWorkspace();

// Antes de que el manejador de edición existente actúe, abrimos la categoría correcta.
// Así el scrollIntoView/focus del formulario existente funciona sin que el usuario mueva nada.
document.addEventListener('click', event => {
  const editButton = event.target.closest('#reviewTable .js-edit');
  if (!editButton) return;

  const categoryByKind = {
    config: 'rules',
    resource: 'resources',
    schedule: 'schedules',
    link: 'links'
  };
  const key = categoryByKind[editButton.dataset.kind];
  if (!key) return;

  activateSetupTab(key, { scroll: true });
}, true);
