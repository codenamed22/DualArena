export type ArenaMapId = "cyber-core" | "forest" | "volcano";

export type ArenaMap = {
  id: ArenaMapId;
  name: string;
  subtitle: string;
  floorColor: number;
  gridColor: number;
  accentColor: number;
  secondaryColor: number;
  glowColor: number;
};

export const arenaMaps: ArenaMap[] = [
  {
    id: "cyber-core",
    name: "Cyber Core Arena",
    subtitle: "Neon grid. Clean angles. Pure duel energy.",
    floorColor: 0x081020,
    gridColor: 0x28f0ff,
    accentColor: 0x28f0ff,
    secondaryColor: 0xff3df2,
    glowColor: 0x28f0ff,
  },
  {
    id: "forest",
    name: "Forest Arena",
    subtitle: "Moss-lit ruins under a dark canopy.",
    floorColor: 0x081811,
    gridColor: 0x7dff72,
    accentColor: 0x7dff72,
    secondaryColor: 0xffe66d,
    glowColor: 0x7dff72,
  },
  {
    id: "volcano",
    name: "Volcano Rift",
    subtitle: "Molten cracks. Hot edges. No mercy.",
    floorColor: 0x190a07,
    gridColor: 0xff6b2b,
    accentColor: 0xff6b2b,
    secondaryColor: 0xff2b2b,
    glowColor: 0xff6b2b,
  },
];

export function getArenaMap(id: ArenaMapId): ArenaMap {
  return arenaMaps.find((map) => map.id === id) ?? arenaMaps[0];
}
