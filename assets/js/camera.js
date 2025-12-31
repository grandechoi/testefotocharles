/**
 * Camera Module - Controle de câmera e captura de fotos
 * Gerencia acesso à câmera traseira e captura de imagens
 */

class CameraManager {
  constructor() {
    this.stream = null;
    this.videoElement = null;
    this.canvasElement = null;
    this.photos = [];
  }

  /**
   * Inicializa elementos de vídeo e canvas
   */
  init(videoElement, canvasElement) {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
  }

  /**
   * Verifica se a câmera é suportada
   */
  isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Inicia a câmera traseira
   */
  async startCamera() {
    if (!this.isSupported()) {
      throw new Error("Cámara no soportada en este navegador");
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment", // Câmera traseira
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
        this.videoElement.classList.remove('hidden');
      }

      return true;
    } catch (error) {
      console.error("Erro ao acessar câmera:", error);
      throw new Error("No se pudo acceder a la cámara. Verifica los permisos.");
    }
  }

  /**
   * Para a câmera e libera recursos
   */
  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement.classList.add('hidden');
    }
  }

  /**
   * Captura uma foto do stream de vídeo
   */
  capturePhoto() {
    if (!this.videoElement || !this.canvasElement) {
      throw new Error("Elementos de vídeo/canvas não inicializados");
    }

    // Configurar canvas com dimensões do vídeo
    this.canvasElement.width = this.videoElement.videoWidth;
    this.canvasElement.height = this.videoElement.videoHeight;

    // Desenhar frame do vídeo no canvas
    const context = this.canvasElement.getContext('2d');
    context.drawImage(this.videoElement, 0, 0);

    // Converter para data URL
    const photoDataUrl = this.canvasElement.toDataURL('image/jpeg', 0.9);
    return photoDataUrl;
  }

  /**
   * Converte arquivo de imagem para data URL
   */
  async fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('Archivo no es una imagen'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Redimensiona imagem para economizar espaço
   */
  async resizeImage(dataUrl, maxWidth = 1920, maxHeight = 1080) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calcular novas dimensões mantendo proporção
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Redimensionar no canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Retornar data URL redimensionada
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = dataUrl;
    });
  }

  /**
   * Limpa fotos armazenadas
   */
  clearPhotos() {
    this.photos = [];
  }

  /**
   * Adiciona foto à lista
   */
  addPhoto(dataUrl) {
    this.photos.push(dataUrl);
  }

  /**
   * Remove foto da lista
   */
  removePhoto(index) {
    this.photos.splice(index, 1);
  }

  /**
   * Obtém todas as fotos
   */
  getPhotos() {
    return this.photos;
  }
}

// Exportar instância global
const camera = new CameraManager();
