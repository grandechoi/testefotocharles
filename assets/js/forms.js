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
        btnSectionPhoto.addEventListener('click', () => this.addSectionPhoto(secao));

        // Items event listeners
        itens.forEach((item, itemIndex) => {
            const itemElement = card.querySelector(`[data-item-index="${itemIndex}"]`);
            
            // State selector button
            const btnState = itemElement.querySelector('.btn-select-state');
            btnState.addEventListener('click', () => this.openStateSelector(secao, item));

            // Photo buttons
            const btnPhoto1 = itemElement.querySelector('.btn-item-photo-1');
            const btnPhoto2 = itemElement.querySelector('.btn-item-photo-2');
            btnPhoto1.addEventListener('click', () => this.addItemPhoto(secao, item, 1));
            btnPhoto2.addEventListener('click', () => this.addItemPhoto(secao, item, 2));
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
     * Adiciona foto da seção
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
