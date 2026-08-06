export interface ConflictMapConfig {
    monsterIndex: number
    tilemapKey: string
    layerName: string
}

export const CONFLICT_MAPS: ConflictMapConfig[] = [
    {
        monsterIndex: 25,
        tilemapKey: 'conflict-grass',
        layerName: 'conflict-grass-layer',
    },
    {
        monsterIndex: 14,
        tilemapKey: 'conflict-shore',
        layerName: 'conflict-shore-layer',
    },
]

const conflictMapByMonsterIndex = new Map(
    CONFLICT_MAPS.map(config => [config.monsterIndex, config] as const)
)

export function getConflictMapForMonsterIndex(
    monsterIndex: number,
): ConflictMapConfig | undefined {
    return conflictMapByMonsterIndex.get(monsterIndex)
}

export function getDefaultConflictMap(): ConflictMapConfig {
    return conflictMapByMonsterIndex.get(25) ?? CONFLICT_MAPS[0]
}
