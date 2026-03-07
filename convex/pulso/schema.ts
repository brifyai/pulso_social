import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const pulsoTables = {
  // Encuestas
  surveys: defineTable({
    question: v.string(),
    context: v.optional(v.string()),
    options: v.array(v.string()),
    status: v.union(v.literal('draft'), v.literal('running'), v.literal('completed')),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    worldId: v.optional(v.id('worlds')),
  })
    .index('status', ['status'])
    .index('createdAt', ['createdAt']),

  // Respuestas de los agentes a las encuestas
  surveyResponses: defineTable({
    surveyId: v.id('surveys'),
    playerId: v.string(), // agentId como "a:1", "a:3", etc.
    playerName: v.string(),
    response: v.string(),
    createdAt: v.number(),
  })
    .index('surveyId', ['surveyId'])
    .index('playerId', ['playerId']),

  // Agentes del panel (extensión de playerDescriptions)
  panelAgents: defineTable({
    // Identificadores
    playerId: v.string(), // "p:0", "p:2", etc.
    id_global: v.optional(v.union(v.string(), v.null())),
    id_vivienda: v.optional(v.union(v.string(), v.null())),
    id_hogar: v.optional(v.union(v.string(), v.null())),
    id_persona: v.optional(v.union(v.string(), v.null())),
    
    // Información personal
    name: v.string(),
    age: v.number(),
    sex: v.optional(v.union(v.string(), v.null())),
    age_group: v.optional(v.union(v.string(), v.null())),
    
    // Ubicación
    region: v.string(),
    provincia: v.optional(v.union(v.string(), v.null())),
    comuna: v.string(),
    comuna_bajo_umbral: v.optional(v.union(v.string(), v.null())),
    area: v.optional(v.union(v.string(), v.null())),
    tipo_operativo: v.optional(v.union(v.string(), v.null())),
    
    // Estado civil y familia
    parentesco: v.optional(v.union(v.string(), v.null())),
    p23_est_civil: v.optional(v.union(v.string(), v.null())),
    p46a_tot_hijs_nac: v.optional(v.union(v.string(), v.null())),
    p46b_hijas_nac: v.optional(v.union(v.string(), v.null())),
    p46c_hijos_nac: v.optional(v.union(v.string(), v.null())),
    p47a_tot_hijs_sobrev: v.optional(v.union(v.string(), v.null())),
    p47b_hijas_sobrev: v.optional(v.union(v.string(), v.null())),
    p47c_hijos_sobrev: v.optional(v.union(v.string(), v.null())),
    
    // Nacionalidad y origen
    p24_lug_resid5: v.optional(v.union(v.string(), v.null())),
    p24_lug_resid5_esp: v.optional(v.union(v.string(), v.null())),
    p25_lug_nacimiento: v.optional(v.union(v.string(), v.null())),
    p25_lug_nacimiento_rec: v.optional(v.union(v.string(), v.null())),
    p25_lug_nacimiento_esp: v.optional(v.union(v.string(), v.null())),
    p26_llegada_periodo: v.optional(v.union(v.string(), v.null())),
    p27_nacionalidad: v.optional(v.union(v.string(), v.null())),
    p27_nacionalidad_esp: v.optional(v.union(v.string(), v.null())),
    p27_nacionalidad_rec: v.optional(v.union(v.string(), v.null())),
    p28_autoid_pueblo: v.optional(v.union(v.string(), v.null())),
    p28_pueblo_pert: v.optional(v.union(v.string(), v.null())),
    p29_afrodescendencia_rec: v.optional(v.union(v.string(), v.null())),
    p29_afrodescendencia: v.optional(v.union(v.string(), v.null())),
    p30_lengua_indigena: v.optional(v.union(v.string(), v.null())),
    p30_lengua_indigena_rec: v.optional(v.union(v.string(), v.null())),
    
    // Religión
    p31_religion: v.optional(v.union(v.string(), v.null())),
    p31_religion_rec: v.optional(v.union(v.string(), v.null())),
    
    // Discapacidad
    p32a_dificultad_ver: v.optional(v.union(v.string(), v.null())),
    p32b_dificultad_oir: v.optional(v.union(v.string(), v.null())),
    p32c_dificultad_mover: v.optional(v.union(v.string(), v.null())),
    p32d_dificultad_cogni: v.optional(v.union(v.string(), v.null())),
    p32e_dificultad_cuidado: v.optional(v.union(v.string(), v.null())),
    p32f_dificultad_comunic: v.optional(v.union(v.string(), v.null())),
    discapacidad: v.optional(v.union(v.string(), v.null())),
    
    // Educación
    p33_edu_asiste: v.optional(v.union(v.string(), v.null())),
    asistencia_parv: v.optional(v.union(v.string(), v.null())),
    asistencia_basica: v.optional(v.union(v.string(), v.null())),
    asistencia_media: v.optional(v.union(v.string(), v.null())),
    asistencia_superior: v.optional(v.union(v.string(), v.null())),
    p37_alfabet: v.optional(v.union(v.string(), v.null())),
    escolaridad: v.optional(v.union(v.string(), v.null())),
    cine11: v.optional(v.union(v.string(), v.null())),
    
    // Trabajo
    sit_fuerza_trabajo: v.optional(v.union(v.string(), v.null())),
    p40_cise_rec: v.optional(v.union(v.string(), v.null())),
    depend_econ_deficit_hab: v.optional(v.union(v.string(), v.null())),
    cod_ciuo: v.optional(v.union(v.string(), v.null())),
    cod_caenes: v.optional(v.union(v.string(), v.null())),
    p44_lug_trab: v.optional(v.union(v.string(), v.null())),
    p44_lug_trab_esp: v.optional(v.union(v.string(), v.null())),
    p45_medio_transporte: v.optional(v.union(v.string(), v.null())),
    
    // Género y diversidad
    div_genero: v.optional(v.union(v.string(), v.null())),
    
    // Grupo Socioeconómico
    gse: v.string(), // Grupo Socioeconómico: AB, C1a, C1b, C2, C3, D, E
    
    // Redes sociales
    tiene_facebook: v.optional(v.union(v.boolean(), v.null())),
    tiene_instagram: v.optional(v.union(v.boolean(), v.null())),
    tiene_tiktok: v.optional(v.union(v.boolean(), v.null())),
    tiene_x: v.optional(v.union(v.boolean(), v.null())),
    tiene_internet: v.optional(v.union(v.boolean(), v.null())),
    
    // Campos del sistema
    politicalLeaning: v.number(), // -100 (izquierda) a 100 (derecha)
    interests: v.array(v.string()),
    worldId: v.id('worlds'),
    isVisible: v.boolean(), // Solo el 5% será visible para no saturar el mapa
    x: v.number(), // Coordenada X en el mapa
    y: v.number(), // Coordenada Y en el mapa
  })
    .index('playerId', ['playerId'])
    .index('gse', ['gse'])
    .index('region', ['region'])
    .index('isVisible', ['isVisible'])
    .index('sex', ['sex'])
    .index('age_group', ['age_group']),

  // Agentes completos con todos los campos del archivo original
  agentsFull: defineTable({
    // Identificadores
    playerId: v.string(),
    id_global: v.optional(v.union(v.string(), v.null())),
    id_vivienda: v.optional(v.union(v.string(), v.null())),
    id_hogar: v.optional(v.union(v.string(), v.null())),
    id_persona: v.optional(v.union(v.string(), v.null())),
    
    // Información personal
    name: v.string(),
    age: v.number(),
    sex: v.optional(v.union(v.string(), v.null())),
    age_group: v.optional(v.union(v.string(), v.null())),
    
    // Ubicación
    region: v.string(),
    provincia: v.optional(v.union(v.string(), v.null())),
    comuna: v.string(),
    comuna_bajo_umbral: v.optional(v.union(v.string(), v.null())),
    area: v.optional(v.union(v.string(), v.null())),
    tipo_operativo: v.optional(v.union(v.string(), v.null())),
    
    // Estado civil y familia
    parentesco: v.optional(v.union(v.string(), v.null())),
    p23_est_civil: v.optional(v.union(v.string(), v.null())),
    p46a_tot_hijs_nac: v.optional(v.union(v.string(), v.null())),
    p46b_hijas_nac: v.optional(v.union(v.string(), v.null())),
    p46c_hijos_nac: v.optional(v.union(v.string(), v.null())),
    p47a_tot_hijs_sobrev: v.optional(v.union(v.string(), v.null())),
    p47b_hijas_sobrev: v.optional(v.union(v.string(), v.null())),
    p47c_hijos_sobrev: v.optional(v.union(v.string(), v.null())),
    
    // Nacionalidad y origen
    p24_lug_resid5: v.optional(v.union(v.string(), v.null())),
    p24_lug_resid5_esp: v.optional(v.union(v.string(), v.null())),
    p25_lug_nacimiento: v.optional(v.union(v.string(), v.null())),
    p25_lug_nacimiento_rec: v.optional(v.union(v.string(), v.null())),
    p25_lug_nacimiento_esp: v.optional(v.union(v.string(), v.null())),
    p26_llegada_periodo: v.optional(v.union(v.string(), v.null())),
    p27_nacionalidad: v.optional(v.union(v.string(), v.null())),
    p27_nacionalidad_esp: v.optional(v.union(v.string(), v.null())),
    p27_nacionalidad_rec: v.optional(v.union(v.string(), v.null())),
    p28_autoid_pueblo: v.optional(v.union(v.string(), v.null())),
    p28_pueblo_pert: v.optional(v.union(v.string(), v.null())),
    p29_afrodescendencia_rec: v.optional(v.union(v.string(), v.null())),
    p29_afrodescendencia: v.optional(v.union(v.string(), v.null())),
    p30_lengua_indigena: v.optional(v.union(v.string(), v.null())),
    p30_lengua_indigena_rec: v.optional(v.union(v.string(), v.null())),
    
    // Religión
    p31_religion: v.optional(v.union(v.string(), v.null())),
    p31_religion_rec: v.optional(v.union(v.string(), v.null())),
    
    // Discapacidad
    p32a_dificultad_ver: v.optional(v.union(v.string(), v.null())),
    p32b_dificultad_oir: v.optional(v.union(v.string(), v.null())),
    p32c_dificultad_mover: v.optional(v.union(v.string(), v.null())),
    p32d_dificultad_cogni: v.optional(v.union(v.string(), v.null())),
    p32e_dificultad_cuidado: v.optional(v.union(v.string(), v.null())),
    p32f_dificultad_comunic: v.optional(v.union(v.string(), v.null())),
    discapacidad: v.optional(v.union(v.string(), v.null())),
    
    // Educación
    p33_edu_asiste: v.optional(v.union(v.string(), v.null())),
    asistencia_parv: v.optional(v.union(v.string(), v.null())),
    asistencia_basica: v.optional(v.union(v.string(), v.null())),
    asistencia_media: v.optional(v.union(v.string(), v.null())),
    asistencia_superior: v.optional(v.union(v.string(), v.null())),
    p37_alfabet: v.optional(v.union(v.string(), v.null())),
    escolaridad: v.optional(v.union(v.string(), v.null())),
    cine11: v.optional(v.union(v.string(), v.null())),
    
    // Trabajo
    sit_fuerza_trabajo: v.optional(v.union(v.string(), v.null())),
    p40_cise_rec: v.optional(v.union(v.string(), v.null())),
    depend_econ_deficit_hab: v.optional(v.union(v.string(), v.null())),
    cod_ciuo: v.optional(v.union(v.string(), v.null())),
    cod_caenes: v.optional(v.union(v.string(), v.null())),
    p44_lug_trab: v.optional(v.union(v.string(), v.null())),
    p44_lug_trab_esp: v.optional(v.union(v.string(), v.null())),
    p45_medio_transporte: v.optional(v.union(v.string(), v.null())),
    
    // Género y diversidad
    div_genero: v.optional(v.union(v.string(), v.null())),
    
    // Grupo Socioeconómico
    gse: v.string(),
    
    // Redes sociales
    tiene_facebook: v.optional(v.union(v.boolean(), v.null())),
    tiene_instagram: v.optional(v.union(v.boolean(), v.null())),
    tiene_tiktok: v.optional(v.union(v.boolean(), v.null())),
    tiene_x: v.optional(v.union(v.boolean(), v.null())),
    tiene_internet: v.optional(v.union(v.boolean(), v.null())),
    
    // Campos del sistema
    politicalLeaning: v.number(),
    interests: v.array(v.string()),
    worldId: v.id('worlds'),
    isVisible: v.boolean(),
    x: v.number(),
    y: v.number(),
  })
    .index('playerId', ['playerId'])
    .index('gse', ['gse'])
    .index('region', ['region'])
    .index('isVisible', ['isVisible'])
    .index('sex', ['sex'])
    .index('age_group', ['age_group']),
};