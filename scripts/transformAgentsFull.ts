import * as fs from 'fs';
import * as readline from 'readline';

const inputFile = 'agents.jsonl';
const outputFile = 'agents_full.jsonl';
const correctWorldId = 'm17a392bywc3418a0smxa5rybn828634';

async function transformAgents() {
  const fileStream = fs.createReadStream(inputFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const writeStream = fs.createWriteStream(outputFile);
  let count = 0;

  for await (const line of rl) {
    const raw = JSON.parse(line);
    count++;

    const transformed = {
      // Identificadores
      playerId: raw.id || `p:${count}`,
      id_global: raw.id_global,
      id_vivienda: raw.id_vivienda,
      id_hogar: raw.id_hogar,
      id_persona: raw.id_persona,
      
      // Información personal
      name: raw.name || `Agente_${count}`,
      age: Number(raw.edad || raw.age || 30),
      sex: raw.sex || raw.sexo,
      age_group: raw.age_group || raw.edad_quinquenal,
      
      // Ubicación
      region: raw.region || "Metropolitana",
      provincia: raw.provincia,
      comuna: raw.comuna || "Santiago",
      comuna_bajo_umbral: raw.comuna_bajo_umbral,
      area: raw.area,
      tipo_operativo: raw.tipo_operativo,
      
      // Estado civil y familia
      parentesco: raw.parentesco,
      p23_est_civil: raw.p23_est_civil,
      p46a_tot_hijs_nac: raw.p46a_tot_hijs_nac,
      p46b_hijas_nac: raw.p46b_hijas_nac,
      p46c_hijos_nac: raw.p46c_hijos_nac,
      p47a_tot_hijs_sobrev: raw.p47a_tot_hijs_sobrev,
      p47b_hijas_sobrev: raw.p47b_hijas_sobrev,
      p47c_hijos_sobrev: raw.p47c_hijos_sobrev,
      
      // Nacionalidad y origen
      p24_lug_resid5: raw.p24_lug_resid5,
      p24_lug_resid5_esp: raw.p24_lug_resid5_esp,
      p25_lug_nacimiento: raw.p25_lug_nacimiento,
      p25_lug_nacimiento_rec: raw.p25_lug_nacimiento_rec,
      p25_lug_nacimiento_esp: raw.p25_lug_nacimiento_esp,
      p26_llegada_periodo: raw.p26_llegada_periodo,
      p27_nacionalidad: raw.p27_nacionalidad,
      p27_nacionalidad_esp: raw.p27_nacionalidad_esp,
      p27_nacionalidad_rec: raw.p27_nacionalidad_rec,
      p28_autoid_pueblo: raw.p28_autoid_pueblo,
      p28_pueblo_pert: raw.p28_pueblo_pert,
      p29_afrodescendencia_rec: raw.p29_afrodescendencia_rec,
      p29_afrodescendencia: raw.p29_afrodescendencia,
      p30_lengua_indigena: raw.p30_lengua_indigena,
      p30_lengua_indigena_rec: raw.p30_lengua_indigena_rec,
      
      // Religión
      p31_religion: raw.p31_religion,
      p31_religion_rec: raw.p31_religion_rec,
      
      // Discapacidad
      p32a_dificultad_ver: raw.p32a_dificultad_ver,
      p32b_dificultad_oir: raw.p32b_dificultad_oir,
      p32c_dificultad_mover: raw.p32c_dificultad_mover,
      p32d_dificultad_cogni: raw.p32d_dificultad_cogni,
      p32e_dificultad_cuidado: raw.p32e_dificultad_cuidado,
      p32f_dificultad_comunic: raw.p32f_dificultad_comunic,
      discapacidad: raw.discapacidad,
      
      // Educación
      p33_edu_asiste: raw.p33_edu_asiste,
      asistencia_parv: raw.asistencia_parv,
      asistencia_basica: raw.asistencia_basica,
      asistencia_media: raw.asistencia_media,
      asistencia_superior: raw.asistencia_superior,
      p37_alfabet: raw.p37_alfabet,
      escolaridad: raw.escolaridad,
      cine11: raw.cine11,
      
      // Trabajo
      sit_fuerza_trabajo: raw.sit_fuerza_trabajo,
      p40_cise_rec: raw.p40_cise_rec,
      depend_econ_deficit_hab: raw.depend_econ_deficit_hab,
      cod_ciuo: raw.cod_ciuo,
      cod_caenes: raw.cod_caenes,
      p44_lug_trab: raw.p44_lug_trab,
      p44_lug_trab_esp: raw.p44_lug_trab_esp,
      p45_medio_transporte: raw.p45_medio_transporte,
      
      // Género y diversidad
      div_genero: raw.div_genero,
      
      // Grupo Socioeconómico
      gse: raw.gse || "C2",
      
      // Redes sociales
      tiene_facebook: raw.tiene_facebook,
      tiene_instagram: raw.tiene_instagram,
      tiene_tiktok: raw.tiene_tiktok,
      tiene_x: raw.tiene_x,
      tiene_internet: raw.tiene_internet,
      
      // Campos del sistema
      politicalLeaning: Math.floor(Math.random() * 200) - 100,
      interests: ["NACIONAL"],
      worldId: correctWorldId,
      isVisible: raw.isVisible !== undefined ? raw.isVisible : Math.random() < 0.05,
      x: 32 + Math.floor(Math.random() * 10),
      y: 32 + Math.floor(Math.random() * 10),
    };

    writeStream.write(JSON.stringify(transformed) + '\n');
  }

  writeStream.end();
  console.log(`Transformed ${count} agents to ${outputFile}`);
}

transformAgents().catch(console.error);
