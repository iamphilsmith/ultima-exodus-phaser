## Phase 5 — Party organization parity

Goal: the pre-game party management screens (Register, Create Character, Form
Party, Disperse, Terminate) work end to end against the C# server, and the HUD
party panel shows the real party instead of the hardcoded stub.

> **Numbering:** steps 26-32 keep their numbers; sub-steps are lettered (26a-b,
> 27a-f, 28a-c, 31a), as in Phases 3 and 4.

> **Decisions made while scoping this phase** (branch
> `phase-5-party-organisation`, from `main`):
> - **Screens are Phaser scenes, not Angular components.** The old
>   `PartyOrganizationScene` and its `OrgView` sub-screens are ported with the
>   same pattern, drawn with the bitmap charset, consistent with "everything is
>   rendered inside the canvas". Angular supplies only services
>   (`RosterService`, `HeroOptionsService`), passed to the scene through its
>   constructor, as `WorldScene` does.
> - **Validation is plain C# in `UltimaExodus.Engine`** (`CreationRules`), unit
>   tested, with no FluentValidation dependency. The server stays authoritative;
>   the client validates only to give the same immediate messages as the old build.
> - **`Hero` and `PartySlot` are plain classes in Engine** (no EF attributes).
>   Engine cannot reference Data, and the rules need to see heroes. Mapping is
>   configured with the fluent API in `UltimaExodusDbContext`.
> - **Starting values keep the old database values:** hit points 100, magic
>   points 0, food 0, gold 0, experience 0, level 1, status good. They live as
>   constants in one place (`HeroDefaults`), so changing them later is one edit.
>   The old HUD stub's 150/149 was only a placeholder.
> - **Schema:** `Heroes` and `PartySlots` are ported. `PartySlots` keeps its
>   shape (slot index 0-3 as key) but gets a **unique index on `HeroId`**, which
>   the old schema lacked. `Heroes.RosterSlot` gets a **unique index filtered to
>   `Terminated = 0`**. `heroInventory`, `equippedWeaponId` and `equippedArmorId`
>   are deferred: nothing in the old build reads or writes them.
> - **Two old bugs are not ported.** `party.form` looked heroes up by roster
>   slot without excluding terminated ones, so a terminated hero could join a
>   party, or a reused slot made forming fail. Every query here excludes
>   terminated heroes, and the filtered index makes the bad state impossible.
> - **Game outcomes are not errors.** "Roster is full", "slot already empty",
>   "can not terminate a character in the party", "a party is already formed"
>   and "each position must be different" return 200 with a status. Only
>   malformed input (blank name, stats not totalling 50, unknown race) returns
>   400. Every command returns the full updated `RosterSnapshot`, so the client
>   never refetches.
> - **Option lists come from the server.** `GET api/hero-options` returns races,
>   classes, sexes and the creation limits, so the client does not duplicate
>   them (same reasoning as `api/tiles`). Initials such as `MHF` (sex, race,
>   class) are computed server-side.
> - **Temporary entry point.** The new client has no main menu until Phase 6, so
>   an `O` key hook on `WorldScene` starts the organisation scene. The scene
>   takes an `exitTo` scene key (default `world`); Phase 6 changes it to
>   `main-menu` and deletes the hook.
> - **No party formed:** the HUD party panel is blank and the world is still
>   walkable. Requiring a party before play is Phase 6's R/O/J gating.
> - **Out of scope:** magic points by class (still 0, as in the old TODO),
>   race/class restrictions on stats, inventory and equipment, and the
>   Ultima III BCD roster files.

**Behaviour matched (old `PartyOrganizationScene` and `hero`/`party` routers):**

- Roster of 20 entries, shown 1-based (`Entry#01`); created heroes take the
  lowest free entry.
- Creation: name 1-12 characters, sex, race (Human, Elf, Dwarf, Bobbit, Fuzzy)
  and class (Fighter, Paladin, Barbarian, Thief, Cleric, Wizard, Druid,
  Illusionist, Alchemist) chosen with left/right; four stats each 0-25 that
  must total exactly 50. A wrong total shows
  `Total must be 50 (currently N) — re-enter stats` and clears the stats.
- Form: four distinct, non-empty entries, only when no party exists. Messages:
  `Must be 01-20`, `Already selected`, `A party is already formed`,
  `Each roster position must be different`, `One or more roster positions are
  empty`, `Party formed — press any key`.
- Disperse always succeeds and shows `Party dispersed`.
- Terminate is a soft delete: `Register slot is already empty`,
  `Can not terminate a character in the party`, `NN Terminated`.
- Register rows: `NN P NAME(12) SRC  Lnn`, red for party members with their
  position number, blue otherwise, `-- Empty --` for free entries.

**Server**

26a. **Add the hero domain to `UltimaExodus.Engine/Heroes/`** — `Sex`, `Race`,
    `HeroClass` enums; `Hero` and `PartySlot` classes; `HeroDefaults` and the
    creation constants (total 50, stat range 0-25, name length 12, roster size
    20, party size 4); and the pure rules `CreationRules.Validate`,
    `Roster.NextFreeEntry`, `PartyRules.TryForm` and `Roster.CanTerminate`.
    xUnit tests at both ends of every range and just outside them (stats 0, 25,
    26; totals 49, 50, 51; name length 12 and 13; entries 1, 20, 21; full
    roster; duplicate entries).
26b. **Persist heroes and the party** — `DbSet<Hero>` and `DbSet<PartySlot>` in
    `UltimaExodusDbContext`, enums stored as strings, the two unique indexes
    above. Migration `AddHeroesAndParty`. Check it applies on a fresh database
    (delete the `.db`) and on the existing one.
27a. **`GET api/hero-options`** — races, classes, sexes, creation limits.
27b. **`GET api/roster`** — `RosterSnapshot`: 20 entries, each with its hero (name,
    initials, level) and party position (1-4) or empty, plus a `PartyFormed`
    flag (Phase 6 will use it).
27c. **`POST api/roster/create`** — validates, assigns the entry, returns a status
    (`Created`, `RosterFull`) and the snapshot; 400 for invalid input.
27d. **`POST api/roster/terminate`** — `{ "entry": 1-20 }`; statuses `Terminated`,
    `Empty`, `InParty`.
27e. **`POST api/party/form` and `POST api/party/disperse`** — form takes
    `{ "entries": [n, n, n, n] }`; statuses `Formed`, `AlreadyFormed`,
    `Duplicate`, `EmptyEntry`.
27f. **Real party in the game snapshot** — remove `StubState.Party` (the clock
    stub stays). `GameService` loads the party slots with their heroes and maps
    each to `PartyMemberStatus` (`Type` = sex/race/class initials, `Magic`,
    `Level`, `Hits`, `Food`, `Condition` letter from status). The snapshot
    builder becomes async. An empty party gives an empty `Members` list. Add a
    `scripts/party-check.ps1` that creates heroes, forms, disperses and
    terminates through the API and checks each status.

**Client**

28a. **Services and DTOs** — `RosterService` and `HeroOptionsService`
    (`@Service()`, `inject()`), with the TypeScript mirrors of the DTOs.
    `tile-catalogue.spec.ts`-style specs that match a full
    `http(s)://host/api/...` URL (the `${apiBaseUrl}` without `()` gotcha).
28b. **Scene infrastructure** — `PartyOrganizationScene`, the `OrgView`
    interface, `writeTextCentered` added to `game/bitmap-text.ts`,
    `NumericLineInput` and `TextLineInput` (with Vitest specs), the scene
    registered in `GameCanvas` (services injected there and passed in), charset
    loading shared so either scene can start first, and the temporary `O` hook
    on `WorldScene`. Remember: do not name a field `game` or `input` on a scene.
    Add the new scene to the hand-rolled Phaser mock if specs need it.
28c. **Options menu and Register screen** — `OptionsMenuView`, `RegisterView`.
    Disperse is wired here.
29. **Create Character screen** — `CreateCharacterView`, using
    `HeroOptionsService` for the cycle lists and limits, with the old messages.
30. **Form Party screen** — `FormPartyView`.
31. **Terminate Character screen** — `TerminateCharacterView`, soft delete only.
31a. **Party panel from the snapshot** — a pure `game/party-rows.ts` (member to the
    four panel rows, zero-padded, with Vitest specs) and `WorldScene` redrawing
    the panel on every snapshot instead of once in `create()`. Handles fewer
    than four members.

**Close-out**

32. **Confirm party organization parity** — compare every sub-screen with the old
    build, side by side: layout, colours, every message above, entry numbering,
    the 20-entry limit and the 4-distinct rule. Check that a refresh keeps the
    roster and party, and that the HUD matches the formed party. Fix-only commit
    if needed, then the docs commit (`MIGRATION_PLAN`, `CONTEXT`,
    `ARCHITECTURE`: snapshot `Party` is now real, new endpoints, the hero
    schema), and merge.

**Intended differences from the old build:** the two bug fixes above, and the
HUD party panel now shows the real party.

Add these to **Explicitly deferred**: hero inventory and equipment; magic points
and race/class stat rules; requiring a party before the overworld (Phase 6);
persisting hero state changes from play (damage, food, gold) until combat and
shops exist.
