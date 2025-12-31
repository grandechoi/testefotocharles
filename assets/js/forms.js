/**
 * Forms Module - Gerenciamento de formulários e verificações
 * Controla entrada de dados, validação e interface de verificações
 */

class FormsManager {
  constructor() {
    this.verifications = [];
    this.currentPhotoTarget = null; // Para saber qual verificação está recebendo fotos
  }

  /**
   * Coleta todos os dados gerais do formulário
   */
  collectGeneralData() {
    return {
      año: document.getElementById('año').value,
      semana: document.getElementById('semana').value,
      cliente: document.getElementById('cliente').value,
      albaran: document.getElementById('albaran').value,
      codIngeniero: document.getElementById('cod-ingeniero').value,
      ubicacion: document.getElementById('ubicacion').value,
      perfiles: document.getElementById('perfiles').value,
      peticiones: document.getElementById('peticiones').value
    };
  }

  /**
   * Preenche formulário com dados
   */
  populateGeneralData(data) {
    document.getElementById('año').value = data.año || '';
    document.getElementById('semana').value = data.semana || '';
    document.getElementById('cliente').value = data.cliente || '';
    document.getElementById('albaran').value = data.albaran || '';
    document.getElementById('cod-ingeniero').value = data.codIngeniero || '';
    document.getElementById('ubicacion').value = data.ubicacion || '';
    document.getElementById('perfiles').value = data.perfiles || '';
    document.getElementById('peticiones').value = data.peticiones || '';
  }

  /**
   * Coleta observações
   */
  collectObservations() {
    return document.getElementById('observaciones').value;
  }

  /**
   * Preenche observações
   */
  populateObservations(text) {
    document.getElementById('observaciones').value = text || '';
  }

  /**
   * Adiciona nova seção de verificação
   */
  addVerification(data = null) {
    const verification = {
      id: Date.now() + Math.random(),
      section: data?.section || '',
      item: data?.item || '',
      status: data?.status || '',
      photos: data?.photos || []
    };

    this.verifications.push(verification);
    this.renderVerification(verification);
    return verification;
  }

  /**
   * Renderiza uma verificação na UI
   */
  renderVerification(verification) {
    const container = document.getElementById('verification-sections');
    const item = document.createElement('div');
    item.className = 'verification-item';
    item.dataset.id = verification.id;

    item.innerHTML = `
      <div class="verification-header">
        <h3>Verificación ${this.verifications.indexOf(verification) + 1}</h3>
        <button type="button" class="btn btn-danger btn-small" onclick="forms.removeVerification(${verification.id})">
          🗑️ Eliminar
        </button>
      </div>
      
      <div class="form-field">
        <label>Sección</label>
        <input type="text" class="verification-section" value="${verification.section}" 
               placeholder="ej: Sistema mecánico" 
               onchange="forms.updateVerification(${verification.id})">
      </div>

      <div class="form-field">
        <label>Item</label>
        <input type="text" class="verification-item-name" value="${verification.item}" 
               placeholder="ej: Rodillos superiores" 
               onchange="forms.updateVerification(${verification.id})">
      </div>

      <div class="form-field">
        <label>Estado/Intervención</label>
        <textarea class="verification-status" rows="2" 
                  onchange="forms.updateVerification(${verification.id})">${verification.status}</textarea>
      </div>

      <div class="form-field">
        <label>Fotos</label>
        <button type="button" class="btn btn-secondary btn-small" 
                onclick="forms.openPhotoModal(${verification.id})">
          📸 Añadir Fotos (${verification.photos.length})
        </button>
        <div class="photo-section" data-photos-container="${verification.id}">
          ${this.renderPhotoPreviews(verification.photos, verification.id)}
        </div>
      </div>
    `;

    container.appendChild(item);
  }

  /**
   * Renderiza miniaturas de fotos
   */
  renderPhotoPreviews(photos, verificationId) {
    return photos.map((photo, index) => `
      <div class="photo-preview">
        <img src="${photo}" alt="Foto ${index + 1}">
        <button type="button" class="photo-remove" 
                onclick="forms.removePhoto(${verificationId}, ${index})">
          ×
        </button>
      </div>
    `).join('');
  }

  /**
   * Atualiza dados de uma verificação
   */
  updateVerification(verificationId) {
    const item = document.querySelector(`[data-id="${verificationId}"]`);
    if (!item) return;

    const verification = this.verifications.find(v => v.id === verificationId);
    if (!verification) return;

    verification.section = item.querySelector('.verification-section').value;
    verification.item = item.querySelector('.verification-item-name').value;
    verification.status = item.querySelector('.verification-status').value;

    // Auto-save
    this.autoSave();
  }

  /**
   * Remove uma verificação
   */
  removeVerification(verificationId) {
    this.verifications = this.verifications.filter(v => v.id !== verificationId);
    const item = document.querySelector(`[data-id="${verificationId}"]`);
    if (item) item.remove();

    // Renumerar títulos
    this.renumberVerifications();
    this.autoSave();
  }

  /**
   * Renumera verificações após remoção
   */
  renumberVerifications() {
    const items = document.querySelectorAll('.verification-item');
    items.forEach((item, index) => {
      const header = item.querySelector('h3');
      if (header) {
        header.textContent = `Verificación ${index + 1}`;
      }
    });
  }

  /**
   * Abre modal de fotos para uma verificação específica
   */
  openPhotoModal(verificationId) {
    this.currentPhotoTarget = verificationId;
    const modal = document.getElementById('photo-modal');
    modal.classList.remove('hidden');

    // Limpar fotos selecionadas do modal
    camera.clearPhotos();
    this.renderModalPhotos();
  }

  /**
   * Fecha modal de fotos
   */
  closePhotoModal() {
    const modal = document.getElementById('photo-modal');
    modal.classList.add('hidden');
    camera.stopCamera();
    camera.clearPhotos();
  }

  /**
   * Confirma fotos selecionadas
   */
  confirmPhotos() {
    if (this.currentPhotoTarget === null) return;

    const verification = this.verifications.find(v => v.id === this.currentPhotoTarget);
    if (!verification) return;

    // Adicionar novas fotos
    verification.photos.push(...camera.getPhotos());

    // Atualizar UI
    const container = document.querySelector(`[data-photos-container="${this.currentPhotoTarget}"]`);
    if (container) {
      container.innerHTML = this.renderPhotoPreviews(verification.photos, this.currentPhotoTarget);
    }

    // Atualizar contador no botão
    const button = container?.previousElementSibling;
    if (button) {
      button.textContent = `📸 Añadir Fotos (${verification.photos.length})`;
    }

    this.closePhotoModal();
    this.autoSave();
  }

  /**
   * Renderiza fotos no modal
   */
  renderModalPhotos() {
    const container = document.getElementById('selected-photos');
    const photos = camera.getPhotos();

    container.innerHTML = photos.map((photo, index) => `
      <div class="photo-preview">
        <img src="${photo}" alt="Foto ${index + 1}">
        <button type="button" class="photo-remove" onclick="forms.removeModalPhoto(${index})">
          ×
        </button>
      </div>
    `).join('');
  }

  /**
   * Remove foto do modal (antes de confirmar)
   */
  removeModalPhoto(index) {
    camera.removePhoto(index);
    this.renderModalPhotos();
  }

  /**
   * Remove foto de uma verificação
   */
  removePhoto(verificationId, photoIndex) {
    const verification = this.verifications.find(v => v.id === verificationId);
    if (!verification) return;

    verification.photos.splice(photoIndex, 1);

    // Atualizar UI
    const container = document.querySelector(`[data-photos-container="${verificationId}"]`);
    if (container) {
      container.innerHTML = this.renderPhotoPreviews(verification.photos, verificationId);
    }

    // Atualizar contador
    const button = container?.previousElementSibling;
    if (button) {
      button.textContent = `📸 Añadir Fotos (${verification.photos.length})`;
    }

    this.autoSave();
  }

  /**
   * Limpa todos os dados do formulário
   */
  clearAll() {
    if (!confirm('¿Está seguro de que desea borrar todos los datos?')) {
      return;
    }

    // Limpar campos gerais
    document.getElementById('año').value = '';
    document.getElementById('semana').value = '';
    document.getElementById('cliente').value = '';
    document.getElementById('albaran').value = '';
    document.getElementById('cod-ingeniero').value = '';
    document.getElementById('ubicacion').value = '';
    document.getElementById('perfiles').value = '';
    document.getElementById('peticiones').value = '';
    document.getElementById('observaciones').value = '';

    // Limpar verificações
    this.verifications = [];
    document.getElementById('verification-sections').innerHTML = '';

    // Limpar storage
    db.clearCurrent();

    this.showStatus('Datos borrados correctamente', 'success');
  }

  /**
   * Auto-save em background
   */
  autoSave() {
    const data = {
      general: this.collectGeneralData(),
      verifications: this.verifications,
      observations: this.collectObservations()
    };
    db.saveCurrent(data);
  }

  /**
   * Carrega dados salvos automaticamente
   */
  loadAutoSaved() {
    const data = db.loadCurrent();
    if (data) {
      this.populateGeneralData(data.general);
      this.populateObservations(data.observations);
      
      // Carregar verificações
      if (data.verifications) {
        data.verifications.forEach(v => {
          this.verifications.push(v);
          this.renderVerification(v);
        });
      }
    }
  }

  /**
   * Mostra mensagem de status
   */
  showStatus(message, type = 'success') {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = type;
    
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = '';
    }, 5000);
  }
}

// Exportar instância global
const forms = new FormsManager();
