/**
 * app.js
 * Main application orchestration (GenReport PWA version)
 */

import { formsManager } from './forms.js';
import { cameraManager } from './camera.js';
import { reportsManager } from './reports.js';

class App {
    constructor() {
        this.initialized = false;
        this.init();
    }

    async init() {
        if (this.initialized) return;

        try {
            // Register service worker
            await this.registerServiceWorker();

            // Setup event listeners
            this.setupEventListeners();

            // Initialize camera
            await cameraManager.init();

            // Auto-save every minute
            setInterval(() => {
                formsManager.saveData();
            }, 60000);

            this.initialized = true;
            console.log('✅ ReportManager initialized successfully');
            
            this.showStatus('Aplicación lista', 'success');
        } catch (error) {
            console.error('❌ Error initializing app:', error);
            this.showStatus('Error al inicializar', 'error');
        }
    }

    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.warn('⚠️ Service Worker not supported');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('✅ Service Worker registered:', registration);
        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
        }
    }

    setupEventListeners() {
        // Save draft button
        const saveDraftBtn = document.getElementById('save-draft');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', () => this.saveDraft());
        }

        // Load draft button
        const loadDraftBtn = document.getElementById('load-draft');
        if (loadDraftBtn) {
            loadDraftBtn.addEventListener('click', () => this.showDraftModal());
        }

        // Generate report button
        const generateBtn = document.getElementById('generate-report');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateReport());
        }

        // Clear all button
        const clearBtn = document.getElementById('clear-all');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => formsManager.clearAll());
        }

        // Listen for general form changes to auto-save
        const generalFields = ['año', 'semana', 'cliente', 'albaran', 'cod-ingeniero', 
                               'ubicacion', 'perfiles', 'peticiones', 'observaciones'];
        
        generalFields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.addEventListener('change', () => {
                    formsManager.saveData();
                });
            }
        });
    }

    async saveDraft() {
        try {
            const data = await formsManager.getReportData();
            
            const draftName = prompt('Nombre del borrador:', 
                `Borrador_${new Date().toLocaleDateString('es-ES')}`);
            
            if (!draftName) return;

            // Save to localStorage with custom name
            localStorage.setItem(`draft_${draftName}`, JSON.stringify(data));
            
            this.showStatus(`✅ Borrador "${draftName}" guardado`, 'success');
        } catch (error) {
            console.error('Error saving draft:', error);
            this.showStatus('Error al guardar borrador', 'error');
        }
    }

    showDraftModal() {
        // Get all drafts from localStorage
        const drafts = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('draft_')) {
                const name = key.replace('draft_', '');
                const data = JSON.parse(localStorage.getItem(key));
                drafts.push({ name, data, key });
            }
        }

        if (drafts.length === 0) {
            alert('No hay borradores guardados');
            return;
        }

        // Create and show modal
        const modal = document.getElementById('draft-modal');
        if (!modal) {
            alert('Modal de borradores no encontrado');
            return;
        }

        const draftList = document.getElementById('draft-list');
        draftList.innerHTML = '';

        drafts.forEach(draft => {
            const item = document.createElement('div');
            item.className = 'draft-item';
            item.innerHTML = `
                <span>${draft.name}</span>
                <div>
                    <button class="btn btn-secondary" onclick="app.loadDraft('${draft.key}')">
                        Cargar
                    </button>
                    <button class="btn btn-danger" onclick="app.deleteDraft('${draft.key}')">
                        Eliminar
                    </button>
                </div>
            `;
            draftList.appendChild(item);
        });

        modal.classList.remove('hidden');

        // Close modal listeners
        const closeButtons = modal.querySelectorAll('.modal-close');
        closeButtons.forEach(btn => {
            btn.onclick = () => modal.classList.add('hidden');
        });
    }

    loadDraft(key) {
        try {
            const dataStr = localStorage.getItem(key);
            if (!dataStr) {
                alert('Borrador no encontrado');
                return;
            }

            const data = JSON.parse(dataStr);

            // Load data into forms
            formsManager.itemStates = data.sections || {};
            formsManager.sectionPhotos = data.sectionPhotos || {};
            formsManager.itemPhotos = data.itemPhotos || {};
            
            formsManager.populateGeneralData(data.generalData);
            formsManager.populateObservations(data.observations);
            formsManager.updateAllDisplays();

            // Close modal
            const modal = document.getElementById('draft-modal');
            if (modal) modal.classList.add('hidden');

            this.showStatus('✅ Borrador cargado', 'success');
        } catch (error) {
            console.error('Error loading draft:', error);
            alert('Error al cargar borrador');
        }
    }

    deleteDraft(key) {
        if (!confirm('¿Eliminar este borrador?')) return;

        localStorage.removeItem(key);
        this.showDraftModal(); // Refresh list
        this.showStatus('✅ Borrador eliminado', 'success');
    }

    async generateReport() {
        try {
            this.showStatus('Generando informe...', 'info');

            const data = await formsManager.getReportData();

            // Validate required fields
            if (!data.generalData.cliente) {
                alert('Por favor, complete el campo Cliente');
                return;
            }

            // Generate Word document
            await reportsManager.generateReport(data);

            this.showStatus('✅ Informe generado correctamente', 'success');
        } catch (error) {
            console.error('Error generating report:', error);
            this.showStatus('Error al generar informe: ' + error.message, 'error');
        }
    }

    showStatus(message, type = 'info') {
        const statusEl = document.getElementById('status');
        if (!statusEl) return;

        statusEl.textContent = message;
        statusEl.className = `status status-${type}`;
        statusEl.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 5000);
    }
}

// Initialize app
const app = new App();

// Make app available globally for inline onclick handlers
window.app = app;

console.log('📱 ReportManager PWA - GenReport Structure');
console.log('✓ 6 sections predefined');
console.log('✓ 64 items total');
console.log('✓ State selection modal');
console.log('✓ 2 photos per item support');
