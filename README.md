# ReportManager - Valmet QCS

Aplicativo PWA para gerar relatórios de manutenção QCS da Valmet com fotos capturadas via câmera do celular.

## Funcionalidades

- ✅ Formulários completos de dados gerais
- ✅ Sistema de verificações por seções
- ✅ Captura de fotos via câmera traseira
- ✅ Upload de fotos da galeria
- ✅ Geração de documento Word (.docx)
- ✅ Sistema de rascunhos/backups (LocalStorage)
- ✅ Funciona 100% offline após instalação
- ✅ PWA instalável no celular

## Tecnologias

- **HTML5/CSS3/JavaScript** - Interface e lógica
- **docx.js** - Geração de documentos Word
- **MediaDevices API** - Acesso à câmera
- **LocalStorage** - Armazenamento de dados e rascunhos
- **Service Worker** - Funcionamento offline
- **PWA Manifest** - Instalação como app

## Como usar

1. Acesse via GitHub Pages: https://grandechoi.github.io/testefotocharles/
2. Toque em "Adicionar à tela inicial" para instalar
3. Preencha os formulários
4. Adicione fotos (câmera ou galeria)
5. Gere o relatório em Word
6. Baixe e compartilhe o arquivo .docx

## Estrutura

```
/
├── index.html              # Interface principal
├── manifest.json           # Configuração PWA
├── sw.js                   # Service Worker
├── assets/
│   ├── css/
│   │   └── styles.css     # Estilos modernos
│   ├── js/
│   │   ├── app.js         # Inicialização
│   │   ├── database.js    # Gerenciamento de dados
│   │   ├── camera.js      # Controle de câmera
│   │   ├── forms.js       # Lógica de formulários
│   │   └── reports.js     # Geração de Word
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
```

## Diferenças do GenReport (Python)

| GenReport (Desktop) | ReportManager (PWA) |
|---|---|
| Python + Tkinter | HTML/CSS/JavaScript |
| python-docx | docx.js |
| Arquivos locais | LocalStorage |
| Desktop only | Funciona no celular |
| ~50MB | ~500KB |

## Limitações

- Fotos armazenadas no navegador (limite ~50MB)
- Documentos gerados são básicos (sem formatação complexa)
- Não sincroniza com servidor

---

**© Valmet 2025** - Adaptado por Louis Charles Almeida Maciel
