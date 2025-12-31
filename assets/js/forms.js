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
        this.itemPhotos = {}; // Now arrays: { "secao|item": [{file, dataUrl, timestamp}, ...] }
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
        card.className = 'section-card collapsed';
        card.innerHTML = `
            <div class="section-header" data-section="${secao}">
                <h3>
                    <span class="section-toggle">▶</span>
                    <span class="section-number">${sectionIndex + 1}</span>
                    ${secao}
                </h3>
            </div>
            <div class="items-list" data-section="${secao}" style="display: none;">
                ${itens.map((item, itemIndex) => this.createItemHTML(secao, item, itemIndex)).join('')}
            </div>
        `;

        // Event listeners
        const sectionHeader = card.querySelector('.section-header');
        sectionHeader.addEventListener('click', (e) => {
            this.toggleSection(card);
        });

        // Items event listeners
        itens.forEach((item, itemIndex) => {
            const itemElement = card.querySelector(`[data-item-index="${itemIndex}"]`);
            
            // State selector button
            const btnState = itemElement.querySelector('.btn-select-state');
            btnState.addEventListener('click', () => this.openStateSelector(secao, item));

            // Add photo button
            const btnAddPhoto = itemElement.querySelector('.btn-add-photo');
            btnAddPhoto.addEventListener('click', () => this.openItemPhotoSelector(secao, item));
            
            // Render existing photos
            this.renderItemPhotos(secao, item);
        });

        return card;
    }

    toggleSection(card) {
        const itemsList = card.querySelector('.items-list');
        const toggle = card.querySelector('.section-toggle');
        const isCollapsed = card.classList.toggle('collapsed');
        
        if (isCollapsed) {
            itemsList.style.display = 'none';
            toggle.textContent = '▶';
        } else {
            itemsList.style.display = 'flex';
            toggle.textContent = '▼';
        }
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
                <div class="item-photos-gallery" data-section="${secao}" data-item="${item}">
                    <button class="btn-add-photo" title="Adicionar foto">
                        📷 +
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
     * Converte File para dataURL com compressão
     */
    async fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    // Comprimir imagem antes de salvar
                    const compressed = await this.compressImage(e.target.result, 1920, 0.85);
                    resolve(compressed);
                } catch (error) {
                    console.warn('Compression failed, using original:', error);
                    resolve(e.target.result);
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Comprime imagem para reduzir tamanho em localStorage
     */
    async compressImage(dataUrl, maxWidth = 1920, quality = 0.85) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Redimensionar se necessário
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Comprimir como JPEG
                    const compressed = canvas.toDataURL('image/jpeg', quality);
                    
                    console.log(`🖼️ Image compressed: ${Math.round(dataUrl.length/1024)}KB → ${Math.round(compressed.length/1024)}KB`);
                    
                    resolve(compressed);
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = reject;
            img.src = dataUrl;
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
     * Renders photo gallery for an item
     */
    renderItemPhotos(secao, item) {
        const itemIndex = TOPICOS_INSPECAO[secao].indexOf(item);
        const itemElement = this.sectionsContainer.querySelector(
            `[data-section="${secao}"] .item-row[data-item-index="${itemIndex}"]`
        );

        if (!itemElement) return;

        const gallery = itemElement.querySelector('.item-photos-gallery');
        if (!gallery) return;

        const key = `${secao}|${item}`;
        const photos = this.itemPhotos[key] || [];

        // Clear existing thumbnails (keep add button)
        const addBtn = gallery.querySelector('.btn-add-photo');
        gallery.innerHTML = '';
        gallery.appendChild(addBtn);

        // Render thumbnails
        photos.forEach((photo, index) => {
            const thumb = document.createElement('div');
            thumb.className = 'photo-thumbnail';
            thumb.style.backgroundImage = `url(${photo.dataUrl})`;
            thumb.onclick = () => this.viewItemPhoto(secao, item, index);
            gallery.appendChild(thumb);
        });
    }

    /**
     * Views item photo in modal
     */
    viewItemPhoto(secao, item, photoIndex) {
        const key = `${secao}|${item}`;
        const photos = this.itemPhotos[key] || [];
        const photo = photos[photoIndex];
        
        if (!photo) return;

        const modal = document.createElement('div');
        modal.className = 'photo-view-modal';
        modal.innerHTML = `
            <div class="photo-view-content">
                <button class="btn-close-view">✕</button>
                <img src="${photo.dataUrl}" alt="Foto">
                <div class="photo-view-actions">
                    <button class="btn-delete-photo">🗑️ Eliminar Foto</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.btn-close-view').onclick = () => {
            document.body.removeChild(modal);
        };

        modal.querySelector('.btn-delete-photo').onclick = () => {
            if (confirm('¿Eliminar esta foto?')) {
                const key = `${secao}|${item}`;
                const photos = this.itemPhotos[key] || [];
                photos.splice(photoIndex, 1);
                if (photos.length === 0) {
                    delete this.itemPhotos[key];
                }
                this.renderItemPhotos(secao, item);
                this.saveData();
                document.body.removeChild(modal);
            }
        };

        modal.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        };
    }

    /**
     * Opens photo selector for item
     */
    openItemPhotoSelector(secao, item) {
        const modal = document.createElement('div');
        modal.className = 'photo-selector-modal';
        modal.innerHTML = `
            <div class="photo-selector-content">
                <div class="photo-selector-header">
                    <h3>📷 Seleccionar Foto</h3>
                    <button class="btn-close-photo-modal">✕</button>
                </div>
                <div class="photo-selector-body">
                    <div class="photo-preview-area" id="photo-preview-area-item">
                        <p>Arrastra una imagen aquí o selecciona una opción abajo</p>
                    </div>
                    <div class="photo-actions">
                        <label class="btn-photo-action btn-file-input">
                            📁 Buscar Archivo
                            <input type="file" accept="image/*" style="display:none" id="file-input-photo-item">
                        </label>
                        <button class="btn-photo-action btn-open-camera-item">
                            📷 Abrir Cámara
                        </button>
                    </div>
                    <button class="btn-confirm-photo btn-confirm-photo-item" style="display:none">
                        ✓ Confirmar Foto
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        let selectedPhoto = null;

        const previewArea = modal.querySelector('#photo-preview-area-item');
        const btnConfirm = modal.querySelector('.btn-confirm-photo-item');
        const fileInput = modal.querySelector('#file-input-photo-item');
        const btnCamera = modal.querySelector('.btn-open-camera-item');
        const btnClose = modal.querySelector('.btn-close-photo-modal');

        // File input
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                selectedPhoto = await this.fileToPhotoObject(file);
                await this.showPhotoPreview(file, previewArea, btnConfirm);
            }
        });

        // Camera button
        btnCamera.addEventListener('click', async () => {
            modal.style.display = 'none';
            try {
                const photo = await cameraManager.takePhoto();
                selectedPhoto = photo;
                await this.showPhotoPreview(null, previewArea, btnConfirm, photo.dataUrl);
                modal.style.display = 'flex';
            } catch (error) {
                modal.style.display = 'flex';
                if (error.message !== 'Captura cancelada') {
                    alert('Error al abrir cámara: ' + error.message);
                }
            }
        });

        // Confirm button
        btnConfirm.addEventListener('click', () => {
            if (selectedPhoto) {
                const key = `${secao}|${item}`;
                if (!this.itemPhotos[key]) {
                    this.itemPhotos[key] = [];
                }
                this.itemPhotos[key].push({
                    dataUrl: selectedPhoto.dataUrl,
                    timestamp: Date.now()
                });
                this.renderItemPhotos(secao, item);
                this.saveData();
                document.body.removeChild(modal);
            }
        });

        // Close button
        btnClose.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // Close on overlay
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
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
            empresa: document.getElementById('empresa')?.value || '',
            direccion: document.getElementById('direccion')?.value || '',
            albaran: document.getElementById('albaran')?.value || '',
            codIngeniero: document.getElementById('cod-ingeniero')?.value || '',
            fechaVisita: document.getElementById('fecha-visita')?.value || '',
            perfiles: document.getElementById('perfiles')?.value || '',
            peticiones: document.getElementById('peticiones')?.value || '',
            descripcionVisita: document.getElementById('descripcion-visita')?.value || ''
        };
    }

    /**
     * Popula dados gerais no formulário
     */
    populateGeneralData(data) {
        if (!data) return;

        const fieldMap = {
            'año': 'año',
            'semana': 'semana',
            'empresa': 'empresa',
            'direccion': 'direccion',
            'albaran': 'albaran',
            'cod-ingeniero': 'codIngeniero',
            'fecha-visita': 'fechaVisita',
            'perfiles': 'perfiles',
            'peticiones': 'peticiones',
            'descripcion-visita': 'descripcionVisita'
        };
        
        Object.entries(fieldMap).forEach(([fieldId, dataKey]) => {
            const element = document.getElementById(fieldId);
            if (element && data[dataKey]) {
                element.value = data[dataKey];
            }
        });
    }

    /**
     * Coleta observações
     */
    collectObservations() {
        return {
            recomendaciones: document.getElementById('recomendaciones')?.value || '',
            conclusion: document.getElementById('conclusion')?.value || '',
            accionesCorrectivas: window.app?.accionesCorrectivas || [],
            generalPhotos: window.app?.generalPhotos || {}
        };
    }

    /**
     * Popula observações
     */
    populateObservations(data) {
        if (!data) return;
        
        const recomendacionesEl = document.getElementById('recomendaciones');
        if (recomendacionesEl && data.recomendaciones) {
            recomendacionesEl.value = data.recomendaciones;
        }
        
        const conclusionEl = document.getElementById('conclusion');
        if (conclusionEl && data.conclusion) {
            conclusionEl.value = data.conclusion;
        }
        
        // Load acciones correctivas
        if (data.accionesCorrectivas && window.app) {
            window.app.accionesCorrectivas = [];
            data.accionesCorrectivas.forEach(accion => {
                window.app.addAccionCorrectiva(accion);
            });
        }
        
        // Load general photos
        if (data.generalPhotos && window.app) {
            window.app.generalPhotos = data.generalPhotos;
            // Render photos
            ['recomendaciones', 'conclusion'].forEach(campo => {
                if (data.generalPhotos[campo]) {
                    window.app.renderGeneralPhotos(campo);
                }
            });
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
                hoursData: this.collectHoursData(),
                signatures: this.collectSignaturesData(),
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
            this.populateHoursData(data.hoursData);
            this.populateSignaturesData(data.signatures);
            
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

        // Update item photos - render galleries for all items
        Object.keys(TOPICOS_INSPECAO).forEach(secao => {
            TOPICOS_INSPECAO[secao].forEach(item => {
                this.renderItemPhotos(secao, item);
            });
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

        // Delete current report from IndexedDB
        try {
            await db.delete('drafts', 'currentReport');
        } catch (error) {
            console.log('No current report to delete');
        }
        
        this.renderAllSections();
        
        // Clear general form
        ['año', 'semana', 'empresa', 'direccion', 'albaran', 'cod-ingeniero', 'fecha-visita',
         'perfiles', 'peticiones', 'descripcion-visita', 'observaciones'].forEach(field => {
            const element = document.getElementById(field);
            if (element) element.value = '';
        });

        // **NOVO**: Limpar assinaturas
        ['nombre-ingeniero', 'nombre-cliente-firma'].forEach(field => {
            const element = document.getElementById(field);
            if (element) element.value = '';
        });
        
        // Limpar assinaturas do app
        if (window.app && window.app.signatures) {
            window.app.signatures.ingeniero = null;
            window.app.signatures.cliente = null;
            
            // Reset containers
            ['ingeniero', 'cliente'].forEach(type => {
                const container = document.getElementById(`signature-${type}-container`);
                if (container) {
                    container.classList.remove('has-signature');
                    container.innerHTML = `
                        <div class="signature-placeholder">
                            ✍️ Toque aquí para firmar
                        </div>
                    `;
                }
            });
        }

        // **NOVO**: Limpar tabela de horas
        document.querySelectorAll('.hours-input, .date-input, .comment-input').forEach(input => {
            input.value = '';
        });
        
        // Resetar totais
        ['viaje', 'normales', 'extras', 'sabados', 'feriados'].forEach(col => {
            const totalEl = document.getElementById(`total-${col}`);
            if (totalEl) totalEl.textContent = '0';
        });

        // Limpar galleries de fotos de cada item
        Object.keys(TOPICOS_INSPECAO).forEach(secao => {
            TOPICOS_INSPECAO[secao].forEach(item => {
                this.renderItemPhotos(secao, item);
            });
        });

        // Limpar acciones correctivas
        if (window.app) {
            if (window.app.accionesCorrectivas) {
                window.app.accionesCorrectivas = [];
            }
            const container = document.getElementById('acciones-correctivas-container');
            if (container) container.innerHTML = '';
            
            // Limpar fotos gerais (recomendaciones, conclusion)
            if (window.app.generalPhotos) {
                window.app.generalPhotos = {};
            }
            ['recomendaciones', 'conclusion'].forEach(campo => {
                const photoContainer = document.getElementById(`${campo}-photos`);
                if (photoContainer) photoContainer.innerHTML = '';
            });
        }

        console.log('✅ All data cleared (including signatures, hours, acciones, and general photos)');
    }

    /**
     * Coleta dados da tabela de horas
     */
    collectHoursData() {
        const days = ['LUN', 'MAR', 'MIER', 'JUE', 'VIER', 'SAB', 'DOM'];
        const hoursData = {};

        days.forEach(day => {
            const row = document.querySelector(`tr[data-day="${day}"]`);
            if (!row) return;

            hoursData[day] = {
                fecha: row.querySelector('.date-input')?.value || '',
                viaje: row.querySelector('.hours-input[data-col="viaje"]')?.value || '',
                normales: row.querySelector('.hours-input[data-col="normales"]')?.value || '',
                extras: row.querySelector('.hours-input[data-col="extras"]')?.value || '',
                sabados: row.querySelector('.hours-input[data-col="sabados"]')?.value || '',
                feriados: row.querySelector('.hours-input[data-col="feriados"]')?.value || '',
                comentarios: row.querySelector('.comment-input')?.value || ''
            };
        });

        return hoursData;
    }

    /**
     * Popula tabela de horas com dados salvos
     */
    populateHoursData(data) {
        if (!data) return;

        const days = ['LUN', 'MAR', 'MIER', 'JUE', 'VIER', 'SAB', 'DOM'];

        days.forEach(day => {
            const dayData = data[day];
            if (!dayData) return;

            const row = document.querySelector(`tr[data-day="${day}"]`);
            if (!row) return;

            const dateInput = row.querySelector('.date-input');
            if (dateInput) dateInput.value = dayData.fecha || '';

            const viajeInput = row.querySelector('.hours-input[data-col="viaje"]');
            if (viajeInput) viajeInput.value = dayData.viaje || '';

            const normalesInput = row.querySelector('.hours-input[data-col="normales"]');
            if (normalesInput) normalesInput.value = dayData.normales || '';

            const extrasInput = row.querySelector('.hours-input[data-col="extras"]');
            if (extrasInput) extrasInput.value = dayData.extras || '';

            const sabadosInput = row.querySelector('.hours-input[data-col="sabados"]');
            if (sabadosInput) sabadosInput.value = dayData.sabados || '';

            const feriadosInput = row.querySelector('.hours-input[data-col="feriados"]');
            if (feriadosInput) feriadosInput.value = dayData.feriados || '';

            const commentInput = row.querySelector('.comment-input');
            if (commentInput) commentInput.value = dayData.comentarios || '';
        });

        // Recalcular totais
        if (window.app && window.app.calculateHoursTotals) {
            window.app.calculateHoursTotals();
        }
    }

    /**
     * Coleta dados das assinaturas
     */
    collectSignaturesData() {
        const data = {
            ingeniero: {
                nombre: document.getElementById('nombre-ingeniero')?.value || ''
            },
            cliente: {
                nombre: document.getElementById('nombre-cliente-firma')?.value || ''
            }
        };
        
        // Add signature images from app if available
        if (window.app && window.app.signatures) {
            data.ingeniero.signature = window.app.signatures.ingeniero || null;
            data.cliente.signature = window.app.signatures.cliente || null;
        }
        
        return data;
    }

    /**
     * Popula dados das assinaturas
     */
    populateSignaturesData(data) {
        if (!data) return;

        if (data.ingeniero && data.ingeniero.nombre) {
            const ingenieroInput = document.getElementById('nombre-ingeniero');
            if (ingenieroInput) ingenieroInput.value = data.ingeniero.nombre;
        }

        if (data.cliente && data.cliente.nombre) {
            const clienteInput = document.getElementById('nombre-cliente-firma');
            if (clienteInput) clienteInput.value = data.cliente.nombre;
        }

        // Restore signature images if available
        if (window.app && window.app.signatures) {
            if (data.ingeniero && data.ingeniero.signature) {
                window.app.signatures.ingeniero = data.ingeniero.signature;
                const container = document.getElementById('signature-ingeniero-container');
                if (container) {
                    container.classList.add('has-signature');
                    container.innerHTML = `
                        <img src="${data.ingeniero.signature}" class="signature-preview" alt="Firma">
                        <button type="button" class="signature-remove-btn" onclick="app.removeSignature('ingeniero')">✕</button>
                    `;
                }
            }
            
            if (data.cliente && data.cliente.signature) {
                window.app.signatures.cliente = data.cliente.signature;
                const container = document.getElementById('signature-cliente-container');
                if (container) {
                    container.classList.add('has-signature');
                    container.innerHTML = `
                        <img src="${data.cliente.signature}" class="signature-preview" alt="Firma">
                        <button type="button" class="signature-remove-btn" onclick="app.removeSignature('cliente')">✕</button>
                    `;
                }
            }
        }
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
            itemPhotos: this.itemPhotos,
            hoursData: this.collectHoursData(),
            signatures: this.collectSignaturesData()
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
