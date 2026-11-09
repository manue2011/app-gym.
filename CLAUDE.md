# CLAUDE.md — App de Hipertrofia (ganancia de masa muscular)

## Qué es este proyecto
App móvil (Android e iOS) para ayudar a las personas a ganar masa muscular.
El usuario **crea sus propias rutinas**, elige qué músculos/ejercicios entrena cada día,
ve **animaciones (GIF)** de cómo hacer cada ejercicio y **registra pesos y repeticiones**
para llevar control de su progreso. Toda recomendación debe estar respaldada por
evidencia científica con su fuente citada.

## Stack técnico
- **Framework:** React Native con Expo (SDK estable más reciente) + TypeScript (modo `strict`).
- **Navegación:** Expo Router (rutas por archivos en `app/`).
- **Base de datos local:** `expo-sqlite` con migraciones versionadas. Todo funciona sin internet.
- **Estado global:** Zustand.
- **Gráficas:** `react-native-gifted-charts`.
- **Imágenes/GIF:** `expo-image` (soporta GIF animado y caché).
- **Tests:** Jest + React Native Testing Library.
- Idioma de la interfaz: **español**. Unidades: kg por defecto, opción lb.

## Comandos
- `npx expo start` — iniciar en desarrollo
- `npm test` — correr tests
- `npm run lint` — ESLint + Prettier
- `npx tsc --noEmit` — revisar tipos

## Estructura de carpetas
```
app/                  # pantallas (Expo Router)
  (tabs)/hoy.tsx          # entrenamiento del día
  (tabs)/rutinas.tsx      # lista de rutinas del usuario
  (tabs)/progreso.tsx     # gráficas
  (tabs)/ejercicios.tsx   # biblioteca con GIFs
  rutina/[id].tsx         # crear / editar rutina
  sesion/[id].tsx         # registrar series en vivo
src/
  db/                 # conexión, migraciones, repositorios (CRUD)
  store/              # stores de Zustand
  components/
  science/            # reglas basadas en evidencia + fuentes
  data/exercises.json # catálogo inicial de ejercicios
assets/gifs/          # animaciones con licencia válida
```

## Funcionalidad central: rutinas guardadas y editables
Esta es la prioridad número 1. El usuario debe poder:
1. **Crear** una rutina con nombre (ej. "Push/Pull/Legs").
2. **Agregar días** a la rutina y asignarles día de la semana (ej. Lunes = Pecho y tríceps).
3. **Agregar ejercicios** a cada día desde la biblioteca o crear uno propio.
4. Definir por ejercicio: series objetivo, rango de repeticiones, descanso y notas.
5. **Editar** cualquier parte: renombrar, cambiar orden (arrastrar), cambiar series/reps,
   quitar o añadir ejercicios y días.
6. **Duplicar** y **eliminar** rutinas (con confirmación).
7. Marcar una rutina como **activa**; la pestaña "Hoy" muestra el día que toca.

Reglas:
- Todo se guarda en SQLite **inmediatamente** al confirmar un cambio. Nada se pierde al cerrar la app.
- Editar una rutina **nunca** borra ni altera el historial de entrenamientos pasados.
- Eliminar usa borrado lógico (`deleted_at`) para poder deshacer.

## Modelo de datos (SQLite)
```
exercises        id, name, muscle_primary, muscles_secondary, equipment,
                 gif_path, instructions, common_mistakes, is_custom, created_at
routines         id, name, is_active, created_at, updated_at, deleted_at
routine_days     id, routine_id, name, weekday (0-6, nullable), position
routine_exercises id, routine_day_id, exercise_id, position,
                 target_sets, rep_min, rep_max, rest_seconds, notes
workouts         id, routine_day_id (nullable), started_at, finished_at, notes
workout_sets     id, workout_id, exercise_id, set_number,
                 weight_kg, reps, rir (0-5, nullable), completed_at
```
- Claves foráneas activadas (`PRAGMA foreign_keys = ON`).
- Cada cambio de esquema = nueva migración numerada en `src/db/migrations/`. Nunca editar una migración ya publicada.
- El peso se guarda siempre en kg; la conversión a lb es solo visual.

## Registro de una sesión
- Al iniciar el día, precargar cada ejercicio con los pesos/reps de la **última vez**.
- Por serie: peso, repeticiones y RIR (repeticiones en reserva).
- Temporizador de descanso automático al completar una serie.
- Mostrar el GIF del ejercicio con un toque.

## Base científica (carpeta `src/science/`)
Cada regla debe tener su referencia en `src/science/sources.ts` y mostrarse en la app
("¿Por qué?"). **No inventar datos ni estudios.** Si algo no tiene evidencia clara, no se afirma.

| Regla | Valor por defecto | Fuente |
|---|---|---|
| Volumen semanal por músculo | Aviso si < 10 series | Schoenfeld, Ogborn & Krieger, 2017, *J Sports Sci* |
| Frecuencia por músculo | Sugerir ≥ 2 veces/semana | Schoenfeld, Ogborn & Krieger, 2016, *Sports Med* |
| Rango de repeticiones | 6–30 reps cerca del fallo | Schoenfeld et al., 2017, *J Strength Cond Res* |
| Cercanía al fallo | RIR 0–3 | Refalo et al., 2023, *Sports Med* |
| Descanso en compuestos | 2–3 min | Schoenfeld et al., 2016, *J Strength Cond Res* |
| Proteína diaria | ~1,6 g/kg (hasta 2,2) | Morton et al., 2018, *Br J Sports Med* |

**Sobrecarga progresiva (sugerencia automática):** si el usuario completa todas las series
en el tope del rango de repeticiones (`rep_max`), sugerir subir el peso
(~2,5 kg en tren superior, ~5 kg en tren inferior) la próxima sesión. Es una sugerencia, nunca obligatoria.

## GIFs y derechos de autor
- Solo usar animaciones con licencia que permita uso comercial: propias, encargadas,
  o de fuentes con licencia (ej. wger bajo CC BY-SA citando autor, o ExerciseDB con licencia de pago).
- Registrar origen y licencia de cada GIF en `assets/gifs/LICENSES.md`.
- **Nunca** descargar GIFs de Google, YouTube u otras apps sin permiso.

## Estilo de código
- Componentes funcionales con hooks; nada de componentes de clase.
- Acceso a la base de datos solo a través de `src/db/repositories/`, nunca SQL dentro de pantallas.
- Nombres de código en inglés; textos visibles al usuario en español.
- Escribir tests para repositorios (CRUD de rutinas) y para las reglas de `src/science/`.

## Seguridad y aviso legal
- Pantalla inicial con descargo de responsabilidad: la app no sustituye a un médico
  ni a un entrenador; consultar a un profesional si hay lesiones o enfermedades.
- Datos del usuario solo en el dispositivo hasta que se añada sincronización con permiso explícito.

## Hoja de ruta
1. ✅ CRUD de rutinas + guardado en SQLite (prioridad)
2. Registro de sesiones con último peso precargado
3. Biblioteca de ejercicios con GIFs
4. Gráficas de progreso por ejercicio
5. Sugerencias científicas (volumen, sobrecarga progresiva)
6. Respaldo/sincronización en la nube (Supabase), opcional
