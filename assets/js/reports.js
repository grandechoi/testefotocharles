/**
 * reports.js
 * Word document generation using docx.js (GenReport structure)
 */

class ReportsManager {
    constructor() {
        this.docx = window.docx;
    }

    /**
     * Generates complete Word report
     */
    async generateReport(reportData) {
        try {
            const { generalData, observations, sections, sectionPhotos, itemPhotos } = reportData;

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
                itemPhotos
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
     */
    async createDocument(generalData, observations, sections, sectionPhotos, itemPhotos) {
        const { Document, Paragraph, TextRun, Heading, AlignmentType } = this.docx;

        const documentChildren = [];

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
                heading: Heading.HEADING_1,
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
                    heading: Heading.HEADING_1,
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
                                new this.docx.ImageRun({
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
                                        new this.docx.ImageRun({
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
                    heading: Heading.HEADING_1,
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

        return new Document({
            sections: [{
                properties: {},
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
     * Generates filename for report
     */
    generateFileName(generalData) {
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0];
        const cliente = generalData.cliente || 'Cliente';
        const sanitized = cliente.replace(/[^a-zA-Z0-9]/g, '_');
        return `Informe_${sanitized}_${dateStr}.docx`;
    }
}

export const reportsManager = new ReportsManager();
