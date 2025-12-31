/**
 * App.js - Inicialização e orquestração da aplicação
 * Conecta todos os módulos e gerencia eventos da interface
 */

class App {
  constructor() {
    this.initialized = false;
  }

  /**
   * Inicializa a aplicação
   */
  async init() {
    if (this.initialized) return;

    try {
      // Registrar service worker
      await this.registerServiceWorker();

      // Inicializar câmera
      camera.init(
        document.getElementById('camera-preview'),
        document.getElementById('camera-snapshot')
      );

      // Configurar event listeners
      this.setupEventListeners();

      // Carregar dados salvos automaticamente
      forms.loadAutoSaved();

      // Marcar como inicializado
      this.initialized = true;

      console.log('✅ ReportManager inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar app:', error);
      forms.showStatus('Error al inicializar la aplicación', 'error');
    }
  }

  /**
   * Registra service worker para funcionamento offline
   */
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker não suportado');
      return;
    }

    try {
      await navigator.serviceWorker.register('./sw.js');
      console.log('✅ Service Worker registrado');
    } catch (error) {
      console.warn('Falha ao registrar Service Worker:', error);
    }
  }

  /**
   * Configura todos os event listeners
   */
  setupEventListeners() {
    // Botão adicionar verificação
    document.getElementById('add-verification').addEventListener('click', () => {
      forms.addVerification();
    });

    // Botão gerar relatório
    document.getElementById('generate-report').addEventListener('click', async () => {
      const btn = document.getElementById('generate-report');
      btn.disabled = true;
      btn.textContent = '⏳ Generando...';

      await reportGenerator.generateReport();

      btn.disabled = false;
      btn.textContent = '📄 Generar Informe Word';
    });

    // Botão salvar rascunho
    document.getElementById('save-draft').addEventListener('click', () => {
      this.showSaveDraftDialog();
    });

    // Botão carregar rascunho
    document.getElementById('load-draft').addEventListener('click', () => {
      this.showLoadDraftDialog();
    });

    // Botão limpar tudo
    document.getElementById('clear-all').addEventListener('click', () => {
      forms.clearAll();
    });

    // Modal de fotos
    this.setupPhotoModalListeners();

    // Auto-save ao alterar campos gerais
    this.setupAutoSave();
  }

  /**
   * Configura listeners do modal de fotos
   */
  setupPhotoModalListeners() {
    const modal = document.getElementById('photo-modal');
    const openCameraBtn = document.getElementById('open-camera');
    const takePhotoBtn = document.getElementById('take-photo');
    const closeCameraBtn = document.getElementById('close-camera');
    const fileInput = document.getElementById('file-input');
    const confirmBtn = document.getElementById('confirm-photos');

    // Botões de fechar modal
    modal.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => forms.closePhotoModal());
    });

    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        forms.closePhotoModal();
      }
    });

    // Abrir câmera
    openCameraBtn.addEventListener('click', async () => {
      try {
        await camera.startCamera();
        openCameraBtn.classList.add('hidden');
        takePhotoBtn.classList.remove('hidden');
        closeCameraBtn.classList.remove('hidden');
      } catch (error) {
        forms.showStatus(error.message, 'error');
      }
    });

    // Tirar foto
    takePhotoBtn.addEventListener('click', () => {
      try {
        const photo = camera.capturePhoto();
        camera.addPhoto(photo);
        forms.renderModalPhotos();
      } catch (error) {
        forms.showStatus('Error al capturar foto', 'error');
      }
    });

    // Fechar câmera
    closeCameraBtn.addEventListener('click', () => {
      camera.stopCamera();
      openCameraBtn.classList.remove('hidden');
      takePhotoBtn.classList.add('hidden');
      closeCameraBtn.classList.add('hidden');
    });

    // Upload de arquivo
    fileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      
      for (const file of files) {
        try {
          let dataUrl = await camera.fileToDataUrl(file);
          dataUrl = await camera.resizeImage(dataUrl);
          camera.addPhoto(dataUrl);
        } catch (error) {
          console.error('Erro ao processar arquivo:', error);
        }
      }

      forms.renderModalPhotos();
      fileInput.value = ''; // Reset input
    });

    // Confirmar fotos
    confirmBtn.addEventListener('click', () => {
      forms.confirmPhotos();
    });
  }

  /**
   * Configura auto-save nos campos gerais
   */
  setupAutoSave() {
    const fields = [
      'año', 'semana', 'cliente', 'albaran', 'cod-ingeniero',
      'ubicacion', 'perfiles', 'peticiones', 'observaciones'
    ];

    fields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('change', () => forms.autoSave());
        field.addEventListener('blur', () => forms.autoSave());
      }
    });
  }

  /**
   * Mostra diálogo para salvar rascunho
   */
  showSaveDraftDialog() {
    const name = prompt('Nombre del borrador:', `Borrador_${new Date().toLocaleDateString('es-ES')}`);
    
    if (!name) return;

    const data = {
      general: forms.collectGeneralData(),
      verifications: forms.verifications,
      observations: forms.collectObservations()
    };

    if (db.saveDraft(name, data)) {
      forms.showStatus('Borrador guardado correctamente', 'success');
    } else {
      forms.showStatus('Error al guardar borrador', 'error');
    }
  }

  /**
   * Mostra diálogo para carregar rascunho
   */
  showLoadDraftDialog() {
    const drafts = db.listDrafts();

    if (drafts.length === 0) {
      alert('No hay borradores guardados');
      return;
    }

    const modal = document.getElementById('draft-modal');
    const listContainer = document.getElementById('draft-list');

    // Renderizar lista de rascunhos
    listContainer.innerHTML = drafts.map(draft => `
      <div class="draft-item">
        <div class="draft-info">
          <h4>${draft.name}</h4>
          <p>${draft.date}</p>
        </div>
        <div class="draft-actions">
          <button class="btn btn-success btn-small" onclick="app.loadDraft(${draft.id})">
            📂 Cargar
          </button>
          <button class="btn btn-danger btn-small" onclick="app.deleteDraft(${draft.id})">
            🗑️ Eliminar
          </button>
        </div>
      </div>
    `).join('');

    // Mostrar modal
    modal.classList.remove('hidden');

    // Fechar modal
    modal.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  }

  /**
   * Carrega um rascunho específico
   */
  loadDraft(draftId) {
    const data = db.loadDraft(draftId);
    
    if (!data) {
      forms.showStatus('Error al cargar borrador', 'error');
      return;
    }

    // Limpar dados atuais
    forms.verifications = [];
    document.getElementById('verification-sections').innerHTML = '';

    // Carregar dados
    forms.populateGeneralData(data.general);
    forms.populateObservations(data.observations);

    // Carregar verificações
    if (data.verifications) {
      data.verifications.forEach(v => {
        forms.verifications.push(v);
        forms.renderVerification(v);
      });
    }

    // Fechar modal
    document.getElementById('draft-modal').classList.add('hidden');

    forms.showStatus('Borrador cargado correctamente', 'success');
  }

  /**
   * Deleta um rascunho
   */
  deleteDraft(draftId) {
    if (!confirm('¿Está seguro de eliminar este borrador?')) {
      return;
    }

    if (db.deleteDraft(draftId)) {
      forms.showStatus('Borrador eliminado', 'success');
      // Reabrir diálogo atualizado
      document.getElementById('draft-modal').classList.add('hidden');
      setTimeout(() => this.showLoadDraftDialog(), 300);
    } else {
      forms.showStatus('Error al eliminar borrador', 'error');
    }
  }
}

// Inicializar app quando DOM estiver pronto
const app = new App();

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
