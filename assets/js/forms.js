/**
 * forms.js
 * Manages verification forms with PREDEFINED sections and items (GenReport structure)
 */

import { db } from './database.js';
import { cameraManager } from './camera.js';
import { TOPICOS_INSPECAO, OPCOES_ESTADO } from './constants.js';
import { StateSelectorModal } from './state-selector.js';

class FormsManager {
    constructor() {
        this.sectionsContainer = document.getElementById('sections-container');
        this.itemStates = {}; // { "secao|item": ["estado1", "estado2"] }
        this.sectionPhotos = {}; // { "secao": { file, dataUrl } }
        this.itemPhotos = {}; // { "secao|item|1": { file, dataUrl }, "secao|item|2": { file, dataUrl } }
        this.stateModal = new StateSelectorModal();
        
        this.init();
    }

    init() {
        this.renderAllSections();
        this.loadData();
    }

    /**
     * Renderiza TODAS as seções e itens pré-definidos
     */
    renderAllSections() {
        this.sectionsContainer.innerHTML = '';
        
        Object.entries(TOPICOS_INSPECAO).forEach(([secao, itens], sectionIndex) => {
            const sectionCard = this.createSectionCard(secao, itens, sectionIndex);
            this.sectionsContainer.appendChild(sectionCard);
        });
    }

    /**
     * Cria card de seção com todos os itens
     */
    createSectionCard(secao, itens, sectionIndex) {
        const card = document.createElement('div');
        card.className = 'section-card';
        card.innerHTML = `
            <div class="section-header">
                <h3>
                    <span class="section-number">${sectionIndex + 1}</span>
                    ${secao}
                </h3>
                <button class="btn-add-section-photo" data-section="${secao}">
                    📷 Foto da Seção
                </button>
            </div>
            <div class="section-photo-preview" data-section="${secao}" style="display: none;">
                <img src="" alt="Foto da seção">
                <button class="btn-remove-photo">✕</button>
            </div>
            <div class="items-list" data-section="${secao}">
                ${itens.map((item, itemIndex) => this.createItemHTML(secao, item, itemIndex)).join('')}
            </div>
        `;

        // Event listeners
        const btnSectionPhoto = card.querySelector('.btn-add-section-photo');
        btnSectionPhoto.addEventListener('click', () => this.openPhotoSelector(secao, null, null));

        // Items event listeners
        itens.forEach((item, itemIndex) => {
            const itemElement = card.querySelector(`[data-item-index="${itemIndex}"]`);
            
            // State selector button
            const btnState = itemElement.querySelector('.btn-select-state');
            btnState.addEventListener('click', () => this.openStateSelector(secao, item));

            // Photo buttons
            const btnPhoto1 = itemElement.querySelector('.btn-item-photo-1');
            const btnPhoto2 = itemElement.querySelector('.btn-item-photo-2');
            btnPhoto1.addEventListener('click', () => this.openPhotoSelector(secao, item, 1));
            btnPhoto2.addEventListener('click', () => this.openPhotoSelector(secao, item, 2));
        });

        return card;
    }

    /**
     * Cria HTML de um item
     */
    createItemHTML(secao, item, itemIndex) {
        const key = `${secao}|${item}`;
        const states = this.itemStates[key] || [];
        const statesText = states.length > 0 ? states.join(', ') : 'Seleccionar estados...';
        const hasStates = states.length > 0;

        return `
            <div class="item-row" data-item-index="${itemIndex}">
                <div class="item-info">
                    <span class="item-number">${itemIndex + 1}</span>
                    <span class="item-name">${item}</span>
                </div>
                <button class="btn-select-state ${hasStates ? 'has-selection' : ''}" 
                        title="Modificar seleção">
                    <span class="state-text">${statesText}</span>
                    ${hasStates ? `<span class="state-count">(${states.length})</span>` : ''}
                </button>
                <div class="item-photos">
                    <button class="btn-item-photo btn-item-photo-1" title="Foto 1">
                        📷 1
                    </button>
                    <button class="btn-item-photo btn-item-photo-2" title="Foto 2">
                        📷 2
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Abre modal para selecionar estados
     */
    openStateSelector(secao, item) {
        const key = `${secao}|${item}`;
        const availableStates = OPCOES_ESTADO[item] || [];
        const currentStates = this.itemStates[key] || [];

        this.stateModal.open(item, availableStates, currentStates, (selectedStates) => {
            this.itemStates[key] = selectedStates;
            this.updateItemDisplay(secao, item);
            this.saveData();
        });
    }

    /**
     * Atualiza display do item após mudança de estado
     */
    updateItemDisplay(secao, item) {
        const key = `${secao}|${item}`;
        const states = this.itemStates[key] || [];
        const itemIndex = TOPICOS_INSPECAO[secao].indexOf(item);
        
        const itemElement = this.sectionsContainer.querySelector(
            `[data-section="${secao}"] .item-row[data-item-index="${itemIndex}"]`
        );

        if (itemElement) {
            const btnState = itemElement.querySelector('.btn-select-state');
            const stateText = itemElement.querySelector('.state-text');
            const stateCount = itemElement.querySelector('.state-count');

            if (states.length > 0) {
                stateText.textContent = states.join(', ');
                btnState.classList.add('has-selection');
                if (stateCount) {
                    stateCount.textContent = `(${states.length})`;
                } else {
                    const countSpan = document.createElement('span');
                    countSpan.className = 'state-count';
                    countSpan.textContent = `(${states.length})`;
                    btnState.appendChild(countSpan);
                }
            } else {
                stateText.textContent = 'Seleccionar estados...';
                btnState.classList.remove('has-selection');
                if (stateCount) {
                    stateCount.remove();
                }
            }
        }
    }

    /**
     * Opens photo selector modal (camera + file + drag & drop)
     */
    openPhotoSelector(secao, item, photoNumber) {
        const modal = document.createElement('div');
        modal.className = 'photo-selector-modal';
        modal.innerHTML = `
            <div class="photo-selector-content">
                <div class="photo-selector-header">
                    <h3>📷 Seleccionar Foto</h3>
                    <button class="btn-close-photo-modal">✕</button>
                </div>
                <div class="photo-selector-body">
                    <div class="photo-preview-area" id="photo-preview-area">
                        <p>Arrastra una imagen aquí o selecciona una opción abajo</p>
                    </div>
                    <div class="photo-actions">
                        <label class="btn-photo-action btn-file-input">
                            📁 Buscar Archivo
                            <input type="file" accept="image/*" style="display:none" id="file-input-photo">
                        </label>
                        <button class="btn-photo-action btn-open-camera">
                            📷 Abrir Cámara
                        </button>
                    </div>
                    <button class="btn-confirm-photo" style="display:none">
                        ✓ Confirmar Foto
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        let selectedPhoto = null;

        // Preview area
        const previewArea = modal.querySelector('#photo-preview-area');
        const btnConfirm = modal.querySelector('.btn-confirm-photo');
        const fileInput = modal.querySelector('#file-input-photo');
        const btnCamera = modal.querySelector('.btn-open-camera');
        const btnClose = modal.querySelector('.btn-close-photo-modal');

        // Drag & Drop
        previewArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            previewArea.classList.add('drag-over');
        });

        previewArea.addEventListener('dragleave', () => {
            previewArea.classList.remove('drag-over');
        });

        previewArea.addEventListener('drop', async (e) => {
            e.preventDefault();
            previewArea.classList.remove('drag-over');

            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                await this.showPhotoPreview(file, previewArea, btnConfirm);
                selectedPhoto = await this.fileToPhotoObject(file);
            } else {
                alert('Por favor, arrastra una imagen válida');
            }
        });

        // File input
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.showPhotoPreview(file, previewArea, btnConfirm);
                selectedPhoto = await this.fileToPhotoObject(file);
            }
        });

        // Camera button
        btnCamera.addEventListener('click', async () => {
            try {
                const photo = await cameraManager.takePhoto();
                await this.showPhotoPreview(null, previewArea, btnConfirm, photo.dataUrl);
                selectedPhoto = photo;
            } catch (error) {
                if (error.message !== 'Captura cancelada') {
                    alert('Error al abrir cámara: ' + error.message);
                }
            }
        });

        // Confirm button
        btnConfirm.addEventListener('click', () => {
            if (selectedPhoto) {
                if (item) {
                    // Item photo
                    const key = `${secao}|${item}|${photoNumber}`;
                    this.itemPhotos[key] = selectedPhoto;
                    this.updateItemPhotoButton(secao, item, photoNumber);
                } else {
                    // Section photo
                    this.sectionPhotos[secao] = selectedPhoto;
                    this.updateSectionPhotoPreview(secao);
                }
                this.saveData();
                document.body.removeChild(modal);
            }
        });

        // Close button
        btnClose.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    /**
     * Shows photo preview in modal
     */
    async showPhotoPreview(file, previewArea, btnConfirm, dataUrl = null) {
        let imageUrl = dataUrl;
        
        if (file && !dataUrl) {
            imageUrl = await this.fileToDataUrl(file);
        }

        previewArea.innerHTML = `
            <img src="${imageUrl}" alt="Preview" style="max-width: 100%; max-height: 300px; border-radius: 8px;">
            <p style="margin-top: 10px; font-size: 0.9rem; color: #4CAF50;">✓ Imagen cargada</p>
        `;
        btnConfirm.style.display = 'block';
    }

    /**
     * Converts File to photo object
     */
    async fileToPhotoObject(file) {
        const dataUrl = await this.fileToDataUrl(file);
        return {
            file,
            dataUrl,
            timestamp: Date.now()
        };
    }

    /**
     * Converts File to DataURL
     */
    fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Updates section photo preview
     */
    updateSectionPhotoPreview(secao) {
        const preview = this.sectionsContainer.querySelector(
            `[data-section="${secao}"] .section-photo-preview`
        );
        
        if (preview && this.sectionPhotos[secao]) {
            preview.style.display = 'block';
            preview.querySelector('img').src = this.sectionPhotos[secao].dataUrl;
            
            const btnRemove = preview.querySelector('.btn-remove-photo');
            btnRemove.onclick = () => this.removeSectionPhoto(secao);
        }
    }

    /**
     * Updates item photo button
     */
    updateItemPhotoButton(secao, item, photoNumber) {
        const itemIndex = TOPICOS_INSPECAO[secao].indexOf(item);
        const itemElement = this.sectionsContainer.querySelector(
            `[data-section="${secao}"] .item-row[data-item-index="${itemIndex}"]`
        );

        if (itemElement) {
            const btn = itemElement.querySelector(`.btn-item-photo-${photoNumber}`);
            if (btn) {
                btn.classList.add('has-photo');
                btn.textContent = `✓ ${photoNumber}`;
                
                // Add click to view
                btn.onclick = (e) => {
                    e.stopPropagation();
                    this.viewPhoto(secao, item, photoNumber);
                };
            }
        }
    }

    /**
     * Views photo in modal
     */
    viewPhoto(secao, item, photoNumber) {
        const key = `${secao}|${item}|${photoNumber}`;
        const photo = this.itemPhotos[key];
        
        if (!photo) return;

        const modal = document.createElement('div');
        modal.className = 'photo-view-modal';
        modal.innerHTML = `
            <div class="photo-view-content">
                <button class="btn-close-view">✕</button>
                <img src="${photo.dataUrl}" alt="Foto">
                <div class="photo-view-actions">
                    <button class="btn-delete-photo">🗑️ Eliminar Foto</button>
                    <button class="btn-replace-photo">🔄 Reemplazar Foto</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.btn-close-view').onclick = () => {
            document.body.removeChild(modal);
        };

        modal.querySelector('.btn-delete-photo').onclick = () => {
            if (confirm('¿Eliminar esta foto?')) {
                delete this.itemPhotos[key];
                this.updateItemPhotoButton(secao, item, photoNumber);
                this.saveData();
                document.body.removeChild(modal);
            }
        };

        modal.querySelector('.btn-replace-photo').onclick = () => {
            document.body.removeChild(modal);
            this.openPhotoSelector(secao, item, photoNumber);
        };

        modal.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        };
    }

    /**
     * Adiciona foto da seção (deprecated - usa openPhotoSelector)
     */
    async addSectionPhoto(secao) {
        try {
            const photo = await cameraManager.takePhoto();
            this.sectionPhotos[secao] = {
                file: photo.file,
                dataUrl: photo.dataUrl,
                timestamp: Date.now()
            };
            
            // Update UI
            const preview = this.sectionsContainer.querySelector(
                `[data-section="${secao}"] .section-photo-preview`
            );
            if (preview) {
                preview.style.display = 'block';
                preview.querySelector('img').src = photo.dataUrl;
                
                const btnRemove = preview.querySelector('.btn-remove-photo');
                btnRemove.onclick = () => this.removeSectionPhoto(secao);
            }

            this.saveData();
        } catch (error) {
            console.error('Error adding section photo:', error);
            alert('Error al capturar foto: ' + error.message);
        }
    }

    /**
     * Remove foto da seção
     */
    removeSectionPhoto(secao) {
        delete this.sectionPhotos[secao];
        
        const preview = this.sectionsContainer.querySelector(
            `[data-section="${secao}"] .section-photo-preview`
        );
        if (preview) {
            preview.style.display = 'none';
            preview.querySelector('img').src = '';
        }

        this.saveData();
    }

    /**
     * Adiciona foto de item (1 ou 2)
     */
    async addItemPhoto(secao, item, photoNumber) {
        try {
            const photo = await cameraManager.takePhoto();
            const key = `${secao}|${item}|${photoNumber}`;
            
            this.itemPhotos[key] = {
                file: photo.file,
                dataUrl: photo.dataUrl,
                timestamp: Date.now()
            };

            // Update button UI
            const itemIndex = TOPICOS_INSPECAO[secao].indexOf(item);
            const itemElement = this.sectionsContainer.querySelector(
                `[data-section="${secao}"] .item-row[data-item-index="${itemIndex}"]`
            );

            if (itemElement) {
                const btn = itemElement.querySelector(`.btn-item-photo-${photoNumber}`);
                btn.classList.add('has-photo');
                btn.textContent = `✓ ${photoNumber}`;
            }

            this.saveData();
        } catch (error) {
            console.error('Error adding item photo:', error);
            alert('Error al capturar foto: ' + error.message);
        }
    }

    /**
     * Coleta dados gerais do formulário
     */
    collectGeneralData() {
        return {
            año: document.getElementById('año')?.value || '',
            semana: document.getElementById('semana')?.value || '',
            cliente: document.getElementById('cliente')?.value || '',
            albaran: document.getElementById('albaran')?.value || '',
            codIngeniero: document.getElementById('cod-ingeniero')?.value || '',
            ubicacion: document.getElementById('ubicacion')?.value || '',
            perfiles: document.getElementById('perfiles')?.value || '',
            peticiones: document.getElementById('peticiones')?.value || ''
        };
    }

    /**
     * Popula dados gerais no formulário
     */
    populateGeneralData(data) {
        if (!data) return;

        const fields = ['año', 'semana', 'cliente', 'albaran', 'cod-ingeniero', 
                       'ubicacion', 'perfiles', 'peticiones'];
        
        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element && data[field]) {
                element.value = data[field];
            }
        });
    }

    /**
     * Coleta observações
     */
    collectObservations() {
        return document.getElementById('observaciones')?.value || '';
    }

    /**
     * Popula observações
     */
    populateObservations(text) {
        const element = document.getElementById('observaciones');
        if (element) {
            element.value = text || '';
        }
    }

    /**
     * Salva todos os dados
     */
    async saveData() {
        try {
            const data = {
                generalData: this.collectGeneralData(),
                observations: this.collectObservations(),
                itemStates: this.itemStates,
                sectionPhotos: this.sectionPhotos,
                itemPhotos: this.itemPhotos,
                timestamp: Date.now()
            };

            await db.save('currentReport', data);
            console.log('✅ Data saved successfully');
        } catch (error) {
            console.error('❌ Error saving data:', error);
        }
    }

    /**
     * Carrega dados salvos
     */
    async loadData() {
        try {
            const data = await db.load('currentReport');
            if (!data) return;

            this.itemStates = data.itemStates || {};
            this.sectionPhotos = data.sectionPhotos || {};
            this.itemPhotos = data.itemPhotos || {};

            this.populateGeneralData(data.generalData);
            this.populateObservations(data.observations);
            
            // Update UI
            this.updateAllDisplays();
            
            console.log('✅ Data loaded successfully');
        } catch (error) {
            console.error('❌ Error loading data:', error);
        }
    }

    /**
     * Atualiza todos os displays após carregar dados
     */
    updateAllDisplays() {
        // Update item states
        Object.entries(this.itemStates).forEach(([key, states]) => {
            const [secao, item] = key.split('|');
            this.updateItemDisplay(secao, item);
        });

        // Update section photos
        Object.entries(this.sectionPhotos).forEach(([secao, photo]) => {
            const preview = this.sectionsContainer.querySelector(
                `[data-section="${secao}"] .section-photo-preview`
            );
            if (preview && photo.dataUrl) {
                preview.style.display = 'block';
                preview.querySelector('img').src = photo.dataUrl;
                
                const btnRemove = preview.querySelector('.btn-remove-photo');
                btnRemove.onclick = () => this.removeSectionPhoto(secao);
            }
        });

        // Update item photos
        Object.entries(this.itemPhotos).forEach(([key, photo]) => {
            const [secao, item, photoNumber] = key.split('|');
            const itemIndex = TOPICOS_INSPECAO[secao].indexOf(item);
            
            const itemElement = this.sectionsContainer.querySelector(
                `[data-section="${secao}"] .item-row[data-item-index="${itemIndex}"]`
            );

            if (itemElement) {
                const btn = itemElement.querySelector(`.btn-item-photo-${photoNumber}`);
                if (btn) {
                    btn.classList.add('has-photo');
                    btn.textContent = `✓ ${photoNumber}`;
                }
            }
        });
    }

    /**
     * Limpa todos os dados
     */
    async clearAll() {
        if (!confirm('¿Está seguro de que desea borrar todos los datos?')) {
            return;
        }

        this.itemStates = {};
        this.sectionPhotos = {};
        this.itemPhotos = {};

        await db.delete('currentReport');
        
        this.renderAllSections();
        
        // Clear general form
        ['año', 'semana', 'cliente', 'albaran', 'cod-ingeniero', 
         'ubicacion', 'perfiles', 'peticiones', 'observaciones'].forEach(field => {
            const element = document.getElementById(field);
            if (element) element.value = '';
        });

        console.log('✅ All data cleared');
    }

    /**
     * Obtém dados completos para geração de relatório
     */
    async getReportData() {
        return {
            generalData: this.collectGeneralData(),
            observations: this.collectObservations(),
            sections: this.formatSectionsForReport(),
            sectionPhotos: this.sectionPhotos,
            itemPhotos: this.itemPhotos
        };
    }

    /**
     * Formata seções para relatório (compatível com docx.js)
     */
    formatSectionsForReport() {
        const formatted = {};

        Object.entries(TOPICOS_INSPECAO).forEach(([secao, itens]) => {
            formatted[secao] = {};
            
            itens.forEach(item => {
                const key = `${secao}|${item}`;
                const states = this.itemStates[key] || [];
                
                // Só incluir itens com estados selecionados
                if (states.length > 0) {
                    formatted[secao][item] = states.join(', ');
                }
            });
        });

        return formatted;
    }
}

// Exporta instância única
export const formsManager = new FormsManager();

// Auto-save a cada 30 segundos
setInterval(() => {
    formsManager.saveData();
}, 30000);
