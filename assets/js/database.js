/**
 * Database Module - Gerenciamento de dados com LocalStorage
 * Responsável por salvar/carregar relatórios e rascunhos
 */

const DB_KEY_DRAFTS = "reportmanager:drafts";
const DB_KEY_CURRENT = "reportmanager:current";

class DatabaseManager {
  /**
   * Salva dados atuais do formulário
   */
  saveCurrent(data) {
    try {
      localStorage.setItem(DB_KEY_CURRENT, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("Erro ao salvar dados atuais:", error);
      return false;
    }
  }

  /**
   * Carrega dados atuais do formulário
   */
  loadCurrent() {
    try {
      const data = localStorage.getItem(DB_KEY_CURRENT);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Erro ao carregar dados atuais:", error);
      return null;
    }
  }

  /**
   * Limpa dados atuais
   */
  clearCurrent() {
    localStorage.removeItem(DB_KEY_CURRENT);
  }

  /**
   * Lista todos os rascunhos salvos
   */
  listDrafts() {
    try {
      const drafts = localStorage.getItem(DB_KEY_DRAFTS);
      return drafts ? JSON.parse(drafts) : [];
    } catch (error) {
      console.error("Erro ao listar rascunhos:", error);
      return [];
    }
  }

  /**
   * Salva um rascunho
   */
  saveDraft(name, data) {
    try {
      const drafts = this.listDrafts();
      const draft = {
        id: Date.now(),
        name: name,
        data: data,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleString('es-ES')
      };
      
      drafts.push(draft);
      localStorage.setItem(DB_KEY_DRAFTS, JSON.stringify(drafts));
      return true;
    } catch (error) {
      console.error("Erro ao salvar rascunho:", error);
      return false;
    }
  }

  /**
   * Carrega um rascunho específico
   */
  loadDraft(draftId) {
    try {
      const drafts = this.listDrafts();
      const draft = drafts.find(d => d.id === draftId);
      return draft ? draft.data : null;
    } catch (error) {
      console.error("Erro ao carregar rascunho:", error);
      return null;
    }
  }

  /**
   * Remove um rascunho
   */
  deleteDraft(draftId) {
    try {
      let drafts = this.listDrafts();
      drafts = drafts.filter(d => d.id !== draftId);
      localStorage.setItem(DB_KEY_DRAFTS, JSON.stringify(drafts));
      return true;
    } catch (error) {
      console.error("Erro ao deletar rascunho:", error);
      return false;
    }
  }

  /**
   * Limpa todos os rascunhos
   */
  clearAllDrafts() {
    try {
      localStorage.removeItem(DB_KEY_DRAFTS);
      return true;
    } catch (error) {
      console.error("Erro ao limpar rascunhos:", error);
      return false;
    }
  }

  /**
   * Obtém uso de armazenamento (estimativa)
   */
  getStorageUsage() {
    let totalSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length;
      }
    }
    return {
      bytes: totalSize,
      kb: (totalSize / 1024).toFixed(2),
      mb: (totalSize / (1024 * 1024)).toFixed(2)
    };
  }

  /**
   * Generic save method
   */
  async save(key, data) {
    try {
      localStorage.setItem(`reportmanager:${key}`, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      throw error;
    }
  }

  /**
   * Generic load method
   */
  async load(key) {
    try {
      const data = localStorage.getItem(`reportmanager:${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error loading ${key}:`, error);
      return null;
    }
  }

  /**
   * Generic delete method
   */
  async delete(key) {
    try {
      localStorage.removeItem(`reportmanager:${key}`);
      return true;
    } catch (error) {
      console.error(`Error deleting ${key}:`, error);
      return false;
    }
  }
}

// Exportar instância global
export const db = new DatabaseManager();
