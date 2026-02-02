export type Program = {
  id: string;
  name: string;
  category: string; // carrera / curso / especialidad
  tagline: string;  // frase del slide
  short: string;    // descripción corta (cards)
  duration: string; // tiempo
  modalities: string[];
  payment: string[];
  curriculum: string[]; // malla curricular (resumen)
  outcomes: string[];   // lo que lograrás
  badge?: string;
};

export const PROGRAMS: Program[] = [
  {
    id: "gastronomia",
    name: "Gastronomía",
    category: "Programa profesional",
    tagline: "Domina la cocina profesional y eleva tu técnica a nivel chef.",
    short: "Base completa: técnicas, fondos, salsas, cocina peruana e internacional.",
    duration: "6–12 meses (según modalidad)",
    modalities: ["Presencial", "Semi-presencial", "Intensivo (cocina acelerada)"],
    payment: ["Mensual", "Por módulos", "Matrícula + cuotas"],
    curriculum: [
      "Bases y mise en place",
      "Cortes, fondos y salsas",
      "Cocina peruana",
      "Cocina internacional",
      "Costos y porcionado",
      "Buenas prácticas (BPM) + seguridad",
      "Proyecto final / práctica",
    ],
    outcomes: [
      "Técnicas profesionales desde cero",
      "Organización de cocina real",
      "Platos con presentación y estándares",
      "Ruta clara para empleabilidad",
    ],
    badge: "Más popular",
  },
  {
    id: "pasteleria",
    name: "Pastelería y Panadería",
    category: "Programa profesional",
    tagline: "De masas a postres de vitrina: crea piezas que venden.",
    short: "Masas, fermentación, laminados, tortas, postres modernos y clásicos.",
    duration: "4–10 meses",
    modalities: ["Presencial", "Fines de semana", "Intensivo"],
    payment: ["Mensual", "Por módulos", "Descuento por pago total"],
    curriculum: [
      "Masas básicas y batidos",
      "Fermentación y panadería",
      "Laminados (hojaldre / croissant)",
      "Postres clásicos",
      "Postres modernos",
      "Decoración y montaje",
      "Costos y producción",
    ],
    outcomes: [
      "Producción consistente y rentable",
      "Decoración moderna",
      "Panadería con fermentación controlada",
      "Portafolio para emprendimiento",
    ],
  },
  {
    id: "bar",
    name: "Bar Profesional",
    category: "Especialidad",
    tagline: "Coctelería con técnica, speed y servicio impecable.",
    short: "Coctelería clásica y moderna, mise en place, speed rounds y garnish.",
    duration: "2–4 meses",
    modalities: ["Presencial", "Noches", "Fines de semana"],
    payment: ["Mensual", "Por módulos"],
    curriculum: [
      "Cristalería y estaciones",
      "Clásicos IBA",
      "Técnicas: shake / stir / build",
      "Garnish y presentación",
      "Servicio y protocolos",
      "Control de inventario",
    ],
    outcomes: [
      "Ejecución rápida y consistente",
      "Recetas y técnicas profesionales",
      "Servicio y atención al cliente",
      "Estándares de bar real",
    ],
  },
  {
    id: "barismo",
    name: "Barismo",
    category: "Especialidad",
    tagline: "Extrae, calibra y sirve café como un profesional.",
    short: "Espresso, calibración, extracción, latte art y servicio.",
    duration: "1–3 meses",
    modalities: ["Presencial", "Talleres intensivos"],
    payment: ["Por niveles", "Paquete completo"],
    curriculum: [
      "Origen y tueste (básico)",
      "Espresso y calibración",
      "Métodos de filtrado",
      "Leche y texturización",
      "Latte art",
      "Servicio en barra",
    ],
    outcomes: [
      "Calibración y recetas estables",
      "Mejor sabor y consistencia",
      "Latte art funcional",
      "Listo para cafetería o emprendimiento",
    ],
  },
  {
    id: "sommelier",
    name: "Sommelier",
    category: "Especialidad",
    tagline: "Cata, maridaje y servicio: domina el mundo del vino.",
    short: "Cata, tipos de vino, maridajes, servicio y cartas.",
    duration: "2–5 meses",
    modalities: ["Presencial", "Noches", "Fines de semana"],
    payment: ["Mensual", "Por módulos"],
    curriculum: [
      "Cata y análisis sensorial",
      "Regiones y cepas",
      "Maridaje",
      "Servicio y protocolo",
      "Gestión de carta",
      "Destilados (intro)",
    ],
    outcomes: [
      "Cata con estructura",
      "Maridajes que funcionan",
      "Servicio profesional",
      "Criterio para carta y compras",
    ],
  },
  {
    id: "acelerada",
    name: "Cocina Acelerada",
    category: "Intensivo",
    tagline: "Aprende rápido y cocina mejor en pocas semanas.",
    short: "Intensivo práctico para entrar rápido al ritmo de cocina.",
    duration: "4–8 semanas",
    modalities: ["Intensivo", "Presencial"],
    payment: ["Pago por programa", "En 2 cuotas"],
    curriculum: [
      "Mise en place",
      "Cortes esenciales",
      "Fondos y salsas base",
      "Platos rápidos y consistentes",
      "Orden y limpieza",
    ],
    outcomes: [
      "Subes nivel en poco tiempo",
      "Más velocidad con técnica",
      "Cocinas mejor con menos caos",
    ],
    badge: "Intensivo",
  },
  {
    id: "personalizados",
    name: "Cursos Personalizados",
    category: "A medida",
    tagline: "Un plan a tu ritmo: enfoque en lo que tú necesitas.",
    short: "1 a 1 o grupos pequeños: menú, técnica específica, emprendimiento.",
    duration: "Según objetivos (semanas/meses)",
    modalities: ["Presencial", "Mixto", "Horario flexible"],
    payment: ["Por sesión", "Paquetes", "Plan mensual"],
    curriculum: [
      "Diagnóstico inicial",
      "Plan por objetivos",
      "Prácticas guiadas",
      "Evaluación y mejora",
      "Proyecto final (opcional)",
    ],
    outcomes: [
      "Aprendizaje enfocado",
      "Avance real en tu necesidad",
      "Acompañamiento directo",
    ],
  },
];
