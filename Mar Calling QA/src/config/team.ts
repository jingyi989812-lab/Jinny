/**
 * CSC team roster (provided by the MARCOM QA lead, 17 Sep 2026).
 * `aliases` are the spellings used in recording file names.
 * Staff found in recordings but not listed here are skipped on import by default
 * (e.g. Sophia — no longer with the team, per QA lead 17 Sep 2026).
 */
export interface RosterMember {
  id: string;
  name: string;
  aliases: string[];
}

export const CSC_ROSTER: RosterMember[] = [
  { id: 'csc-zhi-tian', name: 'Zhi Tian', aliases: ['zhi tian', 'zhi tian gan', 'zhitian'] },
  { id: 'csc-yi-ling', name: 'Yi Ling', aliases: ['yi ling', 'yiling'] },
  { id: 'csc-irene', name: 'Irene', aliases: ['irene', 'irene wong'] },
  { id: 'csc-gracey', name: 'Gracey', aliases: ['gracey', 'graceyy', 'gracy'] },
  { id: 'csc-evelyn', name: 'Evelyn', aliases: ['evelyn'] },
  { id: 'csc-su-jin', name: 'Su Jin', aliases: ['su jin', 'sujin', 'sujin lim', 'su jin lim'] },
  { id: 'csc-xin-ni', name: 'Xin Ni', aliases: ['xin ni', 'xinni'] },
  { id: 'csc-yu-ting', name: 'Yu Ting', aliases: ['yu ting', 'yuting'] },
];

export function matchRoster(rawName: string): RosterMember | undefined {
  const key = rawName.trim().toLowerCase().replace(/\s+/g, ' ');
  return CSC_ROSTER.find((m) => m.aliases.includes(key) || m.name.toLowerCase() === key);
}
