/**
 * constants.js
 * Constantes de dados do sistema QCS ReportManager
 * Port direto do constants.py do GenReport Python
 */

// Estrutura de tópicos de inspeção (6 seções, 64 itens totais)
export const TOPICOS_INSPECAO = {
    "Sistema de refrigeración": [
        "Filtro de agua de refrigeración",
        "Tamice de Lodo",
        "Estado del líquido de refrigeración del depósito",
        "Resistencia de calentamiento",
        "Válvula magnética de agua de fábrica",
        "Conexiones y tuberías del sistema de Refrigeración"
    ],
    "Sistema neumático": [
        "Sistema de purga _ Pastilla Porex",
        "Filtro de Aire comprimido filtrado",
        "Filtro de Aire comprimido general",
        "Conexiones y tuberías del sistema neumático"
    ],
    "Sistema eléctrico y de comunicaciones": [
        "Conexiones de cables y conductores",
        "ACN _ Tarjetas _ Switches _ Fibra _ RJ45"
    ],
    "Cables eléctricos, tuberías de agua y aire en la viga": [
        "Portacables (Cable Track) SUPERIOR",
        "Portacables (Cable Track) INFERIOR",
        "Empalmes y conexiones eléctricas en la plataforma SUPERIOR",
        "Empalmes y conexiones eléctricas en la plataforma INFERIOR"
    ],
    "Sistema mecánico": [
        "Rodamientos de plataforma SUPERIOR",
        "Rodamientos de plataforma INFERIOR",
        "Eje de transmisión",
        "Correa dentada (Timing Belt) SUPERIOR",
        "Correa dentada (Timing Belt) INFERIOR",
        "Correa dentada del Motor",
        "Motor de Transmisión",
        "Correa de sellado (Sealing Belt) SUPERIOR",
        "Correa de sellado (Sealing Belt) INFERIOR",
        "Rodillos de la correa de sellado SUPERIOR",
        "Rodillos de la correa de sellado INFERIOR",
        "Guía y Railwipers"
    ],
    "Plataformas y sensores": [
        "Rodillos guía de las plataformas SUPERIOR",
        "Rodillos guía de las plataformas INFERIOR",
        "Conexiones Y Tuberías de los Sensores SUPERIOR",
        "Conexiones Y Tuberías de los Sensores INFERIOR",
        "Ventanas de medición de los Sensores SUPERIOR",
        "Ventanas de medición de los Sensores INFERIOR",
        "Bombilla de Humedad",
        "Certificado de Fuentes Radioactivas",
        "Certificado de Calibración"
    ]
};

// ===============================================
// MAPEAMENTO DE REPUESTOS (do Python GenReport)
// ===============================================
export const MAPEAMENTO_REPUESTOS = {
    "Ventanas de medición de los Sensores SUPERIOR": { nome: "Ventanas Sensor Superior", codigo: "VEN-SUP-001" },
    "Ventanas de medición de los Sensores INFERIOR": { nome: "Ventanas Sensor Inferior", codigo: "VEN-INF-001" },
    "Estado del líquido de refrigeración del depósito": { nome: "Líquido de Refrigeración", codigo: "LIQ-REF-001" },
    "Portacables (Cable Track) SUPERIOR": { nome: "Portacables Superior", codigo: "POR-SUP-001" },
    "Portacables (Cable Track) INFERIOR": { nome: "Portacables Inferior", codigo: "POR-INF-001" },
    "Filtro de agua de refrigeración": { nome: "Filtro de Agua", codigo: "FIL-AGU-001" },
    "Tamice de Lodo": { nome: "Tamice de Lodo", codigo: "TAM-LOD-001" },
    "Rodamientos de plataforma SUPERIOR": { nome: "Rodamientos Superior", codigo: "ROD-SUP-001" },
    "Rodamientos de plataforma INFERIOR": { nome: "Rodamientos Inferior", codigo: "ROD-INF-001" },
    "Motor de Transmisión": { nome: "Motor de Transmisión", codigo: "MOT-TRA-001" },
    "Correa dentada (Timing Belt) SUPERIOR": { nome: "Correa Timing Superior", codigo: "COR-TIM-SUP" },
    "Correa dentada (Timing Belt) INFERIOR": { nome: "Correa Timing Inferior", codigo: "COR-TIM-INF" },
    "Correa dentada del Motor": { nome: "Correa Motor", codigo: "COR-MOT-001" },
    "Correa de sellado (Sealing Belt) SUPERIOR": { nome: "Correa Sellado Superior", codigo: "COR-SEL-SUP" },
    "Correa de sellado (Sealing Belt) INFERIOR": { nome: "Correa Sellado Inferior", codigo: "COR-SEL-INF" },
    "Bombilla de Humedad": { nome: "Bombilla de Humedad", codigo: "BOM-HUM-001" },
    "Certificado de Fuentes Radioactivas": { nome: "Certificado Fuente Radioactiva", codigo: "CER-RAD-001" },
    "Certificado de Calibración": { nome: "Certificado de Calibración", codigo: "CER-CAL-001" }
};

// Opções de estado para cada item
export const OPCOES_ESTADO = {
    // Sistema de refrigeración
    "Filtro de agua de refrigeración": ["Realizada Limpieza", "Sustituido", "Necesario Sustituir", "En buen estado", "No se aplica", "Otros"],
    "Tamice de Lodo": ["Realizada Limpieza", "Sustituido", "Necesario Sustituir", "En buen estado", "No se aplica", "Otros"],
    "Estado del líquido de refrigeración del depósito": ["Sustituido", "Necesario Sustituir", "En buen estado", "Rellenado", "Nivel Correcto", "No se aplica", "Otros"],
    "Resistencia de calentamiento": ["Realizada Limpieza", "Sustituido", "Necesario Sustituir", "En buen estado", "No se aplica", "Otros"],
    "Válvula magnética de agua de fábrica": ["Realizada Limpieza", "Sustituido", "Necesario Sustituir", "En buen estado", "Atascada", "No se aplica", "Otros"],
    "Conexiones y tuberías del sistema de Refrigeración": ["Realizada Limpieza", "Sustituido", "Necesario Sustituir", "En buen estado", "No se aplica", "Otros"],
    
    // Sistema neumático
    "Sistema de purga _ Pastilla Porex": ["Realizada Limpieza", "Sustituido", "Necesario Sustituir", "En buen estado", "No se aplica", "Otros"],
    "Filtro de Aire comprimido filtrado": ["Realizada Limpieza", "Sustituido", "Necesario Sustituir", "En buen estado", "No se aplica", "Otros"],
    "Filtro de Aire comprimido general": ["Realizada Limpieza", "Sustituido", "Necesario Sustituir", "En buen estado", "No se aplica", "Otros"],
    "Conexiones y tuberías del sistema neumático": ["Realizada Limpieza", "Sustituido", "Necesario Sustituir", "En buen estado", "No se aplica", "Otros"],
    
    // Sistema eléctrico y de comunicaciones
    "Conexiones de cables y conductores": ["Realizada Limpieza", "Sustituido", "Necesario Sustituir", "En buen estado", "No se aplica", "Otros"],
    "ACN _ Tarjetas _ Switches _ Fibra _ RJ45": ["Realizada Limpieza", "Sustituido", "Necesario Sustituir", "En buen estado", "No se aplica", "Otros"],
    
    // Cables eléctricos, tuberías de agua y aire en la viga
    "Portacables (Cable Track) SUPERIOR": ["Bien ajustado", "Realizado ajuste", "Necesario Sustituir", "Inspección Visual", "Comprobada estanqueidad", "Fuga de aire", "Fuga de agua", "No se aplica", "Otros"],
    "Portacables (Cable Track) INFERIOR": ["Bien ajustado", "Realizado ajuste", "Necesario Sustituir", "Inspección Visual", "Comprobada estanqueidad", "Fuga de aire", "Fuga de agua", "No se aplica", "Otros"],
    "Empalmes y conexiones eléctricas en la plataforma SUPERIOR": ["Realizada Limpieza", "Sustituido", "Necesario Sustituir", "En buen estado", "No se aplica", "Otros"],
    "Empalmes y conexiones eléctricas en la plataforma INFERIOR": ["Realizada Limpieza", "Sustituido", "Necesario Sustituir", "En buen estado", "No se aplica", "Otros"],
    
    // Sistema mecánico
    "Rodamientos de plataforma SUPERIOR": ["Debidamente Engrasados", "Necesario Engrasar", "Necesario Sustituir", "Necesita lubrificación", "Ruido excesivo", "Atascado", "No se aplica", "Otros"],
    "Rodamientos de plataforma INFERIOR": ["Debidamente Engrasados", "Necesario Engrasar", "Necesario Sustituir", "Necesita lubrificación", "Ruido excesivo", "Atascado", "No se aplica", "Otros"],
    "Eje de transmisión": ["Debidamente Engrasado", "Necesario Engrasar", "Necesario Sustituir", "Con juego", "Necesita lubrificación", "Ruido excesivo", "No se aplica", "Otros"],
    "Correa dentada (Timing Belt) SUPERIOR": ["Bien ajustado", "Realizado ajuste", "Necesario Sustituir", "Sobretensada", "Destensada", "Desgastada", "Dientes dañados", "Tensión Correcta", "No se aplica", "Otros"],
    "Correa dentada (Timing Belt) INFERIOR": ["Bien ajustado", "Realizado ajuste", "Necesario Sustituir", "Sobretensada", "Destensada", "Desgastada", "Dientes dañados", "Tensión Correcta", "No se aplica", "Otros"],
    "Correa dentada del Motor": ["Bien ajustado", "Realizado ajuste", "Necesario Sustituir", "Sobretensada", "Destensada", "Desgastada", "Dientes dañados", "Tensión Correcta", "No se aplica", "Otros"],
    "Motor de Transmisión": ["En Buen estado", "No se aplica", "Conexiones Eléctricas Ok", "Atascado", "Necesario sustituir", "Otros"],
    "Correa de sellado (Sealing Belt) SUPERIOR": ["Bien ajustado", "Realizado ajuste", "Necesario Sustituir", "Desgaste ligero", "Desgaste severo", "No se aplica", "Otros"],
    "Correa de sellado (Sealing Belt) INFERIOR": ["Bien ajustado", "Realizado ajuste", "Necesario Sustituir", "Desgaste ligero", "Desgaste severo", "No se aplica", "Otros"],
    "Rodillos de la correa de sellado SUPERIOR": ["Realizada Limpieza", "Sustituido", "Necesario Sustituir", "En buen estado", "No se aplica", "Otros"],
    "Rodillos de la correa de sellado INFERIOR": ["Realizada Limpieza", "Sustituido", "Necesario Sustituir", "En buen estado", "No se aplica", "Otros"],
    "Guía y Railwipers": ["Realizada Limpieza", "Sustituido", "Necesario Sustituir", "En buen estado", "No se aplica", "Otros"],
    
    // Plataformas y sensores
    "Rodillos guía de las plataformas SUPERIOR": ["Realizada Limpieza", "Sustituido", "Necesario Sustituir", "En buen estado", "No se aplica", "Otros"],
    "Rodillos guía de las plataformas INFERIOR": ["Realizada Limpieza", "Sustituido", "Necesario Sustituir", "En buen estado", "No se aplica", "Otros"],
    "Conexiones Y Tuberías de los Sensores SUPERIOR": ["Realizada Limpieza", "Sustituido", "Necesario Sustituir", "En buen estado", "No se aplica", "Otros"],
    "Conexiones Y Tuberías de los Sensores INFERIOR": ["Realizada Limpieza", "Sustituido", "Necesario Sustituir", "En buen estado", "No se aplica", "Otros"],
    "Ventanas de medición de los Sensores SUPERIOR": ["Realizada Limpieza", "Sustituido", "Necesario Sustituir", "En buen estado", "No se aplica", "Otros"],
    "Ventanas de medición de los Sensores INFERIOR": ["Realizada Limpieza", "Sustituido", "Necesario Sustituir", "En buen estado", "No se aplica", "Otros"],
    "Bombilla de Humedad": ["Sustituido", "Realizada Inspección", "Ajustada Potencia", "Necesario Sustituir", "Fundida", "En buen estado", "No se aplica", "Otros"],
    "Certificado de Fuentes Radioactivas": ["Realizado", "No se aplica", "Otros"],
    "Certificado de Calibración": ["Realizado", "No se aplica", "Otros"]
};

// Contador total de itens
export const getTotalItems = () => {
    let total = 0;
    for (const secao in TOPICOS_INSPECAO) {
        total += TOPICOS_INSPECAO[secao].length;
    }
    return total;
};

console.log(`📊 Constants loaded: ${Object.keys(TOPICOS_INSPECAO).length} sections, ${getTotalItems()} total items`);
