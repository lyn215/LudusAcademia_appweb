import { useState } from "react";

interface Question {
  id: string;
  pregunta: string;
  opciones: string[];
  correcta: string;
  feedback?: string;
}

interface Level {
  id: number;
  nombre: string;
  titulo: string;
  preguntas: Question[];
}

const LEVELS: Level[] = [
  {
    id: 0,
    nombre: "Nivel 0",
    titulo: "Tutorial",
    preguntas: [
      { id: "N0_P1", pregunta: "¡Atrapa el resultado de 2 + 2!", opciones: ["4","3","5"], correcta: "4" },
      { id: "N0_P2", pregunta: "¿Cuántos lados tiene un cuadrado?", opciones: ["4","3","6"], correcta: "4" },
      { id: "N0_P3", pregunta: "¡Salta al número más grande!", opciones: ["10","5","8"], correcta: "10" },
      { id: "N0_P4", pregunta: "¿Cuánto es 5 − 3?", opciones: ["2","1","3"], correcta: "2" },
      { id: "N0_P5", pregunta: "¡Toca el número par!", opciones: ["6","7","9"], correcta: "6" },
    ],
  },
  {
    id: 1,
    nombre: "Nivel 1",
    titulo: "Praderas de la Adición",
    preguntas: [
      { id: "L1_P1", pregunta: "¡Atrapa el resultado de 150 + 50!", opciones: ["200","100","250"], correcta: "200" },
      { id: "L1_P2", pregunta: "¿Cuánto falta a 80 para llegar a 100?", opciones: ["20","30","10"], correcta: "20" },
      { id: "L1_P3", pregunta: "¡Salta al bloque de 500 - 100!", opciones: ["400","600","300"], correcta: "400" },
      { id: "L1_P4", pregunta: "Suma estas gemas: 25 + 25.", opciones: ["50","40","60"], correcta: "50" },
      { id: "L1_P5", pregunta: "¿Cuál es el doble de 15?", opciones: ["30","25","40"], correcta: "30" },
      { id: "L1_P6", pregunta: "¡Toca el resultado de 1000 - 1!", opciones: ["999","900","990"], correcta: "999" },
      { id: "L1_P7", pregunta: "Si tienes 120 y pierdes 20, te quedan...", opciones: ["100","140","110"], correcta: "100" },
      { id: "L1_P8", pregunta: "Suma rápido: 300 + 400.", opciones: ["700","600","800"], correcta: "700" },
    ],
  },
  {
    id: 2,
    nombre: "Nivel 2",
    titulo: "Minas de la Multiplicación",
    preguntas: [
      { id: "L2_P1", pregunta: "¿Cuánto es 5 x 4?", opciones: ["20","24","15"], correcta: "20" },
      { id: "L2_P2", pregunta: "Reparte 12 gemas entre 3 cofres.", opciones: ["4","3","6"], correcta: "4" },
      { id: "L2_P3", pregunta: "¿Cuánto es 10 x 7?", opciones: ["70","17","107"], correcta: "70" },
      { id: "L2_P4", pregunta: "Si 2 x 8 = 16, ¿cuánto es 16 / 2?", opciones: ["8","4","10"], correcta: "8" },
      { id: "L2_P5", pregunta: "¡Busca el triple de 6!", opciones: ["18","12","9"], correcta: "18" },
      { id: "L2_P6", pregunta: "¡Atrapa el 9 x 3!", opciones: ["27","21","30"], correcta: "27" },
      { id: "L2_P7", pregunta: "Divide 20 entre 5 amigos.", opciones: ["4","5","2"], correcta: "4" },
      { id: "L2_P8", pregunta: "¡Salta al resultado de 8 x 5!", opciones: ["40","45","35"], correcta: "40" },
    ],
  },
  {
    id: 3,
    nombre: "Nivel 3",
    titulo: "Templo de los Triángulos",
    preguntas: [
      { id: "L3_P1", pregunta: "¿Cuántos lados tiene un triángulo?", opciones: ["3","4","5"], correcta: "3" },
      { id: "L3_P2", pregunta: "¿Cuántas caras tiene un cubo?", opciones: ["6","4","8"], correcta: "6" },
      { id: "L3_P3", pregunta: "Triángulo con 3 lados iguales es...", opciones: ["Equilátero","Isósceles","Escaleno"], correcta: "Equilátero" },
      { id: "L3_P4", pregunta: "¿Cuál figura no tiene vértices?", opciones: ["Círculo","Triángulo","Cuadrado"], correcta: "Círculo" },
      { id: "L3_P5", pregunta: "¿Cuántos vértices tiene un rectángulo?", opciones: ["4","3","6"], correcta: "4" },
      { id: "L3_P6", pregunta: "Triángulo con 2 lados iguales es...", opciones: ["Isósceles","Equilátero","Escaleno"], correcta: "Isósceles" },
      { id: "L3_P7", pregunta: "¿Qué cuerpo parece una pelota?", opciones: ["Esfera","Cilindro","Cubo"], correcta: "Esfera" },
      { id: "L3_P8", pregunta: "Bloque de 4 lados iguales se llama...", opciones: ["Cuadrado","Rectángulo","Rombo"], correcta: "Cuadrado" },
    ],
  },
  {
    id: 4,
    nombre: "Nivel 4",
    titulo: "Valle del Cronos",
    preguntas: [
      { id: "L4_P1", pregunta: "¿Cuántos minutos son media hora?", opciones: ["30 min","60 min","15 min"], correcta: "30 min" },
      { id: "L4_P2", pregunta: "¿Cuántos gramos hay en medio kilo?", opciones: ["500 g","250 g","1000 g"], correcta: "500 g" },
      { id: "L4_P3", pregunta: "¿Qué es más largo?", opciones: ["1 metro","1 centímetro","1 milímetro"], correcta: "1 metro" },
      { id: "L4_P4", pregunta: "Dos botellas de medio litro suman...", opciones: ["1 litro","2 litros","Medio litro"], correcta: "1 litro" },
      { id: "L4_P5", pregunta: "¿Cuántos minutos tiene una hora?", opciones: ["60","100","30"], correcta: "60" },
      { id: "L4_P6", pregunta: "De 12:15 a 12:30, ¿cuánto pasa?", opciones: ["15 min","10 min","20 min"], correcta: "15 min" },
      { id: "L4_P7", pregunta: "¿Cuál objeto pesa más?", opciones: ["1 kg de hierro","100 g de arena","500 g de agua"], correcta: "1 kg de hierro" },
      { id: "L4_P8", pregunta: "1 metro tiene...", opciones: ["100 cm","10 cm","1000 cm"], correcta: "100 cm" },
    ],
  },
  {
    id: 5,
    nombre: "Nivel 5",
    titulo: "Cascada de las Fracciones",
    preguntas: [
      { id: "L5_P1", pregunta: "¡Atrapa la mitad de esta manzana!", opciones: ["1/2","1/4","1/8"], correcta: "1/2" },
      { id: "L5_P2", pregunta: "¿Cuántos cuartos forman un entero?", opciones: ["4","2","8"], correcta: "4" },
      { id: "L5_P3", pregunta: "Pastel en 8 partes, cada una es...", opciones: ["1/8","1/4","1/2"], correcta: "1/8" },
      { id: "L5_P4", pregunta: "¿Qué es más grande?", opciones: ["1/2","1/4","1/8"], correcta: "1/2" },
      { id: "L5_P5", pregunta: "Dos octavos (2/8) equivalen a...", opciones: ["1/4","1/2","1/1"], correcta: "1/4" },
      { id: "L5_P6", pregunta: "¡Toca el dibujo de tres cuartos!", opciones: ["3/4","1/3","4/3"], correcta: "3/4" },
      { id: "L5_P7", pregunta: "1/2 + 1/2 = ...", opciones: ["El entero","1/4","Nada"], correcta: "El entero" },
      { id: "L5_P8", pregunta: "¿Cómo se escribe un cuarto?", opciones: ["1/4","4/1","1/2"], correcta: "1/4" },
    ],
  },
];

export function BancoPreguntasPage() {
  const [selectedLevel, setSelectedLevel] = useState(0);
  const level = LEVELS[selectedLevel];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 className="page-title" style={{ marginBottom: 4 }}>📚 Banco de Preguntas</h2>
        <p className="page-subtitle">Tercer Grado — LudusAcademia+</p>
      </div>

      {/* Level tabs */}
      <div className="banco-tabs">
        {LEVELS.map((lvl, idx) => (
          <button
            key={lvl.id}
            className={`banco-tab${selectedLevel === idx ? " active" : ""}`}
            onClick={() => setSelectedLevel(idx)}
          >
            {lvl.nombre}
            <span className="banco-badge">{lvl.preguntas.length}</span>
          </button>
        ))}
      </div>

      {/* Level header */}
      <div className="card mb-16" style={{ padding: "16px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            fontFamily: "'Press Start 2P',monospace",
            fontSize: "0.65rem",
            color: "var(--forest-action)",
            background: "rgba(146,167,63,0.15)",
            border: "1px solid rgba(146,167,63,0.3)",
            borderRadius: 8,
            padding: "8px 14px",
            whiteSpace: "nowrap",
          }}>
            {level.nombre}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-light)" }}>{level.titulo}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--forest-warm)", marginTop: 2 }}>
              {level.preguntas.length} pregunta{level.preguntas.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Questions table */}
      <div className="card">
        <div className="table-wrap" style={{ marginTop: 0 }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 80 }}>ID</th>
                <th>Pregunta</th>
                <th>Opciones</th>
              </tr>
            </thead>
            <tbody>
              {level.preguntas.map((q) => (
                <tr key={q.id}>
                  <td>
                    <span className="mono" style={{ fontSize: "0.75rem", color: "var(--forest-warm)" }}>
                      {q.id}
                    </span>
                  </td>
                  <td style={{ maxWidth: 320 }}>{q.pregunta}</td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {q.opciones.map((op) => (
                        <span
                          key={op}
                          className={`answer-pill${op === q.correcta ? " correct" : ""}`}
                        >
                          {op === q.correcta ? "✓ " : ""}{op}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
