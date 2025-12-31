/**
 * state-selector.js
 * Modal popup para seleção múltipla de estados
 * Replica o MultiSelectPopupWidget do Python
 */

export class StateSelectorModal {
    constructor() {
        this.modal = null;
        this.selectedStates = [];
        this.onConfirm = null;
        this.createModal();
    }

    createModal() {
        // Modal overlay
        this.modal = document.createElement('div');
        this.modal.className = 'state-modal-overlay';
        this.modal.style.display = 'none';
        
        // Modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'state-modal-content';
        
        // Header
        const header = document.createElement('div');
        header.className = 'state-modal-header';
        header.innerHTML = `
            <h3>Seleccionar Estados</h3>
            <button class="state-modal-close">&times;</button>
        `;
        
        // Subtitle with item name
        const subtitle = document.createElement('p');
        subtitle.className = 'state-modal-subtitle';
        subtitle.textContent = 'Seleccione uno o más estados:';
        
        // Checkboxes container
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'state-modal-checkboxes';
        
        // Footer with actions
        const footer = document.createElement('div');
        footer.className = 'state-modal-footer';
        footer.innerHTML = `
            <button class="btn-modal-cancel">Cancelar</button>
            <button class="btn-modal-confirm">Confirmar</button>
        `;
        
        modalContent.appendChild(header);
        modalContent.appendChild(subtitle);
        modalContent.appendChild(checkboxContainer);
        modalContent.appendChild(footer);
        this.modal.appendChild(modalContent);
        document.body.appendChild(this.modal);
        
        // Event listeners
        this.modal.querySelector('.state-modal-close').addEventListener('click', () => this.close());
        this.modal.querySelector('.btn-modal-cancel').addEventListener('click', () => this.close());
        this.modal.querySelector('.btn-modal-confirm').addEventListener('click', () => this.confirm());
        
        // Close on overlay click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
    }

    open(itemName, availableStates, currentStates = [], callback) {
        this.selectedStates = [...currentStates];
        this.onConfirm = callback;
        
        // Update subtitle
        this.modal.querySelector('.state-modal-subtitle').textContent = 
            `Elemento: ${itemName}`;
        
        // Clear and populate checkboxes
        const container = this.modal.querySelector('.state-modal-checkboxes');
        container.innerHTML = '';
        
        availableStates.forEach(state => {
            const label = document.createElement('label');
            label.className = 'state-checkbox-label';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = state;
            checkbox.checked = currentStates.includes(state);
            
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    if (!this.selectedStates.includes(state)) {
                        this.selectedStates.push(state);
                    }
                } else {
                    this.selectedStates = this.selectedStates.filter(s => s !== state);
                }
                this.updateConfirmButton();
            });
            
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(' ' + state));
            container.appendChild(label);
        });
        
        this.updateConfirmButton();
        this.modal.style.display = 'flex';
    }

    updateConfirmButton() {
        const btn = this.modal.querySelector('.btn-modal-confirm');
        const count = this.selectedStates.length;
        btn.textContent = count > 0 ? `Confirmar (${count})` : 'Confirmar';
    }

    confirm() {
        if (this.onConfirm) {
            this.onConfirm(this.selectedStates);
        }
        this.close();
    }

    close() {
        this.modal.style.display = 'none';
        this.selectedStates = [];
        this.onConfirm = null;
    }
}

// Estilos CSS (serão adicionados ao styles.css)
export const STATE_MODAL_STYLES = `
.state-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
}

.state-modal-content {
    background: #2c2c2c;
    border-radius: 12px;
    padding: 0;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
}

.state-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #404040;
}

.state-modal-header h3 {
    margin: 0;
    color: #4CAF50;
    font-size: 20px;
}

.state-modal-close {
    background: none;
    border: none;
    color: #999;
    font-size: 28px;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
}

.state-modal-close:hover {
    background: #404040;
    color: #fff;
}

.state-modal-subtitle {
    padding: 16px 24px;
    margin: 0;
    color: #ddd;
    font-size: 14px;
    background: #242424;
}

.state-modal-checkboxes {
    padding: 20px 24px;
    overflow-y: auto;
    flex: 1;
}

.state-checkbox-label {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    margin-bottom: 8px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
    color: #ddd;
}

.state-checkbox-label:hover {
    background: #353535;
}

.state-checkbox-label input[type="checkbox"] {
    margin-right: 12px;
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #4CAF50;
}

.state-modal-footer {
    padding: 16px 24px;
    border-top: 1px solid #404040;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

.btn-modal-cancel,
.btn-modal-confirm {
    padding: 10px 24px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
}

.btn-modal-cancel {
    background: #404040;
    color: #fff;
}

.btn-modal-cancel:hover {
    background: #4a4a4a;
}

.btn-modal-confirm {
    background: #4CAF50;
    color: white;
}

.btn-modal-confirm:hover {
    background: #45a049;
}
`;
