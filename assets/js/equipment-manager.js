/**
 * Equipment Manager - Gerencia múltiplos equipamentos
 * Cada equipamento tem sua própria verificação independente
 */

class EquipmentManager {
    constructor() {
        this.numEquipments = 1;
        this.currentEquipment = 1;
        this.equipmentData = {
            1: {
                sections: {},
                sectionPhotos: {},
                itemPhotos: {},
                acciones: [],
                generalPhotos: {},
                recomendaciones: '',
                conclusion: ''
            }
        };
    }

    /**
     * Define o número de equipamentos e cria as estruturas necessárias
     */
    setNumberOfEquipments(num) {
        const numInt = parseInt(num);
        if (numInt < 1 || numInt > 10) return;

        this.numEquipments = numInt;

        // Criar estruturas de dados para novos equipamentos
        for (let i = 1; i <= numInt; i++) {
            if (!this.equipmentData[i]) {
                this.equipmentData[i] = {
                    sections: {},
                    sectionPhotos: {},
                    itemPhotos: {},
                    acciones: [],
                    generalPhotos: {},
                    recomendaciones: '',
                    conclusion: ''
                };
            }
        }

        // Remover equipamentos extras
        Object.keys(this.equipmentData).forEach(key => {
            const keyNum = parseInt(key);
            if (keyNum > numInt) {
                delete this.equipmentData[keyNum];
            }
        });

        this.renderEquipmentTabs();
        this.renderEquipmentContainers();
        this.switchEquipment(1);
    }

    /**
     * Renderiza as tabs de equipamentos
     */
    renderEquipmentTabs() {
        const tabsContainer = document.getElementById('equipment-tabs');
        if (!tabsContainer) return;

        tabsContainer.innerHTML = '';

        for (let i = 1; i <= this.numEquipments; i++) {
            const tab = document.createElement('button');
            tab.className = 'equipment-tab' + (i === this.currentEquipment ? ' active' : '');
            tab.dataset.equipment = i;
            tab.onclick = () => this.switchEquipment(i);
            tab.innerHTML = `
                <span class="equipment-icon">⚙️</span>
                <span class="equipment-label">Equipo ${i}</span>
            `;
            tabsContainer.appendChild(tab);
        }
    }

    /**
     * Renderiza os containers de cada equipamento
     */
    renderEquipmentContainers() {
        const containersDiv = document.getElementById('equipment-containers');
        if (!containersDiv) return;

        // Salvar estado do equipamento atual antes de recriar
        if (this.currentEquipment && window.formsManager) {
            this.saveCurrentEquipmentData();
        }

        containersDiv.innerHTML = '';

        for (let i = 1; i <= this.numEquipments; i++) {
            const container = document.createElement('div');
            container.className = 'equipment-container' + (i === this.currentEquipment ? ' active' : '');
            container.id = `equipment-${i}`;
            container.innerHTML = `
                <section class="card">
                    <h2>⚙️ Verificación de Sistemas - Equipo ${i}</h2>
                    <p class="subtitle">Seleccione los estados de cada elemento</p>
                    <div id="sections-container-${i}"></div>
                </section>

                <!-- Acciones Correctivas -->
                <section class="card collapsed-section">
                    <div class="section-header-collapse" onclick="app.toggleCollapse(this)">
                        <h2>🔧 Acciones Correctivas</h2>
                        <span class="collapse-icon">▼</span>
                    </div>
                    <div class="section-content" style="display: none;">
                        <button type="button" class="btn btn-primary" style="margin-bottom: 1rem;" onclick="app.addAccionCorrectiva(${i})">
                            ➕ Añadir Acción Correctiva
                        </button>
                        <div id="acciones-correctivas-container-${i}"></div>
                    </div>
                </section>

                <!-- Recomendaciones -->
                <section class="card collapsed-section">
                    <div class="section-header-collapse" onclick="app.toggleCollapse(this)">
                        <h2>💡 Recomendaciones</h2>
                        <span class="collapse-icon">▼</span>
                    </div>
                    <div class="section-content" style="display: none;">
                        <div class="form-field">
                            <textarea id="recomendaciones-${i}" rows="5" placeholder="Recomendaciones..."></textarea>
                            <div id="recomendaciones-photos-${i}" class="item-photos-gallery">
                                <button class="btn-add-photo" onclick="app.openGeneralPhoto('recomendaciones', ${i})">📷 +</button>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Conclusión -->
                <section class="card collapsed-section">
                    <div class="section-header-collapse" onclick="app.toggleCollapse(this)">
                        <h2>✅ Conclusión</h2>
                        <span class="collapse-icon">▼</span>
                    </div>
                    <div class="section-content" style="display: none;">
                        <div class="form-field">
                            <textarea id="conclusion-${i}" rows="5" placeholder="Conclusión..."></textarea>
                            <div id="conclusion-photos-${i}" class="item-photos-gallery">
                                <button class="btn-add-photo" onclick="app.openGeneralPhoto('conclusion', ${i})">📷 +</button>
                            </div>
                        </div>
                    </div>
                </section>
            `;
            containersDiv.appendChild(container);
        }

        // Renderizar seções para o equipamento atual
        if (window.formsManager) {
            this.loadEquipmentData(this.currentEquipment);
        }
    }

    /**
     * Troca para outro equipamento
     */
    switchEquipment(equipNum) {
        const num = parseInt(equipNum);
        if (num < 1 || num > this.numEquipments) return;

        // Salvar dados do equipamento atual
        if (this.currentEquipment && window.formsManager) {
            this.saveCurrentEquipmentData();
        }

        this.currentEquipment = num;

        // Atualizar tabs
        document.querySelectorAll('.equipment-tab').forEach(tab => {
            tab.classList.toggle('active', parseInt(tab.dataset.equipment) === num);
        });

        // Atualizar containers
        document.querySelectorAll('.equipment-container').forEach(container => {
            container.classList.toggle('active', container.id === `equipment-${num}`);
        });

        // Carregar dados do novo equipamento
        if (window.formsManager) {
            this.loadEquipmentData(num);
        }
    }

    /**
     * Salva dados do equipamento atual
     */
    saveCurrentEquipmentData() {
        if (!this.currentEquipment || !window.formsManager) return;

        const data = this.equipmentData[this.currentEquipment];

        // Salvar seções
        data.sections = { ...window.formsManager.itemStates };
        data.sectionPhotos = { ...window.formsManager.sectionPhotos };
        data.itemPhotos = { ...window.formsManager.itemPhotos };

        // Salvar ações corretivas
        if (window.app) {
            data.acciones = [...(window.app.accionesCorrectivas || [])];
            data.generalPhotos = { ...(window.app.generalPhotos || {}) };
        }

        // Salvar recomendações e conclusão
        const recomendaciones = document.getElementById(`recomendaciones-${this.currentEquipment}`);
        const conclusion = document.getElementById(`conclusion-${this.currentEquipment}`);
        if (recomendaciones) data.recomendaciones = recomendaciones.value;
        if (conclusion) data.conclusion = conclusion.value;
    }

    /**
     * Carrega dados de um equipamento
     */
    loadEquipmentData(equipNum) {
        if (!window.formsManager) return;

        const data = this.equipmentData[equipNum];

        // Carregar seções
        window.formsManager.itemStates = { ...data.sections };
        window.formsManager.sectionPhotos = { ...data.sectionPhotos };
        window.formsManager.itemPhotos = { ...data.itemPhotos };

        // Renderizar seções no container correto
        const sectionsContainer = document.getElementById(`sections-container-${equipNum}`);
        if (sectionsContainer) {
            window.formsManager.sectionsContainer = sectionsContainer;
            window.formsManager.renderAllSections();
            
            // **NOVO**: Atualizar displays para renderizar fotos
            window.formsManager.updateAllDisplays();
        }

        // Carregar ações corretivas
        if (window.app) {
            window.app.accionesCorrectivas = [...data.acciones];
            window.app.generalPhotos = { ...data.generalPhotos };
            
            // Renderizar ações no container correto
            const accionesContainer = document.getElementById(`acciones-correctivas-container-${equipNum}`);
            if (accionesContainer) {
                accionesContainer.innerHTML = '';
                window.app.accionesCorrectivas.forEach(a => window.app.renderAccionCorrectiva(a, equipNum));
            }

            // Renderizar fotos gerais
            ['recomendaciones', 'conclusion'].forEach(campo => {
                window.app.renderGeneralPhotos(campo, equipNum);
            });
        }

        // Carregar recomendações e conclusão
        const recomendaciones = document.getElementById(`recomendaciones-${equipNum}`);
        const conclusion = document.getElementById(`conclusion-${equipNum}`);
        if (recomendaciones) recomendaciones.value = data.recomendaciones || '';
        if (conclusion) conclusion.value = data.conclusion || '';
    }

    /**
     * Retorna todos os dados de todos os equipamentos
     */
    getAllEquipmentsData() {
        // Salvar equipamento atual primeiro
        this.saveCurrentEquipmentData();

        return {
            numEquipments: this.numEquipments,
            equipments: this.equipmentData
        };
    }

    /**
     * Carrega dados de todos os equipamentos
     */
    loadAllEquipmentsData(data) {
        if (!data || !data.numEquipments) return;

        this.equipmentData = data.equipments || {};
        this.setNumberOfEquipments(data.numEquipments);
        
        // Atualizar selector
        const selector = document.getElementById('num-equipments');
        if (selector) {
            selector.value = data.numEquipments;
        }
    }
}

// Exportar instância global
export const equipmentManager = new EquipmentManager();
