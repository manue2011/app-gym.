// Generated from wger.de data (see assets/gifs/LICENSES.md). Keep in sync with exercises.json.
export interface MediaCredit {
  source: string;
  author: string;
  license: string;
  licenseUrl: string;
}

export interface ExerciseMedia {
  /** Asset module from require(). */
  image: number;
  /** True when the file is an animation (start → end position). */
  animated: boolean;
  imageCredit: MediaCredit;
  textCredit: MediaCredit | null;
}

export const EXERCISE_MEDIA: Record<string, ExerciseMedia> = {
  'bench-press': {
    image: require('../../assets/gifs/bench-press.gif'),
    animated: true,
    imageCredit: {
      source: 'wger.de',
      author: 'Everkinetic',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    },
    textCredit: {
      source: 'wger.de',
      author: 'wgerjhn',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    },
  },
  'incline-dumbbell-press': {
    image: require('../../assets/gifs/incline-dumbbell-press.gif'),
    animated: true,
    imageCredit: {
      source: 'wger.de',
      author: 'Everkinetic',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    },
    textCredit: {
      source: 'wger.de',
      author: 'wger.de',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    },
  },
  'dumbbell-fly': {
    image: require('../../assets/gifs/dumbbell-fly.gif'),
    animated: true,
    imageCredit: {
      source: 'wger.de',
      author: 'cshep442',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    },
    textCredit: {
      source: 'wger.de',
      author: 'wgerjhn',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    },
  },
  'cable-crossover': {
    image: require('../../assets/gifs/cable-crossover.gif'),
    animated: true,
    imageCredit: {
      source: 'wger.de',
      author: 'Everkinetic',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    },
    textCredit: null,
  },
  'pull-up': {
    image: require('../../assets/gifs/pull-up.webp'),
    animated: false,
    imageCredit: {
      source: 'wger.de',
      author: 'Imobard',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    },
    textCredit: {
      source: 'wger.de',
      author: 'wger.de',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    },
  },
  'barbell-row': {
    image: require('../../assets/gifs/barbell-row.gif'),
    animated: true,
    imageCredit: {
      source: 'wger.de',
      author: 'Everkinetic',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    },
    textCredit: {
      source: 'wger.de',
      author: 'wgerjhn',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    },
  },
  'seated-cable-row': {
    image: require('../../assets/gifs/seated-cable-row.gif'),
    animated: true,
    imageCredit: {
      source: 'wger.de',
      author: 'Everkinetic',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    },
    textCredit: {
      source: 'wger.de',
      author: 'wger.de',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    },
  },
  'overhead-press': {
    image: require('../../assets/gifs/overhead-press.gif'),
    animated: true,
    imageCredit: {
      source: 'wger.de',
      author: 'Everkinetic',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    },
    textCredit: {
      source: 'wger.de',
      author: 'wger.de',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    },
  },
  'dumbbell-shoulder-press': {
    image: require('../../assets/gifs/dumbbell-shoulder-press.gif'),
    animated: true,
    imageCredit: {
      source: 'wger.de',
      author: 'Everkinetic',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    },
    textCredit: {
      source: 'wger.de',
      author: 'admin',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    },
  },
  'lateral-raise': {
    image: require('../../assets/gifs/lateral-raise.gif'),
    animated: true,
    imageCredit: {
      source: 'wger.de',
      author: 'Everkinetic',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    },
    textCredit: null,
  },
  'barbell-curl': {
    image: require('../../assets/gifs/barbell-curl.gif'),
    animated: true,
    imageCredit: {
      source: 'wger.de',
      author: 'Everkinetic',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    },
    textCredit: {
      source: 'wger.de',
      author: 'admin',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    },
  },
  dips: {
    image: require('../../assets/gifs/dips.webp'),
    animated: false,
    imageCredit: {
      source: 'wger.de',
      author: 'cshep442',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    },
    textCredit: {
      source: 'wger.de',
      author: 'wgerjhn',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    },
  },
  'lying-leg-curl': {
    image: require('../../assets/gifs/lying-leg-curl.gif'),
    animated: true,
    imageCredit: {
      source: 'wger.de',
      author: 'Everkinetic',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    },
    textCredit: {
      source: 'wger.de',
      author: 'wger.de',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    },
  },
};
