/**
 * reports.js
 * Word document generation using docx.js (GenReport structure)
 */

import { MAPEAMENTO_REPUESTOS } from './constants.js';

class ReportsManager {
    constructor() {
        this.docx = window.docx;
    }

    /**
     * Generates complete Word report
     */
    async generateReport(reportData) {
        try {
            const { generalData, observations, sections, sectionPhotos, itemPhotos, hoursData } = reportData;

            // Validate minimum data
            if (!generalData.cliente) {
                throw new Error('Campo "Cliente" es obligatorio');
            }

            // Create document
            const doc = await this.createDocument(
                generalData,
                observations,
                sections,
                sectionPhotos,
                itemPhotos,
                reportData.signatures,  // Assinaturas
                hoursData  // **NOVO**: Horas trabalhadas
            );

            // Generate blob
            const blob = await this.docx.Packer.toBlob(doc);

            // Generate filename
            const fileName = this.generateFileName(generalData);

            // Download using FileSaver.js
            saveAs(blob, fileName);

            return true;
        } catch (error) {
            console.error('Error generating report:', error);
            throw error;
        }
    }

    /**
     * Creates Word document structure
     * @param {object} signatures - {ingeniero: {nombre, firma, fecha}, cliente: {nombre, firma, fecha}}
     * @param {object} hoursData - {rows: [], totals: {}}
     */
    async createDocument(generalData, observations, sections, sectionPhotos, itemPhotos, signatures = null, hoursData = null) {
        const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun } = this.docx;

        const documentChildren = [];

        // **NOVO**: PRIMERA PÁGINA - Tabela de Horas Trabajadas
        if (hoursData && hoursData.rows) {
            await this.addHoursTablePage(documentChildren, hoursData, signatures);
            
            // Page break após horas
            documentChildren.push(
                new Paragraph({
                    children: [],
                    pageBreakBefore: true
                })
            );
        }

        // Title
        documentChildren.push(
            new Paragraph({
                children: [new TextRun({
                    text: "Informe de Verificación QCS - Valmet",
                    bold: true,
                    size: 32
                })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 }
            })
        );

        // General Data Section
        documentChildren.push(
            new Paragraph({
                children: [new TextRun({
                    text: "Datos Generales",
                    bold: true,
                    size: 28
                })],
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 200, after: 200 }
            })
        );

        // General data fields
        const generalFields = [
            { label: "Año", value: generalData.año },
            { label: "Semana", value: generalData.semana },
            { label: "Cliente", value: generalData.cliente },
            { label: "Albarán", value: generalData.albaran },
            { label: "Código Ingeniero", value: generalData.codIngeniero },
            { label: "Ubicación del escáner", value: generalData.ubicacion },
            { label: "Perfiles en el aire", value: generalData.perfiles },
            { label: "Peticiones del cliente", value: generalData.peticiones }
        ];

        generalFields.forEach(field => {
            if (field.value) {
                documentChildren.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `${field.label}: `,
                                bold: true
                            }),
                            new TextRun(field.value)
                        ],
                        spacing: { after: 100 }
                    })
                );
            }
        });

        // Sections with items
        for (const [secao, itens] of Object.entries(sections)) {
            // Skip empty sections
            if (Object.keys(itens).length === 0) continue;

            // Section heading
            documentChildren.push(
                new Paragraph({
                    children: [new TextRun({
                        text: `Verificación del ${secao.toLowerCase()}`,
                        bold: true,
                        size: 26
                    })],
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 }
                })
            );

            // Section photo if exists
            if (sectionPhotos[secao] && sectionPhotos[secao].dataUrl) {
                try {
                    const imageData = await this.dataUrlToArrayBuffer(sectionPhotos[secao].dataUrl);
                    documentChildren.push(
                        new Paragraph({
                            children: [
                                new ImageRun({
                                    data: imageData,
                                    transformation: {
                                        width: 400,
                                        height: 300
                                    }
                                })
                            ],
                            spacing: { after: 200 }
                        })
                    );
                } catch (error) {
                    console.error('Error adding section photo:', error);
                }
            }

            // Items
            for (const [item, estados] of Object.entries(itens)) {
                // Item name
                documentChildren.push(
                    new Paragraph({
                        children: [new TextRun({
                            text: `Verificación de ${item.toLowerCase()}`,
                            bold: true,
                            size: 22
                        })],
                        spacing: { before: 200, after: 100 }
                    })
                );

                // States
                documentChildren.push(
                    new Paragraph({
                        children: [
                            new TextRun("– "),
                            new TextRun(estados)
                        ],
                        spacing: { after: 100 }
                    })
                );

                // Item photos (up to 2)
                const photoKeys = [`${secao}|${item}|1`, `${secao}|${item}|2`];
                for (const photoKey of photoKeys) {
                    if (itemPhotos[photoKey] && itemPhotos[photoKey].dataUrl) {
                        try {
                            const imageData = await this.dataUrlToArrayBuffer(itemPhotos[photoKey].dataUrl);
                            documentChildren.push(
                                new Paragraph({
                                    children: [
                                        new ImageRun({
                                            data: imageData,
                                            transformation: {
                                                width: 300,
                                                height: 225
                                            }
                                        })
                                    ],
                                    spacing: { after: 100 }
                                })
                            );
                        } catch (error) {
                            console.error('Error adding item photo:', error);
                        }
                    }
                }
            }
        }

        // Observations
        if (observations) {
            documentChildren.push(
                new Paragraph({
                    children: [new TextRun({
                        text: "Observaciones",
                        bold: true,
                        size: 26
                    })],
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 }
                })
            );

            documentChildren.push(
                new Paragraph({
                    children: [new TextRun(observations)],
                    spacing: { after: 200 }
                })
            );
        }

        // ===== TABELA DE REPUESTOS NECESARIOS =====
        await this.addRepuestosTable(documentChildren, sections);

        // ===== TABELA DE MANTENIMIENTO =====
        await this.addMantenimientoTable(documentChildren, sections, generalData);

        return new Document({
            sections: [{
                properties: {
                    page: {
                        pageNumbers: {
                            start: 1,
                            formatType: "decimal"
                        }
                    }
                },
                footers: {
                    default: this.createFooter()
                },
                children: documentChildren
            }]
        });
    }

    /**
     * Converts DataURL to ArrayBuffer for docx.js
     */
    async dataUrlToArrayBuffer(dataUrl) {
        const base64 = dataUrl.split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Creates footer with company information
     */
    createFooter() {
        const { Footer, Paragraph, TextRun, AlignmentType } = this.docx;
        
        return new Footer({
            children: [
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "© Valmet 2025",
                            size: 16
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 100, after: 50 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Valmet Technologies S. A. U. - Polígono Malpica calle A nº16, CP 50016 Zaragoza, Spain - Tel +34 91 484 12 26  Fax +34 91 662 60 50",
                            size: 14
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 50 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "www.valmet.com – CIF A28318334 – IBAN: FI6816650001087083",
                            size: 14
                        })
                    ],
                    alignment: AlignmentType.CENTER
                })
            ]
        });
    }

    /**
     * Generates filename for report (formato baseado no Python GenReport)
     * Formato: Año_Semana_Cliente_YYYYMMDD.docx
     */
    generateFileName(generalData) {
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
        
        const año = generalData.año || date.getFullYear();
        const semana = generalData.semana || '';
        const cliente = generalData.cliente || 'Cliente';
        
        // Sanitize strings
        const sanitizedCliente = cliente.replace(/[^a-zA-Z0-9]/g, '_');
        
        // Construir nome: Año_Semana_Cliente_Date.docx
        let fileName = '';
        if (año) fileName += `${año}_`;
        if (semana) fileName += `Sem${semana}_`;
        fileName += `${sanitizedCliente}_${dateStr}.docx`;
        
        return fileName;
    }

    /**
     * Adiciona tabela de Repuestos Necesarios (baseado no Python GenReport)
     * Filtra itens com estado "Sustituir" e mapeia para códigos
     */
    async addRepuestosTable(documentChildren, sections) {
        const { Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle } = this.docx;
        
        const repuestosData = [];
        
        // Percorrer todas as seções e itens
        for (const [sectionName, items] of Object.entries(sections)) {
            for (const [itemName, itemData] of Object.entries(items)) {
                const states = itemData.states || [];
                
                // Se contém "Sustituir" nos estados
                if (states.includes('Sustituir')) {
                    // Buscar mapeamento
                    const mapping = MAPEAMENTO_REPUESTOS[itemName];
                    if (mapping) {
                        repuestosData.push({
                            articulo: mapping.nome,
                            codigo: mapping.codigo,
                            cantidad: 1  // Sempre 1 por padrão
                        });
                    }
                }
            }
        }

        // Se não há repuestos, não adicionar tabela
        if (repuestosData.length === 0) {
            return;
        }

        // Título
        documentChildren.push(
            new Paragraph({
                children: [new TextRun({
                    text: "Repuestos Necesarios",
                    bold: true,
                    size: 26
                })],
                heading: 1,
                spacing: { before: 400, after: 200 }
            })
        );

        // Criar linhas da tabela
        const tableRows = [
            // Header
            new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "Artículo", bold: true })] })],
                        width: { size: 50, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "Código", bold: true })] })],
                        width: { size: 30, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "Cantidad", bold: true })] })],
                        width: { size: 20, type: WidthType.PERCENTAGE }
                    })
                ]
            })
        ];

        // Data rows
        for (const item of repuestosData) {
            tableRows.push(
                new TableRow({
                    children: [
                        new TableCell({
                            children: [new Paragraph(item.articulo)]
                        }),
                        new TableCell({
                            children: [new Paragraph(item.codigo)]
                        }),
                        new TableCell({
                            children: [new Paragraph(item.cantidad.toString())]
                        })
                    ]
                })
            );
        }

        // Adicionar tabela
        documentChildren.push(
            new Table({
                rows: tableRows,
                width: { size: 100, type: WidthType.PERCENTAGE }
            })
        );
    }

    /**
     * Adiciona tabela de Mantenimiento (formato EXATO conforme imagem do usuário)
     * Com cores, dados e estrutura específica
     */
    async addMantenimientoTable(documentChildren, sections, generalData) {
        const { Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ShadingType } = this.docx;

        documentChildren.push(
            new Paragraph({
                children: [new TextRun({
                    text: "Tabla de Mantenimiento",
                    bold: true,
                    size: 26
                })],
                heading: 1,
                spacing: { before: 400, after: 200 }
            })
        );

        const today = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const cliente = generalData?.cliente || 'SW_NAVARRA';

        // Estrutura EXATA conforme imagem (15 linhas de dados)
        const maintenanceData = [
            { resp: cliente, pieza: "Sensores", funcion: "Limpieza", period: "Semanal", escaner: today },
            { resp: cliente, pieza: "Nivel de Agua", funcion: "Comprobar estado y rellenar agua si fuera necesario", period: "Semanal", escaner: today },
            { resp: cliente, pieza: "Portacables", funcion: "Inspección visual", period: "Mensual", escaner: today },
            { resp: "VALMET", pieza: "Portacables", funcion: "Inspección de la estanquidad de las tuercas de aire, cables eléctricos y mangueras de agua", period: "Trimestral", escaner: today },
            { resp: cliente, pieza: "Bombilla de Humedad", funcion: "Sustitución de bombilla en sensor de humedad", period: "Anual", escaner: "" },
            { resp: "VALMET", pieza: "Líquido de refrigeración", funcion: "Sustitución de líquido Refrigerante (Propilenglicol 30% agua destilada 70%)", period: "Anual", escaner: "" },
            { resp: "VALMET", pieza: "Filtro de lodo del sistema de agua", funcion: "Limpieza de los filtros", period: "Trimestral", escaner: today },
            { resp: "VALMET", pieza: "Filtro de aire", funcion: "Comprobar estado y sustituir el filtro de aire", period: "Anual", escaner: today },
            { resp: "VALMET", pieza: "Plástico poroso del indicador de humedad", funcion: "Sustituir por uno nuevo el plástico poroso del interior del indicador de humedad del sistema neumático", period: "Semestral", escaner: "" },
            { resp: "VALMET", pieza: "Bastidor de medición", funcion: "Limpie el bastidor debajo de las estructuras mediante vacío o soplador", period: "Trimestral", escaner: today },
            { resp: "VALMET", pieza: "Rail wipers", funcion: "Sustituya las escobillas del rail", period: "Trimestral", escaner: today },
            { resp: "VALMET", pieza: "Rodamientos del Carro", funcion: "Revisión y Engrasado", period: "Trimestral", escaner: today },
            { resp: "VALMET", pieza: "Rodamientos del Accionamiento", funcion: "Revisión y Engrasado", period: "Semestral", escaner: today },
            { resp: "VALMET", pieza: "Certificado de fuentes radioactivas", funcion: "Emitido según normativa vigente", period: "Anual", escaner: "" },
            { resp: "VALMET", pieza: "Certificado de Calibración", funcion: "Realizado Conforme especificaciones Valmet", period: "Anual", escaner: "" }
        ];

        // Header row com COR VERDE
        const tableRows = [
            new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph({ 
                            children: [new TextRun({ text: "Responsabilidad", bold: true, color: "000000" })],
                            alignment: AlignmentType.CENTER
                        })],
                        shading: { fill: "90EE90", type: ShadingType.CLEAR },
                        width: { size: 15, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph({ 
                            children: [new TextRun({ text: "Pieza", bold: true, color: "000000" })],
                            alignment: AlignmentType.CENTER
                        })],
                        shading: { fill: "90EE90", type: ShadingType.CLEAR },
                        width: { size: 20, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph({ 
                            children: [new TextRun({ text: "Funcción", bold: true, color: "000000" })],
                            alignment: AlignmentType.CENTER
                        })],
                        shading: { fill: "90EE90", type: ShadingType.CLEAR },
                        width: { size: 40, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph({ 
                            children: [new TextRun({ text: "Periodicidad", bold: true, color: "000000" })],
                            alignment: AlignmentType.CENTER
                        })],
                        shading: { fill: "90EE90", type: ShadingType.CLEAR },
                        width: { size: 12, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph({ 
                            children: [new TextRun({ text: "Escáner RL.", bold: true, color: "000000" })],
                            alignment: AlignmentType.CENTER
                        })],
                        shading: { fill: "90EE90", type: ShadingType.CLEAR },
                        width: { size: 13, type: WidthType.PERCENTAGE }
                    })
                ]
            })
        ];

        // Data rows
        maintenanceData.forEach(row => {
            tableRows.push(
                new TableRow({
                    children: [
                        new TableCell({ 
                            children: [new Paragraph({ 
                                children: [new TextRun(row.resp)],
                                alignment: AlignmentType.CENTER
                            })]
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ 
                                children: [new TextRun(row.pieza)],
                                alignment: AlignmentType.CENTER
                            })]
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ 
                                children: [new TextRun(row.funcion)],
                                alignment: AlignmentType.LEFT
                            })]
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ 
                                children: [new TextRun(row.period)],
                                alignment: AlignmentType.CENTER
                            })]
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ 
                                children: [new TextRun(row.escaner)],
                                alignment: AlignmentType.CENTER
                            })]
                        })
                    ]
                })
            );
        });

        documentChildren.push(
            new Table({
                rows: tableRows,
                width: { size: 100, type: WidthType.PERCENTAGE }
            })
        );
    }

    /**
     * Adiciona página de assinaturas (baseado no exemplo do usuário)
     */
    async addSignaturesPage(documentChildren, signatures) {
        const { Paragraph, TextRun, ImageRun } = this.docx;

        documentChildren.push(
            new Paragraph({
                children: [new TextRun({
                    text: "Firmas",
                    bold: true,
                    size: 26
                })],
                heading: 1,
                spacing: { before: 600, after: 300 }
            })
        );

        // Assinatura Ingeniero
        if (signatures.ingeniero) {
            documentChildren.push(
                new Paragraph({
                    children: [new TextRun({
                        text: "Ingeniero de Servicio:",
                        bold: true,
                        size: 24
                    })],
                    spacing: { before: 200, after: 100 }
                })
            );

            if (signatures.ingeniero.nombre) {
                documentChildren.push(
                    new Paragraph({
                        children: [new TextRun(`Nombre: ${signatures.ingeniero.nombre}`)],
                        spacing: { after: 100 }
                    })
                );
            }

            if (signatures.ingeniero.firma) {
                try {
                    const imageBytes = await this.dataUrlToArrayBuffer(signatures.ingeniero.firma);
                    documentChildren.push(
                        new Paragraph({
                            children: [
                                new ImageRun({
                                    data: imageBytes,
                                    transformation: { width: 200, height: 100 }
                                })
                            ],
                            spacing: { after: 100 }
                        })
                    );
                } catch (error) {
                    console.error('Error adding ingeniero signature:', error);
                }
            }

            if (signatures.ingeniero.fecha) {
                documentChildren.push(
                    new Paragraph({
                        children: [new TextRun(`Fecha: ${signatures.ingeniero.fecha}`)],
                        spacing: { after: 300 }
                    })
                );
            }
        }

        // Assinatura Cliente
        if (signatures.cliente) {
            documentChildren.push(
                new Paragraph({
                    children: [new TextRun({
                        text: "Cliente:",
                        bold: true,
                        size: 24
                    })],
                    spacing: { before: 200, after: 100 }
                })
            );

            if (signatures.cliente.nombre) {
                documentChildren.push(
                    new Paragraph({
                        children: [new TextRun(`Nombre: ${signatures.cliente.nombre}`)],
                        spacing: { after: 100 }
                    })
                );
            }

            if (signatures.cliente.firma) {
                try {
                    const imageBytes = await this.dataUrlToArrayBuffer(signatures.cliente.firma);
                    documentChildren.push(
                        new Paragraph({
                            children: [
                                new ImageRun({
                                    data: imageBytes,
                                    transformation: { width: 200, height: 100 }
                                })
                            ],
                            spacing: { after: 100 }
                        })
                    );
                } catch (error) {
                    console.error('Error adding cliente signature:', error);
                }
            }

            if (signatures.cliente.fecha) {
                documentChildren.push(
                    new Paragraph({
                        children: [new TextRun(`Fecha: ${signatures.cliente.fecha}`)],
                        spacing: { after: 200 }
                    })
                );
            }
        }
    }

    /**
     * Adiciona primeira página com tabela de Horas Trabajadas
     * Formato conforme imagem do usuário
     */
    async addHoursTablePage(documentChildren, hoursData, signatures) {
        const { Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, ImageRun } = this.docx;

        // Título
        documentChildren.push(
            new Paragraph({
                children: [new TextRun({
                    text: "Horas Trabajadas",
                    bold: true,
                    size: 28
                })],
                heading: 1,
                spacing: { before: 200, after: 300 }
            })
        );

        const days = ['LUN', 'MAR', 'MIER', 'JUE', 'VIER', 'SAB', 'DOM'];
        const dayLabels = ['LUN.', 'MAR.', 'MIER.', 'JUE.', 'VIER.', 'SAB.', 'DOM.'];

        // Criar linhas da tabela
        const tableRows = [
            // Header row
            new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "DÍAS", bold: true })], alignment: AlignmentType.CENTER })],
                        width: { size: 8, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "FECHAS", bold: true })], alignment: AlignmentType.CENTER })],
                        width: { size: 12, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "Horas de Viaje", bold: true })], alignment: AlignmentType.CENTER })],
                        width: { size: 11, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph({ 
                            children: [new TextRun({ text: "Horas normales\n8h00...20h00\n(Max 8 hrs)", bold: true })], 
                            alignment: AlignmentType.CENTER 
                        })],
                        width: { size: 13, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph({ 
                            children: [new TextRun({ text: "Horas Extras\n20h00...8h00\n(of> 8 hrs)", bold: true })], 
                            alignment: AlignmentType.CENTER 
                        })],
                        width: { size: 13, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "Horas\nSabados", bold: true })], alignment: AlignmentType.CENTER })],
                        width: { size: 11, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "Horas Feriadas\ny Domingos", bold: true })], alignment: AlignmentType.CENTER })],
                        width: { size: 12, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "Commentarios", bold: true })], alignment: AlignmentType.CENTER })],
                        width: { size: 20, type: WidthType.PERCENTAGE }
                    })
                ]
            })
        ];

        // Data rows (7 days)
        hoursData.rows.forEach((row, index) => {
            const formatHours = (value) => value > 0 ? value.toString() : '';
            const formatDate = (dateStr) => {
                if (!dateStr) return '';
                const date = new Date(dateStr + 'T00:00:00');
                return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
            };

            tableRows.push(
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun(dayLabels[index])], alignment: AlignmentType.CENTER })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun(formatDate(row.fecha))], alignment: AlignmentType.CENTER })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun(formatHours(row.viaje))], alignment: AlignmentType.CENTER })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun(formatHours(row.normales))], alignment: AlignmentType.CENTER })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun(formatHours(row.extras))], alignment: AlignmentType.CENTER })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun(formatHours(row.sabados))], alignment: AlignmentType.CENTER })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun(formatHours(row.feriados))], alignment: AlignmentType.CENTER })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun(row.comentarios || '')], alignment: AlignmentType.LEFT })] })
                    ]
                })
            );
        });

        // Total row
        const totals = hoursData.totals;
        const totalGeral = (totals.viaje || 0) + (totals.normales || 0) + (totals.extras || 0) + 
                          (totals.sabados || 0) + (totals.feriados || 0);

        tableRows.push(
            new TableRow({
                children: [
                    new TableCell({ 
                        children: [new Paragraph({ children: [new TextRun({ text: "TOTAL Hrs", bold: true })], alignment: AlignmentType.CENTER })],
                        columnSpan: 2
                    }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (totals.viaje || 0).toFixed(1), bold: true })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (totals.normales || 0).toFixed(1), bold: true })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (totals.extras || 0).toFixed(1), bold: true })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (totals.sabados || 0).toFixed(1), bold: true })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (totals.feriados || 0).toFixed(1), bold: true })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun("")], alignment: AlignmentType.CENTER })] })
                ]
            })
        );

        // Adicionar tabela principal
        documentChildren.push(
            new Table({
                rows: tableRows,
                width: { size: 100, type: WidthType.PERCENTAGE }
            })
        );

        // Espaçamento
        documentChildren.push(new Paragraph({ children: [], spacing: { after: 400 } }));

        // Segunda tabela - Assinaturas (formato simplificado conforme imagem)
        const signatureTableRows = [
            // Header
            new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "FECHA", bold: true })], alignment: AlignmentType.CENTER })],
                        width: { size: 25, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "FIRMA CLIENTE", bold: true })], alignment: AlignmentType.CENTER })],
                        width: { size: 37.5, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "FIRMA VALMET", bold: true })], alignment: AlignmentType.CENTER })],
                        width: { size: 37.5, type: WidthType.PERCENTAGE }
                    })
                ]
            })
        ];

        // Data row com assinaturas
        const today = new Date().toLocaleDateString('es-ES');
        
        // Células para assinaturas
        const clienteSignatureChildren = [];
        const valmetSignatureChildren = [];

        // Cliente signature
        if (signatures && signatures.cliente && signatures.cliente.firma) {
            try {
                const imageBytes = await this.dataUrlToArrayBuffer(signatures.cliente.firma);
                clienteSignatureChildren.push(
                    new Paragraph({
                        children: [
                            new ImageRun({
                                data: imageBytes,
                                transformation: { width: 150, height: 75 }
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 50, after: 50 }
                    })
                );
            } catch (error) {
                console.error('Error adding cliente signature to hours page:', error);
            }
        }

        // Valmet signature
        if (signatures && signatures.ingeniero && signatures.ingeniero.firma) {
            try {
                const imageBytes = await this.dataUrlToArrayBuffer(signatures.ingeniero.firma);
                valmetSignatureChildren.push(
                    new Paragraph({
                        children: [
                            new ImageRun({
                                data: imageBytes,
                                transformation: { width: 150, height: 75 }
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 50, after: 50 }
                    })
                );
            } catch (error) {
                console.error('Error adding ingeniero signature to hours page:', error);
            }
        }

        // Se não houver assinaturas, adicionar espaço vazio
        if (clienteSignatureChildren.length === 0) {
            clienteSignatureChildren.push(new Paragraph({ children: [new TextRun("")], spacing: { before: 100, after: 100 } }));
        }
        if (valmetSignatureChildren.length === 0) {
            valmetSignatureChildren.push(new Paragraph({ children: [new TextRun("")], spacing: { before: 100, after: 100 } }));
        }

        signatureTableRows.push(
            new TableRow({
                children: [
                    new TableCell({ 
                        children: [new Paragraph({ 
                            children: [new TextRun(today)], 
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 200, after: 200 }
                        })]
                    }),
                    new TableCell({ children: clienteSignatureChildren }),
                    new TableCell({ children: valmetSignatureChildren })
                ]
            })
        );

        documentChildren.push(
            new Table({
                rows: signatureTableRows,
                width: { size: 100, type: WidthType.PERCENTAGE }
            })
        );

        // Comentarios section
        documentChildren.push(
            new Paragraph({
                children: [new TextRun("Comentarios:")],
                spacing: { before: 200, after: 600 }
            })
        );
    }
}

export const reportsManager = new ReportsManager();
