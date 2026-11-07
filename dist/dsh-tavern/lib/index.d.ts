import { Context, LoggerService } from "@deepseek-ai/cordis";
import { Agent, AgentHandle, AgentRegistry } from "@deepseek-ai/dsh-agent";
import { AgentPresetRegistry } from "@deepseek-ai/dsh-agent-preset-registry";
import { SessionEvent } from "@deepseek-ai/dsh-session";
import SessionPersistence from "@deepseek-ai/dsh-session-persistence";
import { ToolDefinition, ToolRunContext } from "@deepseek-ai/dsh-tools";
import { WorkspaceRegistry } from "@deepseek-ai/dsh-workspace";
//#region src/types.d.ts
/**
 * dsh-tavern data model: SillyTavern/TauriTavern compatible character cards,
 * world books (lorebooks), presets, and chat messages.
 */
/** The character card body, compatible with SillyTavern chara_card_v2. */
interface CharacterCardData {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creator_notes: string;
  system_prompt: string;
  post_history_instructions: string;
  alternate_greetings: string[];
  group_only_greetings?: string[];
  character_book?: WorldBook;
  tags: string[];
  creator: string;
  character_version: string;
  /** Free-form extension map kept verbatim for round-trip fidelity. */
  extensions: Record<string, unknown>;
}
/** The full chara_card_v2 envelope. */
interface CharacterCard {
  spec: 'chara_card_v2';
  spec_version: string;
  data: CharacterCardData;
}
/** A tavern-managed character: the card plus local bookkeeping. */
interface CharacterRecord {
  id: string;
  /** Import source display name (file name or manual). */
  source?: string;
  /**
   * Avatar as a data URL (legacy inline) or as a DSH-home-relative file path
   * (`tavern/avatars/<character-id>.png`).  The client and export route resolve
   * the path through the `/tavern/avatars/...` HTTP route.
   */
  avatar?: string;
  /** When this record was created, ISO string. */
  createdAt: string;
  /** When this record was last edited, ISO string. */
  updatedAt: string;
  card: CharacterCard;
}
/** One world-info entry, SillyTavern field names (camelCase top level). */
interface WorldBookEntry {
  uid: number;
  /** Primary match keys. */
  key: string[];
  /** Secondary match keys. */
  keysecondary: string[];
  /** Editor comment (also shown to the model when addMemo). */
  comment: string;
  content: string;
  /** Always active regardless of key matching. */
  constant: boolean;
  vectorized: boolean;
  selective: boolean;
  /** AND_ANY=0, NOT_ALL=1, NOT_ANY=2, AND_ALL=3. */
  selectiveLogic: number;
  addMemo: boolean;
  /** Display order in the editor (insertion order default 100). */
  order: number;
  /** Insert position: 0=before, 1=after (2..7 are AN/EM/atDepth/outlet variants). */
  position: number;
  disable: boolean;
  ignoreBudget: boolean;
  excludeRecursion: boolean;
  preventRecursion: boolean;
  matchPersonaDescription: boolean;
  matchCharacterDescription: boolean;
  matchCharacterPersonality: boolean;
  matchCharacterDepthPrompt: boolean;
  matchScenario: boolean;
  matchCreatorNotes: boolean;
  /** Delay in messages before recursive insertion applies. */
  delayUntilRecursion: number;
  /** Activation probability in percent. */
  probability: number;
  useProbability: boolean;
  /** Minimum message depth for activation (default 4). */
  depth: number;
  outletName: string;
  /** Group id (string in ST; one member activates at a time). */
  group: string;
  groupOverride: boolean;
  groupWeight: number;
  scanDepth: number | null;
  caseSensitive: boolean | null;
  matchWholeWords: boolean | null;
  useGroupScoring: boolean | null;
  automationId: string;
  /** SYSTEM=0, USER=1, ASSISTANT=2, NARRATOR=3. */
  role: number;
  sticky: number | null;
  cooldown: number | null;
  delay: number | null;
  /** Generated-content triggers (rarely used). */
  triggers: string[];
  /** Persisted snake_case metadata mirror (SillyTavern world-info format). */
  extensions: WorldBookEntryExtensions;
  /** Regex key alternative. */
  keyregex?: string;
}
/** One world-info entry extension block (snake_case, ST world-info files). */
interface WorldBookEntryExtensions {
  position?: number;
  exclude_recursion?: boolean;
  display_index?: number;
  probability?: number;
  useProbability?: boolean;
  depth?: number;
  selectiveLogic?: number;
  outlet_name?: string;
  group?: string;
  group_override?: boolean;
  group_weight?: number;
  prevent_recursion?: boolean;
  delay_until_recursion?: number;
  scan_depth?: number | null;
  match_whole_words?: boolean | null;
  use_group_scoring?: boolean | null;
  case_sensitive?: boolean | null;
  automation_id?: string;
  role?: number;
  vectorized?: boolean;
  sticky?: number | null;
  cooldown?: number | null;
  delay?: number | null;
  match_persona_description?: boolean;
  match_character_description?: boolean;
  match_character_personality?: boolean;
  match_character_depth_prompt?: boolean;
  match_scenario?: boolean;
  match_creator_notes?: boolean;
  triggers?: string[];
  ignore_budget?: boolean;
  /** Extra unknown keys pass through untouched. */
  [key: string]: unknown;
}
/** A full world book (lorebook) in tavern-internal array form. */
interface WorldBook {
  name?: string;
  description?: string;
  scan_depth?: number;
  token_budget?: number;
  recursive_scanning?: boolean;
  extensions?: Record<string, unknown>;
  /** Entries in array form (converted from ST's uid-keyed object on import). */
  entries: WorldBookEntry[];
}
/** A tavern-managed world book plus local bookkeeping. */
interface WorldBookRecord {
  id: string;
  name: string;
  /** Import source path (worlds/<file>); used to make re-import idempotent. */
  source?: string;
  createdAt: string;
  updatedAt: string;
  book: WorldBook;
}
/** AI preset: sampling knobs plus DSH model routing. */
interface Preset {
  id: string;
  name: string;
  /** Import source path (preset dir/<file>); used to make re-import idempotent. */
  source?: string;
  createdAt: string;
  updatedAt: string;
  /** DSH provider route; absent = session default. */
  provider?: string;
  /** DSH model id; absent = session default. */
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  topA?: number;
  typicalP?: number;
  minP?: number;
  repPen?: number;
  repPenRange?: number;
  repPenSlope?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  /** System prompt override layered over the character card. */
  systemPrompt?: string;
  /** Free-form extras kept for round-trip fidelity. */
  raw?: Record<string, unknown>;
}
/**
 * One roleplay session ("play"): characters + world book + preset bound to a
 * DSH session. The conversation itself lives in the DSH session log — the
 * tavern plugin only supplies the composition (prompts, world book, model
 * route) and the multi-agent tooling.
 */
interface Play {
  id: string;
  title: string;
  /** Character record ids in the scene, first = main character. */
  characterIds: string[];
  /**
   * World book record ids bound to this play (multiple books are merged in
   * selection order when the prompt is assembled).
   */
  lorebookIds?: string[];
  /** @deprecated Legacy single-book field, kept to read plays persisted before multi-select. */
  lorebookId?: string;
  /** Preset record id; absent = defaults. */
  presetId?: string;
  /** Whether the director agent narrates scene transitions. */
  narratorEnabled: boolean;
  /** Multi-agent mode: characters are separate DSH agents via tavern_speak. */
  multiAgent: boolean;
  /** The bound DSH session id (the director agent's session). */
  sessionId: string;
  /** Selected greeting (first_mes or alternate); used as the opening seed. */
  greetingIndex?: number;
  /** The greeting text chosen for this play. */
  greeting?: string;
  createdAt: string;
  updatedAt: string;
}
/**
 * One swipe branch: every alternative generation of the same assistant reply,
 * forked from a shared balanced session-log prefix. Because DSH session logs
 * are append-only, regenerating forks a NEW session per variant; the branch
 * keeps the prefix plus each variant's event tail so any alternative can be
 * re-materialized as a live session. Event numbers and texts are plain JSON
 * (`unknown[]`) so swapping variants needs no host-round-trip of typed data.
 */
interface SwipeBranch {
  /** Play this branch belongs to. */
  playId: string;
  /**
   * Stable branch identity: the event count of the fork prefix. One active
   * lineage has exactly one branch per user turn; edits delete stale ones.
   */
  key: string;
  /** Balanced completed-turn prefix shared by every variant. */
  prefix: unknown[];
  /** The user message text replayed when a variant is generated. */
  userText: string;
  /**
   * One event tail per attempt, from the question turn's `turn/start` through
   * its `turn/end`. An empty array marks an in-flight generation.
   */
  variants: unknown[][];
  /** Index of the variant currently materialized as the play's session. */
  current: number;
  /** Whether a generation for `variants[current]` is still running. */
  busy: boolean;
  /** Generation error of the last attempt, when it failed before settling. */
  error?: string;
  updatedAt: string;
}
/** Tavern view style: DSH-token look or the legacy dark-gold palette. */
type TavernStyle = 'dsh' | 'classic';
/** Categories selected for a local TauriTavern data-directory import. */
interface TauriTavernImportSelection {
  characters: boolean;
  lorebooks: boolean;
  presets: boolean;
}
/** One file that could not be imported (the rest of the import continues). */
interface TauriTavernImportIssue {
  category: 'character' | 'lorebook' | 'preset';
  /** Path relative to the detected TauriTavern user directory. */
  file: string;
  reason: string;
}
/** Result of one local TauriTavern data-directory import. */
interface TauriTavernImportReport {
  /** The path the user supplied. */
  input: string;
  /** Detected TauriTavern data root (parent of default-user). */
  root: string;
  /** Detected TauriTavern user directory (contains characters/worlds/...). */
  userDir: string;
  imported: {
    characters: number;
    lorebooks: number;
    presets: number;
  };
  issues: TauriTavernImportIssue[];
}
//#endregion
//#region src/library.d.ts
/** Minimal logger surface (matches the host's LoggerService shape we use). */
interface LibraryLogger {
  warn: (message: string) => void;
  info: (message: string) => void;
  /**
   * Failures the user has to see. The host logger has this method at the same
   * call shape; test doubles may omit it, which is why {@link LibraryStore}
   * falls back to `warn` when it is absent.
   */
  error?: (message: string) => void;
}
/**
 * In-memory index over the on-disk library. Reads are synchronous against the
 * index (every caller in the plugin expects that); writes update the index and
 * persist the single affected file.
 */
declare class LibraryStore {
  private readonly maps;
  private readonly root;
  private readonly logger;
  /**
   * Construct the index without touching the disk. The plugin provides its
   * service synchronously, so the store must exist before {@link load} has
   * run; callers gate their first read on the load promise.
   *
   * Fields are declared explicitly rather than as constructor parameter
   * properties so this module runs under Node's strip-only TypeScript support
   * (which rejects parameter properties) — handy for verification scripts.
   */
  constructor(root: string, logger: LibraryLogger);
  /** Create the library directories and read every record into the index. */
  load(): Promise<void>;
  /** Open (creating if needed) the library directory and load every record. */
  static open(root: string, logger: LibraryLogger): Promise<LibraryStore>;
  /** Read every record of one collection into the index. */
  private loadCollection;
  /** Persist one record and index it. */
  private put;
  /** Remove one record from disk and the index. Missing files are fine. */
  private drop;
  private all;
  characters(): CharacterRecord[];
  character(id: string): CharacterRecord | undefined;
  putCharacter(record: CharacterRecord): Promise<void>;
  /** Write many records; a failure on one is reported but does not abort the rest. */
  putCharacters(records: readonly CharacterRecord[]): Promise<void>;
  dropCharacter(id: string): Promise<void>;
  lorebooks(): WorldBookRecord[];
  lorebook(id: string): WorldBookRecord | undefined;
  putLorebook(record: WorldBookRecord): Promise<void>;
  dropLorebook(id: string): Promise<void>;
  presets(): Preset[];
  preset(id: string): Preset | undefined;
  putPreset(record: Preset): Promise<void>;
  dropPreset(id: string): Promise<void>;
  plays(): Play[];
  play(id: string): Play | undefined;
  putPlay(record: Play): Promise<void>;
  dropPlay(id: string): Promise<void>;
  branches(): SwipeBranch[];
  branch(playId: string, key: string): SwipeBranch | undefined;
  putBranch(record: SwipeBranch): Promise<void>;
  dropBranch(playId: string, key: string): Promise<void>;
  /** Drop every branch of one play (an edit rebases history; variants go stale). */
  dropBranchesOf(playId: string): Promise<void>;
  /** Total record count, used to verify a migration before it drops the source. */
  size(): number;
}
/** The legacy settings-document shape this migration reads from. */
interface LegacyLibrary {
  characters?: CharacterRecord[];
  lorebooks?: WorldBookRecord[];
  presets?: Preset[];
  plays?: Play[];
  branches?: SwipeBranch[];
}
//#endregion
//#region src/prefs.d.ts
/**
 * The preferences face {@link TavernStorage} needs.
 *
 * Declared structurally (rather than importing a service type) so the storage
 * facade does not care whether the values come from a file, a test double, or
 * some future DSH store.
 */
interface PrefsScope {
  /** Current values; never undefined (an unreadable file yields defaults). */
  get(): TavernDatabase;
  /** Merge a sparse patch; `undefined` values are ignored, as in a settings patch. */
  update(patch: Partial<TavernDatabase>): Promise<void>;
  /** Replace the whole document. */
  replace(next: TavernDatabase): Promise<void>;
}
//#endregion
//#region src/storage.d.ts
/**
 * The persisted database shape callers see from {@link TavernStorage.snapshot}
 * and read back at migration time. The library arrays are no longer stored in
 * one document; they are declared here because the snapshot is assembled into
 * this shape and a legacy import may still supply it.
 */
interface TavernDatabase {
  version: 1;
  characters: CharacterRecord[];
  lorebooks: WorldBookRecord[];
  presets: Preset[];
  plays: Play[];
  /** Alternative generations (swipe variants) keyed by play + fork point. */
  branches?: SwipeBranch[];
  defaultPresetId?: string;
  /** Tavern view style preference. */
  style?: TavernStyle;
}
/** Storage facade over the library file store plus the preferences section. */
declare class TavernStorage {
  private readonly library;
  private readonly prefs;
  constructor(library: LibraryStore, prefs: PrefsScope);
  /**
   * A database-shaped view for callers that still want one snapshot (the
   * `/tavern/state` response). Assembled per call from the index; nothing is
   * copied to disk.
   */
  snapshot(): TavernDatabase;
  listCharacters(): CharacterRecord[];
  getCharacter(id: string): CharacterRecord | undefined;
  upsertCharacter(record: CharacterRecord): Promise<void>;
  /** Persist the complete character array (used by avatar-file migration). */
  replaceCharacters(records: CharacterRecord[]): Promise<void>;
  /** Bulk-append imported character records. */
  appendCharacters(records: CharacterRecord[]): Promise<void>;
  deleteCharacter(id: string): Promise<void>;
  listLorebooks(): WorldBookRecord[];
  getLorebook(id: string): WorldBookRecord | undefined;
  upsertLorebook(record: WorldBookRecord): Promise<void>;
  /** Bulk-append imported lorebook records. */
  appendLorebooks(records: WorldBookRecord[]): Promise<void>;
  deleteLorebook(id: string): Promise<void>;
  listPresets(): Preset[];
  getPreset(id: string): Preset | undefined;
  upsertPreset(preset: Preset): Promise<void>;
  /** Bulk-append imported preset records. */
  appendPresets(records: Preset[]): Promise<void>;
  deletePreset(id: string): Promise<void>;
  listPlays(): Play[];
  getPlay(id: string): Play | undefined;
  upsertPlay(play: Play): Promise<void>;
  deletePlay(id: string): Promise<void>;
  /** Every swipe branch of one play. */
  listSwipeBranches(playId: string): SwipeBranch[];
  /** The branch of one fork point, when it exists. */
  getSwipeBranch(playId: string, key: string): SwipeBranch | undefined;
  upsertSwipeBranch(branch: SwipeBranch): Promise<void>;
  /** Remove exactly one branch (retry rollback after a failed session fork). */
  deleteSwipeBranch(playId: string, key: string): Promise<void>;
  /** Drop one play's branches (edits rebase history; old variants go stale). */
  deleteSwipeBranches(playId: string): Promise<void>;
  setDefaultPreset(id: string | undefined): Promise<void>;
  /** Persist the tavern view style preference. */
  setStyle(style: TavernStyle): Promise<void>;
}
//#endregion
//#region src/avatarstore.d.ts
/** Options for {@link AvatarStore.materializeCharacter}. */
interface MaterializeAvatarOptions {
  /**
   * Keep an unsupported, oversized, or undecodable inline avatar on the record
   * instead of dropping it.  Dropping is right for an incoming HTTP payload
   * (the settings document must stay bounded), but wrong for a startup
   * migration: the inline value may be the user's only copy and the migration
   * result is persisted immediately.
   */
  keepUnsupported?: boolean;
}
/**
 * File-backed avatar store.  Persisted paths are always relative to the DSH
 * home directory so the settings document stays host-independent.
 */
declare class AvatarStore {
  readonly root: string;
  /**
   * The plugin logger.  Public because the TauriTavern importer runs as plain
   * functions with no logger of their own and already receives this store.
   */
  readonly logger: Pick<LoggerService, 'warn' | 'error'>;
  /** Per-character write tail, so concurrent saves cannot interleave disk work. */
  private readonly tails;
  constructor(root: string,
  /**
   * The plugin logger.  Public because the TauriTavern importer runs as plain
   * functions with no logger of their own and already receives this store.
   */
  logger: Pick<LoggerService, 'warn' | 'error'>);
  private filePath;
  private ensureRoot;
  /** Run `task` after every previous task for the same character has settled. */
  private serialize;
  /**
   * Replace a character's data-URL avatar with an on-disk file and return the
   * record that should be persisted.  Records that already use a relative path
   * (or have no avatar) are returned unchanged.  A value this store could never
   * have produced is dropped rather than written back (unless the caller opts
   * into `keepUnsupported` for a migration): the HTTP body cap is the only
   * limit on what a client can put in `avatar`, and whatever lands in the
   * settings document is re-serialized on every later library mutation.
   *
   * Writes are serialized per character and go through {@link writeAtomic}, so
   * two saves of the same record (two tabs, double click, import-then-edit)
   * cannot overwrite each other half-way or delete each other's file.
   */
  materializeCharacter(record: CharacterRecord, previous?: CharacterRecord, options?: MaterializeAvatarOptions): Promise<CharacterRecord>;
  /**
   * Delete the file the record pointed at before the new one became durable.
   *
   * Only that exact file is removed.  The old code swept every known extension
   * for the id, which deleted the copy a concurrent save had just written —
   * two tabs saving the same character as png and jpg left both records
   * pointing at a 404.  An orphaned file from a changed extension is left
   * behind on purpose: a stray byte costs nothing, a missing avatar does not
   * come back.
   */
  private removePrevious;
  /**
   * Materialize every data-URL avatar in one batch (used by the importer).
   * Settled, not `all`: one unwritable avatar (EACCES/ENOSPC) used to reject the
   * whole call, which aborted the import before anything was persisted and left
   * the user with an empty result and no explanation.
   */
  materializeCharacters(records: CharacterRecord[]): Promise<CharacterRecord[]>;
  /**
   * Migrate legacy inline avatars out of the settings document.
   *
   * A migration is a data move, never a cleanup: if the value cannot be
   * decoded or written, the original record is returned untouched and the
   * inline avatar stays in the library.  The previous behaviour dropped an
   * oversized or non-whitelisted avatar and then persisted the loss, which
   * destroyed the only copy on the first startup after upgrading.
   * @returns the records to persist, how many gained a file, and how many kept
   * their inline value for a later run.
   */
  migrateLegacyCharacters(records: CharacterRecord[]): Promise<{
    characters: CharacterRecord[];
    changed: number;
    skipped: number;
  }>;
  /** Read a stored avatar for the HTTP route. */
  read(file: string): Promise<{
    bytes: Buffer;
    contentType: string;
  } | undefined>;
  /** Read the bytes backing a character record (legacy inline or on-disk). */
  readCharacter(record: CharacterRecord): Promise<Buffer | undefined>;
  /** Remove the on-disk avatar for a deleted character. */
  removeCharacter(record: CharacterRecord): Promise<void>;
}
//#endregion
//#region src/config.d.ts
/**
 * Plugin configuration for dsh-tavern.
 *
 * These values were previously module constants and one environment variable,
 * scattered across `play.ts`, `lorebook.ts` and `api.ts`. Cordis reads a
 * plugin's `Config` (a Standard Schema) and validates the loader row's
 * `config:` block against it before the plugin starts
 * (`cordis/src/fiber.ts:50-62`), so this is the framework's own place for
 * them — one declaration, one set of defaults, tunable from the config tree
 * without editing source.
 *
 * The schema is hand-rolled rather than built with schemastery: an
 * out-of-tree plugin cannot resolve `@deepseek-ai/*` at runtime (the
 * installed profile has no top-level `@deepseek-ai`), and `@standard-schema/spec`
 * is likewise not a direct dependency, so the Standard Schema shape is
 * satisfied structurally. Cordis only ever touches `['~standard'].validate`.
 */
/** Tunables for one tavern plugin instance. */
interface TavernConfig {
  /**
   * Extra `Host` header values accepted for mutating HTTP requests, on top of
   * loopback addresses and `localhost`. Needed only when the DSH web UI is
   * reached through a real hostname; see the DNS-rebinding note in api.ts.
   */
  allowedHosts: string[];
  /**
   * Stored retry attempts per fork point. Every variant is a full session
   * event tail on disk, so this bounds what holding down 重试 can grow to.
   */
  maxSwipeVariants: number;
  /** Ceiling on rendered world-info characters per assembly. */
  worldInfoBudgetChars: number;
  /** How many recent chat lines the world-book scanner reads. */
  scanMessages: number;
  /** How long one `tavern_speak` call waits for its character agent. */
  speakTimeoutMs: number;
}
/**
 * The Standard Schema cordis validates the loader row against.
 *
 * Shape only — `@standard-schema/spec` is not a dependency, and cordis reads
 * nothing but `['~standard'].validate` (`cordis/src/fiber.ts:53`).
 */
declare const Config: {
  '~standard': {
    version: 1;
    vendor: string;
    validate: (value: unknown) => {
      value: TavernConfig;
    } | {
      issues: {
        message: string;
      }[];
    };
  };
};
//#endregion
//#region src/play.d.ts
interface PlayRuntimeDeps {
  storage: TavernStorage;
  agents: AgentRegistry;
  /** Agent-preset roster: mounts the tavern preset for play sessions. */
  agentPresets: AgentPresetRegistry;
  /**
   * Workspace registry probe. Archiving a play session out of the 对话 page is
   * best-effort, so this is an OPTIONAL dependency resolved per call
   * (`ctx.get`) rather than injected — requiring it would stop the whole
   * tavern from loading in a profile that omits it.
   */
  workspace: () => WorkspaceRegistry | undefined;
  /** Session persistence: resolves the preset a persisted session was produced under. */
  sessionPersistence: SessionPersistence;
  /** Author the tavern preset into the harness-home user root (memoized, non-clobbering). */
  ensurePreset: () => Promise<unknown>;
  /** Default model selection for agents without a preset override. */
  defaultModel: () => {
    provider: string;
    model: string;
    reasoningEffort?: string;
  };
  logger: LoggerService;
  /** Tunables from the plugin config (swipe cap, scan window, timeouts). */
  config: TavernConfig;
}
/**
 * The tavern session runtime: owns the director and character agents of
 * every play, keyed by play id, and exposes the `tavern_speak` execution.
 */
declare class TavernSessionRuntime {
  /** playId → director handle. */
  private readonly directors;
  /** playId → (characterId → handle). */
  private readonly roles;
  /** agentId → tail promise serializing tavern_speak calls per character agent. */
  private readonly speakQueues;
  /** playId → in-flight director assembly; concurrent activations share one attempt. */
  private readonly directorInflight;
  /** `${playId}:${characterId}` → in-flight role assembly (same race as the director). */
  private readonly roleInflight;
  /**
   * Declared explicitly rather than as a constructor parameter property: this
   * module is imported directly by `scripts/verify/*.mjs`, which run under
   * Node's strip-only TypeScript support (parameter properties are the one
   * syntax it rejects). `library.ts` states the same convention.
   */
  private readonly deps;
  constructor(deps: PlayRuntimeDeps);
  /**
   * Dispose every live agent, awaiting each one.
   *
   * Called from the plugin's teardown effect. It used to fire-and-forget
   * (`void handle.dispose().catch(...)`), so plugin unload returned before a
   * single agent had actually released its session — a reload could then race
   * the old agents against the new ones over the same session ids.
   */
  dispose(): Promise<void>;
  /** Run one tavern_speak task after any previous task for the same agent settles. */
  private enqueueSpeak;
  /** Live director agent for a play, or undefined. */
  getDirector(playId: string): Agent | undefined;
  /**
   * Assemble (create or resume) the director agent for a play. Idempotent per
   * process: the director's session id is the play-bound DSH session. When
   * the persisted session exists (a previous run), it is resumed so history
   * survives restarts; otherwise a fresh session is created. Every play
   * session runs under the tavern agent preset and is archived so the
   * workspace browser (「对话」页) never lists it — the play lives inside the
   * tavern page only.
   */
  ensureDirector(play: Play, seedOverride?: readonly SessionEvent[]): Promise<AgentHandle>;
  /** The single assembly attempt behind {@link ensureDirector}. */
  private createDirector;
  /**
   * The preset a persisted session actually runs, newest selection winning
   * (mirrors `resolveSessionPreset` from dsh-agent-presets; inlined to keep
   * the host half free of @deepseek-ai runtime imports).
   * @param header - the persisted session's creation header.
   * @param events - the persisted session's event log, oldest first.
   * @returns the recorded preset id, or undefined for a session composed bare.
   */
  private recordedPreset;
  /**
   * Whether a session is already stored, and which preset it was produced under.
   *
   * This is deliberately NOT `preset | undefined` (see
   * {@link PersistedSessionState}): "no session yet" and "a session that
   * records no preset" are different states, and the caller answers the first
   * with `agents.create(...)`.
   * @param sessionId - the session to probe.
   * @returns existence plus the recorded preset id.
   */
  private persistedSession;
  /**
   * Compose one play session's scoped world: mount the session's agent
   * preset (when it has one), then register the play's own system prompt
   * into the persona slot, the world-book dynamic context, and — for a
   * multi-agent director — the `tavern_speak` tool.
   * @param presetId - preset to mount, or undefined to compose bare (legacy).
   * @param system - the director/character system prompt text.
   * @param loreContext - the world-book dynamic context, or null.
   * @param speakTool - agent-scoped tool to register, or undefined.
   */
  private sessionSetup;
  /**
   * Archive one play session: tavern sessions are hidden from every workspace
   * grouping surface (the 对话 page) and live inside the tavern page only.
   * Idempotent; failures only log because a play must stay usable.
   * @param sessionId - the session to hide.
   */
  private hideFromWorkspace;
  /** Compose the director's system prompt. */
  private buildDirectorSystem;
  /** Dynamic world-book context for one play's assembly. */
  private buildLoreContext;
  /** Resolve the world-book records bound to one play, in play order. */
  private playLorebooks;
  /** Recent user/assistant text of a session, newest last (world-book scan). */
  private recentSessionText;
  /**
   * The `tavern_speak` tool definition, registered per multi-agent director
   * from {@link sessionSetup}. It is deliberately NOT registered on the plugin
   * context: a global registration puts it in every DSH session's toolset,
   * including sessions that have no play behind them.
   */
  speakToolDefinition(): ToolDefinition;
  /**
   * Execute one tavern_speak call: route to the named character agent (in
   * multi-agent mode), or fall back to the director's own voice.
   * @param exec - tool execution context (its agent is the director).
   * @param args - characterName/characterId plus the instruction.
   * @returns the character's lines.
   */
  speakFor(exec: ToolRunContext, args: {
    characterName?: string;
    characterId?: string;
    instruction?: string;
  }): Promise<{
    reply: string;
  }>;
  /** Create (or reuse) the character agent for one play (multi-agent mode). */
  private ensureRoleAgent;
  /** The single assembly attempt behind {@link ensureRoleAgent}. */
  private createRoleAgent;
  /** Drop the live agents of one play (play deleted). */
  dropPlay(playId: string): Promise<void>;
  /**
   * The play session's current event log, live when a director is running.
   * @param play - the play whose log is read.
   * @returns the events in seq order.
   * @throws while a generation is still running (the log is mid-turn).
   */
  private liveEvents;
  /**
   * Move one play onto a fresh DSH session seeded with the given history
   * (session logs are append-only, so edits and retries fork instead). The
   * new session resumes under the tavern preset on later restarts like any
   * other play session.
   * @param play - the play to rebase.
   * @param seed - a balanced completed-turn event prefix.
   * @returns the updated play carrying the new session id.
   */
  private rebasePlaySession;
  /**
   * Plan a retry of the last assistant turn: the balanced prefix before the
   * question turn, the question text to replay, and the current tail.
   * @param events - the play session's current events.
   * @returns the reroll plan.
   */
  private planReroll;
  /**
   * Regenerate the last assistant reply as a NEW swipe variant: the current
   * turn tail is stored as one variant, the play is rebased to the shared
   * prefix, and a fresh generation is kicked off in the background.
   * @param playId - the play to reroll.
   * @returns the rebased play and the updated swipe branch (busy).
   */
  reroll(playId: string): Promise<{
    play: Play;
    branch: SwipeBranch;
  }>;
  /**
   * Drive one swipe generation in the background and record its tail (or
   * failure) into the branch once the director settles.
   * @param play - the rebased play.
   * @param branch - the branch whose `current` slot receives the result.
   */
  private kickSwipeGeneration;
  /**
   * Record one settled swipe attempt into its branch slot.
   * @param playId - owning play.
   * @param key - branch key.
   * @param index - variant slot to fill.
   * @param readTail - reader of the settling generation's own session events
   *   (captured at kick time; immune to later director replacement).
   * @param error - generation failure, when the drive rejected.
   */
  private settleSwipe;
  /**
   * Materialize another stored swipe variant as the play's live session.
   * @param playId - the play.
   * @param key - branch key (from the state snapshot's swipe summary).
   * @param step - relative movement (+1 next, -1 previous, wraps around).
   * @returns the rebased play and the updated branch.
   */
  swipe(playId: string, key: string, step: number): Promise<{
    play: Play;
    branch: SwipeBranch;
  }>;
  /**
   * Edit one assistant reply in place: the play's session forks to a copy
   * whose target message text is replaced. Stale swipe branches are dropped.
   * @param playId - the play.
   * @param messageId - the durable assistant message id.
   * @param text - the new reply text.
   * @returns the rebased play.
   */
  editAssistant(playId: string, messageId: string, text: string): Promise<Play>;
  /**
   * Edit one user message: the session is rebased to just before that
   * message's turn and the edited text is replayed, regenerating the answer.
   * @param playId - the play.
   * @param messageId - the user message id.
   * @param text - the edited message text.
   * @returns the rebased play (generation continues in the background).
   */
  editUserAndRetry(playId: string, messageId: string, text: string): Promise<Play>;
}
//#endregion
//#region src/index.d.ts
declare module '@deepseek-ai/cordis' {
  interface Context {
    /** The tavern service: library CRUD plus play/session assembly. */
    tavern: TavernService;
  }
}
declare const name = "dsh-tavern";
/**
 * Services required by the host half.
 *
 * `workspaceRegistry` is deliberately absent: its only use is archiving a play
 * session out of the 对话 page, which is already best-effort, so requiring it
 * would keep the whole tavern from loading in a profile that omits it. It is
 * probed with `ctx.get()` at the call site instead.
 *
 * NOTE: this fork has no optional-inject syntax. `Inject.resolve`
 * (`cordis/src/registry.ts:71-88`) turns EVERY key of the object form into a
 * required dependency — the object's values are per-service intercept config,
 * not a required/optional split. Writing `{ required: [...], optional: [...] }`
 * would request two services literally named "required" and "optional", and
 * the plugin would sit in PENDING forever without ever reporting an error.
 */
declare const inject: string[];
/**
 * Validate one decoded legacy library document.
 *
 * Permissive on purpose: the arrays and the two preferences are what the
 * migration knows how to move, and an unknown field must not abort it.
 * @param input - the decoded `tavern` section of an old settings document.
 * @returns the library part, or undefined when the value is not a document.
 */
declare function legacyLibraryOf(input: unknown): LegacyLibrary | undefined;
/**
 * The tavern service: library CRUD and the session runtime. The browser talks
 * to the REST route; other host plugins may use this service directly by
 * injecting `tavern`, which resolves only once {@link TavernService.load} has
 * finished (see the module note on the readiness gate).
 */
declare class TavernService {
  readonly storage: TavernStorage;
  readonly runtime: TavernSessionRuntime;
  readonly avatars: AvatarStore;
  readonly config: TavernConfig;
  private readonly ctx;
  private readonly library;
  private readonly prefs;
  private presetAttempt;
  constructor(ctx: Context, config: TavernConfig);
  /**
   * Async bootstrap: load the preferences and library index, recover a
   * pre-0.2 settings-backed library onto disk if one can still be found,
   * extract legacy inline avatars, author the agent preset.
   *
   * Awaited by `apply` before the fiber activates, so completing this is
   * exactly "the tavern is ready to serve". A throw here leaves the fiber
   * FAILED and `ctx.tavern` unresolvable — cordis logs the reason at ERROR,
   * which is the level that actually reaches an exporter.
   */
  load(): Promise<void>;
  /** One preset-registration attempt per process; a rejection allows a retry. */
  private ensurePreset;
  /** All stored characters. */
  listCharacters(): CharacterRecord[];
  /** All stored world books. */
  listLorebooks(): WorldBookRecord[];
  /** All stored presets. */
  listPresets(): Preset[];
  /** All stored plays. */
  listPlays(): Play[];
  /**
   * Import TauriTavern user data from a local installation/data directory
   * (portable app root, data root, default-user, or a child directory).
   */
  importTauriTavern(input: string, selection?: Partial<TauriTavernImportSelection>): Promise<TauriTavernImportReport>;
  /**
   * One-time (idempotent) migration: extract legacy inline data-URL avatars to
   * `<dsh-home>/tavern/avatars/` and persist only their relative paths.
   */
  migrateLegacyAvatars(): Promise<{
    changed: number;
  }>;
  /**
   * Recover the library a pre-0.2 install kept in the settings document.
   *
   * Two sources, in order:
   *
   * 1. `<dsh home>/tavern/legacy-library.json` — a plain JSON copy in the
   *    database shape, for anyone who exported one before upgrading.
   * 2. The settings document itself, as `SettingsForms.importLegacyDocument`
   *    leaves it: `settings.yaml.imported` (renamed before the first write,
   *    so a partial import never repeats) or `settings.yaml` (a harness that
   *    has not imported yet). Its `tavern:` section is the library.
   *
   * Reading YAML needs a parser this package does not ship, so it is a
   * dynamic optional import: when `yaml` cannot be resolved the tavern still
   * starts, logs one actionable line, and the user can re-import their cards
   * through the TauriTavern importer instead.
   *
   * Never throws: a recovery failure must not keep the tavern from loading.
   * @returns the legacy library section, or undefined when there is none.
   */
  private readLegacySettingsDocument;
  /**
   * Whether the agent-loop factory is currently available.
   *
   * `AgentRegistry.factory` is private with no public probe, so the signal is
   * the `agentLoop` service the stock agent-loop plugin provides — it registers
   * itself as the factory from that service's own effect. An earlier version
   * also poked the private field through a cast; that has been removed rather
   * than depend on a compiled-output detail.
   */
  multiAgentAvailable(): boolean;
}
/**
 * Plugin entry.
 *
 * `async` on purpose — that is what makes cordis await the bootstrap before
 * activating the fiber, which is what gates `ctx.tavern` (see the module note).
 * It also means the function has no `.prototype`, so cordis calls it plainly
 * rather than with `new`, the way it invokes ordinary `function apply`
 * declarations (`cordis/src/utils.ts:isConstructor`, `fiber.ts:251`).
 *
 * Kept as a named export with NO default export: the loader's `unwrapExports`
 * collapses a module to its default when one exists, discarding `name`,
 * `inject`, and `Config` with it.
 *
 * @param ctx - the plugin's context.
 * @param config - the loader row's `config:`, already validated by {@link Config}.
 */
declare function apply(ctx: Context, config?: TavernConfig): Promise<void>;
//#endregion
export { Config, TavernService, apply, inject, legacyLibraryOf, name };