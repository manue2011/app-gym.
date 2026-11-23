/** Peer-reviewed references behind every rule the app shows. Do not add a rule without one. */
export interface Source {
  id: SourceId;
  authors: string;
  year: number;
  title: string;
  journal: string;
  doi: string;
}

export type SourceId =
  | 'schoenfeld2017volume'
  | 'schoenfeld2016frequency'
  | 'schoenfeld2017loads'
  | 'refalo2023failure'
  | 'schoenfeld2016rest'
  | 'morton2018protein'
  | 'acsm2009progression';

export const SOURCES: Record<SourceId, Source> = {
  schoenfeld2017volume: {
    id: 'schoenfeld2017volume',
    authors: 'Schoenfeld BJ, Ogborn D, Krieger JW',
    year: 2017,
    title:
      'Dose-response relationship between weekly resistance training volume and increases in muscle mass: A systematic review and meta-analysis',
    journal: 'J Sports Sci. 35(11):1073–1082',
    doi: '10.1080/02640414.2016.1210197',
  },
  schoenfeld2016frequency: {
    id: 'schoenfeld2016frequency',
    authors: 'Schoenfeld BJ, Ogborn D, Krieger JW',
    year: 2016,
    title:
      'Effects of resistance training frequency on measures of muscle hypertrophy: A systematic review and meta-analysis',
    journal: 'Sports Med. 46(11):1689–1697',
    doi: '10.1007/s40279-016-0543-8',
  },
  schoenfeld2017loads: {
    id: 'schoenfeld2017loads',
    authors: 'Schoenfeld BJ, Grgic J, Ogborn D, Krieger JW',
    year: 2017,
    title:
      'Strength and hypertrophy adaptations between low- vs. high-load resistance training: A systematic review and meta-analysis',
    journal: 'J Strength Cond Res. 31(12):3508–3523',
    doi: '10.1519/JSC.0000000000002200',
  },
  refalo2023failure: {
    id: 'refalo2023failure',
    authors: 'Refalo MC, Helms ER, Trexler ET, Hamilton DL, Fyfe JJ',
    year: 2023,
    title:
      'Influence of resistance training proximity-to-failure on skeletal muscle hypertrophy: A systematic review with meta-analysis',
    journal: 'Sports Med. 53(3):649–665',
    doi: '10.1007/s40279-022-01784-y',
  },
  schoenfeld2016rest: {
    id: 'schoenfeld2016rest',
    authors: 'Schoenfeld BJ, Pope ZK, Benik FM, et al.',
    year: 2016,
    title:
      'Longer interset rest periods enhance muscle strength and hypertrophy in resistance-trained men',
    journal: 'J Strength Cond Res. 30(7):1805–1812',
    doi: '10.1519/JSC.0000000000001272',
  },
  morton2018protein: {
    id: 'morton2018protein',
    authors: 'Morton RW, Murphy KT, McKellar SR, et al.',
    year: 2018,
    title:
      'A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults',
    journal: 'Br J Sports Med. 52(6):376–384',
    doi: '10.1136/bjsports-2017-097608',
  },
  acsm2009progression: {
    id: 'acsm2009progression',
    authors: 'American College of Sports Medicine',
    year: 2009,
    title: 'Position stand: Progression models in resistance training for healthy adults',
    journal: 'Med Sci Sports Exerc. 41(3):687–708',
    doi: '10.1249/MSS.0b013e3181915670',
  },
};

export const doiUrl = (s: Source) => `https://doi.org/${s.doi}`;
