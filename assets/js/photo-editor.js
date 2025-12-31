/**
 * Photo Editor Module - Editor de imagens com ferramentas de desenho
 * Permite desenhar, adicionar formas e texto sobre imagens
 */

class PhotoEditor {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.image = null;
    this.isDrawing = false;
    this.currentTool = 'pencil'; // pencil, eraser, rectangle, circle, arrow, text
    this.currentColor = '#FF0000';
    this.lineWidth = 3;
    this.startX = 0;
    this.startY = 0;
    this.snapshot = null;
    this.textInput = null;
    this.onSave = null;
  }

  /**
   * Abre o editor com uma imagem
   */
  async openEditor(imageDataUrl, onSaveCallback) {
    this.onSave = onSaveCallback;
    
    return new Promise((resolve, reject) => {
      // Criar modal do editor
      const modal = document.createElement('div');
      modal.className = 'photo-editor-modal';
      modal.innerHTML = `
        <div class="photo-editor-container">
          <div class="photo-editor-header">
            <h3>✏️ Editar Imagen</h3>
            <button class="btn-close-editor">✕</button>
          </div>
          
          <div class="photo-editor-toolbar">
            <div class="toolbar-section">
              <button class="tool-btn active" data-tool="pencil" title="Dibujo Libre">
                ✏️
              </button>
              <button class="tool-btn" data-tool="eraser" title="Borrador">
                🧹
              </button>
              <button class="tool-btn" data-tool="rectangle" title="Rectángulo">
                ▭
              </button>
              <button class="tool-btn" data-tool="circle" title="Círculo">
                ○
              </button>
              <button class="tool-btn" data-tool="arrow" title="Flecha">
                ➜
              </button>
              <button class="tool-btn" data-tool="text" title="Texto">
                T
              </button>
            </div>
            
            <div class="toolbar-section">
              <label class="color-picker-label">
                <span>Color:</span>
                <input type="color" id="color-picker" value="#FF0000">
              </label>
              
              <label class="line-width-label">
                <span>Grosor:</span>
                <input type="range" id="line-width" min="1" max="10" value="3">
                <span id="line-width-value">3</span>
              </label>
            </div>
            
            <div class="toolbar-section">
              <button class="btn-undo" title="Deshacer">↶</button>
              <button class="btn-clear" title="Limpiar Todo">🗑️</button>
            </div>
          </div>
          
          <div class="photo-editor-canvas-container">
            <canvas id="photo-editor-canvas"></canvas>
            <input type="text" id="text-input-overlay" class="text-input-overlay" style="display:none;" placeholder="Escribe aquí...">
          </div>
          
          <div class="photo-editor-actions">
            <button class="btn-cancel-editor">Cancelar</button>
            <button class="btn-save-editor">💾 Guardar</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Elementos
      this.canvas = modal.querySelector('#photo-editor-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.textInput = modal.querySelector('#text-input-overlay');
      
      const colorPicker = modal.querySelector('#color-picker');
      const lineWidthSlider = modal.querySelector('#line-width');
      const lineWidthValue = modal.querySelector('#line-width-value');
      const toolBtns = modal.querySelectorAll('.tool-btn');
      const btnUndo = modal.querySelector('.btn-undo');
      const btnClear = modal.querySelector('.btn-clear');
      const btnSave = modal.querySelector('.btn-save-editor');
      const btnCancel = modal.querySelector('.btn-cancel-editor');
      const btnClose = modal.querySelector('.btn-close-editor');
      
      // Histórico para desfazer
      this.history = [];
      
      // Carregar imagem
      const img = new Image();
      img.onload = () => {
        this.image = img;
        
        // Configurar canvas
        const maxWidth = 800;
        const maxHeight = 600;
        let width = img.width;
        let height = img.height;
        
        // Redimensionar mantendo proporção
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Desenhar imagem
        this.ctx.drawImage(img, 0, 0, width, height);
        this.saveHistory();
        
        // Event listeners para ferramentas
        toolBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            toolBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.currentTool = btn.dataset.tool;
            this.textInput.style.display = 'none';
          });
        });
        
        // Color picker
        colorPicker.addEventListener('change', (e) => {
          this.currentColor = e.target.value;
        });
        
        // Line width
        lineWidthSlider.addEventListener('input', (e) => {
          this.lineWidth = parseInt(e.target.value);
          lineWidthValue.textContent = this.lineWidth;
        });
        
        // Desenho no canvas
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
        
        // Touch events
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));
        
        // Text input
        this.textInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.finishText();
          } else if (e.key === 'Escape') {
            this.textInput.style.display = 'none';
            this.textInput.value = '';
          }
        });
        
        // Undo
        btnUndo.addEventListener('click', () => this.undo());
        
        // Clear
        btnClear.addEventListener('click', () => {
          if (confirm('¿Limpiar todas las ediciones?')) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);
            this.saveHistory();
          }
        });
        
        // Save
        btnSave.addEventListener('click', () => {
          const editedImageDataUrl = this.canvas.toDataURL('image/jpeg', 0.9);
          if (this.onSave) {
            this.onSave(editedImageDataUrl);
          }
          document.body.removeChild(modal);
          resolve(editedImageDataUrl);
        });
        
        // Cancel/Close
        const closeEditor = () => {
          document.body.removeChild(modal);
          resolve(null);
        };
        
        btnCancel.addEventListener('click', closeEditor);
        btnClose.addEventListener('click', closeEditor);
      };
      
      img.onerror = () => {
        document.body.removeChild(modal);
        reject(new Error('Error al cargar imagen'));
      };
      
      img.src = imageDataUrl;
    });
  }
  
  saveHistory() {
    // Salvar estado atual
    this.history.push(this.canvas.toDataURL());
    // Limitar histórico a 20 estados
    if (this.history.length > 20) {
      this.history.shift();
    }
  }
  
  undo() {
    if (this.history.length > 1) {
      this.history.pop(); // Remove estado atual
      const previousState = this.history[this.history.length - 1];
      
      const img = new Image();
      img.onload = () => {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(img, 0, 0);
      };
      img.src = previousState;
    }
  }
  
  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }
  
  getTouchPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
    };
  }
  
  handleTouchStart(e) {
    e.preventDefault();
    const pos = this.getTouchPos(e);
    this.startDrawing({ clientX: pos.x, clientY: pos.y, type: 'touchstart' });
  }
  
  handleTouchMove(e) {
    e.preventDefault();
    const pos = this.getTouchPos(e);
    this.draw({ clientX: pos.x, clientY: pos.y, type: 'touchmove' });
  }
  
  startDrawing(e) {
    const pos = e.type.includes('touch') ? { x: e.clientX, y: e.clientY } : this.getMousePos(e);
    
    this.isDrawing = true;
    this.startX = pos.x;
    this.startY = pos.y;
    
    if (this.currentTool === 'text') {
      // Mostrar input de texto na posição clicada
      const rect = this.canvas.getBoundingClientRect();
      this.textInput.style.left = (e.clientX || e.touches[0].clientX) + 'px';
      this.textInput.style.top = (e.clientY || e.touches[0].clientY) + 'px';
      this.textInput.style.display = 'block';
      this.textInput.style.color = this.currentColor;
      this.textInput.style.fontSize = (this.lineWidth * 5) + 'px';
      this.textInput.value = '';
      this.textInput.focus();
      this.isDrawing = false;
      return;
    }
    
    // Salvar snapshot para desenhar formas
    if (this.currentTool !== 'pencil') {
      this.snapshot = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }
    
    // Configurar contexto
    if (this.currentTool === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.lineWidth = this.lineWidth * 3; // Borracha maior
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = this.currentColor;
      this.ctx.fillStyle = this.currentColor;
      this.ctx.lineWidth = this.lineWidth;
    }
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    if (this.currentTool === 'pencil' || this.currentTool === 'eraser') {
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, pos.y);
    }
  }
  
  draw(e) {
    if (!this.isDrawing) return;
    
    const pos = e.type.includes('touch') ? { x: e.clientX, y: e.clientY } : this.getMousePos(e);
    
    if (this.currentTool === 'pencil' || this.currentTool === 'eraser') {
      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.stroke();
    } else if (this.currentTool === 'rectangle') {
      // Restaurar snapshot e desenhar retângulo
      this.ctx.putImageData(this.snapshot, 0, 0);
      const width = pos.x - this.startX;
      const height = pos.y - this.startY;
      this.ctx.strokeRect(this.startX, this.startY, width, height);
    } else if (this.currentTool === 'circle') {
      // Restaurar snapshot e desenhar círculo
      this.ctx.putImageData(this.snapshot, 0, 0);
      const radius = Math.sqrt(Math.pow(pos.x - this.startX, 2) + Math.pow(pos.y - this.startY, 2));
      this.ctx.beginPath();
      this.ctx.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
      this.ctx.stroke();
    } else if (this.currentTool === 'arrow') {
      // Restaurar snapshot e desenhar seta
      this.ctx.putImageData(this.snapshot, 0, 0);
      this.drawArrow(this.startX, this.startY, pos.x, pos.y);
    }
  }
  
  stopDrawing() {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.saveHistory();
    }
  }
  
  finishText() {
    const text = this.textInput.value.trim();
    if (text) {
      const rect = this.canvas.getBoundingClientRect();
      const canvasX = (parseFloat(this.textInput.style.left) - rect.left) * (this.canvas.width / rect.width);
      const canvasY = (parseFloat(this.textInput.style.top) - rect.top) * (this.canvas.height / rect.height);
      
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.font = `bold ${this.lineWidth * 5}px Arial`;
      this.ctx.fillStyle = this.currentColor;
      this.ctx.fillText(text, canvasX, canvasY);
      this.saveHistory();
    }
    this.textInput.style.display = 'none';
    this.textInput.value = '';
  }
  
  drawArrow(fromX, fromY, toX, toY) {
    const headLength = 15 * (this.lineWidth / 3); // Tamanho da ponta
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    // Desenhar linha
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();
    
    // Desenhar ponta da seta
    this.ctx.beginPath();
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();
  }
}

// Exportar instância global
export const photoEditor = new PhotoEditor();
