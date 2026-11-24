import type { SourceId } from './sources';

export type RuleId =
  'volume' | 'frequency' | 'repRange' | 'proximity' | 'rest' | 'protein' | 'overload';

/** User-facing explanation for a rule, shown on the "¿Por qué?" screen. */
export interface Rule {
  id: RuleId;
  title: string;
  /** One-line recommendation. */
  summary: string;
  /** What the evidence says, in plain Spanish. */
  detail: string;
  sources: SourceId[];
}

export const MIN_WEEKLY_SETS = 10;
export const MIN_WEEKLY_FREQUENCY = 2;
export const REP_RANGE = { min: 6, max: 30 } as const;
export const MAX_RECOMMENDED_RIR = 3;

export const RULES: Record<RuleId, Rule> = {
  volume: {
    id: 'volume',
    title: 'Volumen semanal por músculo',
    summary: `Apunta a ${MIN_WEEKLY_SETS} series o más por músculo a la semana.`,
    detail:
      'Un metaanálisis encontró una relación dosis-respuesta entre las series semanales y el ' +
      'crecimiento muscular: hacer 10 o más series por músculo a la semana produjo más ' +
      'hipertrofia que hacer menos de 5. La app cuenta las series de cada ejercicio para su ' +
      'músculo principal.',
    sources: ['schoenfeld2017volume'],
  },
  frequency: {
    id: 'frequency',
    title: 'Frecuencia por músculo',
    summary: `Entrena cada músculo al menos ${MIN_WEEKLY_FREQUENCY} veces por semana.`,
    detail:
      'Entrenar cada músculo dos veces por semana dio mejores ' +
      'resultados de hipertrofia que una sola vez. Repartir las series en varios días también ' +
      'ayuda a que cada sesión sea más llevadera.',
    sources: ['schoenfeld2016frequency'],
  },
  repRange: {
    id: 'repRange',
    title: 'Rango de repeticiones',
    summary: `Entre ${REP_RANGE.min} y ${REP_RANGE.max} repeticiones, cerca del fallo.`,
    detail:
      'Las cargas bajas (60 % del máximo o menos, muchas repeticiones) y las altas produjeron una ' +
      'hipertrofia similar cuando las series se llevaban cerca del fallo. La fuerza máxima, en ' +
      'cambio, mejoró más con cargas altas.',
    sources: ['schoenfeld2017loads'],
  },
  proximity: {
    id: 'proximity',
    title: 'Cercanía al fallo (RIR)',
    summary: `Termina las series con 0 a ${MAX_RECOMMENDED_RIR} repeticiones en reserva.`,
    detail:
      'RIR son las repeticiones que te quedaban antes del fallo. El análisis sugiere que la ' +
      'hipertrofia mejora a medida que las series se acercan al fallo, aunque no hace falta ' +
      'llegar siempre a 0: quedarse a 1–3 repeticiones también funciona y cansa menos.',
    sources: ['refalo2023failure'],
  },
  rest: {
    id: 'rest',
    title: 'Descanso entre series',
    summary: 'En ejercicios compuestos, descansa de 2 a 3 minutos.',
    detail:
      'En hombres entrenados, descansar 3 minutos entre series produjo más fuerza y, en ' +
      'algunos músculos, más hipertrofia que descansar 1 minuto. Descansar más permite mantener el peso y las ' +
      'repeticiones en las series siguientes.',
    sources: ['schoenfeld2016rest'],
  },
  protein: {
    id: 'protein',
    title: 'Proteína diaria',
    summary: 'Alrededor de 1,6 g por kg de peso corporal al día (hasta 2,2 g).',
    detail:
      'Por encima de unos 1,6 g/kg/día, consumir más proteína no aumentó de forma clara la ' +
      'ganancia de masa muscular. Los autores proponen hasta 2,2 g/kg/día para cubrir las ' +
      'diferencias entre personas. Si tienes alguna enfermedad renal o metabólica, consulta a ' +
      'un profesional.',
    sources: ['morton2018protein'],
  },
  overload: {
    id: 'overload',
    title: 'Sobrecarga progresiva',
    summary: 'Si llegas al tope de repeticiones en todas las series, sube un poco el peso.',
    detail:
      'El ACSM recomienda subir la carga entre un 2 y un 10 % cuando puedes hacer 1 o 2 ' +
      'repeticiones más de las previstas. La app usa un criterio práctico: si completas todas ' +
      'las series en el máximo de tu rango, sugiere +2,5 kg en tren superior y +5 kg en tren ' +
      'inferior (+5 lb y +10 lb si usas libras). Es solo una sugerencia; si la técnica ' +
      'empeora, mantén el peso.',
    sources: ['acsm2009progression'],
  },
};

export const RULE_ORDER: RuleId[] = [
  'volume',
  'frequency',
  'repRange',
  'proximity',
  'rest',
  'overload',
  'protein',
];

export const isRuleId = (id: string): id is RuleId => id in RULES;
