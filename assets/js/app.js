/**
 * app.js
 * Main application orchestration (GenReport PWA version)
 */

import { formsManager } from './forms.js';
import { cameraManager } from './camera.js';
import { reportsManager } from './reports.js';
import { db } from './database.js';
import { photoEditor } from './photo-editor.js';
import { equipmentManager } from './equipment-manager.js';

// Expose to window for console debugging
window.db = db;
window.formsManager = formsManager;
window.cameraManager = cameraManager;
window.reportsManager = reportsManager;
window.photoEditor = photoEditor;
window.equipmentManager = equipmentManager;

class App {
    constructor() {
        this.initialized = false;
        this.currentTab = 'datos';
        this.signaturePads = {};
        this.accionesCorrectivas = [];
        this.generalPhotos = {};
        this.init();
    }

    async init() {
        if (this.initialized) return;

        try {
            // Register service worker
            await this.registerServiceWorker();

            // Setup event listeners
            this.setupEventListeners();

            // Initialize signatures
            this.initSignatures();

            // Initialize camera
            await cameraManager.init();

            // **NOVO**: Initialize equipment manager
            equipmentManager.setNumberOfEquipments(1);

            // **NOVO**: Initialize hours table calculations
            this.initHoursTable();
            
            // **NOVO**: Initialize acciones correctivas
            setTimeout(() => this.initAccionesCorrectivas(), 100);

            // Load saved data on startup
            await formsManager.loadData();

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
    
    /**
     * Define número de equipamentos
     */
    setNumberOfEquipments(num) {
        equipmentManager.setNumberOfEquipments(num);
    }
    
    /**
     * Troca para outro equipamento
     */
    switchEquipment(equipNum) {
        equipmentManager.switchEquipment(equipNum);
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
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });

        // FAB - Generate report
        const fabGenerate = document.getElementById('fab-generate');
        if (fabGenerate) {
            fabGenerate.addEventListener('click', () => this.generateReport());
        }

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

        // Export draft button
        const exportDraftBtn = document.getElementById('export-draft');
        if (exportDraftBtn) {
            exportDraftBtn.addEventListener('click', () => this.exportDraft());
        }

        // Import draft button
        const importDraftBtn = document.getElementById('import-draft');
        if (importDraftBtn) {
            importDraftBtn.addEventListener('click', () => this.importDraft());
        }

        // Check storage button
        const checkStorageBtn = document.getElementById('check-storage');
        if (checkStorageBtn) {
            checkStorageBtn.addEventListener('click', () => this.checkStorage());
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
                               'perfiles', 'peticiones', 'observaciones'];
        
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
            
            // Add acciones correctivas and general photos from app
            data.accionesCorrectivas = this.accionesCorrectivas || [];
            data.generalPhotos = this.generalPhotos || {};
            
            // Count photos for debugging
            let photoCount = 0;
            Object.values(data.itemPhotos || {}).forEach(photos => {
                if (Array.isArray(photos)) photoCount += photos.length;
            });
            Object.values(data.generalPhotos || {}).forEach(photos => {
                if (Array.isArray(photos)) photoCount += photos.length;
            });
            console.log(`📷 Total photos: ${photoCount}`);
            
            const draftName = prompt('Nombre del borrador:', 
                `Borrador_${new Date().toLocaleDateString('es-ES')}`);
            
            if (!draftName) return;

            // Sanitize draft name (remove invalid characters)
            const safeName = draftName.replace(/[<>:"/\\|?*]/g, '_').substring(0, 50);
            
            // Convert to JSON and check size
            const dataStr = JSON.stringify(data);
            const sizeKB = Math.round(dataStr.length / 1024);
            const sizeMB = (sizeKB / 1024).toFixed(2);
            
            console.log(`📦 Borrador size: ${sizeKB} KB (${sizeMB} MB)`);
            
            // Check available quota
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                const usagePercent = ((estimate.usage / estimate.quota) * 100).toFixed(2);
                console.log(`💾 Storage: ${usagePercent}% usado (${(estimate.usage / 1024 / 1024).toFixed(2)} MB de ${(estimate.quota / 1024 / 1024).toFixed(2)} MB)`);
                
                // Warn if storage is almost full
                if (estimate.usage / estimate.quota > 0.9) {
                    if (!confirm(`⚠️ Espacio casi lleno (${usagePercent}%).\n\nElimine borradores antiguos antes de continuar.\n\n¿Continuar de todos modos?`)) {
                        return;
                    }
                }
            }
            
            // Use IndexedDB for drafts (supports much larger sizes)
            try {
                // Delete old draft with same name first
                const existingDrafts = await db.getAll('drafts');
                const existing = existingDrafts.find(d => d.name === safeName);
                if (existing) {
                    await db.delete('drafts', safeName);
                    console.log(`🗑️ Borrador anterior eliminado: ${safeName}`);
                }
                
                await db.put('drafts', {
                    name: safeName,
                    data: data,
                    timestamp: Date.now(),
                    size: dataStr.length
                });
                
                const displaySize = sizeMB >= 1 ? `${sizeMB} MB` : `${sizeKB} KB`;
                this.showStatus(`✅ Borrador "${safeName}" guardado (${displaySize}, ${photoCount} fotos)`, 'success');
            } catch (dbError) {
                console.error('IndexedDB error:', dbError);
                
                // Check if it's a quota error
                if (dbError.name === 'QuotaExceededError' || dbError.message.includes('quota')) {
                    throw new Error(`Espacio insuficiente en el navegador.\n\nTamaño del borrador: ${sizeMB} MB\nFotos: ${photoCount}\n\nElimine borradores antiguos o reduzca el número de fotos.`);
                }
                
                throw new Error(`Error en base de datos: ${dbError.message}`);
            }
        } catch (error) {
            console.error('Error saving draft:', error);
            alert(`❌ Error al guardar borrador:\n\n${error.message}`);
            this.showStatus('Error al guardar borrador', 'error');
        }
    }

    async showDraftModal() {
        try {
            // Get all drafts from IndexedDB
            const dbDrafts = await db.getAll('drafts') || [];
            
            // Also get old localStorage drafts for migration
            const localDrafts = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('draft_')) {
                    const name = key.replace('draft_', '');
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        localDrafts.push({ name, data, key, source: 'localStorage' });
                    } catch (e) {
                        console.error('Error parsing draft:', key, e);
                    }
                }
            }
            
            const allDrafts = [
                ...dbDrafts.map(d => ({ 
                    name: d.name, 
                    data: d.data, 
                    timestamp: d.timestamp,
                    size: d.size,
                    source: 'indexedDB' 
                })),
                ...localDrafts
            ];

            if (allDrafts.length === 0) {
                alert('No hay borradores guardados');
                return;
            }

            // Sort by timestamp (newest first)
            allDrafts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

            // Create and show modal
            const modal = document.getElementById('draft-modal');
            if (!modal) {
                alert('Modal de borradores no encontrado');
                return;
            }

            const draftList = document.getElementById('draft-list');
            draftList.innerHTML = '';

            allDrafts.forEach(draft => {
                const item = document.createElement('div');
                item.className = 'draft-item';
                const sizeMB = draft.size ? (draft.size / 1024 / 1024).toFixed(2) : '?';
                const sizeInfo = draft.size ? ` (${sizeMB} MB)` : '';
                const draftId = draft.source === 'localStorage' ? draft.key : draft.name;
                
                item.innerHTML = `
                    <span>${draft.name}${sizeInfo}</span>
                    <div>
                        <button class="btn btn-secondary btn-load-draft">
                            Cargar
                        </button>
                        <button class="btn btn-danger btn-delete-draft">
                            Eliminar
                        </button>
                    </div>
                `;
                
                // Add event listeners to avoid HTML injection issues
                const loadBtn = item.querySelector('.btn-load-draft');
                const deleteBtn = item.querySelector('.btn-delete-draft');
                
                loadBtn.onclick = () => this.loadDraft(draftId, draft.source);
                deleteBtn.onclick = () => this.deleteDraft(draftId, draft.source);
                
                draftList.appendChild(item);
            });

            modal.classList.remove('hidden');

            // Close modal listeners
            const closeButtons = modal.querySelectorAll('.modal-close');
            closeButtons.forEach(btn => {
                btn.onclick = () => modal.classList.add('hidden');
            });
        } catch (error) {
            console.error('Error showing drafts:', error);
            alert('Error al cargar lista de borradores');
        }
    }

    async loadDraft(key, source = 'indexedDB') {
        try {
            let data;
            
            if (source === 'localStorage') {
                const dataStr = localStorage.getItem(key);
                if (!dataStr) {
                    alert('Borrador no encontrado');
                    return;
                }
                data = JSON.parse(dataStr);
            } else {
                // Load from IndexedDB
                const drafts = await db.getAll('drafts');
                const draft = drafts.find(d => d.name === key);
                if (!draft) {
                    alert('Borrador no encontrado');
                    return;
                }
                data = draft.data;
            }

            // Clear current data first
            formsManager.itemStates = {};
            formsManager.sectionPhotos = {};
            formsManager.itemPhotos = {};
            this.accionesCorrectivas = [];
            this.generalPhotos = {};
            this.signatures = { ingeniero: null, cliente: null };

            // Load data into forms
            formsManager.itemStates = data.sections || {};
            formsManager.sectionPhotos = data.sectionPhotos || {};
            formsManager.itemPhotos = data.itemPhotos || {};
            
            formsManager.populateGeneralData(data.generalData);
            formsManager.populateObservations(data.observations);
            formsManager.populateHoursData(data.hoursData);
            formsManager.populateSignaturesData(data.signatures);
            formsManager.updateAllDisplays();

            // Load acciones correctivas
            if (data.accionesCorrectivas && Array.isArray(data.accionesCorrectivas)) {
                this.accionesCorrectivas = data.accionesCorrectivas;
                this.renderAllAcciones();
            } else {
                // Clear if no data
                const container = document.getElementById('acciones-list');
                if (container) container.innerHTML = '';
            }

            // Load general photos (recomendaciones, conclusion)
            if (data.generalPhotos) {
                this.generalPhotos = data.generalPhotos;
                ['recomendaciones', 'conclusion'].forEach(campo => {
                    this.renderGeneralPhotos(campo);
                });
            } else {
                // Clear if no photos
                ['recomendaciones', 'conclusion'].forEach(campo => {
                    const photoContainer = document.getElementById(`${campo}-photos`);
                    if (photoContainer) photoContainer.innerHTML = '';
                });
            }

            // Close modal
            const modal = document.getElementById('draft-modal');
            if (modal) modal.classList.add('hidden');

            this.showStatus('✅ Borrador cargado', 'success');
        } catch (error) {
            console.error('Error loading draft:', error);
            alert('Error al cargar borrador');
        }
    }

    async deleteDraft(key, source = 'indexedDB') {
        if (!confirm('¿Eliminar este borrador?')) return;

        try {
            if (source === 'localStorage') {
                localStorage.removeItem(key);
            } else {
                // Delete from IndexedDB
                await db.delete('drafts', key);
            }
            
            // Check if there are more drafts
            const remainingDrafts = await db.getAll('drafts');
            
            if (remainingDrafts.length > 0) {
                // Refresh list if there are more drafts
                this.showDraftModal();
            } else {
                // Close modal if no more drafts
                const modal = document.getElementById('draft-modal');
                if (modal) modal.classList.add('hidden');
            }
            
            this.showStatus('✅ Borrador eliminado', 'success');
        } catch (error) {
            console.error('Error deleting draft:', error);
            alert('Error al eliminar borrador');
        }
    }

    async exportDraft() {
        try {
            const data = await formsManager.getReportData();
            
            // Add acciones correctivas and general photos
            data.accionesCorrectivas = this.accionesCorrectivas || [];
            data.generalPhotos = this.generalPhotos || {};
            
            // Add metadata
            data._metadata = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                app: 'ReportManager'
            };
            
            // Convert to JSON
            const dataStr = JSON.stringify(data, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `borrador_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            const sizeMB = (dataStr.length / 1024 / 1024).toFixed(2);
            this.showStatus(`✅ Borrador exportado (${sizeMB} MB)`, 'success');
        } catch (error) {
            console.error('Error exporting draft:', error);
            alert(`❌ Error al exportar:\n\n${error.message}`);
        }
    }

    async importDraft() {
        try {
            // Create file input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    
                    // Validate data structure
                    if (!data.generalData && !data.sections) {
                        throw new Error('Archivo no válido. No contiene datos de borrador.');
                    }
                    
                    // Confirm import
                    const sizeMB = (text.length / 1024 / 1024).toFixed(2);
                    if (!confirm(`¿Importar borrador?\n\nTamaño: ${sizeMB} MB\nFecha de exportación: ${data._metadata?.exportDate || 'desconocida'}\n\nEsto reemplazará los datos actuales.`)) {
                        return;
                    }
                    
                    // Load data
                    formsManager.itemStates = data.sections || {};
                    formsManager.sectionPhotos = data.sectionPhotos || {};
                    formsManager.itemPhotos = data.itemPhotos || {};
                    
                    formsManager.populateGeneralData(data.generalData);
                    formsManager.populateObservations(data.observations);
                    formsManager.populateHoursData(data.hoursData);
                    formsManager.populateSignaturesData(data.signatures);
                    formsManager.updateAllDisplays();
                    
                    // Load acciones correctivas
                    if (data.accionesCorrectivas) {
                        this.accionesCorrectivas = data.accionesCorrectivas;
                        this.renderAllAcciones();
                    }
                    
                    // Load general photos
                    if (data.generalPhotos) {
                        this.generalPhotos = data.generalPhotos;
                        ['recomendaciones', 'conclusion'].forEach(campo => {
                            this.renderGeneralPhotos(campo);
                        });
                    }
                    
                    this.showStatus('✅ Borrador importado correctamente', 'success');
                } catch (error) {
                    console.error('Error parsing file:', error);
                    alert(`❌ Error al importar archivo:\n\n${error.message}`);
                }
            };
            
            input.click();
        } catch (error) {
            console.error('Error importing draft:', error);
            alert(`❌ Error al importar:\n\n${error.message}`);
        }
    }

    async checkStorage() {
        try {
            // Get drafts from IndexedDB
            const drafts = await db.getAll('drafts');
            
            // Calculate storage usage
            let totalSize = 0;
            const items = [];
            
            drafts.forEach(draft => {
                const size = draft.size || 0;
                totalSize += size;
                items.push({
                    name: draft.name,
                    sizeKB: Math.round(size / 1024),
                    sizeMB: (size / 1024 / 1024).toFixed(2)
                });
            });

            const totalKB = Math.round(totalSize / 1024);
            const totalMB = (totalKB / 1024).toFixed(2);
            const totalGB = (totalMB / 1024).toFixed(2);

            // Get real storage quota from browser
            let quotaMessage = '';
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                const usagePercent = ((estimate.usage / estimate.quota) * 100).toFixed(2);
                const usageMB = (estimate.usage / 1024 / 1024).toFixed(2);
                const quotaMB = (estimate.quota / 1024 / 1024).toFixed(2);
                const quotaGB = (estimate.quota / 1024 / 1024 / 1024).toFixed(2);
                
                quotaMessage = `Total usado (navegador): ${usageMB} MB\n`;
                quotaMessage += `Espacio disponible: ${quotaMB} MB (${quotaGB} GB)\n`;
                quotaMessage += `Uso: ${usagePercent}%\n\n`;
            }

            let message = `📊 Uso de Almacenamiento IndexedDB\n\n`;
            message += quotaMessage;
            message += `Borradores guardados: ${drafts.length}\n`;
            message += `Tamaño total de borradores: ${totalMB} MB (${totalGB} GB)\n\n`;
            
            if (items.length > 0) {
                message += `Detalle de borradores:\n`;
                items.sort((a, b) => b.sizeKB - a.sizeKB);
                items.forEach(item => {
                    message += `• ${item.name}: ${item.sizeMB} MB\n`;
                });
            } else {
                message += `No hay borradores guardados.`;
            }

            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                const usagePercent = (estimate.usage / estimate.quota) * 100;
                if (usagePercent > 80) {
                    message += `\n\n⚠️ Almacenamiento casi lleno (${usagePercent.toFixed(1)}%)!\nElimina borradores antiguos.`;
                }
            }

            alert(message);
        } catch (error) {
            console.error('Error checking storage:', error);
            alert('Error al verificar almacenamiento');
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });

        this.currentTab = tabName;
    }

    initSignatures() {
        // Sistema de assinatura com modal
        this.signatures = {
            ingeniero: null,
            cliente: null
        };
        
        this.currentSignatureType = null;
        
        // Modal elements
        this.signatureModal = document.getElementById('signature-modal');
        this.signatureCanvas = document.getElementById('signature-modal-canvas');
        const ctx = this.signatureCanvas.getContext('2d');
        
        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;
        
        // Set canvas size
        const resizeCanvas = () => {
            const isMobile = window.innerWidth <= 768;
            const width = Math.min(isMobile ? 700 : 800, window.innerWidth - 40);
            const height = isMobile ? 250 : 300;
            
            // Salvar imagem antes de redimensionar
            const imageData = this.signatureCanvas.width > 0 ? ctx.getImageData(0, 0, this.signatureCanvas.width, this.signatureCanvas.height) : null;
            
            this.signatureCanvas.width = width;
            this.signatureCanvas.height = height;
            
            // Restaurar imagem após redimensionar
            if (imageData) {
                ctx.putImageData(imageData, 0, 0);
            }
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Drawing functions
        const getCoordinates = (e) => {
            const rect = this.signatureCanvas.getBoundingClientRect();
            const touch = e.touches ? e.touches[0] : e;
            return {
                x: (touch.clientX - rect.left) * (this.signatureCanvas.width / rect.width),
                y: (touch.clientY - rect.top) * (this.signatureCanvas.height / rect.height)
            };
        };
        
        const startDrawing = (e) => {
            isDrawing = true;
            const coords = getCoordinates(e);
            lastX = coords.x;
            lastY = coords.y;
        };
        
        const draw = (e) => {
            if (!isDrawing) return;
            e.preventDefault();
            
            const coords = getCoordinates(e);
            const x = coords.x;
            const y = coords.y;
            
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.stroke();
            
            lastX = x;
            lastY = y;
        };
        
        const stopDrawing = () => {
            isDrawing = false;
        };
        
        // Canvas events
        this.signatureCanvas.addEventListener('mousedown', startDrawing);
        this.signatureCanvas.addEventListener('mousemove', draw);
        this.signatureCanvas.addEventListener('mouseup', stopDrawing);
        this.signatureCanvas.addEventListener('mouseout', stopDrawing);
        this.signatureCanvas.addEventListener('touchstart', startDrawing, { passive: false });
        this.signatureCanvas.addEventListener('touchmove', draw, { passive: false });
        this.signatureCanvas.addEventListener('touchend', stopDrawing);
        
        // Click handlers for signature containers
        ['ingeniero', 'cliente'].forEach(type => {
            const container = document.getElementById(`signature-${type}-container`);
            if (container) {
                container.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('signature-remove-btn')) {
                        this.openSignatureModal(type);
                    }
                });
            }
        });
        
        // Modal buttons
        document.querySelector('.modal-close-signature')?.addEventListener('click', () => {
            this.closeSignatureModal();
        });
        
        document.getElementById('clear-signature-modal')?.addEventListener('click', () => {
            ctx.clearRect(0, 0, this.signatureCanvas.width, this.signatureCanvas.height);
        });
        
        document.getElementById('save-signature-modal')?.addEventListener('click', () => {
            this.saveSignature();
        });
        
        // Close modal on background click
        this.signatureModal?.addEventListener('click', (e) => {
            if (e.target === this.signatureModal) {
                this.closeSignatureModal();
            }
        });
    }
    
    openSignatureModal(type) {
        this.currentSignatureType = type;
        this.signatureModal.classList.remove('hidden');
        this.signatureModal.setAttribute('aria-hidden', 'false');
        
        // Clear canvas
        const ctx = this.signatureCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.signatureCanvas.width, this.signatureCanvas.height);
        
        // Load existing signature if any
        if (this.signatures[type]) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, this.signatureCanvas.width, this.signatureCanvas.height);
            };
            img.src = this.signatures[type];
        }
    }
    
    closeSignatureModal() {
        this.signatureModal.classList.add('hidden');
        this.signatureModal.setAttribute('aria-hidden', 'true');
        this.currentSignatureType = null;
    }
    
    saveSignature() {
        if (!this.currentSignatureType) return;
        
        // Save signature as dataURL
        const dataUrl = this.signatureCanvas.toDataURL('image/png');
        this.signatures[this.currentSignatureType] = dataUrl;
        
        // Update container to show preview
        const container = document.getElementById(`signature-${this.currentSignatureType}-container`);
        if (container) {
            container.classList.add('has-signature');
            container.innerHTML = `
                <img src="${dataUrl}" class="signature-preview" alt="Firma">
                <button type="button" class="signature-remove-btn" onclick="app.removeSignature('${this.currentSignatureType}')">✕</button>
            `;
        }
        
        this.closeSignatureModal();
        this.showStatus('✓ Firma guardada', 'success');
    }
    
    removeSignature(type) {
        this.signatures[type] = null;
        const container = document.getElementById(`signature-${type}-container`);
        if (container) {
            container.classList.remove('has-signature');
            container.innerHTML = `
                <div class="signature-placeholder">
                    ✍️ Toque aquí para firmar
                </div>
            `;
        }
    }

    getSignatureData(type) {
        return this.signatures[type];
    }

    async generateReport() {
        try {
            this.showStatus('Generando informe...', 'info');

            const data = await formsManager.getReportData();

            // **NOVO**: Add hours data
            data.hoursData = this.getHoursData();

            // Add signatures
            data.signatures = {
                ingeniero: {
                    nombre: document.getElementById('nombre-ingeniero')?.value || '',
                    firma: this.getSignatureData('ingeniero'),
                    fecha: new Date().toLocaleDateString('es-ES')
                },
                cliente: {
                    nombre: document.getElementById('nombre-cliente-firma')?.value || '',
                    firma: this.getSignatureData('cliente'),
                    fecha: new Date().toLocaleDateString('es-ES')
                }
            };

            // SEM VALIDAÇÃO - permite gerar com tudo em branco

            // Generate Word document
            await reportsManager.generateReport(data);

            this.showStatus('✅ Informe generado correctamente', 'success');
        } catch (error) {
            console.error('Error generating report:', error);
            this.showStatus('Error al generar informe: ' + error.message, 'error');
        }
    }

    
    // ===== ACCIONES CORRECTIVAS =====
    initAccionesCorrectivas() {
        const btnAdd = document.getElementById('add-accion-correctiva');
        if (btnAdd) {
            btnAdd.addEventListener('click', () => this.addAccionCorrectiva());
        }
    }
    
    addAccionCorrectiva(data = null) {
        const id = Date.now();
        const accion = data || {
            id,
            titulo: '',
            descripcionProblema: '',
            intervencion: '',
            resultado: ''
        };
        
        this.accionesCorrectivas.push(accion);
        this.renderAccionCorrectiva(accion);
        
        // Expand section if collapsed
        const section = document.querySelector('#acciones-correctivas-container').closest('.collapsed-section');
        if (section && !section.classList.contains('expanded')) {
            const header = section.querySelector('.section-header-collapse');
            if (header) this.toggleCollapse(header);
        }
    }
    
    renderAccionCorrectiva(accion) {
        const container = document.getElementById('acciones-correctivas-container');
        if (!container) return;
        
        const index = this.accionesCorrectivas.findIndex(a => a.id === accion.id);
        
        const card = document.createElement('div');
        card.className = 'accion-correctiva-card collapsed-section';
        card.dataset.id = accion.id;
        card.innerHTML = `
            <div class="accion-correctiva-header section-header-collapse" onclick="app.toggleCollapse(this)">
                <span class="accion-correctiva-number">Acción Correctiva #${index + 1}: ${accion.titulo || 'Sin título'}</span>
                <div class="header-actions">
                    <span class="collapse-icon">▼</span>
                    <button type="button" class="btn-remove-accion" onclick="event.stopPropagation(); app.removeAccionCorrectiva(${accion.id})">✕</button>
                </div>
            </div>
            <div class="section-content" style="display: none;">
                <div class="form-field">
                    <label>Título</label>
                    <input type="text" class="accion-titulo" value="${accion.titulo || ''}" 
                           onchange="app.updateAccionCorrectiva(${accion.id}, 'titulo', this.value); app.updateAccionTitulo(${accion.id})">
                </div>
                <div class="form-field">
                    <label>Descripción del Problema</label>
                    <textarea class="accion-descripcion" rows="3" 
                              onchange="app.updateAccionCorrectiva(${accion.id}, 'descripcionProblema', this.value)">${accion.descripcionProblema || ''}</textarea>
                    <div class="item-photos-gallery" data-accion="${accion.id}" data-campo="descripcion">
                        <button class="btn-add-photo" onclick="app.openAccionPhoto(${accion.id}, 'descripcion')">📷 +</button>
                    </div>
                </div>
                <div class="form-field">
                    <label>Intervención</label>
                    <textarea class="accion-intervencion" rows="3" 
                              onchange="app.updateAccionCorrectiva(${accion.id}, 'intervencion', this.value)">${accion.intervencion || ''}</textarea>
                    <div class="item-photos-gallery" data-accion="${accion.id}" data-campo="intervencion">
                        <button class="btn-add-photo" onclick="app.openAccionPhoto(${accion.id}, 'intervencion')">📷 +</button>
                    </div>
                </div>
                <div class="form-field">
                    <label>Resultado</label>
                    <textarea class="accion-resultado" rows="3" 
                              onchange="app.updateAccionCorrectiva(${accion.id}, 'resultado', this.value)">${accion.resultado || ''}</textarea>
                    <div class="item-photos-gallery" data-accion="${accion.id}" data-campo="resultado">
                        <button class="btn-add-photo" onclick="app.openAccionPhoto(${accion.id}, 'resultado')">📷 +</button>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(card);
        
        // Render photos if exist
        if (accion.photos) {
            ['descripcion', 'intervencion', 'resultado'].forEach(campo => {
                this.renderAccionPhotos(accion.id, campo);
            });
        }
    }
    
    updateAccionTitulo(id) {
        const accion = this.accionesCorrectivas.find(a => a.id === id);
        if (!accion) return;
        const card = document.querySelector(`[data-id="${id}"]`);
        if (card) {
            const numberSpan = card.querySelector('.accion-correctiva-number');
            const index = this.accionesCorrectivas.findIndex(a => a.id === id);
            if (numberSpan) {
                numberSpan.textContent = `Acción Correctiva #${index + 1}: ${accion.titulo || 'Sin título'}`;
            }
        }
    }
    
    openAccionPhoto(accionId, campo) {
        this.openPhotoModal((photo) => {
            const accion = this.accionesCorrectivas.find(a => a.id === accionId);
            if (accion) {
                if (!accion.photos) accion.photos = {};
                if (!accion.photos[campo]) accion.photos[campo] = [];
                accion.photos[campo].push({
                    dataUrl: photo.dataUrl,
                    timestamp: Date.now()
                });
                this.renderAccionPhotos(accionId, campo);
            }
        });
    }
    
    renderAccionPhotos(accionId, campo) {
        const card = document.querySelector(`[data-id="${accionId}"]`);
        if (!card) return;
        
        const gallery = card.querySelector(`[data-accion="${accionId}"][data-campo="${campo}"]`);
        if (!gallery) return;
        
        const accion = this.accionesCorrectivas.find(a => a.id === accionId);
        if (!accion || !accion.photos || !accion.photos[campo]) return;
        
        const addBtn = gallery.querySelector('.btn-add-photo');
        gallery.innerHTML = '';
        gallery.appendChild(addBtn);
        
        accion.photos[campo].forEach((photo, index) => {
            const thumb = document.createElement('div');
            thumb.className = 'photo-thumbnail';
            thumb.style.backgroundImage = `url(${photo.dataUrl})`;
            thumb.onclick = () => this.viewAccionPhoto(accionId, campo, index);
            gallery.appendChild(thumb);
        });
    }
    
    viewAccionPhoto(accionId, campo, photoIndex) {
        const accion = this.accionesCorrectivas.find(a => a.id === accionId);
        if (!accion || !accion.photos || !accion.photos[campo]) return;
        
        const photo = accion.photos[campo][photoIndex];
        if (!photo) return;
        
        const modal = document.createElement('div');
        modal.className = 'photo-view-modal';
        modal.innerHTML = `
            <div class="photo-view-content">
                <button class="btn-close-view">✕</button>
                <img src="${photo.dataUrl}" alt="Foto">
                <div class="photo-view-actions">
                    <button class="btn-edit-photo">✏️ Editar</button>
                    <button class="btn-delete-photo">🗑️ Eliminar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.btn-close-view').onclick = () => document.body.removeChild(modal);
        
        modal.querySelector('.btn-edit-photo').onclick = async () => {
            document.body.removeChild(modal);
            await photoEditor.openEditor(photo.dataUrl, (editedDataUrl) => {
                accion.photos[campo][photoIndex] = { dataUrl: editedDataUrl, timestamp: Date.now() };
                this.renderAccionPhotos(accionId, campo);
            });
        };
        
        modal.querySelector('.btn-delete-photo').onclick = () => {
            if (confirm('¿Eliminar esta foto?')) {
                accion.photos[campo].splice(photoIndex, 1);
                if (accion.photos[campo].length === 0) delete accion.photos[campo];
                this.renderAccionPhotos(accionId, campo);
                document.body.removeChild(modal);
            }
        };
        modal.onclick = (e) => { if (e.target === modal) document.body.removeChild(modal); };
    }
    
    openGeneralPhoto(campo) {
        this.openPhotoModal((photo) => {
            if (!this.generalPhotos) this.generalPhotos = {};
            if (!this.generalPhotos[campo]) this.generalPhotos[campo] = [];
            this.generalPhotos[campo].push({
                dataUrl: photo.dataUrl,
                timestamp: Date.now()
            });
            this.renderGeneralPhotos(campo);
        });
    }
    
    renderGeneralPhotos(campo) {
        const section = document.querySelector(`#${campo}`);
        if (!section || !section.parentElement) return;
        
        const gallery = section.parentElement.querySelector('.item-photos-gallery');
        if (!gallery) return;
        
        const addBtn = gallery.querySelector('.btn-add-photo');
        gallery.innerHTML = '';
        gallery.appendChild(addBtn);
        
        const photos = this.generalPhotos[campo] || [];
        photos.forEach((photo, index) => {
            const thumb = document.createElement('div');
            thumb.className = 'photo-thumbnail';
            thumb.style.backgroundImage = `url(${photo.dataUrl})`;
            thumb.onclick = () => this.viewGeneralPhoto(campo, index);
            gallery.appendChild(thumb);
        });
    }
    
    viewGeneralPhoto(campo, photoIndex) {
        const photos = this.generalPhotos[campo] || [];
        const photo = photos[photoIndex];
        if (!photo) return;
        
        const modal = document.createElement('div');
        modal.className = 'photo-view-modal';
        modal.innerHTML = `
            <div class="photo-view-content">
                <button class="btn-close-view">✕</button>
                <img src="${photo.dataUrl}" alt="Foto">
                <div class="photo-view-actions">
                    <button class="btn-edit-photo">✏️ Editar</button>
                    <button class="btn-delete-photo">🗑️ Eliminar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.btn-close-view').onclick = () => document.body.removeChild(modal);
        
        modal.querySelector('.btn-edit-photo').onclick = async () => {
            document.body.removeChild(modal);
            await photoEditor.openEditor(photo.dataUrl, (editedDataUrl) => {
                this.generalPhotos[campo][photoIndex] = { dataUrl: editedDataUrl, timestamp: Date.now() };
                this.renderGeneralPhotos(campo);
            });
        };
        
        modal.querySelector('.btn-delete-photo').onclick = () => {
            if (confirm('¿Eliminar esta foto?')) {
                this.generalPhotos[campo].splice(photoIndex, 1);
                if (this.generalPhotos[campo].length === 0) delete this.generalPhotos[campo];
                this.renderGeneralPhotos(campo);
                document.body.removeChild(modal);
            }
        };
        modal.onclick = (e) => { if (e.target === modal) document.body.removeChild(modal); };
    }
    
    updateAccionCorrectiva(id, field, value) {
        const accion = this.accionesCorrectivas.find(a => a.id === id);
        if (accion) {
            accion[field] = value;
        }
    }
    
    removeAccionCorrectiva(id) {
        if (!confirm('¿Eliminar esta acción correctiva?')) return;
        
        this.accionesCorrectivas = this.accionesCorrectivas.filter(a => a.id !== id);
        
        // Re-render all
        const container = document.getElementById('acciones-correctivas-container');
        if (container) {
            container.innerHTML = '';
            this.accionesCorrectivas.forEach(a => this.renderAccionCorrectiva(a));
        }
    }
    
    openPhotoModal(onPhotoSelected) {
        const modal = document.createElement('div');
        modal.className = 'photo-selector-modal';
        modal.innerHTML = `
            <div class="photo-selector-content">
                <div class="photo-selector-header">
                    <h3>📷 Seleccionar Foto</h3>
                    <button class="btn-close-photo-modal">✕</button>
                </div>
                <div class="photo-selector-body">
                    <div class="photo-preview-area" id="photo-preview-area-app">
                        <p>Arrastra una imagen aquí o selecciona una opción abajo</p>
                    </div>
                    <div class="photo-actions">
                        <label class="btn-photo-action btn-file-input">
                            📁 Buscar Archivo
                            <input type="file" accept="image/*" style="display:none" id="file-input-photo-app">
                        </label>
                        <button class="btn-photo-action btn-open-camera-app">
                            📷 Abrir Cámara
                        </button>
                    </div>
                    <button class="btn-confirm-photo btn-confirm-photo-app" style="display:none">
                        ✓ Confirmar Foto
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        let selectedPhoto = null;

        const previewArea = modal.querySelector('#photo-preview-area-app');
        const btnConfirm = modal.querySelector('.btn-confirm-photo-app');
        const fileInput = modal.querySelector('#file-input-photo-app');
        const btnCamera = modal.querySelector('.btn-open-camera-app');
        const btnClose = modal.querySelector('.btn-close-photo-modal');

        // File input
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const dataUrl = await this.fileToDataUrl(file);
                selectedPhoto = { dataUrl, timestamp: Date.now() };
                previewArea.innerHTML = `
                    <img src="${dataUrl}" alt="Preview" style="max-width: 100%; max-height: 300px; border-radius: 8px;">
                    <p style="margin-top: 10px; font-size: 0.9rem; color: #4CAF50;">✓ Imagen cargada</p>
                `;
                btnConfirm.style.display = 'block';
            }
        });

        // Camera button
        btnCamera.addEventListener('click', async () => {
            modal.style.display = 'none';
            try {
                const photo = await cameraManager.takePhoto();
                selectedPhoto = photo;
                previewArea.innerHTML = `
                    <img src="${photo.dataUrl}" alt="Preview" style="max-width: 100%; max-height: 300px; border-radius: 8px;">
                    <p style="margin-top: 10px; font-size: 0.9rem; color: #4CAF50;">✓ Imagen cargada</p>
                `;
                btnConfirm.style.display = 'block';
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
            if (selectedPhoto && onPhotoSelected) {
                onPhotoSelected(selectedPhoto);
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
    
    fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    toggleCollapse(header) {
        const section = header.closest('.collapsed-section');
        const content = section.querySelector('.section-content');
        
        if (section.classList.contains('expanded')) {
            section.classList.remove('expanded');
            content.style.display = 'none';
        } else {
            section.classList.add('expanded');
            content.style.display = 'block';
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

    /**
     * Initialize hours table with auto-calculation
     */
    initHoursTable() {
        const hoursInputs = document.querySelectorAll('.hours-input');
        
        hoursInputs.forEach(input => {
            input.addEventListener('input', () => this.calculateHoursTotals());
        });

        // Calculate on load
        this.calculateHoursTotals();
    }

    /**
     * Calculate totals for hours table
     */
    calculateHoursTotals() {
        const columns = ['viaje', 'normales', 'extras', 'sabados', 'feriados'];
        const totals = {};

        columns.forEach(col => {
            const inputs = document.querySelectorAll(`.hours-input[data-col="${col}"]`);
            let sum = 0;
            
            inputs.forEach(input => {
                const value = parseFloat(input.value) || 0;
                sum += value;
            });

            totals[col] = sum;
            
            // Update total display
            const totalEl = document.getElementById(`total-${col}`);
            if (totalEl) {
                totalEl.textContent = sum.toFixed(1);
            }
        });

        return totals;
    }

    /**
     * Get hours data from table
     */
    getHoursData() {
        const days = ['LUN', 'MAR', 'MIER', 'JUE', 'VIER', 'SAB', 'DOM'];
        const hoursData = [];

        days.forEach(day => {
            const row = document.querySelector(`tr[data-day="${day}"]`);
            if (!row) return;

            const fecha = row.querySelector('.date-input')?.value || '';
            const viaje = parseFloat(row.querySelector('.hours-input[data-col="viaje"]')?.value) || 0;
            const normales = parseFloat(row.querySelector('.hours-input[data-col="normales"]')?.value) || 0;
            const extras = parseFloat(row.querySelector('.hours-input[data-col="extras"]')?.value) || 0;
            const sabados = parseFloat(row.querySelector('.hours-input[data-col="sabados"]')?.value) || 0;
            const feriados = parseFloat(row.querySelector('.hours-input[data-col="feriados"]')?.value) || 0;
            const comentarios = row.querySelector('.comment-input')?.value || '';

            hoursData.push({
                day,
                fecha,
                viaje,
                normales,
                extras,
                sabados,
                feriados,
                comentarios
            });
        });

        return {
            rows: hoursData,
            totals: this.calculateHoursTotals()
        };
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
