/**
 * Reports Module - Geração de documentos Word
 * Usa docx.js para criar relatórios em formato .docx
 */

class ReportGenerator {
  constructor() {
    this.docx = window.docx; // Biblioteca docx.js carregada globalmente
  }

  /**
   * Gera relatório completo em Word
   */
  async generateReport() {
    try {
      const generalData = forms.collectGeneralData();
      const verifications = forms.verifications;
      const observations = forms.collectObservations();

      // Validar dados mínimos
      if (!generalData.cliente || !generalData.ubicacion) {
        throw new Error('Por favor, complete al menos Cliente y Ubicación del escáner');
      }

      // Criar documento
      const doc = this.createDocument(generalData, verifications, observations);

      // Gerar blob
      const blob = await this.docx.Packer.toBlob(doc);

      // Nome do arquivo
      const fileName = this.generateFileName(generalData);

      // Download
      saveAs(blob, fileName);

      forms.showStatus('Informe generado correctamente', 'success');
      return true;

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      forms.showStatus(`Error: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Cria documento Word com estrutura completa
   */
  createDocument(generalData, verifications, observations) {
    const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, convertInchesToTwip } = this.docx;

    // Criar seções do documento
    const sections = [];

    // Cabeçalho
    sections.push(
      new Paragraph({
        text: "Informe de Intervención",
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    sections.push(
      new Paragraph({
        text: "Visita Preventiva",
        alignment: AlignmentType.RIGHT,
        spacing: { after: 200 }
      })
    );

    // Datos Generales
    sections.push(...this.createGeneralDataSection(generalData));

    // Verificaciones
    if (verifications && verifications.length > 0) {
      sections.push(...this.createVerificationsSection(verifications));
    }

    // Observaciones
    if (observations) {
      sections.push(...this.createObservationsSection(observations));
    }

    // Rodapé
    sections.push(
      new Paragraph({
        text: "© Valmet 2025",
        alignment: AlignmentType.LEFT,
        spacing: { before: 400 }
      }),
      new Paragraph({
        text: "Valmet Technologies S. A. U. - Polígono Malpica calle A nº16, CP 50016 Zaragoza, Spain",
        spacing: { after: 200 }
      })
    );

    return new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.5),
              right: convertInchesToTwip(0.625),
              bottom: convertInchesToTwip(0.5),
              left: convertInchesToTwip(0.625)
            }
          }
        },
        children: sections
      }]
    });
  }

  /**
   * Cria seção de dados gerais
   */
  createGeneralDataSection(data) {
    const { Paragraph, TextRun, AlignmentType } = this.docx;
    const sections = [];

    sections.push(
      new Paragraph({
        text: "Datos Generales",
        heading: this.docx.HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 }
      })
    );

    // Linha de dados básicos
    if (data.año || data.semana || data.cliente || data.albaran || data.codIngeniero) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Año: ${data.año || '-'}  |  `, bold: true }),
            new TextRun({ text: `Semana: ${data.semana || '-'}  |  `, bold: true }),
            new TextRun({ text: `Cliente: ${data.cliente || '-'}  |  `, bold: true }),
            new TextRun({ text: `Albarán: ${data.albaran || '-'}  |  `, bold: true }),
            new TextRun({ text: `Cód.Ingeniero: ${data.codIngeniero || '-'}`, bold: true })
          ],
          spacing: { after: 200 }
        })
      );
    }

    // Ubicación del escáner
    if (data.ubicacion) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Ubicación del escáner: ", bold: true }),
            new TextRun({ text: data.ubicacion })
          ],
          spacing: { after: 200 }
        })
      );
    }

    // Perfiles en el aire
    if (data.perfiles) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Perfiles en el aire:", bold: true })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: `- ${data.perfiles}`,
          spacing: { after: 200 }
        })
      );
    }

    // Peticiones del cliente
    if (data.peticiones) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Peticiones del cliente:", bold: true })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: `- ${data.peticiones}`,
          spacing: { after: 200 }
        })
      );
    }

    // Descripción de la visita
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Descripción de la Visita:", bold: true })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        text: `- Revisión del Escáner - ${data.ubicacion || ''}`,
        spacing: { after: 300 }
      })
    );

    return sections;
  }

  /**
   * Cria seção de verificações
   */
  createVerificationsSection(verifications) {
    const { Paragraph, TextRun, AlignmentType } = this.docx;
    const sections = [];

    sections.push(
      new Paragraph({
        text: "Verificaciones Realizadas",
        heading: this.docx.HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 }
      })
    );

    verifications.forEach((verification, index) => {
      // Título da verificação
      const title = verification.section 
        ? `Verificación del ${verification.section.toLowerCase()}`
        : `Verificación ${index + 1}`;

      sections.push(
        new Paragraph({
          text: title,
          heading: this.docx.HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 }
        })
      );

      // Item
      if (verification.item) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: `Verificación de ${verification.item.toLowerCase()}`, bold: true })
            ],
            spacing: { after: 100 }
          })
        );
      }

      // Estado
      if (verification.status) {
        sections.push(
          new Paragraph({
            text: `– ${verification.status}`,
            spacing: { after: 100 }
          })
        );
      }

      // Nota sobre fotos (não podemos inserir imagens base64 diretamente com docx.js básico)
      if (verification.photos && verification.photos.length > 0) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ 
                text: `[${verification.photos.length} foto(s) capturada(s) - ver archivos adjuntos]`,
                italics: true,
                color: "666666"
              })
            ],
            spacing: { after: 200 }
          })
        );
      }
    });

    return sections;
  }

  /**
   * Cria seção de observações
   */
  createObservationsSection(observations) {
    const { Paragraph, TextRun } = this.docx;

    return [
      new Paragraph({
        text: "Observaciones",
        heading: this.docx.HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 }
      }),
      new Paragraph({
        text: observations,
        spacing: { after: 200 }
      })
    ];
  }

  /**
   * Gera nome do arquivo baseado nos dados
   */
  generateFileName(data) {
    const date = new Date();
    const year = data.año || date.getFullYear();
    const week = data.semana || this.getWeekNumber(date);
    const client = data.cliente || 'Cliente';
    
    // Sanitizar nome do cliente
    const sanitizedClient = client.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
    
    return `Informe_QCS_${year}_S${week}_${sanitizedClient}.docx`;
  }

  /**
   * Calcula número da semana do ano
   */
  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }
}

// Exportar instância global
const reportGenerator = new ReportGenerator();
