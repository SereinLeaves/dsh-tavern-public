window.__ModuleLoader__.load({
	id: "dsh-tavern",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/store.ts
		/**
		* Tavern UI store: cross-remount viewing state for the tavern view entry.
		* Business data (characters, lorebooks, presets, plays) lives on the host and
		* is fetched per mount; only navigation and selection survive here.
		*/
		/**
		* Declares the tavern viewing state and write surface.
		* The returned definition is handed to the slot registration, which mints one
		* instance per rendered Session scope (the standard store seat).
		* @returns the store definition.
		*/
		function createTavernStore() {
			return (0, _deepseek_ai_dsh_client_store.defineStore)({
				init: () => ({
					panel: "chat",
					playId: null,
					selectedCharacterId: null,
					selectedLorebookId: null,
					selectedPresetId: null,
					draft: {
						characterIds: [],
						lorebookIds: [],
						narratorEnabled: false
					},
					generating: false,
					error: null,
					replyMode: "first"
				}),
				actions: {
					setPanel: (d, panel) => {
						d.panel = panel;
					},
					setPlayId: (d, playId) => {
						d.playId = playId;
					},
					selectCharacter: (d, id) => {
						d.selectedCharacterId = id;
					},
					selectLorebook: (d, id) => {
						d.selectedLorebookId = id;
					},
					selectPreset: (d, id) => {
						d.selectedPresetId = id;
					},
					setDraft: (d, draft) => {
						d.draft = draft;
					},
					toggleDraftCharacter: (d, id) => {
						const has = d.draft.characterIds.includes(id);
						d.draft = {
							...d.draft,
							characterIds: has ? d.draft.characterIds.filter((cid) => cid !== id) : [...d.draft.characterIds, id]
						};
					},
					setDraftLorebooks: (d, lorebookIds) => {
						d.draft = {
							...d.draft,
							lorebookIds
						};
					},
					setDraftPreset: (d, presetId) => {
						d.draft = {
							...d.draft,
							presetId
						};
					},
					setDraftNarrator: (d, enabled) => {
						d.draft = {
							...d.draft,
							narratorEnabled: enabled
						};
					},
					setGenerating: (d, generating) => {
						d.generating = generating;
					},
					setError: (d, error) => {
						d.error = error;
					},
					setReplyMode: (d, mode) => {
						d.replyMode = mode;
					}
				}
			});
		}
		//#endregion
		//#region src/client/api.ts
		async function request(path, init) {
			const response = await fetch(path, {
				...init,
				headers: {
					...init?.body !== void 0 && typeof init.body === "string" ? { "content-type": "application/json" } : {},
					...init?.headers
				}
			});
			if (!response.ok) {
				let message = `请求失败：${response.status}`;
				try {
					const body = await response.json();
					if (body.error) message = body.error;
				} catch {}
				throw new Error(message);
			}
			if (response.status === 204) return void 0;
			const text = await response.text();
			if (text === "") return void 0;
			return JSON.parse(text);
		}
		function api() {
			return {
				state: () => request("/tavern/state"),
				createCharacter: (input) => request("/tavern/characters", {
					method: "POST",
					body: JSON.stringify(input)
				}),
				updateCharacter: (id, data, avatar) => request(`/tavern/characters/${encodeURIComponent(id)}`, {
					method: "PUT",
					body: JSON.stringify({
						data,
						avatar
					})
				}),
				deleteCharacter: async (id) => {
					await request(`/tavern/characters/${encodeURIComponent(id)}`, { method: "DELETE" });
				},
				exportCharacterUrl: (id) => `/tavern/characters/${encodeURIComponent(id)}/export`,
				createLorebook: (input) => request("/tavern/lorebooks", {
					method: "POST",
					body: JSON.stringify(input)
				}),
				updateLorebook: (id, book, name) => request(`/tavern/lorebooks/${encodeURIComponent(id)}`, {
					method: "PUT",
					body: JSON.stringify({
						book,
						name
					})
				}),
				deleteLorebook: async (id) => {
					await request(`/tavern/lorebooks/${encodeURIComponent(id)}`, { method: "DELETE" });
				},
				exportLorebookUrl: (id) => `/tavern/lorebooks/${encodeURIComponent(id)}/export`,
				createPreset: (input) => request("/tavern/presets", {
					method: "POST",
					body: JSON.stringify(input)
				}),
				updatePreset: (id, patch) => request(`/tavern/presets/${encodeURIComponent(id)}`, {
					method: "PUT",
					body: JSON.stringify(patch)
				}),
				deletePreset: async (id) => {
					await request(`/tavern/presets/${encodeURIComponent(id)}`, { method: "DELETE" });
				},
				exportPresetUrl: (id) => `/tavern/presets/${encodeURIComponent(id)}/export`,
				importTauriTavern: (input) => request("/tavern/import/tauritavern", {
					method: "POST",
					body: JSON.stringify(input)
				}),
				createPlay: (input) => request("/tavern/plays", {
					method: "POST",
					body: JSON.stringify(input)
				}),
				getPlay: (id) => request(`/tavern/plays/${encodeURIComponent(id)}`),
                compactPlay: id => request(`/tavern/plays/${encodeURIComponent(id)}/compact`, { method: "POST", body: "{}" }),
				activatePlay: (id) => request(`/tavern/plays/${encodeURIComponent(id)}/activate`, {
					method: "POST",
					body: "{}"
				}),
				enterCharacter: (id, characterId, expectedUpdatedAt) => request(`/tavern/plays/${encodeURIComponent(id)}/enter`, {
					method: "POST",
					body: JSON.stringify({ characterId, expectedUpdatedAt })
				}),
				updateCharacterMemory: (id, characterId, patch) => request(`/tavern/plays/${encodeURIComponent(id)}/memories/${encodeURIComponent(characterId)}`, {
					method: "PUT",
					body: JSON.stringify(patch)
				}),
				updatePlay: (id, patch) => request(`/tavern/plays/${encodeURIComponent(id)}`, {
					method: "PUT",
					body: JSON.stringify(patch)
				}),
				deletePlay: async (id) => {
					await request(`/tavern/plays/${encodeURIComponent(id)}`, { method: "DELETE" });
				},
				retryReply: (playId) => request(`/tavern/plays/${encodeURIComponent(playId)}/messages/retry`, {
					method: "POST",
					body: "{}"
				}),
				swipeReply: (playId, key, step) => request(`/tavern/plays/${encodeURIComponent(playId)}/messages/swipe`, {
					method: "POST",
					body: JSON.stringify({
						key,
						step
					})
				}),
				editAssistantMessage: (playId, messageId, text) => request(`/tavern/plays/${encodeURIComponent(playId)}/messages/${encodeURIComponent(messageId)}`, {
					method: "PUT",
					body: JSON.stringify({ text })
				}),
				editUserMessageAndRetry: (playId, messageId, text) => request(`/tavern/plays/${encodeURIComponent(playId)}/messages/${encodeURIComponent(messageId)}/retry`, {
					method: "POST",
					body: JSON.stringify({ text })
				}),
				setDefaultPreset: async (defaultPresetId) => {
					await request("/tavern/settings", {
						method: "PUT",
						body: JSON.stringify({ defaultPresetId: defaultPresetId ?? null })
					});
				},
				setStyle: async (style) => {
					await request("/tavern/settings", {
						method: "PUT",
						body: JSON.stringify({ style })
					});
				}
			};
		}
		/** Shared singleton handle for the API (stateless). */
		const tavernApi = api();
		/** Read a file as base64 data URL. */
		function fileToDataUrl(file) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(String(reader.result));
				reader.onerror = () => reject(reader.error ?? /* @__PURE__ */ new Error("读取文件失败"));
				reader.readAsDataURL(file);
			});
		}
		/** Read a text file. */
		function fileToText(file) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(String(reader.result));
				reader.onerror = () => reject(reader.error ?? /* @__PURE__ */ new Error("读取文件失败"));
				reader.readAsText(file);
			});
		}
		//#endregion
		//#region src/client/avatar.ts
		/** Resolve a stored avatar value to an `<img src>` URL. */
		function avatarSrc(avatar) {
			if (avatar === void 0 || avatar === "") return void 0;
			if (/^(?:data:|blob:|https?:)/i.test(avatar) || avatar.startsWith("/")) return avatar;
			const file = avatar.replace(/\\/g, "/").split("/").pop();
			return file === void 0 || file === "" ? avatar : `/tavern/avatars/${encodeURIComponent(file)}`;
		}
		//#endregion
		//#region \0dsh-css:src/client/TavernView.module.css.mjs
		const css = ".dy0ESq_view{--tv-bg:var(--dsw-alias-bg-base);--tv-nav-bg:var(--dsw-alias-bg-module-platform);--tv-surface-card:var(--dsw-alias-bg-layer-2);--tv-surface-input:var(--dsw-specific-input-major);--tv-sidebar-fill:var(--dsw-specific-sidebar-fill);--tv-bubble-user:var(--dsw-specific-bubble);--tv-border:var(--dsw-alias-border-l2);--tv-border-strong:var(--dsw-alias-border-l3);--tv-text:var(--dsw-alias-label-primary);--tv-text-secondary:var(--dsw-alias-label-secondary);--tv-text-tertiary:var(--dsw-alias-label-tertiary);--tv-text-caption:var(--dsw-alias-label-caption);--tv-hover:var(--dsw-alias-interactive-bg-hover);--tv-active:var(--dsw-alias-interactive-bg-active);--tv-btn-bg:var(--dsw-alias-button-elevated-fill);--tv-btn-bg-hover:var(--dsw-alias-interactive-bg-hover-solid);--tv-primary-fill:var(--dsw-alias-button-primary-fill);--tv-primary-fill-hover:var(--dsw-alias-button-primary-hover);--tv-primary-text:var(--dsw-alias-label-primary-foreground);--tv-danger-fill:color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent);--tv-danger-fill-hover:color-mix(in srgb, var(--dsw-alias-state-error-primary) 18%, transparent);--tv-danger-border:color-mix(in srgb, var(--dsw-alias-state-error-primary) 40%, transparent);--tv-error:var(--dsw-alias-state-error-primary);--tv-focus:var(--dsw-alias-state-business-primary);--tv-user-name:var(--dsw-alias-state-business-primary);--tv-accent:var(--dsw-static-amber-500);--tv-accent-text:var(--dsw-static-amber-600);--tv-accent-soft:color-mix(in srgb, var(--tv-accent) 12%, transparent);--tv-accent-border:color-mix(in srgb, var(--tv-accent) 32%, transparent);--tv-accent-border-strong:color-mix(in srgb, var(--tv-accent) 55%, transparent);background:radial-gradient(1200px 600px at 80% -10%, var(--tv-accent-soft), transparent 60%), var(--tv-bg);height:100%;min-height:0;color:var(--tv-text);font:var(--dsw-font-s-14);flex-direction:column;display:flex}[data-conversation-scroll] .dy0ESq_view{height:100%;overflow:hidden}.dy0ESq_nav{border-bottom:1px solid var(--tv-border);background:var(--tv-nav-bg);flex-shrink:0;align-items:center;gap:4px;padding:8px 12px;display:flex}.dy0ESq_navTitle{font:var(--dsw-font-m-18);letter-spacing:2px;color:var(--tv-accent-text);white-space:nowrap;margin-right:12px;font-weight:700}.dy0ESq_navTab{color:var(--tv-text-secondary);cursor:pointer;font:var(--dsw-font-xs-13);transition:background var(--ds-transition-duration) var(--ds-ease-in-out), color var(--ds-transition-duration) var(--ds-ease-in-out);background:0 0;border:none;border-radius:6px;padding:6px 14px}.dy0ESq_navTab:hover{background:var(--tv-hover);color:var(--tv-text)}.dy0ESq_navTabActive{background:var(--tv-accent-soft);color:var(--tv-accent-text);font-weight:600}.dy0ESq_navSpacer{flex:1}.dy0ESq_navError{color:var(--tv-error);font:var(--dsw-font-xxs-12);text-overflow:ellipsis;white-space:nowrap;max-width:40%;overflow:hidden}.dy0ESq_stylePicker{font:var(--dsw-font-xxs-12);color:var(--tv-text-tertiary);white-space:nowrap;align-items:center;gap:6px;margin-right:8px;display:inline-flex}.dy0ESq_styleSelect{background:var(--tv-surface-input);border:1px solid var(--tv-border);color:var(--tv-text-secondary);font:var(--dsw-font-xxs-12);cursor:pointer;transition:border-color var(--ds-transition-duration) var(--ds-ease-in-out), box-shadow var(--ds-transition-duration) var(--ds-ease-in-out);border-radius:6px;outline:none;padding:3px 8px;font-family:inherit}.dy0ESq_styleSelect:focus{border-color:var(--tv-focus);box-shadow:0 0 0 2px color-mix(in srgb, var(--tv-focus) 18%, transparent)}.dy0ESq_body{flex:1;min-height:0;display:flex}.dy0ESq_sidebar{border-right:1px solid var(--tv-border);background:var(--tv-sidebar-fill);flex-direction:column;flex-shrink:0;width:260px;min-height:0;display:flex}.dy0ESq_sidebarHead{border-bottom:1px solid var(--tv-border);flex-shrink:0;align-items:center;gap:8px;padding:10px 12px;display:flex}.dy0ESq_sidebarTitle{font:var(--dsw-font-xs-strong-13);color:var(--tv-accent-text);flex:1}.dy0ESq_list{flex-direction:column;flex:1;gap:4px;min-height:0;padding:6px;display:flex;overflow-y:auto}.dy0ESq_listItem{cursor:pointer;color:var(--tv-text);text-align:left;font:var(--dsw-font-xs-13);width:100%;transition:background var(--ds-transition-duration) var(--ds-ease-in-out);background:0 0;border:none;border-radius:6px;align-items:center;gap:8px;padding:7px 9px;display:flex}.dy0ESq_listItem:hover{background:var(--tv-hover)}.dy0ESq_listItemActive{background:var(--tv-accent-soft)}.dy0ESq_listItemAvatar{object-fit:cover;background:var(--tv-accent-soft);border-radius:50%;flex-shrink:0;width:30px;height:30px}.dy0ESq_listItemName{text-overflow:ellipsis;white-space:nowrap;flex:1;overflow:hidden}.dy0ESq_listItemMeta{font:var(--dsw-font-xxxs-11);color:var(--tv-text-caption)}.dy0ESq_empty{text-align:center;color:var(--tv-text-tertiary);font:var(--dsw-font-xs-13);padding:24px 12px}.dy0ESq_content{flex-direction:column;flex:1;gap:12px;min-width:0;min-height:0;padding:14px;display:flex;overflow-y:auto}.dy0ESq_grid{grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;display:grid}.dy0ESq_card{border:1px solid var(--tv-border);background:var(--tv-surface-card);cursor:pointer;transition:border-color var(--ds-transition-duration) var(--ds-ease-in-out), transform var(--ds-transition-duration) var(--ds-ease-in-out), box-shadow var(--ds-transition-duration) var(--ds-ease-in-out);text-align:center;border-radius:8px;flex-direction:column;align-items:center;gap:6px;padding:10px;display:flex}.dy0ESq_card:hover{border-color:var(--tv-accent-border-strong);box-shadow:var(--dsw-shadow-lv1);transform:translateY(-1px)}.dy0ESq_cardAvatar{object-fit:cover;background:var(--tv-accent-soft);border-radius:50%;width:64px;height:64px}.dy0ESq_cardName{font:var(--dsw-font-xs-strong-13)}.dy0ESq_cardTags{font:var(--dsw-font-xxxs-11);color:var(--tv-text-tertiary);text-overflow:ellipsis;white-space:nowrap;max-width:100%;overflow:hidden}.dy0ESq_chat{flex-direction:column;flex:1;height:100%;min-height:0;display:flex}.dy0ESq_chatHead{border-bottom:1px solid var(--tv-border);flex-shrink:0;align-items:center;gap:10px;padding:8px 12px;display:flex}.dy0ESq_chatTitle{font:var(--dsw-font-m-18);font-weight:700}.dy0ESq_chatMeta{font:var(--dsw-font-xxs-12);color:var(--tv-text-caption)}.dy0ESq_messages{flex-direction:column;flex:1;gap:12px;min-height:0;padding:14px 16px;display:flex;overflow-y:auto}.dy0ESq_msg{flex-direction:column;gap:3px;max-width:85%;display:flex}.dy0ESq_msgUser{align-self:flex-end;align-items:flex-end}.dy0ESq_msgName{font:var(--dsw-font-xxs-strong-12);color:var(--tv-accent-text)}.dy0ESq_msgUser .dy0ESq_msgName{color:var(--tv-user-name)}.dy0ESq_msgBubble{background:var(--tv-surface-card);border:1px solid var(--tv-border);white-space:pre-wrap;word-break:break-word;font:var(--dsw-font-base-16);border-radius:22px;padding:10px 16px}.dy0ESq_msgRich{line-height:1.65}.dy0ESq_msgRich p{margin:0 0 .6em}.dy0ESq_msgRich p:last-child{margin-bottom:0}.dy0ESq_msgRich img{border-radius:8px;max-width:100%;height:auto;margin:4px 0;display:block}.dy0ESq_msgRich a{color:var(--tv-accent-text);text-decoration:underline}.dy0ESq_msgRich pre{background:var(--tv-surface-input);border:1px solid var(--tv-border);white-space:pre-wrap;border-radius:8px;padding:8px 10px;overflow-x:auto}.dy0ESq_msgRich code{font-family:var(--dsw-font-family-monospace,monospace);font-size:.92em}.dy0ESq_msgRich blockquote{border-left:3px solid var(--tv-accent-border-strong);color:var(--tv-text-secondary);margin:4px 0;padding:2px 10px}.dy0ESq_msgRich ul,.dy0ESq_msgRich ol{margin:4px 0;padding-left:22px}.dy0ESq_msgRich table{border-collapse:collapse;font:var(--dsw-font-xs-13);margin:6px 0}.dy0ESq_msgRich th,.dy0ESq_msgRich td{border:1px solid var(--tv-border);padding:4px 8px}.dy0ESq_msgRich hr{border:none;border-top:1px solid var(--tv-border);margin:10px 0}.dy0ESq_msgUser .dy0ESq_msgBubble{background:var(--tv-bubble-user);border:none}.dy0ESq_msgNarrator .dy0ESq_msgBubble{font:var(--dsw-font-s-14);color:var(--tv-text-secondary);background:0 0;border:none;padding:2px 4px;font-style:italic}.dy0ESq_msgNarrator .dy0ESq_msgName{color:var(--tv-text-tertiary)}.dy0ESq_msgSystem .dy0ESq_msgBubble{color:var(--tv-text-caption);font:var(--dsw-font-xxs-12);background:0 0;border:none;padding:2px 4px}.dy0ESq_msgTime{font:var(--dsw-font-xxxs-11);color:var(--tv-text-caption)}.dy0ESq_composer{border-top:1px solid var(--tv-border);background:var(--tv-nav-bg);flex-direction:column;flex-shrink:0;gap:8px;padding:10px 12px;display:flex}.dy0ESq_composerRow{align-items:center;gap:8px;display:flex}.dy0ESq_composerInput{resize:none;background:var(--tv-surface-input);border:1px solid var(--dsw-alias-border-l2-darkmode-thin);min-height:40px;max-height:120px;color:var(--tv-text);font:var(--dsw-font-s-14);transition:border-color var(--ds-transition-duration) var(--ds-ease-in-out), box-shadow var(--ds-transition-duration) var(--ds-ease-in-out);border-radius:10px;outline:none;flex:1;padding:9px 12px;font-family:inherit}.dy0ESq_composerInput:focus{border-color:var(--tv-focus);box-shadow:0 0 0 2px color-mix(in srgb, var(--tv-focus) 18%, transparent)}.dy0ESq_composerInput:disabled{opacity:.5}.dy0ESq_sendBtn{background:var(--tv-primary-fill);color:var(--tv-primary-text);cursor:pointer;height:40px;font-weight:600;font:var(--dsw-font-s-strong-14);transition:background var(--ds-transition-duration) var(--ds-ease-in-out);border:none;border-radius:10px;flex-shrink:0;padding:0 18px}.dy0ESq_sendBtn:hover:not(:disabled){background:var(--tv-primary-fill-hover)}.dy0ESq_sendBtn:disabled{opacity:.45;cursor:default}.dy0ESq_modeRow{font:var(--dsw-font-xxs-12);color:var(--tv-text-tertiary);align-items:center;gap:10px;display:flex}.dy0ESq_modeLabel{cursor:pointer;align-items:center;gap:4px;display:flex}.dy0ESq_btn{border:1px solid var(--tv-border);background:var(--tv-btn-bg);color:var(--tv-text-secondary);cursor:pointer;font:var(--dsw-font-xs-13);transition:background var(--ds-transition-duration) var(--ds-ease-in-out), color var(--ds-transition-duration) var(--ds-ease-in-out);white-space:nowrap;border-radius:6px;padding:5px 11px}.dy0ESq_btn:hover:not(:disabled){background:var(--tv-btn-bg-hover);color:var(--tv-text)}.dy0ESq_btn:disabled{opacity:.4;cursor:default}.dy0ESq_btnDanger{border-color:var(--tv-danger-border);background:var(--tv-danger-fill);color:var(--tv-error)}.dy0ESq_btnDanger:hover:not(:disabled){background:var(--tv-danger-fill-hover)}.dy0ESq_btnPrimary{background:var(--tv-primary-fill);color:var(--tv-primary-text);border-color:#0000;font-weight:600}.dy0ESq_btnPrimary:hover:not(:disabled){background:var(--tv-primary-fill-hover);color:var(--tv-primary-text)}.dy0ESq_btnGhost{color:var(--tv-text-tertiary);background:0 0;border-color:#0000;padding:4px 8px}.dy0ESq_btnGhost:hover:not(:disabled){background:var(--tv-hover);color:var(--tv-text-secondary)}.dy0ESq_field{flex-direction:column;gap:4px;display:flex}.dy0ESq_fieldLabel{font:var(--dsw-font-xxs-12);color:var(--tv-text-secondary)}.dy0ESq_fieldInput,.dy0ESq_fieldSelect,.dy0ESq_fieldTextarea{background:var(--tv-surface-input);border:1px solid var(--tv-border);color:var(--tv-text);font:var(--dsw-font-xs-13);transition:border-color var(--ds-transition-duration) var(--ds-ease-in-out), box-shadow var(--ds-transition-duration) var(--ds-ease-in-out);border-radius:6px;outline:none;padding:7px 10px;font-family:inherit}.dy0ESq_fieldInput:focus,.dy0ESq_fieldSelect:focus,.dy0ESq_fieldTextarea:focus{border-color:var(--tv-focus);box-shadow:0 0 0 2px color-mix(in srgb, var(--tv-focus) 18%, transparent)}.dy0ESq_fieldTextarea{resize:vertical;min-height:80px;line-height:1.5}.dy0ESq_row{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.dy0ESq_spread{justify-content:space-between}.dy0ESq_hint{font:var(--dsw-font-xxs-12);color:var(--tv-text-tertiary);line-height:1.5}.dy0ESq_section{flex-direction:column;gap:10px;display:flex}.dy0ESq_sectionTitle{font:var(--dsw-font-xs-strong-13);color:var(--tv-accent-text);border-bottom:1px solid var(--tv-border);padding-bottom:6px}.dy0ESq_editor{flex-direction:column;gap:10px;max-width:720px;display:flex}.dy0ESq_badge{font:var(--dsw-font-xxxs-11);background:var(--tv-accent-soft);color:var(--tv-accent-text);border:1px solid var(--tv-accent-border);border-radius:10px;padding:1px 7px;display:inline-block}.dy0ESq_checkRow{font:var(--dsw-font-xs-13);cursor:pointer;align-items:center;gap:6px;display:flex}.dy0ESq_spinner{border:2px solid var(--tv-accent-border);border-top-color:var(--tv-accent);border-radius:50%;width:14px;height:14px;animation:.8s linear infinite dy0ESq_spin;display:inline-block}@keyframes dy0ESq_spin{to{transform:rotate(360deg)}}.dy0ESq_entryList{flex-direction:column;gap:6px;display:flex}.dy0ESq_entry{border:1px solid var(--tv-border);background:var(--tv-surface-card);border-radius:6px;flex-direction:column;gap:4px;padding:8px 10px;display:flex}.dy0ESq_entryKeys{font:var(--dsw-font-xxs-12);color:var(--tv-accent-text)}.dy0ESq_entryContent{font:var(--dsw-font-s-14);color:var(--tv-text-secondary);white-space:pre-wrap;max-height:120px;overflow-y:auto}.dy0ESq_entryHead{justify-content:space-between;align-items:center;gap:8px;display:flex}.dy0ESq_view :where(button,select):focus-visible{outline:1.5px solid var(--tv-focus);outline-offset:2px}.dy0ESq_view[data-style=classic]{color-scheme:dark;--tv-bg:#141210;--tv-nav-bg:#141210e6;--tv-surface-card:#00000047;--tv-surface-input:#00000059;--tv-sidebar-fill:#00000038;--tv-bubble-user:#8fb7d91f;--tv-border:#d4af3740;--tv-border-strong:#d4af3759;--tv-text:#e8e2d4;--tv-text-secondary:#c9bfa3;--tv-text-tertiary:#8d846c;--tv-text-caption:#8d846c;--tv-hover:#d4af371a;--tv-active:#d4af3733;--tv-btn-bg:#d4af371a;--tv-btn-bg-hover:#d4af3738;--tv-primary-fill:#b8962e;--tv-primary-fill-hover:#d4af37;--tv-primary-text:#201a08;--tv-danger-fill:#e06c5e14;--tv-danger-fill-hover:#e06c5e2e;--tv-danger-border:#e06c5e66;--tv-error:#e06c5e;--tv-focus:#d4af37;--tv-user-name:#8fb7d9;--tv-accent:#d4af37;--tv-accent-text:#d4af37;--tv-accent-soft:#d4af3726;--tv-accent-border:#d4af374d;--tv-accent-border-strong:#d4af37}.dy0ESq_playAvatarStack{flex-shrink:0;align-items:center;display:flex}.dy0ESq_playAvatarStack>*+*{margin-left:-8px}.dy0ESq_playAvatar{object-fit:cover;background:var(--tv-accent-soft);width:26px;height:26px;color:var(--tv-accent-text);border:2px solid var(--tv-sidebar-fill);font:var(--dsw-font-xxxs-11);border-radius:50%;justify-content:center;align-items:center;display:flex;overflow:hidden}.dy0ESq_playAvatarMore{background:var(--tv-surface-card);min-width:26px;height:26px;color:var(--tv-text-secondary);border:1px solid var(--tv-border);font:var(--dsw-font-xxxs-11);box-sizing:border-box;border-radius:999px;justify-content:center;align-items:center;padding:0 5px;display:inline-flex}.dy0ESq_listItemBody{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex}.dy0ESq_playTitle{font:var(--dsw-font-xs-strong-13);color:var(--tv-text);text-overflow:ellipsis;white-space:nowrap;max-width:100%;overflow:hidden}.dy0ESq_playMeta{font:var(--dsw-font-xxxs-11);color:var(--tv-text-secondary);text-overflow:ellipsis;white-space:nowrap;max-width:100%;overflow:hidden}.dy0ESq_createSheet{border:1px solid var(--tv-border);background:color-mix(in srgb, var(--tv-surface-card) 78%, transparent);width:100%;max-width:1080px;box-shadow:var(--dsw-shadow-lv1);border-radius:14px;flex-direction:column;gap:16px;margin:0 auto;padding:18px;display:flex}.dy0ESq_createHeader{justify-content:space-between;align-items:flex-start;gap:12px;display:flex}.dy0ESq_createHeaderText{flex-direction:column;gap:4px;min-width:0;display:flex}.dy0ESq_createTitle{font:var(--dsw-font-m-18);color:var(--tv-text);font-weight:700}.dy0ESq_createSubtitle{font:var(--dsw-font-xs-13);color:var(--tv-text-secondary);max-width:760px;line-height:1.6}.dy0ESq_castCount{border:1px solid var(--tv-accent-border);background:var(--tv-accent-soft);color:var(--tv-accent-text);font:var(--dsw-font-xxs-strong-12);white-space:nowrap;border-radius:999px;flex-shrink:0;padding:5px 10px}.dy0ESq_castCountEmpty{border-color:var(--tv-border);background:var(--tv-surface-input);color:var(--tv-text-tertiary)}.dy0ESq_createBasics{grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;display:grid}.dy0ESq_createModes{grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px;display:grid}.dy0ESq_modeCard{text-align:left;border:1px solid var(--tv-border);background:var(--tv-surface-input);color:var(--tv-text);cursor:pointer;transition:border-color var(--ds-transition-duration) var(--ds-ease-in-out), background var(--ds-transition-duration) var(--ds-ease-in-out), box-shadow var(--ds-transition-duration) var(--ds-ease-in-out);border-radius:10px;flex-direction:column;align-items:flex-start;gap:4px;padding:10px 12px;display:flex}.dy0ESq_modeCard:hover:not(:disabled){border-color:var(--tv-accent-border-strong)}.dy0ESq_modeCard:disabled{opacity:.5;cursor:default}.dy0ESq_modeCardOn{border-color:var(--tv-accent-border-strong);background:var(--tv-accent-soft);box-shadow:inset 0 0 0 1px var(--tv-accent-border)}.dy0ESq_modeCardTitle{font:var(--dsw-font-xs-strong-13);color:var(--tv-text)}.dy0ESq_modeCardOn .dy0ESq_modeCardTitle{color:var(--tv-accent-text)}.dy0ESq_modeCardText{font:var(--dsw-font-xxs-12);color:var(--tv-text-tertiary);line-height:1.45}.dy0ESq_castPicker{border:1px solid var(--tv-border);background:color-mix(in srgb, var(--tv-surface-input) 55%, transparent);border-radius:12px;flex-direction:column;gap:10px;padding:12px;display:flex}.dy0ESq_castPickerHead{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;display:flex}.dy0ESq_castPickerTitleRow{flex-direction:column;gap:2px;display:flex}.dy0ESq_castPickerTitle{font:var(--dsw-font-s-strong-14);color:var(--tv-accent-text)}.dy0ESq_castPickerHint{font:var(--dsw-font-xxs-12);color:var(--tv-text-tertiary)}.dy0ESq_castPickerActions{align-items:center;gap:8px;display:flex}.dy0ESq_castSearch{background:var(--tv-surface-input);border:1px solid var(--tv-border);width:min(280px,100%);color:var(--tv-text);font:var(--dsw-font-xxs-12);transition:border-color var(--ds-transition-duration) var(--ds-ease-in-out), box-shadow var(--ds-transition-duration) var(--ds-ease-in-out);border-radius:999px;outline:none;padding:6px 12px;font-family:inherit}.dy0ESq_castSearch:focus{border-color:var(--tv-focus);box-shadow:0 0 0 2px color-mix(in srgb, var(--tv-focus) 18%, transparent)}.dy0ESq_castOrder{flex-wrap:wrap;align-items:center;gap:6px;display:flex}.dy0ESq_castOrderLabel{font:var(--dsw-font-xxs-12);color:var(--tv-text-tertiary);margin-right:2px}.dy0ESq_castOrderItem{border:1px solid var(--tv-border);background:var(--tv-surface-input);max-width:240px;color:var(--tv-text);cursor:pointer;transition:border-color var(--ds-transition-duration) var(--ds-ease-in-out), background var(--ds-transition-duration) var(--ds-ease-in-out);border-radius:999px;align-items:center;gap:6px;padding:4px 9px 4px 5px;display:inline-flex}.dy0ESq_castOrderItem:hover{border-color:var(--tv-accent-border-strong)}.dy0ESq_castOrderItemMain{border-color:var(--tv-accent-border-strong);background:var(--tv-accent-soft)}.dy0ESq_castOrderAvatar{object-fit:cover;background:var(--tv-accent-soft);width:20px;height:20px;color:var(--tv-accent-text);font:var(--dsw-font-xxxs-11);border-radius:50%;flex-shrink:0;justify-content:center;align-items:center;display:flex;overflow:hidden}.dy0ESq_castOrderName{font:var(--dsw-font-xxs-12);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.dy0ESq_castOrderRank{font:var(--dsw-font-xxxs-11);color:var(--tv-accent-text);white-space:nowrap;font-weight:700}.dy0ESq_castGrid{grid-template-columns:repeat(auto-fill,minmax(172px,1fr));gap:10px;max-height:420px;padding:2px;display:grid;overflow-y:auto}.dy0ESq_castCard{border:1px solid var(--tv-border);background:var(--tv-surface-card);min-width:0;color:var(--tv-text);text-align:left;cursor:pointer;transition:border-color var(--ds-transition-duration) var(--ds-ease-in-out), background var(--ds-transition-duration) var(--ds-ease-in-out), box-shadow var(--ds-transition-duration) var(--ds-ease-in-out), transform var(--ds-transition-duration) var(--ds-ease-in-out);border-radius:12px;flex-direction:column;gap:8px;padding:10px;display:flex;position:relative}.dy0ESq_castCard:hover{border-color:var(--tv-accent-border-strong);box-shadow:var(--dsw-shadow-lv1);transform:translateY(-2px)}.dy0ESq_castCardSelected{border-color:var(--tv-accent-border-strong);background:linear-gradient(180deg, color-mix(in srgb, var(--tv-accent) 14%, transparent), transparent 90px), var(--tv-surface-card);box-shadow:inset 0 0 0 1px var(--tv-accent-border)}.dy0ESq_castCardMedia{background:var(--tv-accent-soft);border-radius:10px;justify-content:center;align-items:center;width:100%;height:104px;display:flex;overflow:hidden}.dy0ESq_castCardAvatar{object-fit:cover;background:var(--tv-accent-soft);width:100%;height:100%;color:var(--tv-accent-text);border-radius:10px;justify-content:center;align-items:center;font-size:30px;font-weight:700;display:flex}.dy0ESq_castRank{border:1px solid var(--tv-border-strong);background:color-mix(in srgb, var(--tv-bg) 82%, transparent);color:var(--tv-text-secondary);font:var(--dsw-font-xxxs-11);pointer-events:none;border-radius:999px;padding:2px 8px;font-weight:700;position:absolute;top:16px;left:16px}.dy0ESq_castRankMain{border-color:var(--tv-accent-border-strong);background:var(--tv-accent);color:var(--tv-primary-text)}.dy0ESq_castCheck{border:1.5px solid var(--tv-border-strong);background:color-mix(in srgb, var(--tv-bg) 72%, transparent);width:24px;height:24px;color:var(--tv-primary-text);pointer-events:none;transition:border-color var(--ds-transition-duration) var(--ds-ease-in-out), background var(--ds-transition-duration) var(--ds-ease-in-out);border-radius:50%;justify-content:center;align-items:center;font-size:14px;font-weight:700;display:flex;position:absolute;top:16px;right:16px}.dy0ESq_castCardSelected .dy0ESq_castCheck{border-color:var(--tv-accent-border-strong);background:var(--tv-accent)}.dy0ESq_castCardBody{flex-direction:column;gap:4px;min-width:0;display:flex}.dy0ESq_castCardName{font:var(--dsw-font-xs-strong-13);color:var(--tv-text);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.dy0ESq_castCardDesc{font:var(--dsw-font-xxs-12);color:var(--tv-text-secondary);-webkit-line-clamp:2;-webkit-box-orient:vertical;min-height:2.9em;line-height:1.45;display:-webkit-box;overflow:hidden}.dy0ESq_castCardTags{font:var(--dsw-font-xxxs-11);color:var(--tv-accent-text);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.dy0ESq_castEmpty{border:1px dashed var(--tv-border-strong);background:color-mix(in srgb, var(--tv-surface-input) 45%, transparent);text-align:center;border-radius:12px;flex-direction:column;justify-content:center;align-items:center;gap:6px;min-height:170px;padding:26px 16px;display:flex}.dy0ESq_castEmptyIcon{font-size:34px;line-height:1}.dy0ESq_castEmptyTitle{font:var(--dsw-font-xs-strong-13);color:var(--tv-text)}.dy0ESq_createFooter{flex-wrap:wrap;align-items:center;gap:12px;display:flex}.dy0ESq_createFooter>:first-child{min-width:140px}.dy0ESq_fieldInput,.dy0ESq_fieldSelect,.dy0ESq_fieldTextarea{box-sizing:border-box;width:100%}@media (width<=720px){.dy0ESq_createHeader{flex-direction:column}.dy0ESq_castPickerHead{flex-direction:column;align-items:flex-start}.dy0ESq_castSearch{width:100%}}.dy0ESq_lorebookPicker{border:1px solid var(--tv-border);background:color-mix(in srgb, var(--tv-surface-input) 55%, transparent);border-radius:12px;flex-direction:column;gap:10px;padding:12px;display:flex}.dy0ESq_lorebookPickerHead{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;display:flex}.dy0ESq_lorebookPickerTitleRow{flex-direction:column;gap:2px;display:flex}.dy0ESq_lorebookPickerTitle{font:var(--dsw-font-s-strong-14);color:var(--tv-accent-text)}.dy0ESq_lorebookPickerHint{font:var(--dsw-font-xxs-12);color:var(--tv-text-tertiary)}.dy0ESq_lorebookPickerActions{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.dy0ESq_lorebookOrder{flex-wrap:wrap;align-items:center;gap:6px;display:flex}.dy0ESq_lorebookOrderLabel{font:var(--dsw-font-xxs-12);color:var(--tv-text-tertiary);margin-right:2px}.dy0ESq_lorebookOrderItem{border:1px solid var(--tv-border);background:var(--tv-surface-input);max-width:260px;color:var(--tv-text);cursor:pointer;transition:border-color var(--ds-transition-duration) var(--ds-ease-in-out), background var(--ds-transition-duration) var(--ds-ease-in-out);border-radius:999px;align-items:center;gap:6px;padding:4px 8px 4px 6px;display:inline-flex}.dy0ESq_lorebookOrderItem:hover{border-color:var(--tv-accent-border-strong)}.dy0ESq_lorebookOrderRank{background:var(--tv-accent-soft);min-width:18px;height:18px;color:var(--tv-accent-text);font:var(--dsw-font-xxxs-11);box-sizing:border-box;border-radius:999px;justify-content:center;align-items:center;padding:0 4px;font-weight:700;display:inline-flex}.dy0ESq_lorebookOrderName{font:var(--dsw-font-xxs-12);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.dy0ESq_lorebookOrderRemove{color:var(--tv-text-tertiary);font-size:14px;line-height:1}.dy0ESq_lorebookGrid{grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;max-height:280px;padding:2px;display:grid;overflow-y:auto}.dy0ESq_lorebookCard{border:1px solid var(--tv-border);background:var(--tv-surface-card);min-width:0;color:var(--tv-text);text-align:left;cursor:pointer;transition:border-color var(--ds-transition-duration) var(--ds-ease-in-out), background var(--ds-transition-duration) var(--ds-ease-in-out), box-shadow var(--ds-transition-duration) var(--ds-ease-in-out), transform var(--ds-transition-duration) var(--ds-ease-in-out);border-radius:10px;align-items:center;gap:8px;padding:10px 12px;display:flex;position:relative}.dy0ESq_lorebookCard:hover{border-color:var(--tv-accent-border-strong);box-shadow:var(--dsw-shadow-lv1);transform:translateY(-1px)}.dy0ESq_lorebookCardSelected{border-color:var(--tv-accent-border-strong);background:linear-gradient(90deg, color-mix(in srgb, var(--tv-accent) 13%, transparent), transparent 160px), var(--tv-surface-card);box-shadow:inset 0 0 0 1px var(--tv-accent-border)}.dy0ESq_lorebookCardCheck{border:1.5px solid var(--tv-border-strong);width:20px;height:20px;color:var(--tv-primary-text);box-sizing:border-box;transition:border-color var(--ds-transition-duration) var(--ds-ease-in-out), background var(--ds-transition-duration) var(--ds-ease-in-out);border-radius:50%;flex-shrink:0;justify-content:center;align-items:center;font-size:13px;font-weight:700;display:flex}.dy0ESq_lorebookCardSelected .dy0ESq_lorebookCardCheck{border-color:var(--tv-accent-border-strong);background:var(--tv-accent)}.dy0ESq_lorebookCardBody{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex}.dy0ESq_lorebookCardName{font:var(--dsw-font-xs-strong-13);color:var(--tv-text);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.dy0ESq_lorebookCardMeta{font:var(--dsw-font-xxxs-11);color:var(--tv-text-tertiary);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.dy0ESq_lorebookRank{background:var(--tv-accent-soft);color:var(--tv-accent-text);border:1px solid var(--tv-accent-border);font:var(--dsw-font-xxxs-11);border-radius:999px;flex-shrink:0;padding:2px 7px;font-weight:700}@media (width<=720px){.dy0ESq_lorebookPickerHead{flex-direction:column;align-items:flex-start}}.dy0ESq_thinking{border:1px dashed var(--tv-border);background:var(--tv-surface-card);border-radius:10px;overflow:hidden}.dy0ESq_thinkingToggle{width:100%;color:var(--tv-text-tertiary);font:var(--dsw-font-xxs-12);cursor:pointer;text-align:left;background:0 0;border:none;align-items:center;gap:6px;padding:5px 10px;display:flex}.dy0ESq_thinkingToggle:hover{color:var(--tv-text-secondary)}.dy0ESq_thinkingOpen{border-style:solid}.dy0ESq_thinkingOpen>.dy0ESq_thinkingToggle{color:var(--tv-text-secondary)}.dy0ESq_thinkingCaret{color:var(--tv-accent-text)}.dy0ESq_thinkingBody{color:var(--tv-text-secondary);font:var(--dsw-font-xs-13);white-space:pre-wrap;word-break:break-word;max-height:260px;padding:2px 10px 8px;overflow-y:auto}.dy0ESq_msgStatus{font:var(--dsw-font-xxs-12);color:var(--tv-text-tertiary);white-space:nowrap;text-overflow:ellipsis;overflow:hidden}.dy0ESq_msgStatusWarn{color:var(--dsw-alias-warning-text,#b45309)}.dy0ESq_msgStatusError{color:var(--dsw-alias-danger-text,#c43d3d);max-width:100%}.dy0ESq_msgStatusStreaming{font:var(--dsw-font-xxs-12);color:var(--tv-accent-text);align-items:center;gap:6px;display:inline-flex}.dy0ESq_msgActions{flex-wrap:wrap;align-items:center;gap:6px;display:flex}.dy0ESq_msgUser .dy0ESq_msgActions{justify-content:flex-end}.dy0ESq_msgActionBtn{border:1px solid var(--tv-border);color:var(--tv-text-tertiary);font:var(--dsw-font-xxs-12);cursor:pointer;transition:color var(--ds-transition-duration) var(--ds-ease-in-out), border-color var(--ds-transition-duration) var(--ds-ease-in-out);background:0 0;border-radius:999px;padding:2px 10px}.dy0ESq_msgActionBtn:hover:not(:disabled){color:var(--tv-accent-text);border-color:var(--tv-accent-border)}.dy0ESq_msgActionBtn:disabled{opacity:.45;cursor:default}.dy0ESq_swipeNav{border:1px solid var(--tv-border);border-radius:999px;align-items:center;gap:2px;padding:0 4px;display:inline-flex}.dy0ESq_swipeBtn{color:var(--tv-text-secondary);font:var(--dsw-font-s-14);cursor:pointer;background:0 0;border:none;border-radius:999px;width:22px;height:22px;line-height:1}.dy0ESq_swipeBtn:hover:not(:disabled){color:var(--tv-accent-text);background:var(--tv-accent-soft)}.dy0ESq_swipeBtn:disabled{opacity:.4;cursor:default}.dy0ESq_swipeCount{font:var(--dsw-font-xxxs-11);color:var(--tv-text-tertiary);text-align:center;user-select:none;min-width:34px}.dy0ESq_editArea{flex-direction:column;gap:6px;min-width:min(420px,100%);display:flex}.dy0ESq_editInput{resize:vertical;background:var(--tv-surface-input);border:1px solid var(--tv-border);color:var(--tv-text);font:var(--dsw-font-s-14);border-radius:10px;outline:none;padding:9px 12px;font-family:inherit}.dy0ESq_editInput:focus{border-color:var(--tv-focus)}.dy0ESq_stopBtn{border:1px solid var(--dsw-alias-danger-text,#c43d3d);color:var(--dsw-alias-danger-text,#c43d3d);background:0 0}.dy0ESq_stopBtn:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-danger-text,#c43d3d) 12%, transparent)}.tv-scene-rail{width:92px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:12px;padding:14px 6px;border-right:1px solid var(--tv-border);background:var(--tv-sidebar-fill);overflow-y:auto}.tv-scene-title{font-weight:600;font-size:12px;color:var(--tv-text)}.tv-scene-hint{font-size:10px;color:var(--tv-text-tertiary)}.tv-scene-character{display:flex;flex-direction:column;align-items:center;gap:5px;width:100%;padding:8px 2px;border:1px solid transparent;border-radius:12px;background:transparent;color:var(--tv-text-secondary);cursor:pointer}.tv-scene-character:hover:not(:disabled){background:var(--tv-hover)}.tv-scene-character:focus-visible{outline:2px solid var(--tv-focus)}.tv-scene-character:disabled{opacity:.5;cursor:default}.tv-scene-present{border-color:var(--tv-accent-border);background:var(--tv-accent-soft);color:var(--tv-accent-text)}.tv-character-avatar{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;flex-shrink:0;overflow:hidden;border-radius:50%;background:var(--tv-accent-soft);border:1px solid var(--tv-border);color:var(--tv-accent-text);font-size:16px}.tv-character-avatar img{width:100%;height:100%;object-fit:cover}.tv-scene-character .tv-character-avatar{width:52px;height:52px;font-size:22px}.tv-scene-name{font-size:12px;max-width:100%;overflow-wrap:anywhere}.tv-scene-status{font-size:10px}.dy0ESq_msgName{display:inline-flex;align-items:center;gap:8px}@media(max-width:760px){.tv-scene-rail{width:66px;padding:10px 3px}.tv-scene-character .tv-character-avatar{width:40px;height:40px}.tv-scene-name{font-size:11px}.tv-scene-hint{font-size:9px}}.tv-scene-character.tv-scene-present:not(.tv-scene-current){border-color:var(--tv-border);background:transparent;color:var(--tv-text-secondary)}.tv-scene-current{box-shadow:inset 0 0 0 1px var(--tv-accent-border);background:var(--tv-accent-soft);color:var(--tv-accent-text)}.tv-settings-sheet{overflow:visible}.tv-settings-actions{position:sticky;top:0;z-index:10;background:var(--tv-surface-card);border-bottom:1px solid var(--tv-border);flex-wrap:wrap;box-shadow:0 4px 10px #0002}";
		const tagId = "dsh-tavern/TavernView.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-tavern";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var TavernView_module_css_default = {
			"castCheck": "dy0ESq_castCheck",
			"msgActions": "dy0ESq_msgActions",
			"btnPrimary": "dy0ESq_btnPrimary",
			"spinner": "dy0ESq_spinner",
			"castPickerHead": "dy0ESq_castPickerHead",
			"castEmptyIcon": "dy0ESq_castEmptyIcon",
			"castOrderAvatar": "dy0ESq_castOrderAvatar",
			"msgRich": "dy0ESq_msgRich",
			"playTitle": "dy0ESq_playTitle",
			"entryHead": "dy0ESq_entryHead",
			"lorebookCardSelected": "dy0ESq_lorebookCardSelected",
			"chatMeta": "dy0ESq_chatMeta",
			"modeCardTitle": "dy0ESq_modeCardTitle",
			"msgSystem": "dy0ESq_msgSystem",
			"lorebookCardMeta": "dy0ESq_lorebookCardMeta",
			"nav": "dy0ESq_nav",
			"fieldTextarea": "dy0ESq_fieldTextarea",
			"lorebookOrderLabel": "dy0ESq_lorebookOrderLabel",
			"navTitle": "dy0ESq_navTitle",
			"fieldSelect": "dy0ESq_fieldSelect",
			"entryContent": "dy0ESq_entryContent",
			"badge": "dy0ESq_badge",
			"castGrid": "dy0ESq_castGrid",
			"sidebarHead": "dy0ESq_sidebarHead",
			"section": "dy0ESq_section",
			"listItemAvatar": "dy0ESq_listItemAvatar",
			"cardAvatar": "dy0ESq_cardAvatar",
			"messages": "dy0ESq_messages",
			"swipeNav": "dy0ESq_swipeNav",
			"castEmpty": "dy0ESq_castEmpty",
			"msgStatusStreaming": "dy0ESq_msgStatusStreaming",
			"msgUser": "dy0ESq_msgUser",
			"editor": "dy0ESq_editor",
			"sidebarTitle": "dy0ESq_sidebarTitle",
			"cardName": "dy0ESq_cardName",
			"msgName": "dy0ESq_msgName",
			"castRankMain": "dy0ESq_castRankMain",
			"createHeader": "dy0ESq_createHeader",
			"sectionTitle": "dy0ESq_sectionTitle",
			"castCountEmpty": "dy0ESq_castCountEmpty",
			"lorebookGrid": "dy0ESq_lorebookGrid",
			"lorebookPickerTitleRow": "dy0ESq_lorebookPickerTitleRow",
			"castPickerHint": "dy0ESq_castPickerHint",
			"msgStatus": "dy0ESq_msgStatus",
			"castCardMedia": "dy0ESq_castCardMedia",
			"list": "dy0ESq_list",
			"row": "dy0ESq_row",
			"castPicker": "dy0ESq_castPicker",
			"lorebookCardCheck": "dy0ESq_lorebookCardCheck",
			"thinkingOpen": "dy0ESq_thinkingOpen",
			"navSpacer": "dy0ESq_navSpacer",
			"swipeBtn": "dy0ESq_swipeBtn",
			"entry": "dy0ESq_entry",
			"listItemBody": "dy0ESq_listItemBody",
			"castCardTags": "dy0ESq_castCardTags",
			"composerRow": "dy0ESq_composerRow",
			"lorebookPicker": "dy0ESq_lorebookPicker",
			"lorebookCardName": "dy0ESq_lorebookCardName",
			"fieldLabel": "dy0ESq_fieldLabel",
			"empty": "dy0ESq_empty",
			"createSubtitle": "dy0ESq_createSubtitle",
			"lorebookCardBody": "dy0ESq_lorebookCardBody",
			"castOrderItem": "dy0ESq_castOrderItem",
			"createFooter": "dy0ESq_createFooter",
			"castPickerTitleRow": "dy0ESq_castPickerTitleRow",
			"composer": "dy0ESq_composer",
			"castOrderLabel": "dy0ESq_castOrderLabel",
			"castOrderItemMain": "dy0ESq_castOrderItemMain",
			"castCardAvatar": "dy0ESq_castCardAvatar",
			"sendBtn": "dy0ESq_sendBtn",
			"msgActionBtn": "dy0ESq_msgActionBtn",
			"editInput": "dy0ESq_editInput",
			"createHeaderText": "dy0ESq_createHeaderText",
			"navError": "dy0ESq_navError",
			"stylePicker": "dy0ESq_stylePicker",
			"card": "dy0ESq_card",
			"entryList": "dy0ESq_entryList",
			"lorebookPickerHead": "dy0ESq_lorebookPickerHead",
			"msg": "dy0ESq_msg",
			"lorebookOrderName": "dy0ESq_lorebookOrderName",
			"stopBtn": "dy0ESq_stopBtn",
			"thinkingCaret": "dy0ESq_thinkingCaret",
			"swipeCount": "dy0ESq_swipeCount",
			"createBasics": "dy0ESq_createBasics",
			"view": "dy0ESq_view",
			"castCount": "dy0ESq_castCount",
			"castCardBody": "dy0ESq_castCardBody",
			"lorebookPickerHint": "dy0ESq_lorebookPickerHint",
			"spin": "dy0ESq_spin",
			"lorebookOrder": "dy0ESq_lorebookOrder",
			"msgBubble": "dy0ESq_msgBubble",
			"msgNarrator": "dy0ESq_msgNarrator",
			"entryKeys": "dy0ESq_entryKeys",
			"sidebar": "dy0ESq_sidebar",
			"playAvatarStack": "dy0ESq_playAvatarStack",
			"modeCard": "dy0ESq_modeCard",
			"lorebookPickerTitle": "dy0ESq_lorebookPickerTitle",
			"playAvatar": "dy0ESq_playAvatar",
			"chatHead": "dy0ESq_chatHead",
			"chat": "dy0ESq_chat",
			"btn": "dy0ESq_btn",
			"lorebookRank": "dy0ESq_lorebookRank",
			"thinking": "dy0ESq_thinking",
			"thinkingBody": "dy0ESq_thinkingBody",
			"editArea": "dy0ESq_editArea",
			"btnGhost": "dy0ESq_btnGhost",
			"modeCardOn": "dy0ESq_modeCardOn",
			"msgStatusWarn": "dy0ESq_msgStatusWarn",
			"playMeta": "dy0ESq_playMeta",
			"lorebookCard": "dy0ESq_lorebookCard",
			"castOrder": "dy0ESq_castOrder",
			"grid": "dy0ESq_grid",
			"composerInput": "dy0ESq_composerInput",
			"navTab": "dy0ESq_navTab",
			"castEmptyTitle": "dy0ESq_castEmptyTitle",
			"listItemActive": "dy0ESq_listItemActive",
			"modeLabel": "dy0ESq_modeLabel",
			"castCardDesc": "dy0ESq_castCardDesc",
			"castSearch": "dy0ESq_castSearch",
			"navTabActive": "dy0ESq_navTabActive",
			"thinkingToggle": "dy0ESq_thinkingToggle",
			"body": "dy0ESq_body",
			"chatTitle": "dy0ESq_chatTitle",
			"createTitle": "dy0ESq_createTitle",
			"playAvatarMore": "dy0ESq_playAvatarMore",
			"castOrderRank": "dy0ESq_castOrderRank",
			"listItem": "dy0ESq_listItem",
			"field": "dy0ESq_field",
			"castPickerActions": "dy0ESq_castPickerActions",
			"msgStatusError": "dy0ESq_msgStatusError",
			"castPickerTitle": "dy0ESq_castPickerTitle",
			"styleSelect": "dy0ESq_styleSelect",
			"modeRow": "dy0ESq_modeRow",
			"cardTags": "dy0ESq_cardTags",
			"castCardName": "dy0ESq_castCardName",
			"lorebookOrderItem": "dy0ESq_lorebookOrderItem",
			"lorebookOrderRank": "dy0ESq_lorebookOrderRank",
			"createModes": "dy0ESq_createModes",
			"msgTime": "dy0ESq_msgTime",
			"btnDanger": "dy0ESq_btnDanger",
			"listItemMeta": "dy0ESq_listItemMeta",
			"createSheet": "dy0ESq_createSheet",
			"castRank": "dy0ESq_castRank",
			"castOrderName": "dy0ESq_castOrderName",
			"modeCardText": "dy0ESq_modeCardText",
			"lorebookOrderRemove": "dy0ESq_lorebookOrderRemove",
			"hint": "dy0ESq_hint",
			"fieldInput": "dy0ESq_fieldInput",
			"checkRow": "dy0ESq_checkRow",
			"spread": "dy0ESq_spread",
			"castCardSelected": "dy0ESq_castCardSelected",
			"listItemName": "dy0ESq_listItemName",
			"castCard": "dy0ESq_castCard",
			"content": "dy0ESq_content",
			"lorebookPickerActions": "dy0ESq_lorebookPickerActions"
		};
		//#endregion
		//#region src/client/components/common.tsx
		function Button(props) {
			const cls = props.variant === "primary" ? `${TavernView_module_css_default.btn} ${TavernView_module_css_default.btnPrimary}` : props.variant === "danger" ? `${TavernView_module_css_default.btn} ${TavernView_module_css_default.btnDanger}` : props.variant === "ghost" ? `${TavernView_module_css_default.btn} ${TavernView_module_css_default.btnGhost}` : TavernView_module_css_default.btn;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: cls,
				onClick: props.onClick,
				disabled: props.disabled,
				title: props.title,
				children: props.children
			});
		}
		function Field(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: TavernView_module_css_default.field,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: TavernView_module_css_default.fieldLabel,
					children: props.label
				}), props.children]
			});
		}
		function TextInput(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
				className: TavernView_module_css_default.fieldInput,
				value: props.value,
				placeholder: props.placeholder,
				disabled: props.disabled,
				onChange: (event) => props.onChange(event.target.value)
			});
		}
		function TextArea(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
				className: TavernView_module_css_default.fieldTextarea,
				value: props.value,
				placeholder: props.placeholder,
				rows: props.rows,
				disabled: props.disabled,
				onChange: (event) => props.onChange(event.target.value)
			});
		}
		function Select(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
				className: TavernView_module_css_default.fieldSelect,
				value: props.value ?? "",
				onChange: (event) => {
					const value = event.target.value;
					props.onChange(value === "" ? void 0 : value);
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
					value: "",
					children: props.placeholder ?? "（无）"
				}), props.options.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
					value: option.value,
					children: option.label
				}, option.value))]
			});
		}
		function Checkbox(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: TavernView_module_css_default.checkRow,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked: props.checked,
					onChange: (event) => props.onChange(event.target.checked)
				}), props.label]
			});
		}
		function Spinner() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: TavernView_module_css_default.spinner,
				"aria-label": "加载中"
			});
		}
		function Empty(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: TavernView_module_css_default.empty,
				children: props.text
			});
		}
		/** Simple confirm dialog via window.confirm. */
		function confirmAction(message) {
			return window.confirm(message);
		}
		//#endregion
		//#region src/client/components/ChatPanel.tsx
		/**
		* Chat panel: play list, session message thread (from the DSH session
		* snapshot), composer, and play creation. The conversation itself is the
		* DSH session — sending routes through the conversation service.
		*/
		function firstGrapheme(value) {
			const trimmed = value.trim();
			return trimmed === "" ? "?" : Array.from(trimmed)[0] ?? "?";
		}
		function compactText(value) {
			return (value ?? "").replace(/\s+/g, " ").trim();
		}
		function matchesCharacter(character, query) {
			return [
				character.name,
				character.description ?? "",
				character.personality ?? "",
				...character.tags ?? []
			].join("\n").toLowerCase().includes(query);
		}
		function matchesLorebook(book, query) {
			return [book.name, book.description ?? ""].join("\n").toLowerCase().includes(query);
		}
		/** Markup tags allowed in chat bubbles; everything else is dropped or unwrapped. */
		const HTML_ALLOWED_TAGS = /* @__PURE__ */ new Set([
			"p",
			"br",
			"div",
			"span",
			"blockquote",
			"hr",
			"b",
			"strong",
			"i",
			"em",
			"u",
			"s",
			"del",
			"font",
			"code",
			"pre",
			"a",
			"img",
			"ul",
			"ol",
			"li",
			"h1",
			"h2",
			"h3",
			"h4",
			"table",
			"thead",
			"tbody",
			"tr",
			"td",
			"th"
		]);
		/** Per-tag attribute whitelist; all other attributes (incl. on*) are removed. */
		const HTML_ALLOWED_ATTRS = {
			a: ["href", "title"],
			img: [
				"src",
				"alt",
				"title",
				"width",
				"height"
			],
			font: ["color"],
			td: ["colspan", "rowspan"],
			th: ["colspan", "rowspan"]
		};
		/** Quick tag sniff to distinguish HTML markup from plain narrative text. */
		const HTML_TAG_RE = /<\s*(a|img|div|span|p|br|hr|table|tr|td|th|ul|ol|li|blockquote|code|pre|font|b|i|u|em|strong|s|del|h[1-4])\b[^>]*>/i;
		/** Hard cap on inline data-URL media in message bubbles (memory bound). */
		const MAX_DATA_IMAGE_BYTES = 524288;
		function safeUrl(value, allowDataImage) {
			const trimmed = value.trim();
			if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
			if (allowDataImage) {
				const match = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)$/i.exec(trimmed);
				if (match !== null && match[2].length <= Math.ceil(MAX_DATA_IMAGE_BYTES * 4 / 3) + 4) return trimmed;
			}
			return null;
		}
		/**
		* Elements dropped with their subtree instead of being unwrapped.
		*
		* Beyond the obviously active ones (script/style/iframe/…), this covers every
		* element whose children the HTML parser treats as raw text or as an inert
		* sub-document. Those parse differently in the DOMParser document used here
		* (scripting disabled, no template contents in the main tree) than in the live
		* document the fragment is later injected into, which is the classic mXSS
		* lever: unwrapping `<noscript>` hands back markup that never went through the
		* whitelist. Nothing in a roleplay bubble legitimately needs them.
		*/
		const STRIP_CONTENT = /* @__PURE__ */ new Set([
			"script",
			"style",
			"iframe",
			"object",
			"embed",
			"form",
			"input",
			"button",
			"select",
			"textarea",
			"noscript",
			"template",
			"noembed",
			"noframes",
			"xmp",
			"plaintext",
			"title"
		]);
		/** One whitelist pass over `html`; returns the serialized sanitized body. */
		function sanitizePass(html) {
			const doc = new DOMParser().parseFromString(html, "text/html");
			const sanitizeNode = (node) => {
				for (const child of Array.from(node.childNodes)) if (child.nodeType === 1) {
					const el = child;
					const tag = el.tagName.toLowerCase();
					if (STRIP_CONTENT.has(tag)) {
						el.remove();
						continue;
					}
					if (!HTML_ALLOWED_TAGS.has(tag)) {
						sanitizeNode(el);
						while (el.firstChild !== null) el.parentNode.insertBefore(el.firstChild, el);
						el.remove();
						continue;
					}
					for (const attr of Array.from(el.attributes)) {
						if (!(HTML_ALLOWED_ATTRS[tag] ?? []).includes(attr.name.toLowerCase())) {
							el.removeAttribute(attr.name);
							continue;
						}
						if (tag === "a" && attr.name === "href") {
							const url = safeUrl(attr.value, false);
							if (url === null) el.removeAttribute("href");
							else el.setAttribute("href", url);
						}
						if (tag === "img" && attr.name === "src") {
							const url = safeUrl(attr.value, true);
							if (url === null) el.removeAttribute("src");
							else el.setAttribute("src", url);
						}
					}
					if (tag === "a") {
						el.setAttribute("target", "_blank");
						el.setAttribute("rel", "noopener noreferrer");
					}
					sanitizeNode(el);
				}
			};
			sanitizeNode(doc.body);
			return doc.body.innerHTML;
		}
		/**
		* Sanitize roleplay HTML into a whitelist-only fragment safe for innerHTML.
		* Returns null when the result cannot be trusted; callers must then render the
		* message as plain text.
		*
		* Message text is model output steered by imported character cards, i.e.
		* attacker-controllable, and there is no DOMPurify here to lean on. So the
		* whitelist pass is followed by a fixed-point check: feeding the serialized
		* output back through the parser must be a no-op. Any mutation means the
		* browser reads the sanitized string differently from the tree that was
		* sanitized (namespace confusion, raw-text re-interpretation, entity
		* round-tripping) — the general shape of every mXSS bypass — and the safe
		* answer is to publish nothing rather than guess which reading wins.
		*/
		function sanitizeMessageHtml(html) {
			const first = sanitizePass(html);
			return sanitizePass(first) === first ? first : null;
		}
		/** Whether the message contains HTML markup worth rendering as markup. */
		function looksLikeHtml(text) {
			return HTML_TAG_RE.test(text);
		}
		function CharacterAvatar({ src, name }) {
			const [broken, setBroken] = (0, react.useState)(false);
			(0, react.useEffect)(() => setBroken(false), [src]);
			return (0, react_jsx_runtime.jsx)("span", {
				className: "tv-character-avatar",
				children: src && !broken
					? (0, react_jsx_runtime.jsx)("img", { src: avatarSrc(src), alt: name, onError: () => setBroken(true) })
					: (0, react_jsx_runtime.jsx)("span", { "aria-hidden": true, children: firstGrapheme(name) })
			});
		}
// Scene headers describe presence. Explicit speaker prefixes describe who is speaking.
function namesInSceneHeader(text, characterNames, streaming = false) {
	const lines = text.slice(0, 1600).split(/\r?\n/);
	for (let index = 0; index < Math.min(lines.length, 4); index++) {
		const line = lines[index].replace(/[*_]/g, "");
		if (!/^\s*(?:#{1,6}\s*)?【(?:时间|地点|在场人物|在场角色)】/.test(line)) continue;
		const header = /【在场(?:人物|角色)】\s*[:：]?\s*(.*)/.exec(line);
		if (!header || (streaming && index === lines.length - 1)) continue;
		return characterNames.filter(name => {
			const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			return new RegExp("(?:^|[、，,;；|/\\s])" + escaped + "(?=$|[、，,;；|/\\s（(])").test(header[1]);
		});
	}
	return null;
}
function sceneCue(text, characterNames) {
	const entering = [], leaving = [];
	for (const name of characterNames) {
		const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const start = "(?:^|[，,。；;\\n])\\s*(?:(?:请|让|换成|改为|接下来|现在)\\s*)*" + escaped + "\\s*";
		if (new RegExp(start + "(?:出场|上场|进来|接话|说话)(?=$|[，,。！!\\s])").test(text)) entering.push(name);
		if (new RegExp(start + "(?:放一边|先放一边|退场|离开|先不出场)(?=$|[，,。！!\\s])").test(text)) leaving.push(name);
	}
	return { entering, leaving };
}
function projectScene(items, characterNames, initialNames, override) {
	let presentNames = [...initialNames];
	let activeNames = [...presentNames];
	if (override && !override.afterMessageId) {
		presentNames = override.names.filter(name => characterNames.includes(name));
		activeNames = override.activeName ? [override.activeName] : [...presentNames];
	}
	const rows = items.map(item => {
		if (item.kind === "user") {
			const cue = sceneCue(item.text, characterNames);
			if (cue.entering.length || cue.leaving.length) {
				presentNames = [...new Set([...presentNames.filter(name => !cue.leaving.includes(name)), ...cue.entering])];
				activeNames = cue.entering.length ? cue.entering : activeNames.filter(name => presentNames.includes(name));
			}
			return item;
		}
		const header = namesInSceneHeader(item.text, characterNames, item.status === "streaming");
		if (header !== null) {
			presentNames = header;
			activeNames = [...header];
		}
		const prefixedNames = item.text.split("\n").flatMap(line => {
			const match = /^\s*([^：:\n]{1,40})[：:]/.exec(line.replace(/[*_]/g, ""));
			const name = match?.[1].trim();
			return characterNames.includes(name) ? [name] : [];
		});
		for (const name of prefixedNames) {
			if (!presentNames.includes(name)) presentNames.push(name);
		}
		if (prefixedNames.length) activeNames = [prefixedNames.at(-1)];
		const speaker = characterNames.includes(item.name) ? item.name : void 0;
		if (speaker !== void 0) {
			if (!presentNames.includes(speaker)) presentNames = [...presentNames, speaker];
			activeNames = [speaker];
		}
		const labelNames = speaker ? [speaker] : [...activeNames];
		const row = {
			...item,
			name: labelNames.join(" · ") || "场景",
			speakerNames: labelNames
		};
		// Apply a portrait click after its source reply, without relabeling that reply.
		if (override?.afterMessageId && item.messageId === override.afterMessageId) {
			presentNames = override.names.filter(name => characterNames.includes(name));
			activeNames = override.activeName && presentNames.includes(override.activeName)
				? [override.activeName] : [...presentNames];
		}
		return row;
	});
	return { rows, presentNames, activeNames };
}

		function SceneRail(props) {
			const ids = props.sceneCharacterIds ?? props.play.sceneCharacterIds ?? props.play.characterIds.slice(0, 1);
			const currentIds = props.activeCharacterIds ?? ids;
			const characters = props.play.characterIds.map(id => props.characters.find(character => character.id === id)).filter(Boolean);
			return (0, react_jsx_runtime.jsxs)("aside", {
				className: "tv-scene-rail",
				"aria-label": "角色出场栏",
				children: [
					(0, react_jsx_runtime.jsx)("span", { className: "tv-scene-title", children: "角色出场" }),
					(0, react_jsx_runtime.jsx)("span", { className: "tv-scene-hint", children: "点击即回复" }),
					...characters.map(character => {
						const present = ids.includes(character.id);
						return (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "tv-scene-character" + (present ? " tv-scene-present" : "") + (currentIds.includes(character.id) ? " tv-scene-current" : ""),
							disabled: props.busy,
							title: present ? "让" + character.name + "接话（生成回复）" : "让" + character.name + "出场并生成回复",
							"aria-label": present ? character.name + "，在场，点击接话" : character.name + "，未出场，点击出场",
							onClick: () => props.onEnter(character.id),
							children: [
								(0, react_jsx_runtime.jsx)(CharacterAvatar, { src: character.avatar, name: character.name }),
								(0, react_jsx_runtime.jsx)("span", { className: "tv-scene-name", children: character.name }),
								(0, react_jsx_runtime.jsx)("span", { className: "tv-scene-status", children: currentIds.includes(character.id) ? "当前 · 接话" : present ? "在场" : "未出场" })
							]
						}, character.id);
					})
				]
			});
		}

		function ChatPanel(props) {
			const { running } = props;
			const [draft, setDraft] = (0, react.useState)("");
			const [title, setTitle] = (0, react.useState)("");
			const [selectedIds, setSelectedIds] = (0, react.useState)([]);
			const [characterQuery, setCharacterQuery] = (0, react.useState)("");
			const [lorebookIds, setLorebookIds] = (0, react.useState)([]);
			const [lorebookQuery, setLorebookQuery] = (0, react.useState)("");
			const [presetId, setPresetId] = (0, react.useState)(void 0);
			const [narratorEnabled, setNarratorEnabled] = (0, react.useState)(false);
			const [multiAgent, setMultiAgent] = (0, react.useState)(true);
			const [creating, setCreating] = (0, react.useState)(false);
			const [editingSettings, setEditingSettings] = (0, react.useState)(false);
			const [settingsVersion, setSettingsVersion] = (0, react.useState)(void 0);
			(0, react.useEffect)(() => setEditingSettings(false), [props.activePlayId]);
			const openSettings = () => {
				const play = props.activePlay;
				if (play === null || running || props.branching) return;
				setTitle(play.title);
				setSelectedIds([...play.characterIds]);
				setLorebookIds([...(play.lorebookIds ?? [])]);
				setPresetId(play.presetId);
				setNarratorEnabled(play.narratorEnabled ?? false);
				setMultiAgent(play.multiAgent ?? false);
				setCharacterQuery("");
				setLorebookQuery("");
				setSettingsVersion(play.updatedAt);
				setEditingSettings(true);
			};
			const listRef = (0, react.useRef)(null);
			const pinnedRef = (0, react.useRef)(true);
			const lastRef = (0, react.useRef)({
				playKey: null,
				count: 0
			});
			(0, react.useEffect)(() => {
				const list = listRef.current;
				if (list === null) return;
				const prev = lastRef.current;
				const newPlay = prev.playKey !== props.activePlayId;
				const appended = props.messages.length > prev.count;
				lastRef.current = {
					playKey: props.activePlayId,
					count: props.messages.length
				};
				const last = props.messages[props.messages.length - 1];
				const ownSend = appended && last?.kind === "user";
				if (newPlay || ownSend || pinnedRef.current) list.scrollTop = list.scrollHeight;
			}, [
				props.messages,
				running,
				props.activePlayId
			]);
			const selectedCharacters = selectedIds.map((id) => props.characters.find((character) => character.id === id)).filter((character) => character !== void 0);
			const selectedLorebooks = lorebookIds.map((id) => props.lorebooks.find((book) => book.id === id)).filter((book) => book !== void 0);
			const visibleCharacters = (0, react.useMemo)(() => {
				const query = characterQuery.trim().toLowerCase();
				const selected = new Set(selectedIds);
				const matched = query === "" ? props.characters : props.characters.filter((character) => matchesCharacter(character, query));
				return [...matched.filter((character) => selected.has(character.id)), ...matched.filter((character) => !selected.has(character.id))];
			}, [
				characterQuery,
				props.characters,
				selectedIds
			]);
			const visibleLorebooks = (0, react.useMemo)(() => {
				const query = lorebookQuery.trim().toLowerCase();
				const selected = new Set(lorebookIds);
				const matched = query === "" ? props.lorebooks : props.lorebooks.filter((book) => matchesLorebook(book, query));
				const byId = new Map(matched.map((book) => [book.id, book]));
				return [...lorebookIds.map((id) => byId.get(id)).filter((book) => book !== void 0), ...matched.filter((book) => !selected.has(book.id))];
			}, [
				lorebookQuery,
				lorebookIds,
				props.lorebooks
			]);
			const toggleSelect = (id) => {
				setSelectedIds((prev) => prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]);
			};
			const toggleLorebook = (id) => {
				setLorebookIds((prev) => prev.includes(id) ? prev.filter((bid) => bid !== id) : [...prev, id]);
			};
			const clearLorebooks = () => {
				setLorebookIds([]);
			};
			const makeMain = (id) => {
				setSelectedIds((prev) => prev[0] === id ? prev : [id, ...prev.filter((cid) => cid !== id)]);
			};
			const clearSelection = () => {
				setSelectedIds([]);
			};
			const submitCreate = async () => {
				if (selectedCharacters.length === 0) return;
				setCreating(true);
				try {
					if (editingSettings) {
						await props.onUpdatePlay(props.activePlayId, {
							title: title.trim(),
							characterIds: selectedCharacters.map(character => character.id),
							lorebookIds: selectedLorebooks.map(book => book.id),
							presetId: presetId ?? null,
							narratorEnabled,
							multiAgent: multiAgent && props.multiAgentAvailable,
							expectedUpdatedAt: settingsVersion
						});
						setEditingSettings(false);
					} else {
						await props.onCreatePlay(title.trim(), selectedCharacters.map((character) => character.id), selectedLorebooks.map((book) => book.id), presetId, narratorEnabled, multiAgent && props.multiAgentAvailable);
					}
					setTitle("");
					setSelectedIds([]);
					setCharacterQuery("");
					setLorebookIds([]);
					setLorebookQuery("");
					setPresetId(void 0);
				} catch {} finally {
					setCreating(false);
				}
			};
			const send = () => {
				const content = draft.trim();
				if (content === "" || running) return;
				setDraft("");
				props.onSend(content).catch(() => {
					setDraft((prev) => prev === "" ? content : prev);
				});
			};
			const lastAssistantIndex = (0, react.useMemo)(() => {
				for (let index = props.messages.length - 1; index >= 0; index -= 1) {
					const kind = props.messages[index].kind;
					if (kind === "user") return -1;
					if (kind === "assistant") return index;
				}
				return -1;
			}, [props.messages]);
			const saveEdit = (0, react.useCallback)((messageId, kind, text) => {
				if (kind === "user") return props.onEditUserRetry(messageId, text);
				return props.onEditAssistant(messageId, text);
			}, [props.onEditUserRetry, props.onEditAssistant]);
			const inPlaySession = props.activeSessionId !== void 0;
			const formActions = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: TavernView_module_css_default.createFooter + (editingSettings ? " tv-settings-actions" : ""),
				children: [editingSettings && (0, react_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					disabled: creating,
					onClick: () => setEditingSettings(false),
					children: "取消"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					variant: "primary",
					disabled: selectedCharacters.length === 0 || creating || running || props.branching,
					onClick: () => void submitCreate(),
					children: creating ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, {}) : editingSettings ? "保存设置" : "开始扮演"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: TavernView_module_css_default.hint,
					children: selectedCharacters.length === 0 ? "至少选择一位角色才能开场。" : selectedCharacters[0] !== void 0 ? `第一位「${selectedCharacters[0].name}」将作为主角。` : ""
				})]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: TavernView_module_css_default.body,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: TavernView_module_css_default.sidebar,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TavernView_module_css_default.sidebarHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: TavernView_module_css_default.sidebarTitle,
							children: "酒馆会话"
						}), props.activePlayId !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							onClick: () => props.onSelectPlay(null),
							children: "＋ 新建"
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TavernView_module_css_default.list,
						children: [props.plays.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { text: "还没有会话，从右侧挑选角色开始第一场扮演" }), props.plays.map((play) => {
							const cast = play.characterIds.map((id) => props.characters.find((character) => character.id === id)).filter((character) => character !== void 0);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: `${TavernView_module_css_default.listItem} ${play.id === props.activePlayId ? TavernView_module_css_default.listItemActive : ""}`,
								onClick: () => props.onSelectPlay(play.id),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: TavernView_module_css_default.playAvatarStack,
									"aria-hidden": "true",
									children: [cast.slice(0, 3).map((character) => character.avatar !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
										className: TavernView_module_css_default.playAvatar,
										src: avatarSrc(character.avatar),
										alt: ""
									}, character.id) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: TavernView_module_css_default.playAvatar,
										children: firstGrapheme(character.name)
									}, character.id)), cast.length > 3 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: TavernView_module_css_default.playAvatarMore,
										children: ["+", cast.length - 3]
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: TavernView_module_css_default.listItemBody,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: TavernView_module_css_default.playTitle,
											children: play.title
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: TavernView_module_css_default.playMeta,
											children: cast.length > 0 ? `${cast.slice(0, 3).map((character) => character.name).join(" · ")}${cast.length > 3 ? " …" : ""}` : `${play.characterIds.length} 位角色`
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: TavernView_module_css_default.listItemMeta,
											children: [
												play.characterIds.length,
												" 角",
												play.multiAgent ? "·多 agent" : "·经典",
												(play.lorebookIds?.length ?? 0) > 0 ? `·${play.lorebookIds?.length} 书` : "",
												play.narratorEnabled ? "·叙" : ""
											]
										})
									]
								})]
							}, play.id);
						})]
					})]
				}), props.activePlay && !editingSettings && (0, react_jsx_runtime.jsx)(SceneRail, {
					play: props.activePlay,
					characters: props.characters,
					busy: running || props.branching || !inPlaySession,
					onEnter: props.onEnterCharacter,
					sceneCharacterIds: props.sceneCharacterIds,
					activeCharacterIds: props.activeCharacterIds
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: TavernView_module_css_default.chat,
					children: props.activePlayId === null || editingSettings ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: TavernView_module_css_default.content,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: TavernView_module_css_default.createSheet + (editingSettings ? " tv-settings-sheet" : ""),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: TavernView_module_css_default.createHeader,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: TavernView_module_css_default.createHeaderText,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: TavernView_module_css_default.createTitle,
											children: editingSettings ? "会话设置" : "✦ 开启新扮演"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: TavernView_module_css_default.createSubtitle,
											children: editingSettings ? "保存后从下一轮使用新设置，继续沿用当前聊天。移出的角色保留经历，再次加入时继续使用原有记忆。" : "新扮演会创建一个 DSH 会话（导演 agent）：角色卡组成系统提示，世界书按关键词自动注入， 聊天记录与轨迹完全走 DSH 会话。"
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: `${TavernView_module_css_default.castCount} ${selectedCharacters.length === 0 ? TavernView_module_css_default.castCountEmpty : ""}`,
										children: selectedCharacters.length === 0 ? "尚未选择角色" : `已选 ${selectedCharacters.length} 位`
									})]
								}),
								editingSettings && formActions,
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: TavernView_module_css_default.createBasics,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
										label: "会话标题（留空使用第一位角色名）",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: TavernView_module_css_default.fieldInput,
											value: title,
											placeholder: "例如：酒馆之夜",
											onChange: (event) => setTitle(event.target.value)
										})
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
										label: "预设与模型",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Select, {
											value: presetId,
											onChange: value => setPresetId(value || void 0),
											options: [{ value: "", label: "使用默认模型" }, ...props.presets.map((preset) => ({
												value: preset.id,
												label: preset.name
											}))],
											placeholder: "（使用默认模型）"
										})
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: TavernView_module_css_default.lorebookPicker,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: TavernView_module_css_default.lorebookPickerHead,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: TavernView_module_css_default.lorebookPickerTitleRow,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: TavernView_module_css_default.lorebookPickerTitle,
													children: "世界书（可多选）"
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: TavernView_module_css_default.lorebookPickerHint,
													children: "按选择顺序合并注入，自动关键词激活"
												})]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: TavernView_module_css_default.lorebookPickerActions,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
														className: TavernView_module_css_default.castSearch,
														value: lorebookQuery,
														placeholder: "搜索世界书…",
														"aria-label": "搜索世界书",
														onChange: (event) => setLorebookQuery(event.target.value)
													}),
													selectedLorebooks.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
														variant: "ghost",
														onClick: clearLorebooks,
														children: "清空"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: `${TavernView_module_css_default.castCount} ${selectedLorebooks.length === 0 ? TavernView_module_css_default.castCountEmpty : ""}`,
														children: selectedLorebooks.length === 0 ? "未选择" : `已选 ${selectedLorebooks.length} 本`
													})
												]
											})]
										}),
										selectedLorebooks.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: TavernView_module_css_default.lorebookOrder,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: TavernView_module_css_default.lorebookOrderLabel,
												children: "注入顺序"
											}), selectedLorebooks.map((book, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												className: TavernView_module_css_default.lorebookOrderItem,
												onClick: () => toggleLorebook(book.id),
												title: `点击移除「${book.name}」`,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: TavernView_module_css_default.lorebookOrderRank,
														children: index + 1
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: TavernView_module_css_default.lorebookOrderName,
														children: book.name
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: TavernView_module_css_default.lorebookOrderRemove,
														"aria-hidden": "true",
														children: "×"
													})
												]
											}, book.id))]
										}),
										props.lorebooks.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: TavernView_module_css_default.castEmpty,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: TavernView_module_css_default.castEmptyIcon,
													children: "✦"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: TavernView_module_css_default.castEmptyTitle,
													children: "还没有世界书"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: TavernView_module_css_default.hint,
													children: "导入 ST 世界书 JSON 后，可以在这里一次挂载多本。"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
													variant: "primary",
													onClick: props.onGoToLorebooks,
													children: "去「世界书」页导入"
												})
											]
										}) : visibleLorebooks.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: TavernView_module_css_default.castEmpty,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: TavernView_module_css_default.castEmptyIcon,
													children: "✦"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: TavernView_module_css_default.castEmptyTitle,
													children: "没有找到匹配的世界书"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: TavernView_module_css_default.hint,
													children: "试试其他书名或描述关键词。"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
													onClick: () => setLorebookQuery(""),
													children: "清除搜索"
												})
											]
										}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: TavernView_module_css_default.lorebookGrid,
											children: visibleLorebooks.map((book) => {
												const rank = lorebookIds.indexOf(book.id);
												const isSelected = rank >= 0;
												const description = compactText(book.description);
												return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
													type: "button",
													className: `${TavernView_module_css_default.lorebookCard} ${isSelected ? TavernView_module_css_default.lorebookCardSelected : ""}`,
													"aria-pressed": isSelected,
													title: isSelected ? `点击移除「${book.name}」` : `点击挂载「${book.name}」`,
													onClick: () => toggleLorebook(book.id),
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: TavernView_module_css_default.lorebookCardCheck,
															"aria-hidden": "true",
															children: isSelected ? "✓" : ""
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: TavernView_module_css_default.lorebookCardBody,
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: TavernView_module_css_default.lorebookCardName,
																children: book.name
															}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																className: TavernView_module_css_default.lorebookCardMeta,
																children: [
																	book.entryCount ?? 0,
																	" 个条目",
																	description !== "" ? ` · ${description}` : ""
																]
															})]
														}),
														isSelected && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: TavernView_module_css_default.lorebookRank,
															children: ["#", rank + 1]
														})
													]
												}, book.id);
											})
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: TavernView_module_css_default.createModes,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: `${TavernView_module_css_default.modeCard} ${multiAgent && props.multiAgentAvailable ? TavernView_module_css_default.modeCardOn : ""}`,
										disabled: !props.multiAgentAvailable,
										"aria-pressed": multiAgent && props.multiAgentAvailable,
										onClick: () => setMultiAgent((prev) => !prev),
										title: props.multiAgentAvailable ? "每个角色使用独立的 DSH agent 与记忆" : "当前未检测到 agent-loop 工厂，不可用",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: TavernView_module_css_default.modeCardTitle,
											children: "多 agent 模式"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: TavernView_module_css_default.modeCardText,
											children: ["每个角色是独立的 DSH agent，导演通过 tavern_speak 工具调遣", !props.multiAgentAvailable ? "（不可用）" : ""]
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: `${TavernView_module_css_default.modeCard} ${narratorEnabled ? TavernView_module_css_default.modeCardOn : ""}`,
										"aria-pressed": narratorEnabled,
										onClick: () => setNarratorEnabled((prev) => !prev),
										title: "导演额外描写场景与旁白",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: TavernView_module_css_default.modeCardTitle,
											children: "叙述者"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: TavernView_module_css_default.modeCardText,
											children: "导演负责描写场景过渡与旁白"
										})]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: TavernView_module_css_default.castPicker,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: TavernView_module_css_default.castPickerHead,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: TavernView_module_css_default.castPickerTitleRow,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: TavernView_module_css_default.castPickerTitle,
													children: "登场角色"
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: TavernView_module_css_default.castPickerHint,
													children: "点击卡片加入或移除 · 第 1 位为主角"
												})]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: TavernView_module_css_default.castPickerActions,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
													className: TavernView_module_css_default.castSearch,
													value: characterQuery,
													placeholder: "搜索名字、标签或设定…",
													"aria-label": "搜索角色",
													onChange: (event) => setCharacterQuery(event.target.value)
												}), selectedCharacters.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
													variant: "ghost",
													onClick: clearSelection,
													children: "清空"
												})]
											})]
										}),
										selectedCharacters.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: TavernView_module_css_default.castOrder,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: TavernView_module_css_default.castOrderLabel,
												children: "出场顺序"
											}), selectedCharacters.map((character, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												className: `${TavernView_module_css_default.castOrderItem} ${index === 0 ? TavernView_module_css_default.castOrderItemMain : ""}`,
												onClick: () => makeMain(character.id),
												title: index === 0 ? "当前主角（第 1 位）" : `点击将「${character.name}」设为主角`,
												children: [
													character.avatar !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
														className: TavernView_module_css_default.castOrderAvatar,
														src: avatarSrc(character.avatar),
														alt: ""
													}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: TavernView_module_css_default.castOrderAvatar,
														children: firstGrapheme(character.name)
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: TavernView_module_css_default.castOrderName,
														children: character.name
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: TavernView_module_css_default.castOrderRank,
														children: index === 0 ? "★ 主角" : `#${index + 1}`
													})
												]
											}, character.id))]
										}),
										props.characters.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: TavernView_module_css_default.castEmpty,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: TavernView_module_css_default.castEmptyIcon,
													children: "✦"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: TavernView_module_css_default.castEmptyTitle,
													children: "角色库还是空的"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: TavernView_module_css_default.hint,
													children: "导入 SillyTavern / TauriTavern 人物卡后，就能在这里挑选登场角色。"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
													variant: "primary",
													onClick: props.onGoToCharacters,
													children: "去「角色」页导入"
												})
											]
										}) : visibleCharacters.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: TavernView_module_css_default.castEmpty,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: TavernView_module_css_default.castEmptyIcon,
													children: "✦"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: TavernView_module_css_default.castEmptyTitle,
													children: "没有找到匹配的角色"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: TavernView_module_css_default.hint,
													children: "试试其他名字、标签或设定关键词。"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
													onClick: () => setCharacterQuery(""),
													children: "清除搜索"
												})
											]
										}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: TavernView_module_css_default.castGrid,
											children: visibleCharacters.map((character) => {
												const rank = selectedIds.indexOf(character.id);
												const isSelected = rank >= 0;
												const summary = compactText(character.description) || compactText(character.personality) || "暂无设定摘要，点击选择这位角色";
												return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
													type: "button",
													className: `${TavernView_module_css_default.castCard} ${isSelected ? TavernView_module_css_default.castCardSelected : ""}`,
													"aria-pressed": isSelected,
													title: isSelected ? `点击移除「${character.name}」` : `点击选择「${character.name}」`,
													onClick: () => toggleSelect(character.id),
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: TavernView_module_css_default.castCardMedia,
															children: character.avatar !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
																className: TavernView_module_css_default.castCardAvatar,
																src: avatarSrc(character.avatar),
																alt: ""
															}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: TavernView_module_css_default.castCardAvatar,
																children: firstGrapheme(character.name)
															})
														}),
														isSelected && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: `${TavernView_module_css_default.castRank} ${rank === 0 ? TavernView_module_css_default.castRankMain : ""}`,
															children: rank === 0 ? "★ 主角" : `#${rank + 1}`
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: TavernView_module_css_default.castCheck,
															"aria-hidden": "true",
															children: isSelected ? "✓" : ""
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: TavernView_module_css_default.castCardBody,
															children: [
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: TavernView_module_css_default.castCardName,
																	children: character.name
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: TavernView_module_css_default.castCardDesc,
																	children: summary
																}),
																(character.tags?.length ?? 0) > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: TavernView_module_css_default.castCardTags,
																	children: character.tags.slice(0, 3).map((tag) => `#${tag}`).join(" ")
																})
															]
														})
													]
												}, character.id);
											})
										})
									]
								}),
								!editingSettings && formActions
							]
						})
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: TavernView_module_css_default.chatHead,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: TavernView_module_css_default.chatTitle,
									children: props.activePlayTitle ?? "酒馆会话"
								}),
								(0, react_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									disabled: running || props.branching,
									onClick: openSettings,
									children: "会话设置"
								}),
                                (0, react_jsx_runtime.jsx)(Button, {
                                    variant: "ghost", disabled: running || props.branching || !inPlaySession,
                                    title: "使用当前模型生成剧情摘要，会产生 API 用量；原始日志保留。",
                                    onClick: props.onCompact, children: "压缩上下文"
                                }),
                                props.compactNotice && (0, react_jsx_runtime.jsx)("span", { role: "status", children: props.compactNotice }),
								!inPlaySession && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: TavernView_module_css_default.badge,
									children: "当前会话未绑定，请从左侧选择"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: { flex: 1 } }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									variant: "danger",
									onClick: () => {
										if (confirmAction(`删除会话「${props.activePlayTitle ?? ""}」？`)) props.onDeletePlay(props.activePlayId);
									},
									children: "删除"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: TavernView_module_css_default.messages,
							ref: listRef,
							onScroll: (event) => {
								const el = event.currentTarget;
								pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
							},
							children: [
								props.messages.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { text: "对话尚未开始。发送第一句话开始这场扮演。" }),
								props.messages.map((message, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MessageRow, {
									message,
									characterAvatar: props.characters.find(character => character.name === message.name)?.avatar,
									speakerAvatars: message.speakerNames?.map(name => ({ name, avatar: props.characters.find(character => character.name === name)?.avatar })),
									reasoningView: props.reasoningView,
									isLastAssistant: index === lastAssistantIndex && message.status !== "streaming",
									busy: props.branching,
									running,
									swipe: props.swipe,
									onRetry: props.onRetry,
									onSwipe: props.onSwipe,
									onSaveEdit: saveEdit
								}, message.id)),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { "aria-hidden": "true" })
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: TavernView_module_css_default.composer,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: TavernView_module_css_default.composerRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									className: TavernView_module_css_default.composerInput,
									value: draft,
									placeholder: inPlaySession ? "对角色说话…" : "请先在左侧选择一个酒馆会话",
									disabled: running || !inPlaySession,
									onChange: (event) => setDraft(event.target.value),
									onKeyDown: (event) => {
										if (event.nativeEvent.isComposing || event.keyCode === 229) return;
										if (event.key === "Enter" && !event.shiftKey) {
											event.preventDefault();
											send();
										}
									}
								}), running ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: `${TavernView_module_css_default.sendBtn} ${TavernView_module_css_default.stopBtn}`,
									onClick: () => props.onCancel(),
									title: "停止当前输出",
									children: "停止"
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: TavernView_module_css_default.sendBtn,
									disabled: props.branching || draft.trim() === "" || !inPlaySession,
									onClick: send,
									children: "发送"
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: TavernView_module_css_default.modeRow,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "聊天通过 DSH 会话进行：回复会记录在会话日志（轨迹）中；酒馆会话只显示在本页，不会出现在「对话」页。" })
							})]
						})
					] })
				})]
			});
		}
		/** Collapsible reasoning (思维链) block for one reply. */
		function ThinkingBlock(props) {
			const [open, setOpen] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `${TavernView_module_css_default.thinking} ${open ? TavernView_module_css_default.thinkingOpen : ""}`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: TavernView_module_css_default.thinkingToggle,
					onClick: () => setOpen((prev) => !prev),
					"aria-expanded": open,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: TavernView_module_css_default.thinkingCaret,
						children: open ? "▾" : "▸"
					}), props.streaming ? "思维链 · 思考中…" : "思维链"]
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: TavernView_module_css_default.thinkingBody,
					children: props.reasoningView?.(props.text, props.streaming) ?? props.text
				})]
			});
		}
		/** Status label of one reply row (streaming / stopped / truncated / error). */
		function StatusLine(props) {
			const { message } = props;
			if (message.kind !== "assistant") return null;
			if (message.status === "streaming") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: TavernView_module_css_default.msgStatusStreaming,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, {}), " 正在输出…"]
			});
			if (message.status === "stopped") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: `${TavernView_module_css_default.msgStatus} ${TavernView_module_css_default.msgStatusWarn}`,
				children: "⏸ 已停止"
			});
			if (message.status === "truncated") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: `${TavernView_module_css_default.msgStatus} ${TavernView_module_css_default.msgStatusWarn}`,
				children: "⚠ 已达长度上限，输出被截断"
			});
			if (message.status === "error") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: `${TavernView_module_css_default.msgStatus} ${TavernView_module_css_default.msgStatusError}`,
				title: message.errorText,
				children: ["✕ 生成出错：", message.errorText ?? "未知错误"]
			});
			return null;
		}
		/**
		* Rows are re-projected from the session snapshot on every streamed token, so
		* `message` is a fresh object each time even when the row it describes did not
		* change. Compare it field-wise: without this the memo would never hit during
		* streaming and the whole transcript would re-render per token.
		*/
		function sameMessageRow(prev, next) {
			const a = prev.message;
			const b = next.message;
			return JSON.stringify(prev.speakerAvatars) === JSON.stringify(next.speakerAvatars) && prev.characterAvatar === next.characterAvatar && prev.reasoningView === next.reasoningView && prev.isLastAssistant === next.isLastAssistant && prev.busy === next.busy && prev.running === next.running && prev.swipe === next.swipe && prev.onRetry === next.onRetry && prev.onSwipe === next.onSwipe && prev.onSaveEdit === next.onSaveEdit && a.id === b.id && a.kind === b.kind && a.name === b.name && a.text === b.text && a.thinking === b.thinking && a.status === b.status && a.errorText === b.errorText && a.messageId === b.messageId && a.stepText === b.stepText;
		}
		const MessageRow = (0, react.memo)(function MessageRow(props) {
			const { message } = props;
			const [editing, setEditing] = (0, react.useState)(false);
			const [draft, setDraft] = (0, react.useState)("");
			const cls = message.kind === "user" ? `${TavernView_module_css_default.msg} ${TavernView_module_css_default.msgUser}` : message.name === void 0 ? `${TavernView_module_css_default.msg} ${TavernView_module_css_default.msgNarrator}` : TavernView_module_css_default.msg;
			const canEdit = message.messageId !== void 0 && !props.running && !props.busy;
			const showSwipe = props.isLastAssistant && props.swipe !== void 0 && props.swipe.count > 1;
			const showRetry = props.isLastAssistant && !props.running;
			const streaming = message.status === "streaming";
			const richHtml = (0, react.useMemo)(() => looksLikeHtml(message.text) ? sanitizeMessageHtml(message.text) : null, [message.text]);
			const startEdit = () => {
				setDraft(message.stepText ?? message.text);
				setEditing(true);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: cls,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: TavernView_module_css_default.msgName,
						children: [
							message.kind === "assistant" && (props.speakerAvatars ?? []).map(character =>
								(0, react_jsx_runtime.jsx)(CharacterAvatar, { src: character.avatar, name: character.name }, character.name)),
							message.kind === "user" ? "你" : message.name ?? "场景", streaming && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, {})]
					}),
					message.thinking !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThinkingBlock, {
						text: message.thinking,
						reasoningView: props.reasoningView,
						streaming
					}),
					message.text !== "" && (editing ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TavernView_module_css_default.editArea,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							className: TavernView_module_css_default.editInput,
							value: draft,
							rows: Math.min(12, draft.split("\n").length + 1),
							disabled: props.busy,
							onChange: (event) => setDraft(event.target.value)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: TavernView_module_css_default.msgActions,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "primary",
								disabled: props.busy || draft.trim() === "",
								onClick: async () => {
                                    if (message.messageId !== void 0 && await props.onSaveEdit(message.messageId, message.kind, draft.trim()) === true) setEditing(false);
								},
								children: message.kind === "user" ? "保存并重新生成" : "保存"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								disabled: props.busy,
								onClick: () => setEditing(false),
								children: "取消"
							})]
						})]
					}) : richHtml !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: `${TavernView_module_css_default.msgBubble} ${TavernView_module_css_default.msgRich}`,
						dangerouslySetInnerHTML: { __html: richHtml }
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: TavernView_module_css_default.msgBubble,
						children: message.text
					})),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatusLine, { message }),
					!editing && (showRetry || canEdit) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TavernView_module_css_default.msgActions,
						children: [
							showSwipe && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: TavernView_module_css_default.swipeNav,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: TavernView_module_css_default.swipeBtn,
										disabled: props.busy || props.swipe.busy,
										onClick: () => props.onSwipe(-1),
										title: "上一条回复",
										children: "‹"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: TavernView_module_css_default.swipeCount,
										children: [
											props.swipe.current + 1,
											"/",
											props.swipe.count,
											props.swipe.busy ? " ·生成中" : ""
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: TavernView_module_css_default.swipeBtn,
										disabled: props.busy || props.swipe.busy,
										onClick: () => props.onSwipe(1),
										title: "下一条回复",
										children: "›"
									})
								]
							}),
							showRetry && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: TavernView_module_css_default.msgActionBtn,
								disabled: props.busy || props.swipe?.busy === true,
								onClick: () => props.onRetry(),
								title: "重新生成这条回复（旧回复保留在左右切换中）",
								children: "↻ 重试"
							}),
							canEdit && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: TavernView_module_css_default.msgActionBtn,
								onClick: startEdit,
								title: message.kind === "user" ? "修改这条消息并重新生成" : "直接修改这条回复",
								children: "✎ 编辑"
							}),
							props.swipe?.error !== void 0 && props.isLastAssistant && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `${TavernView_module_css_default.msgStatus} ${TavernView_module_css_default.msgStatusError}`,
								title: props.swipe.error,
								children: "✕ 上次重试失败"
							})
						]
					})
				]
			});
		}, sameMessageRow);
		//#endregion
		//#region src/client/components/CharacterPanel.tsx
		/**
		* Character library panel: card grid, import (PNG/JSON), editor, export.
		*/
		function CharacterPanel(props) {
			const selected = props.characters.find((c) => c.id === props.selectedId) ?? null;
			const fileRef = (0, react.useRef)(null);
			const [importing, setImporting] = (0, react.useState)(false);
			const [importText, setImportText] = (0, react.useState)("");
			const [showImport, setShowImport] = (0, react.useState)(false);
			const importFile = async (file) => {
				setImporting(true);
				try {
					const input = file.type === "image/png" || file.name.toLowerCase().endsWith(".png") ? await fileToDataUrl(file) : await fileToText(file);
					await props.api.createCharacter({
						input,
						source: file.name
					});
					await props.onChanged();
				} catch (error) {
					props.onError(error instanceof Error ? error.message : String(error));
				} finally {
					setImporting(false);
				}
			};
			const importTextCard = async () => {
				if (importText.trim() === "") return;
				setImporting(true);
				try {
					await props.api.createCharacter({
						input: importText.trim(),
						source: "粘贴"
					});
					setImportText("");
					setShowImport(false);
					await props.onChanged();
				} catch (error) {
					props.onError(error instanceof Error ? error.message : String(error));
				} finally {
					setImporting(false);
				}
			};
			const deleteSelected = async () => {
				if (selected === null) return;
				if (!confirmAction(`删除角色「${selected.card.data.name}」？相关会话将保留历史但不再指派。`)) return;
				try {
					await props.api.deleteCharacter(selected.id);
					props.onSelect(null);
					await props.onChanged();
				} catch (error) {
					props.onError(error instanceof Error ? error.message : String(error));
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: TavernView_module_css_default.body,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: TavernView_module_css_default.sidebar,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: TavernView_module_css_default.sidebarHead,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: TavernView_module_css_default.sidebarTitle,
									children: [
										"角色库（",
										props.characters.length,
										"）"
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									onClick: () => {
										setShowImport((prev) => !prev);
									},
									children: "导入"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									ref: fileRef,
									type: "file",
									accept: ".png,.json,image/png,application/json",
									style: { display: "none" },
									onChange: (event) => {
										const file = event.target.files?.[0];
										if (file !== void 0) importFile(file);
										event.target.value = "";
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									onClick: () => fileRef.current?.click(),
									disabled: importing,
									children: importing ? "导入中…" : "选择文件"
								})
							]
						}),
						showImport && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: TavernView_module_css_default.section,
							style: {
								padding: "8px 10px",
								gap: 6
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: TavernView_module_css_default.hint,
									children: "支持 SillyTavern / TauriTavern 人物卡：PNG 卡（含 chara 文本块）或 JSON 卡（v1/v2/v3）。"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextArea, {
									value: importText,
									onChange: setImportText,
									placeholder: "粘贴卡片 JSON…（{\"spec\":\"chara_card_v2\",…}）",
									rows: 4
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: TavernView_module_css_default.row,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										variant: "primary",
										disabled: importing || importText.trim() === "",
										onClick: () => void importTextCard(),
										children: "导入 JSON"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										onClick: () => fileRef.current?.click(),
										disabled: importing,
										children: "导入 PNG / JSON 文件"
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: TavernView_module_css_default.list,
							children: [props.characters.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { text: "角色库为空" }), props.characters.map((character) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: `${TavernView_module_css_default.listItem} ${character.id === props.selectedId ? TavernView_module_css_default.listItemActive : ""}`,
								onClick: () => props.onSelect(character.id),
								children: [character.avatar !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
									className: TavernView_module_css_default.listItemAvatar,
									src: avatarSrc(character.avatar),
									alt: ""
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: TavernView_module_css_default.listItemAvatar }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: TavernView_module_css_default.listItemName,
									children: character.card.data.name
								})]
							}, character.id))]
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: TavernView_module_css_default.content,
					children: selected === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { text: "选择左侧角色查看详情，或导入新的人物卡" }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterEditor, {
						api: props.api,
						character: selected,
						onChanged: props.onChanged,
						onError: props.onError,
						onDelete: deleteSelected
					}, selected.id)
				})]
			});
		}
		function CharacterEditor(props) {
			const data = props.character.card.data;
			const [name, setName] = (0, react.useState)(data.name);
			const [description, setDescription] = (0, react.useState)(data.description);
			const [personality, setPersonality] = (0, react.useState)(data.personality);
			const [scenario, setScenario] = (0, react.useState)(data.scenario);
			const [firstMes, setFirstMes] = (0, react.useState)(data.first_mes);
			const [mesExample, setMesExample] = (0, react.useState)(data.mes_example);
			const [systemPrompt, setSystemPrompt] = (0, react.useState)(data.system_prompt);
			const [postHistory, setPostHistory] = (0, react.useState)(data.post_history_instructions);
			const [tags, setTags] = (0, react.useState)(data.tags.join(", "));
			const [saving, setSaving] = (0, react.useState)(false);
			const save = async () => {
				setSaving(true);
				try {
					await props.api.updateCharacter(props.character.id, {
						name: name.trim() || data.name,
						description,
						personality,
						scenario,
						first_mes: firstMes,
						mes_example: mesExample,
						system_prompt: systemPrompt,
						post_history_instructions: postHistory,
						tags: tags.split(",").map((t) => t.trim()).filter((t) => t !== ""),
						creator: data.creator,
						creator_notes: data.creator_notes,
						character_version: data.character_version,
						alternate_greetings: data.alternate_greetings,
						...data.group_only_greetings !== void 0 ? { group_only_greetings: data.group_only_greetings } : {},
						...data.character_book !== void 0 ? { character_book: data.character_book } : {},
						extensions: data.extensions
					});
					await props.onChanged();
					props.onError(null);
				} catch (error) {
					props.onError(error instanceof Error ? error.message : String(error));
				} finally {
					setSaving(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: TavernView_module_css_default.editor,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TavernView_module_css_default.row,
						style: { justifyContent: "space-between" },
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: TavernView_module_css_default.row,
							children: [
								props.character.avatar !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
									className: TavernView_module_css_default.cardAvatar,
									src: avatarSrc(props.character.avatar),
									alt: ""
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: TavernView_module_css_default.cardAvatar }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: TavernView_module_css_default.sectionTitle,
									style: {
										border: "none",
										padding: 0
									},
									children: data.name
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: TavernView_module_css_default.badge,
									children: data.character_version || "v?"
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: TavernView_module_css_default.row,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								onClick: () => {
									const anchor = document.createElement("a");
									anchor.href = props.api.exportCharacterUrl(props.character.id);
									anchor.download = `${data.name}.png`;
									document.body.appendChild(anchor);
									anchor.click();
									anchor.remove();
								},
								children: "导出 PNG 卡"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "danger",
								onClick: () => void props.onDelete(),
								children: "删除"
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
						label: "名字",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextInput, {
							value: name,
							onChange: setName
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
						label: "角色设定（description）",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextArea, {
							value: description,
							onChange: setDescription,
							rows: 5
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
						label: "性格（personality）",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextArea, {
							value: personality,
							onChange: setPersonality,
							rows: 4
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
						label: "场景（scenario）",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextArea, {
							value: scenario,
							onChange: setScenario,
							rows: 3
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
						label: "开场白（first_mes）",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextArea, {
							value: firstMes,
							onChange: setFirstMes,
							rows: 3
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
						label: "对话示例（mes_example）",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextArea, {
							value: mesExample,
							onChange: setMesExample,
							rows: 4
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
						label: "系统提示（system_prompt）",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextArea, {
							value: systemPrompt,
							onChange: setSystemPrompt,
							rows: 3
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
						label: "历史后指令（post_history_instructions）",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextArea, {
							value: postHistory,
							onChange: setPostHistory,
							rows: 2
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
						label: "标签（逗号分隔）",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextInput, {
							value: tags,
							onChange: setTags
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TavernView_module_css_default.row,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "primary",
							disabled: saving,
							onClick: () => void save(),
							children: saving ? "保存中…" : "保存修改"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: TavernView_module_css_default.hint,
							children: "多 agent 模式下，每个角色是一个独立的 DSH agent（独立会话与记忆）， 其系统提示由本卡自动组装。"
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/components/LorebookPanel.tsx
		/**
		* World-book (lorebook) panel: book list, entry viewer/editor, import/export.
		*/
		function LorebookPanel(props) {
			const selected = props.lorebooks.find((book) => book.id === props.selectedId) ?? null;
			const [importText, setImportText] = (0, react.useState)("");
			const [newName, setNewName] = (0, react.useState)("");
			const importBook = async (text) => {
				try {
					await props.api.createLorebook({
						input: text,
						name: newName.trim() || void 0
					});
					setImportText("");
					setNewName("");
					await props.onChanged();
				} catch (error) {
					props.onError(error instanceof Error ? error.message : String(error));
				}
			};
			const deleteSelected = async () => {
				if (selected === null) return;
				if (!confirmAction(`删除世界书「${selected.name}」？使用它的会话将停止注入。`)) return;
				try {
					await props.api.deleteLorebook(selected.id);
					props.onSelect(null);
					await props.onChanged();
				} catch (error) {
					props.onError(error instanceof Error ? error.message : String(error));
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: TavernView_module_css_default.body,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: TavernView_module_css_default.sidebar,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: TavernView_module_css_default.sidebarHead,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: TavernView_module_css_default.sidebarTitle,
							children: [
								"世界书（",
								props.lorebooks.length,
								"）"
							]
						})
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TavernView_module_css_default.list,
						children: [props.lorebooks.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { text: "还没有世界书" }), props.lorebooks.map((book) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: `${TavernView_module_css_default.listItem} ${book.id === props.selectedId ? TavernView_module_css_default.listItemActive : ""}`,
							onClick: () => props.onSelect(book.id),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: TavernView_module_css_default.listItemName,
								children: book.name
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: TavernView_module_css_default.listItemMeta,
								children: [book.book.entries.length, " 条"]
							})]
						}, book.id))]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: TavernView_module_css_default.content,
					children: selected === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TavernView_module_css_default.section,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: TavernView_module_css_default.sectionTitle,
								children: "导入世界书"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: TavernView_module_css_default.hint,
								children: "支持 SillyTavern / TauriTavern 世界书 JSON （entries 为对象或数组均可），也支持角色卡内嵌 character_book 结构。 世界书条目会在扮演时按关键词自动激活并注入提示词。"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "书名（可选）",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextInput, {
									value: newName,
									onChange: setNewName,
									placeholder: "例如：剑与魔法大陆"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "世界书 JSON",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextArea, {
									value: importText,
									onChange: setImportText,
									rows: 8,
									placeholder: "{\"entries\": {\"0\": {\"key\": [\"酒馆\"], \"content\": \"…\"}}}"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: TavernView_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									variant: "primary",
									disabled: importText.trim() === "",
									onClick: () => void importBook(importText),
									children: "导入"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									onClick: () => {
										const input = document.createElement("input");
										input.type = "file";
										input.accept = ".json,application/json";
										input.onchange = () => {
											const file = input.files?.[0];
											if (file !== void 0) fileToText(file).then((text) => importBook(text)).catch((error) => {
												props.onError(error instanceof Error ? error.message : String(error));
											});
										};
										input.click();
									},
									children: "选择文件"
								})]
							}),
							props.lorebooks.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { text: "左侧选择世界书查看条目" })
						]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LorebookEditor, {
						api: props.api,
						book: selected,
						onChanged: props.onChanged,
						onError: props.onError,
						onDelete: deleteSelected
					}, selected.id)
				})]
			});
		}
		function LorebookEditor(props) {
			const [name, setName] = (0, react.useState)(props.book.name);
			const [entries, setEntries] = (0, react.useState)(props.book.book.entries);
			const [saving, setSaving] = (0, react.useState)(false);
			const save = async () => {
				setSaving(true);
				try {
					await props.api.updateLorebook(props.book.id, {
						name,
						entries
					}, name);
					await props.onChanged();
				} catch (error) {
					props.onError(error instanceof Error ? error.message : String(error));
				} finally {
					setSaving(false);
				}
			};
			const updateEntry = (index, patch) => {
				setEntries((prev) => prev.map((entry, i) => i === index ? {
					...entry,
					...patch
				} : entry));
			};
			const addEntry = () => {
				const uid = entries.length > 0 ? Math.max(...entries.map((e) => e.uid)) + 1 : 0;
				setEntries((prev) => [...prev, {
					uid,
					key: [],
					keysecondary: [],
					comment: "",
					content: "",
					constant: false,
					vectorized: false,
					selective: true,
					selectiveLogic: 0,
					addMemo: false,
					order: 100,
					position: 0,
					disable: false,
					ignoreBudget: false,
					excludeRecursion: false,
					preventRecursion: false,
					matchPersonaDescription: false,
					matchCharacterDescription: false,
					matchCharacterPersonality: false,
					matchCharacterDepthPrompt: false,
					matchScenario: false,
					matchCreatorNotes: false,
					delayUntilRecursion: 0,
					probability: 100,
					useProbability: true,
					depth: 4,
					outletName: "",
					group: "",
					groupOverride: false,
					groupWeight: 100,
					scanDepth: null,
					caseSensitive: null,
					matchWholeWords: null,
					useGroupScoring: null,
					automationId: "",
					role: 0,
					sticky: null,
					cooldown: null,
					delay: null,
					triggers: [],
					extensions: {}
				}]);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: TavernView_module_css_default.editor,
				style: { maxWidth: "none" },
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TavernView_module_css_default.row,
						style: { justifyContent: "space-between" },
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: TavernView_module_css_default.row,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: TavernView_module_css_default.sectionTitle,
								style: {
									border: "none",
									padding: 0
								},
								children: props.book.name
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: TavernView_module_css_default.badge,
								children: [entries.length, " 条"]
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: TavernView_module_css_default.row,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								onClick: () => {
									const anchor = document.createElement("a");
									anchor.href = props.api.exportLorebookUrl(props.book.id);
									anchor.download = `${props.book.name}.json`;
									document.body.appendChild(anchor);
									anchor.click();
									anchor.remove();
								},
								children: "导出 JSON"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "danger",
								onClick: () => void props.onDelete(),
								children: "删除"
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
						label: "书名",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextInput, {
							value: name,
							onChange: setName
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TavernView_module_css_default.row,
						style: { justifyContent: "space-between" },
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: TavernView_module_css_default.sectionTitle,
							children: "条目"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							onClick: addEntry,
							children: "＋ 新条目"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TavernView_module_css_default.entryList,
						children: [entries.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { text: "还没有条目" }), entries.map((entry, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: TavernView_module_css_default.entry,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: TavernView_module_css_default.entryHead,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: TavernView_module_css_default.entryKeys,
										children: ["关键词：", (entry.key ?? []).join("、") || "（无）"]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										variant: "ghost",
										onClick: () => setEntries((prev) => prev.filter((_, i) => i !== index)),
										children: "删除"
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									label: "关键词（逗号分隔）",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextInput, {
										value: (entry.key ?? []).join(", "),
										onChange: (value) => updateEntry(index, { key: value.split(",").map((s) => s.trim()).filter((s) => s !== "") })
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									label: "内容",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextArea, {
										value: entry.content,
										onChange: (value) => updateEntry(index, { content: value }),
										rows: 3
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: TavernView_module_css_default.row,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: TavernView_module_css_default.checkRow,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: entry.constant,
											onChange: (event) => updateEntry(index, { constant: event.target.checked })
										}), "常驻"]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: TavernView_module_css_default.checkRow,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: !entry.disable,
											onChange: (event) => updateEntry(index, { disable: !event.target.checked })
										}), "启用"]
									})]
								})
							]
						}, entry.uid))]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: TavernView_module_css_default.row,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "primary",
							disabled: saving,
							onClick: () => void save(),
							children: saving ? "保存中…" : "保存世界书"
						})
					})
				]
			});
		}
		//#endregion
		//#region src/client/components/PresetPanel.tsx
		/**
		* Preset panel: preset list, sampler editor, import/export.
		*/
		function PresetPanel(props) {
			const selected = props.presets.find((preset) => preset.id === props.selectedId) ?? null;
			const [importText, setImportText] = (0, react.useState)("");
			const [newName, setNewName] = (0, react.useState)("");
			const importPreset = async (text) => {
				try {
					const raw = JSON.parse(text);
					await props.api.createPreset({
						preset: raw,
						name: newName.trim() || void 0
					});
					setImportText("");
					setNewName("");
					await props.onChanged();
				} catch (error) {
					props.onError(error instanceof Error ? error.message : String(error));
				}
			};
			const deleteSelected = async () => {
				if (selected === null) return;
				if (!confirmAction(`删除预设「${selected.name}」？`)) return;
				try {
					await props.api.deletePreset(selected.id);
					props.onSelect(null);
					await props.onChanged();
				} catch (error) {
					props.onError(error instanceof Error ? error.message : String(error));
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: TavernView_module_css_default.body,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: TavernView_module_css_default.sidebar,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: TavernView_module_css_default.sidebarHead,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: TavernView_module_css_default.sidebarTitle,
							children: [
								"预设（",
								props.presets.length,
								"）"
							]
						})
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TavernView_module_css_default.list,
						children: [props.presets.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { text: "还没有预设" }), props.presets.map((preset) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: `${TavernView_module_css_default.listItem} ${preset.id === props.selectedId ? TavernView_module_css_default.listItemActive : ""}`,
							onClick: () => props.onSelect(preset.id),
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: TavernView_module_css_default.listItemName,
								children: [preset.name, preset.id === props.defaultPresetId ? " ★" : ""]
							})
						}, preset.id))]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: TavernView_module_css_default.content,
					children: selected === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TavernView_module_css_default.section,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: TavernView_module_css_default.sectionTitle,
								children: "导入预设"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: TavernView_module_css_default.hint,
								children: "支持 SillyTavern / TauriTavern 预设 JSON（OpenAI / TextGen / Kobold 等类型均可）。 采样参数（温度、top_p、重复惩罚等）与模型路由会在生成时应用。"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "预设名（可选，留空用 JSON 内 name）",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextInput, {
									value: newName,
									onChange: setNewName,
									placeholder: "例如：角色扮演-创意"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "预设 JSON",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextArea, {
									value: importText,
									onChange: setImportText,
									rows: 8,
									placeholder: "{\"temp\": 1.1, \"top_p\": 0.95, \"rep_pen\": 1.08, …}"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: TavernView_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									variant: "primary",
									disabled: importText.trim() === "",
									onClick: () => void importPreset(importText),
									children: "导入"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									onClick: () => {
										const input = document.createElement("input");
										input.type = "file";
										input.accept = ".json,application/json";
										input.onchange = () => {
											const file = input.files?.[0];
											if (file !== void 0) fileToText(file).then((text) => importPreset(text)).catch((error) => {
												props.onError(error instanceof Error ? error.message : String(error));
											});
										};
										input.click();
									},
									children: "选择文件"
								})]
							})
						]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetEditor, {
						api: props.api,
						preset: selected,
						isDefault: selected.id === props.defaultPresetId,
						onChanged: props.onChanged,
						onError: props.onError,
						onDelete: deleteSelected
					}, selected.id)
				})]
			});
		}
		function numberField(value) {
			return value === void 0 ? "" : String(value);
		}
		function parseNumber(text) {
			if (text.trim() === "") return null;
			const value = Number(text);
			return Number.isFinite(value) ? value : void 0;
		}
		function PresetEditor(props) {
			const preset = props.preset;
			const [name, setName] = (0, react.useState)(preset.name);
			const [model, setModel] = (0, react.useState)(preset.model ?? "");
			const [provider, setProvider] = (0, react.useState)(preset.provider ?? "");
			const [maxTokens, setMaxTokens] = (0, react.useState)(numberField(preset.maxTokens));
			const [temperature, setTemperature] = (0, react.useState)(numberField(preset.temperature));
			const [topP, setTopP] = (0, react.useState)(numberField(preset.topP));
			const [topK, setTopK] = (0, react.useState)(numberField(preset.topK));
			const [topA, setTopA] = (0, react.useState)(numberField(preset.topA));
			const [typicalP, setTypicalP] = (0, react.useState)(numberField(preset.typicalP));
			const [minP, setMinP] = (0, react.useState)(numberField(preset.minP));
			const [repPen, setRepPen] = (0, react.useState)(numberField(preset.repPen));
			const [repPenRange, setRepPenRange] = (0, react.useState)(numberField(preset.repPenRange));
			const [repPenSlope, setRepPenSlope] = (0, react.useState)(numberField(preset.repPenSlope));
			const [presencePenalty, setPresencePenalty] = (0, react.useState)(numberField(preset.presencePenalty));
			const [frequencyPenalty, setFrequencyPenalty] = (0, react.useState)(numberField(preset.frequencyPenalty));
			const [systemPrompt, setSystemPrompt] = (0, react.useState)(preset.systemPrompt ?? "");
			const [saving, setSaving] = (0, react.useState)(false);
			const save = async () => {
				setSaving(true);
				try {
					await props.api.updatePreset(preset.id, {
						name: name.trim() || preset.name,
						model: model.trim() === "" ? null : model.trim(),
						provider: provider.trim() === "" ? null : provider.trim(),
						maxTokens: parseNumber(maxTokens),
						temperature: parseNumber(temperature),
						topP: parseNumber(topP),
						topK: parseNumber(topK),
						topA: parseNumber(topA),
						typicalP: parseNumber(typicalP),
						minP: parseNumber(minP),
						repPen: parseNumber(repPen),
						repPenRange: parseNumber(repPenRange),
						repPenSlope: parseNumber(repPenSlope),
						presencePenalty: parseNumber(presencePenalty),
						frequencyPenalty: parseNumber(frequencyPenalty),
						systemPrompt
					});
					await props.onChanged();
				} catch (error) {
					props.onError(error instanceof Error ? error.message : String(error));
				} finally {
					setSaving(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: TavernView_module_css_default.editor,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TavernView_module_css_default.row,
						style: { justifyContent: "space-between" },
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: TavernView_module_css_default.row,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: TavernView_module_css_default.sectionTitle,
								style: {
									border: "none",
									padding: 0
								},
								children: [
									preset.name,
									" ",
									props.isDefault ? "（默认）" : ""
								]
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: TavernView_module_css_default.row,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								onClick: () => {
									const anchor = document.createElement("a");
									anchor.href = props.api.exportPresetUrl(preset.id);
									anchor.download = `${preset.name}.json`;
									document.body.appendChild(anchor);
									anchor.click();
									anchor.remove();
								},
								children: "导出 JSON"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "danger",
								onClick: () => void props.onDelete(),
								children: "删除"
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TavernView_module_css_default.row,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "名称",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextInput, {
									value: name,
									onChange: setName
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "模型（custom_model）",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextInput, {
									value: model,
									onChange: setModel,
									placeholder: "例如 deepseek-chat"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "Provider（DSH 路由）",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextInput, {
									value: provider,
									onChange: setProvider,
									placeholder: "留空用默认"
								})
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: TavernView_module_css_default.sectionTitle,
						children: "采样参数"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TavernView_module_css_default.row,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "温度 temp",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextInput, {
									value: temperature,
									onChange: setTemperature,
									placeholder: "1.0"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "top_p",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextInput, {
									value: topP,
									onChange: setTopP,
									placeholder: "0.95"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "top_k",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextInput, {
									value: topK,
									onChange: setTopK,
									placeholder: "0"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "top_a",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextInput, {
									value: topA,
									onChange: setTopA,
									placeholder: "0"
								})
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TavernView_module_css_default.row,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "typical_p",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextInput, {
									value: typicalP,
									onChange: setTypicalP,
									placeholder: "1"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "min_p",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextInput, {
									value: minP,
									onChange: setMinP,
									placeholder: "0"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "重复惩罚 rep_pen",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextInput, {
									value: repPen,
									onChange: setRepPen,
									placeholder: "1.08"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "rep_pen_range",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextInput, {
									value: repPenRange,
									onChange: setRepPenRange,
									placeholder: "1024"
								})
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TavernView_module_css_default.row,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "rep_pen_slope",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextInput, {
									value: repPenSlope,
									onChange: setRepPenSlope,
									placeholder: "0.7"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "存在惩罚",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextInput, {
									value: presencePenalty,
									onChange: setPresencePenalty,
									placeholder: "0"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "频率惩罚",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextInput, {
									value: frequencyPenalty,
									onChange: setFrequencyPenalty,
									placeholder: "0"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "max_tokens",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextInput, {
									value: maxTokens,
									onChange: setMaxTokens,
									placeholder: "模型默认"
								})
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
						label: "系统提示覆盖（叠加在角色卡之上）",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextArea, {
							value: systemPrompt,
							onChange: setSystemPrompt,
							rows: 3
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: TavernView_module_css_default.row,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "primary",
							disabled: saving,
							onClick: () => void save(),
							children: saving ? "保存中…" : "保存预设"
						})
					})
				]
			});
		}
		//#endregion
		//#region src/client/components/TauriTavernImportPanel.tsx
		/**
		* Local TauriTavern import panel: points the host plugin at a local
		* TauriTavern installation/data directory and batch-imports the tavern
		* categories it manages (characters, world books, presets).
		*/
		function TauriTavernImportPanel(props) {
			const [path, setPath] = (0, react.useState)("");
			const [characters, setCharacters] = (0, react.useState)(true);
			const [lorebooks, setLorebooks] = (0, react.useState)(true);
			const [presets, setPresets] = (0, react.useState)(true);
			const [running, setRunning] = (0, react.useState)(false);
			const [report, setReport] = (0, react.useState)(null);
			const startImport = async () => {
				if (path.trim() === "" || running) return;
				setRunning(true);
				setReport(null);
				try {
					const result = await props.api.importTauriTavern({
						path: path.trim(),
						characters,
						lorebooks,
						presets
					});
					setReport(result);
					await props.onChanged();
					props.onError(null);
				} catch (error) {
					props.onError(error instanceof Error ? error.message : String(error));
				} finally {
					setRunning(false);
				}
			};
			const total = report === null ? 0 : report.imported.characters + report.imported.lorebooks + report.imported.presets;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: TavernView_module_css_default.content,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: TavernView_module_css_default.editor,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: TavernView_module_css_default.sectionTitle,
							children: "从本地 TauriTavern 目录导入"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: TavernView_module_css_default.hint,
							children: "读取 DSH 进程所在机器上的原始 TauriTavern 数据目录（不会修改原目录）。 可填写安装目录、data 目录、default-user 目录，或其下任意子目录。"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
							label: "TauriTavern 安装 / 数据目录",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextInput, {
								value: path,
								onChange: setPath,
								placeholder: "例如 E:\\TauriTavern 或 E:\\TauriTavern\\data\\default-user",
								disabled: running
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: TavernView_module_css_default.row,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Checkbox, {
									checked: characters,
									onChange: setCharacters,
									label: "人物卡（characters/*.png、*.json）"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Checkbox, {
									checked: lorebooks,
									onChange: setLorebooks,
									label: "世界书（worlds/*.json）"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Checkbox, {
									checked: presets,
									onChange: setPresets,
									label: "预设（context / instruct / textgen 等）"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: TavernView_module_css_default.row,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "primary",
								disabled: running || path.trim() === "" || !characters && !lorebooks && !presets,
								onClick: () => void startImport(),
								children: running ? "导入中…" : "开始导入"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: TavernView_module_css_default.hint,
								children: "数据会追加到酒馆对应资料库；重复执行会自动跳过已导入的同源数据。"
							})]
						}),
						report === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { text: "尚未从本地目录导入" }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: TavernView_module_css_default.section,
							style: { gap: 8 },
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: TavernView_module_css_default.sectionTitle,
									style: {
										border: "none",
										padding: 0
									},
									children: [
										"导入完成：共 ",
										total,
										" 条"
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: TavernView_module_css_default.hint,
									children: ["识别目录：", report.userDir]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: TavernView_module_css_default.hint,
									children: [
										"人物卡 ",
										report.imported.characters,
										" · 世界书 ",
										report.imported.lorebooks,
										" · 预设 ",
										report.imported.presets
									]
								}),
								report.issues.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: TavernView_module_css_default.entryList,
									children: report.issues.map((issue, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: TavernView_module_css_default.entry,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: TavernView_module_css_default.entryHead,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: TavernView_module_css_default.entryKeys,
												children: [
													issue.category,
													" / ",
													issue.file
												]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: TavernView_module_css_default.hint,
												children: "跳过"
											})]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: TavernView_module_css_default.entryContent,
											children: issue.reason
										})]
									}, `${issue.file}-${index}`))
								})
							]
						})
					]
				})
			});
		}
		//#endregion
		//#region src/client/TavernView.tsx
		/**
		* Tavern view: the conversation-view entry the tavern plugin registers.
		* The chat area renders the ACTIVE play's DSH session (the director
		* session) directly from its client runtime snapshot, without switching the
		* global current session, and sends through that session's conversation
		* service; the library panels manage characters / world books / presets
		* through the host route.
		*/
		/** Extract text blocks from a content block list. */
		function blocksToText(blocks) {
			return blocks.filter((block) => block.type === "text" && typeof block.text === "string").map((block) => block.text).join("");
		}
		/** Join one kind of assistant blocks (text / reasoning). */
		function joinBlocks(blocks, kind) {
			return blocks.filter((block) => block.kind === kind && typeof block.text === "string").map((block) => block.text).join("");
		}
		/** `角色名：台词` line prefix that the classic-mode prompt asks the model for. */
		const SPEAKER_LINE_RE = /^\s*([^：:\n]{1,20})[：:]\s*([\s\S]*)$/;
		/**
		* Split a classic-mode reply into consecutive speaker runs.
		*
		* In classic (single-agent) mode one assistant step contains the whole cast's
		* lines, each prefixed with `角色名：` per `buildClassicSystem`. Matching only
		* the head of the step would file every line under the first speaker, so scan
		* line by line and start a new run whenever a line opens with a name the play
		* actually knows. Unknown prefixes (`注意：`, a colon mid-sentence) are not
		* speakers and keep flowing into the current run, which preserves the previous
		* behaviour — one nameless row holding the entire reply — for replies that
		* never name a character.
		*/
		function splitSpeakerRuns(text, characterNames) {
			const runs = [];
			for (const line of text.split("\n")) {
				const match = SPEAKER_LINE_RE.exec(line);
				const speaker = match !== null && characterNames.includes(match[1].trim()) ? match[1].trim() : void 0;
				if (speaker !== void 0) runs.push({
					name: speaker,
					lines: [match[2]]
				});
				else if (runs.length === 0) runs.push({ lines: [line] });
				else runs[runs.length - 1].lines.push(line);
			}
			const out = runs.map((run) => ({
				...run.name !== void 0 ? { name: run.name } : {},
				text: run.lines.join("\n").trim()
			})).filter((run) => run.text !== "");
			return out.length > 0 ? out : [{ text: text.trim() }];
		}
		/**
		* Project ordered user/assistant rows from the session's Chat target snapshot,
		* attaching per-row generation status (streaming / stopped / truncated / error)
		* and thinking text from the chat node's turn metadata.
		*/
		function extractMessages(snapshot, characterNames) {
			const turnMarks = /* @__PURE__ */ new Map();
			for (const key of snapshot.order) {
				const node = snapshot.nodes.get(key);
				if (node === void 0) continue;
				const data = node.data;
				if (node.kind === "turn-max-tokens" && typeof data.turn === "number") turnMarks.set(data.turn, {
					...turnMarks.get(data.turn),
					truncated: true
				});
				else if (node.kind === "turn-error" && typeof data.turn === "number") {
					const error = typeof data.message === "string" && data.message !== "" ? data.message : "生成失败";
					turnMarks.set(data.turn, {
						...turnMarks.get(data.turn),
						error
					});
				}
			}
			const out = [];
			for (const key of snapshot.order) {
				const node = snapshot.nodes.get(key);
				if (node === void 0) continue;
				if (node.kind === "user" || node.kind === "steering") {
					const data = node.data;
					const text = blocksToText(data.content ?? []).trim();
					if (text !== "" && text !== "[开场] 扮演开始。") out.push({
						id: key,
						kind: "user",
						text,
						status: "done",
						messageId: node.id
					});
				} else if (node.kind === "assistant-step") {
					const data = node.data;
					const blocks = data.blocks ?? [];
					const thinking = joinBlocks(blocks, "reasoning").trim();
					const text = joinBlocks(blocks, "text").trim();
					if (text === "" && thinking === "") continue;
					let status = data.status === "running" ? "streaming" : data.status === "interrupted" ? "stopped" : "done";
					let errorText;
					const mark = typeof data.turn === "number" ? turnMarks.get(data.turn) : void 0;
					if (status === "done" && mark?.truncated === true) status = "truncated";
					if (mark?.error !== void 0) {
						status = "error";
						errorText = mark.error;
					}
					const runs = splitSpeakerRuns(text, characterNames);
					runs.forEach((run, index) => {
						const isTail = index === runs.length - 1;
						out.push({
							id: `${key}#${index}`,
							kind: "assistant",
							...run.name !== void 0 ? { name: run.name } : {},
							text: run.text,
							...thinking !== "" && index === 0 ? { thinking } : {},
							status: isTail ? status : "done",
							...isTail && errorText !== void 0 ? { errorText } : {},
							...isTail && data.finalNode?.messageId !== void 0 ? {
								messageId: data.finalNode.messageId,
								stepText: text
							} : {}
						});
					});
				}
			}
			return out;
		}
		/** Load the full tavern state snapshot. */
		async function loadState(api) {
			return api.state();
		}
		/** Subscribe to a retained session's lifecycle snapshot. */
		function useSessionSnapshot(session) {
			return (0, react.useSyncExternalStore)((0, react.useCallback)((onStoreChange) => session?.subscribe(onStoreChange) ?? (() => {}), [session]), (0, react.useCallback)(() => session?.getSnapshot(), [session]));
		}
		/** Subscribe to a retained session's Chat target snapshot. */
		function useChatSnapshot(source) {
			return (0, react.useSyncExternalStore)((0, react.useCallback)((onStoreChange) => source?.subscribe(onStoreChange) ?? (() => {}), [source]), (0, react.useCallback)(() => source?.getSnapshot(), [source]));
		}
		function CharacterMemoryPanel(props) {
			const [selectedId, setSelectedId] = (0, react.useState)(void 0);
			const play = props.play;
			if (play === null) return (0, react_jsx_runtime.jsx)(Empty, { text: "请先在会话页选择一个酒馆会话，再管理该会话的角色经历。" });
			const characters = props.characters.filter(character => play.characterIds.includes(character.id));
			const character = characters.find(character => character.id === selectedId) ?? characters[0];
			if (!character) return (0, react_jsx_runtime.jsx)(Empty, { text: "当前会话没有可用角色。" });
			return (0, react_jsx_runtime.jsxs)("div", {
				className: TavernView_module_css_default.content,
				style: { overflowY: "auto" },
				children: [
					(0, react_jsx_runtime.jsx)("h3", { children: "角色经历 · " + play.title }),
					(0, react_jsx_runtime.jsx)(Field, {
						label: "当前会话中的角色",
						children: (0, react_jsx_runtime.jsx)(Select, {
							value: character.id,
							onChange: setSelectedId,
							options: characters.map(character => ({ value: character.id, label: character.card.data.name }))
						})
					}),
					(0, react_jsx_runtime.jsx)(CharacterMemoryEditor, { ...props, character }, play.id + ":" + character.id + ":" + play.updatedAt)
				]
			});
		}
		function CharacterMemoryEditor(props) {
			const memory = props.play.characterMemories?.[props.character.id];
			const [entries, setEntries] = (0, react.useState)(() => structuredClone(memory?.book.entries ?? []));
			const [enabled, setEnabled] = (0, react.useState)(memory?.enabled ?? true);
			const [autoEnabled, setAutoEnabled] = (0, react.useState)(memory?.autoReview?.enabled ?? false);
            const [interval, setInterval] = (0, react.useState)(String(memory?.autoReview?.interval ?? 5));
            const [dismissAutomaticIds, setDismissAutomaticIds] = (0, react.useState)([]);
            const [sourceId, setSourceId] = (0, react.useState)(void 0);
			const [saving, setSaving] = (0, react.useState)(false);
			const [notice, setNotice] = (0, react.useState)("");
			const busy = saving || props.running;
			const updateEntry = (index, patch) => setEntries(previous => previous.map((entry, i) => i === index ? { ...entry, ...patch } : entry));
			const save = async () => {
				if (busy) return;
				if (memory?.suspended && !confirmAction("这份经历来自其他剧情分支。确认已经核对，重新用于当前分支？")) return;
				setSaving(true);
				props.onError(null);
				try {
					await props.api.updateCharacterMemory(props.play.id, props.character.id, {
						name: memory?.name ?? props.character.card.data.name + "·经历",
						book: { ...memory?.book, entries },
                        autoReview: { enabled: autoEnabled, interval: Number(interval) },
                        dismissAutomaticIds,
						enabled,
						expectedUpdatedAt: props.play.updatedAt
					});
					await props.onChanged();
					setNotice("经历已保存，从下一轮生效。");
				} catch (error) {
					props.onError(error instanceof Error ? error.message : String(error));
				} finally { setSaving(false); }
			};
			return (0, react_jsx_runtime.jsxs)("fieldset", {
				disabled: busy,
				style: { border: "none", padding: 0, minWidth: 0 },
				children: [
					(0, react_jsx_runtime.jsx)("p", { children: "仅用于本会话及该角色；主持者可参考，其他角色不会自动获知。过去经历、当前状态和待发生约定请分别说明。" }),
					memory?.suspended && (0, react_jsx_runtime.jsx)("p", { role: "status", children: "当前剧情分支与这份经历的来源不同，已暂停生效。核对内容后可重新保存启用。" }),
					(0, react_jsx_runtime.jsx)(Checkbox, { label: "启用本角色经历", checked: enabled, onChange: setEnabled }),
                    (0, react_jsx_runtime.jsx)(Checkbox, { label: "随正常回复自动检查经历", checked: autoEnabled, onChange: setAutoEnabled }),
                    (0, react_jsx_runtime.jsx)(Field, { label: "检查间隔（2–50 轮，一问一答算一轮）", children: (0, react_jsx_runtime.jsx)(TextInput, { value: interval, onChange: setInterval }) }),
                    (0, react_jsx_runtime.jsx)("p", { children: "每达到间隔，在下一次正常回复时检查此前已完成的对话；没有新事实就不添加。不单独发起生成请求，工具交互仍消耗令牌。自动经历与手动条目分开，保存后生效。" }),
                    memory?.autoReview?.checkedAt && (0, react_jsx_runtime.jsx)("p", { children: "最近检查：" + memory.autoReview.checkedAt + "，新增 " + (memory.autoReview.lastAdded ?? 0) + " 条。" }),
                    ...(memory?.automaticEntries ?? []).filter(entry => !entry.disable && !dismissAutomaticIds.includes(entry.uid)).map(entry => (0, react_jsx_runtime.jsxs)("details", { children: [
                        (0, react_jsx_runtime.jsx)("summary", { children: entry.comment }),
                        (0, react_jsx_runtime.jsx)("p", { children: entry.content }),
                        (0, react_jsx_runtime.jsx)("blockquote", { children: "来源原文：" + entry.evidence.quote }),
                        (0, react_jsx_runtime.jsx)(Button, { children: "撤回此条（保存后生效）", onClick: () => setDismissAutomaticIds(previous => [...previous, entry.uid]) })
                    ] }, entry.uid)),

					(0, react_jsx_runtime.jsx)("p", { children: "共 " + entries.length + " 条。常驻条目每轮提供，其余按关键词触发，与世界书共享预算。" }),
					entries.length === 0 && (0, react_jsx_runtime.jsxs)("div", { children: [
						(0, react_jsx_runtime.jsx)(Select, { value: sourceId, onChange: setSourceId, placeholder: "选择作为经历素材的世界书", options: props.lorebooks.map(book => ({ value: book.id, label: book.name })) }),
						(0, react_jsx_runtime.jsx)(Button, {
							disabled: !sourceId, children: "载入条目",
							onClick: () => {
								const book = props.lorebooks.find(book => book.id === sourceId);
								if (book) setEntries(structuredClone(book.book.entries));
							}
						})
					] }),
					entries.map((entry, index) => (0, react_jsx_runtime.jsxs)("details", {
						open: index === 0,
						style: { margin: "12px 0" },
						children: [
							(0, react_jsx_runtime.jsx)("summary", { children: (index + 1) + ". " + (entry.comment || "经历") + (entry.constant ? " · 常驻" : "") + (entry.disable ? " · 已停用" : "") }),
							(0, react_jsx_runtime.jsx)(Field, { label: "标题", children: (0, react_jsx_runtime.jsx)(TextInput, { value: entry.comment ?? "", onChange: comment => updateEntry(index, { comment }) }) }),
							(0, react_jsx_runtime.jsx)(Field, { label: "经历内容", children: (0, react_jsx_runtime.jsx)(TextArea, { value: entry.content, rows: 5, onChange: content => updateEntry(index, { content }) }) }),
							(0, react_jsx_runtime.jsx)(Field, { label: "触发词（逗号分隔）", children: (0, react_jsx_runtime.jsx)(TextInput, { value: (entry.key ?? []).join("，"), onChange: value => updateEntry(index, { key: value.split(/[,，]/).map(key => key.trim()).filter(Boolean) }) }) }),
							(0, react_jsx_runtime.jsx)(Checkbox, { label: "常驻", checked: entry.constant, onChange: constant => updateEntry(index, { constant }) }),
							(0, react_jsx_runtime.jsx)(Checkbox, { label: "启用此条", checked: !entry.disable, onChange: value => updateEntry(index, { disable: !value }) })
						]
					}, entry.uid)),
					(0, react_jsx_runtime.jsx)(Button, { children: "添加经历", onClick: () => setEntries(previous => [...previous, { uid: previous.reduce((max, entry) => Math.max(max, entry.uid), -1) + 1, key: [], keysecondary: [], comment: "新经历", content: "", constant: false, disable: false, order: 80 }]) }),
					(0, react_jsx_runtime.jsx)(Button, { variant: "primary", disabled: busy, onClick: save, children: saving ? "保存中…" : "保存经历" }),
					(0, react_jsx_runtime.jsx)("p", { role: "status", children: notice })
				]
			});
		}

		function TavernView({ useStore, actions, useSessions, retainSession, renderSlot, SessionProvider }) {
			const panel = useStore((s) => s.panel);
			const playId = useStore((s) => s.playId);
			const selectedCharacterId = useStore((s) => s.selectedCharacterId);
			const selectedLorebookId = useStore((s) => s.selectedLorebookId);
			const selectedPresetId = useStore((s) => s.selectedPresetId);
			const error = useStore((s) => s.error);
			const [state, setState] = (0, react.useState)(null);
			const [loading, setLoading] = (0, react.useState)(true);
			const rootRef = (0, react.useRef)(null);
			const [style, setStyle] = (0, react.useState)("dsh");
			const refresh = (0, react.useCallback)(async () => {
				const next = await loadState(tavernApi);
				setState(next);
				setLoading(false);
			}, []);
			(0, react.useEffect)(() => {
				refresh().catch((e) => {
					actions.setError(e instanceof Error ? e.message : String(e));
					setLoading(false);
				});
			}, [refresh, actions]);
			(0, react.useEffect)(() => {
				if (state?.style !== void 0) setStyle(state.style);
			}, [state?.style]);
			const changeStyle = (0, react.useCallback)((next) => {
				setStyle(next);
				tavernApi.setStyle(next).catch((e) => {
					actions.setError(e instanceof Error ? e.message : String(e));
				});
			}, [actions]);
			const activationRequest = (0, react.useRef)(0);
            const selectPlay = (0, react.useCallback)(async (id) => {
                const request = ++activationRequest.current;
                actions.setError(null);
                const playSummary = state?.plays.find(play => play.id === id);
                if (!playSummary) { actions.setError("会话列表已变化，请刷新后重新选择。"); return; }
                try {
                    // Do not retain/observe the session until Tavern owns its writer.
                    await tavernApi.activatePlay(id);
                    if (request !== activationRequest.current) return;
                    actions.setPlayId(id);
                    actions.setPanel("chat");
                } catch (error) {
                    if (request === activationRequest.current) actions.setError(error instanceof Error ? error.message : String(error));
                }
            }, [actions, state]);
			const createPlay = (0, react.useCallback)(async (title, characterIds, lorebookIds, presetId, narratorEnabled, multiAgent) => {
				try {
					const created = await tavernApi.createPlay({
						title,
						characterIds,
						lorebookIds,
						presetId,
						narratorEnabled,
						multiAgent
					});
					await refresh();
					actions.setPlayId(created.id);
					actions.setPanel("chat");
				} catch (e) {
					actions.setError(e instanceof Error ? e.message : String(e));
					throw e;
				}
			}, [actions, refresh]);
			const updatePlay = (0, react.useCallback)(async (id, patch) => {
				actions.setError(null);
				try {
					await tavernApi.updatePlay(id, patch);
					await refresh();
				} catch (error) {
					actions.setError(error instanceof Error ? error.message : String(error));
					throw error;
				}
			}, [actions, refresh]);
			const deletePlay = (0, react.useCallback)(async (id) => {
				try {
					await tavernApi.deletePlay(id);
					if (playId === id) actions.setPlayId(null);
					await refresh();
				} catch (e) {
					actions.setError(e instanceof Error ? e.message : String(e));
				}
			}, [
				actions,
				playId,
				refresh
			]);
			const characterNames = (0, react.useMemo)(() => state?.characters.map((c) => c.card.data.name) ?? [], [state]);
			const activePlay = playId !== null ? state?.plays.find((p) => p.id === playId) ?? null : null;
			const playSessionId = activePlay?.sessionId;
			const playSessionKnown = useSessions((s) => playSessionId !== void 0 && s.byId[playSessionId] !== void 0);
			const [handle, setHandle] = (0, react.useState)(void 0);
			(0, react.useEffect)(() => {
				if (playSessionId === void 0 || !playSessionKnown) {
					setHandle(void 0);
					return;
				}
				let next;
				try {
					next = retainSession(playSessionId);
				} catch (error) {
					actions.setError(error instanceof Error ? error.message : String(error));
					setHandle(void 0);
					return;
				}
				setHandle(next);
				let disposed = false;
				next.ready.catch((error) => {
					if (disposed) return;
					actions.setError(error instanceof Error ? error.message : String(error));
				});
				return () => {
					disposed = true;
					next.release();
				};
			}, [
				playSessionId,
				playSessionKnown,
				retainSession,
				actions
			]);
			const activeHandle = handle !== void 0 && handle.session.sessionId === playSessionId ? handle : void 0;
			const sessionSnapshot = useSessionSnapshot(activeHandle?.session);
            (0, react.useEffect)(() => { if (panel === "memories") refresh().catch(e => actions.setError(String(e))); }, [panel, playId, refresh, actions]);
			const chatSnapshot = useChatSnapshot(activeHandle?.chat);
			const displaySessionId = activeHandle?.session.sessionId;
			const reasoningReference = activeHandle?.reference;
			const reasoningView = (0, react.useMemo)(() => {
				if (reasoningReference === void 0) return void 0;
				return (text, running) => (0, react_jsx_runtime.jsx)(SessionProvider, {
					session: reasoningReference,
					empty: () => text,
					children: renderSlot("tavern.reasoning.body", { rawText: text, text, running })
				});
			}, [reasoningReference, renderSlot, SessionProvider]);
			(0, react.useLayoutEffect)(() => {
				const seat = (rootRef.current?.closest("[data-conversation-scroll]"))?.querySelector("[data-composer-seat]") ?? document.querySelector("[data-composer-seat]");
				if (seat === null || seat === void 0) return;
				const startHeight = seat.getBoundingClientRect().height;
				if (startHeight <= 0) return;
				const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
				const previousStyles = {
					maxHeight: seat.style.maxHeight,
					opacity: seat.style.opacity,
					transform: seat.style.transform,
					visibility: seat.style.visibility,
					overflow: seat.style.overflow,
					pointerEvents: seat.style.pointerEvents
				};
				const restore = () => {
					seat.style.maxHeight = previousStyles.maxHeight;
					seat.style.opacity = previousStyles.opacity;
					seat.style.transform = previousStyles.transform;
					seat.style.visibility = previousStyles.visibility;
					seat.style.overflow = previousStyles.overflow;
					seat.style.pointerEvents = previousStyles.pointerEvents;
				};
				if (typeof seat.animate !== "function") {
					seat.style.maxHeight = "0px";
					seat.style.opacity = "0";
					seat.style.transform = "translateY(8px)";
					seat.style.visibility = "hidden";
					seat.style.overflow = "hidden";
					seat.style.pointerEvents = "none";
					return restore;
				}
				seat.style.overflow = "hidden";
				seat.style.pointerEvents = "none";
				const animation = seat.animate([{
					maxHeight: `${startHeight}px`,
					opacity: "1",
					transform: "translateY(0)"
				}, {
					maxHeight: "0px",
					opacity: "0",
					transform: "translateY(8px)"
				}], {
					duration: reduceMotion ? 0 : 200,
					easing: "ease",
					fill: "forwards"
				});
				return () => {
					animation.cancel();
					restore();
				};
			}, []);
			const sceneProjection = (0, react.useMemo)(() => {
				const nameFor = id => state?.characters.find(character => character.id === id)?.card.data.name;
				const override = activePlay?.sceneOverride;
				return projectScene(
					chatSnapshot === void 0 ? [] : extractMessages(chatSnapshot, characterNames),
					characterNames,
					(activePlay?.characterIds.slice(0, 1) ?? []).map(nameFor).filter(Boolean),
					override ? {
						afterMessageId: override.afterMessageId,
						names: override.characterIds.map(nameFor).filter(Boolean),
						activeName: nameFor(override.activeCharacterId)
					} : void 0);
			}, [chatSnapshot, characterNames, activePlay, state]);
			const messages = sceneProjection.rows;
			const sceneIdsFor = names => state?.characters.filter(character => names.includes(character.card.data.name)).map(character => character.id) ?? [];
			const running = (sessionSnapshot?.running ?? false) || chatSnapshot !== void 0 && chatSnapshot.legacy.partial !== null;
			const [advancedFrom, setAdvancedFrom] = (0, react.useState)(void 0);
			const lastMessage = messages.at(-1);
			const replyKey = lastMessage?.messageId === void 0 || displaySessionId === void 0
				? void 0 : JSON.stringify([displaySessionId, lastMessage.messageId]);
			const swipe = (0, react.useMemo)(() => {
				if (playId === null || state === null || running || replyKey === void 0 ||
					replyKey === advancedFrom || lastMessage?.kind !== "assistant") return void 0;
				const branches = state.swipes.filter(branch =>
					branch.playId === playId && branch.assistantMessageId === lastMessage.messageId);
				if (branches.length === 0) return void 0;
				return branches.reduce((a, b) => a.updatedAt >= b.updatedAt ? a : b);
			}, [state, playId, running, replyKey, advancedFrom, lastMessage]);
			const [branching, setBranching] = (0, react.useState)(false);
			const branchPending = (0, react.useRef)(false);
			(0, react.useEffect)(() => {
				if (!state?.swipes.some(branch => branch.playId === playId && branch.busy)) return;
				const timer = setTimeout(() => {
					refresh().catch(() => {});
				}, 800);
				return () => clearTimeout(timer);
			}, [
				state,
				playId,
				swipe?.busy,
				running,
				refresh
			]);
			const runBranchOp = (0, react.useCallback)((op) => {
				if (branching || branchPending.current) return Promise.resolve(false);
				branchPending.current = true;
				setBranching(true);
				actions.setError(null);
				return Promise.resolve().then(op).then(async () => { await refresh(); return true; }).catch((e) => {
                    actions.setError(e instanceof Error ? e.message : String(e));
                    return false;
                }).finally(() => {
					branchPending.current = false;
					setBranching(false);
				});
			}, [
				actions,
				branching,
				refresh
			]);
			const enterCharacter = (0, react.useCallback)((characterId) => {
				if (activePlay === null || running) return;
				setAdvancedFrom(replyKey);
				runBranchOp(() => tavernApi.enterCharacter(activePlay.id, characterId, activePlay.updatedAt).catch(error => {
					setAdvancedFrom(current => current === replyKey ? void 0 : current);
					throw error;
				}));
			}, [activePlay, running, replyKey, runBranchOp]);
            const [compactNotice, setCompactNotice] = (0, react.useState)("");
            const compactContext = (0, react.useCallback)(() => {
                if (!activePlay) return;
                setCompactNotice("正在整理剧情摘要…");
                return runBranchOp(async () => {
                    try {
                        const result = await tavernApi.compactPlay(activePlay.id);
                        setCompactNotice(result.compacted ? `已压缩 ${result.items} 项旧上下文；后续从剧情摘要继续，原日志保留。` : "目前没有可压缩的旧上下文。");
                    } catch (error) { setCompactNotice(""); throw error; }
                });
            }, [activePlay, runBranchOp]);
			const retryReply = (0, react.useCallback)(() => {
				if (activePlay === null) return;
				runBranchOp(() => tavernApi.retryReply(activePlay.id));
			}, [activePlay, runBranchOp]);
			const swipeReply = (0, react.useCallback)((step) => {
				if (activePlay === null || swipe === void 0) return;
				runBranchOp(() => tavernApi.swipeReply(activePlay.id, swipe.key, step));
			}, [
				activePlay,
				swipe,
				runBranchOp
			]);
			const editAssistant = (0, react.useCallback)((messageId, text) => {
				if (activePlay === null) return Promise.resolve(false);
				return runBranchOp(() => tavernApi.editAssistantMessage(activePlay.id, messageId, text));
			}, [activePlay, runBranchOp]);
			const editUserRetry = (0, react.useCallback)((messageId, text) => {
				if (activePlay === null) return Promise.resolve(false);
				return runBranchOp(() => tavernApi.editUserMessageAndRetry(activePlay.id, messageId, text));
			}, [activePlay, runBranchOp]);
			const cancelRun = (0, react.useCallback)(() => {
				if (activeHandle === void 0) return;
				activeHandle.cancel().catch((e) => {
					actions.setError(e instanceof Error ? e.message : String(e));
				});
			}, [activeHandle, actions]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: rootRef,
				className: TavernView_module_css_default.view,
				"data-style": style,
				"data-conversation-composer-overlay": "",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: TavernView_module_css_default.nav,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: TavernView_module_css_default.navTitle,
							children: "🏮 酒馆"
						}),
						[
							["chat", "会话"],
							["characters", "角色"],
							["lorebooks", "世界书"],
							["memories", "角色经历"],
							["presets", "预设"],
							["import", "导入"]
						].map(([key, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: `${TavernView_module_css_default.navTab} ${panel === key ? TavernView_module_css_default.navTabActive : ""}`,
							onClick: () => actions.setPanel(key),
							children: label
						}, key)),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: TavernView_module_css_default.navSpacer }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: TavernView_module_css_default.stylePicker,
							title: "切换酒馆样式（跟随 DSH 主题或经典暗金）",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "样式" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								className: TavernView_module_css_default.styleSelect,
								value: style,
								onChange: (event) => changeStyle(event.target.value),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "dsh",
									children: "跟随 DSH"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "classic",
									children: "经典酒馆"
								})]
							})]
						}),

						!loading && state !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: TavernView_module_css_default.hint,
							style: { marginRight: 8 },
							children: ["会话 ", displaySessionId !== void 0 ? displaySessionId.slice(0, 12) : "（无）"]
						})
					]
				}), error !== null && (0, react_jsx_runtime.jsx)("div", {
                        role: "alert",
                        className: TavernView_module_css_default.navError,
                        style: { whiteSpace: "normal", maxWidth: "none", overflow: "visible", flexShrink: 0, padding: "8px 16px", lineHeight: 1.6, overflowWrap: "anywhere" },
                        children: "⚠ " + error
                    }), loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: TavernView_module_css_default.content,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { text: "正在加载酒馆…" })
				}) : state === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: TavernView_module_css_default.content,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { text: "酒馆数据不可用" })
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: TavernView_module_css_default.body,
					style: { border: "none" },
					children: [
						panel === "chat" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChatPanel, {
							api: tavernApi,
							plays: state.plays,
							characters: state.characters.map((c) => ({
								id: c.id,
								name: c.card.data.name,
								avatar: c.avatar,
								description: c.card.data.description,
								personality: c.card.data.personality,
								tags: c.card.data.tags
							})),
							lorebooks: state.lorebooks.map((b) => ({
								id: b.id,
								name: b.name,
								description: b.book.description,
								entryCount: b.book.entries.length
							})),
							presets: state.presets.map((p) => ({
								id: p.id,
								name: p.name
							})),
							activePlayId: playId,
							activePlayTitle: activePlay?.title,
							sceneCharacterIds: sceneIdsFor(sceneProjection.presentNames),
							activeCharacterIds: sceneIdsFor(sceneProjection.activeNames),
							activePlay,
							onUpdatePlay: updatePlay,
							multiAgentAvailable: state.multiAgentAvailable,
							messages,
							reasoningView,
							activeSessionId: activeHandle?.session.sessionId,
							running,
							swipe,
							branching,
							onRetry: retryReply,
							onEnterCharacter: enterCharacter,
							onSwipe: swipeReply,
							onCancel: cancelRun,
							onEditAssistant: editAssistant,
							onEditUserRetry: editUserRetry,
							onSelectPlay: selectPlay,
							onGoToCharacters: () => actions.setPanel("characters"),
							onGoToLorebooks: () => actions.setPanel("lorebooks"),
							onCreatePlay: createPlay,
                            onCompact: compactContext,
                            compactNotice,
							onDeletePlay: deletePlay,
							onSend: async (text) => {
								actions.setError(null);
								try {
									if (activePlay === null || activeHandle === void 0) throw new Error("请先选择一个酒馆会话");
									setAdvancedFrom(replyKey);
									await activeHandle.send(text);
								} catch (e) {
									setAdvancedFrom(current => current === replyKey ? void 0 : current);
									actions.setError(e instanceof Error ? e.message : String(e));
									throw e;
								}
							}
						}),
						panel === "memories" && (0, react_jsx_runtime.jsx)(CharacterMemoryPanel, {
							api: tavernApi,
							play: activePlay,
							characters: state.characters,
							lorebooks: state.lorebooks,
							running: running || branching,
							onChanged: refresh,
							onError: actions.setError
						}),
						panel === "characters" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterPanel, {
							api: tavernApi,
							characters: state.characters,
							selectedId: selectedCharacterId,
							onSelect: actions.selectCharacter,
							onChanged: refresh,
							onError: actions.setError
						}),
						panel === "lorebooks" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LorebookPanel, {
							api: tavernApi,
							lorebooks: state.lorebooks,
							selectedId: selectedLorebookId,
							onSelect: actions.selectLorebook,
							onChanged: refresh,
							onError: actions.setError
						}),
						panel === "presets" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetPanel, {
							api: tavernApi,
							presets: state.presets,
							selectedId: selectedPresetId,
							defaultPresetId: state.defaultPresetId,
							onSelect: actions.selectPreset,
							onChanged: refresh,
							onError: actions.setError
						}),
						panel === "import" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TauriTavernImportPanel, {
							api: tavernApi,
							onChanged: refresh,
							onError: actions.setError
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** Required services: the slot registry, the session manager, and conversation view assembly. */
		const inject = [
			"slots",
			"sessions",
			"uiConversation"
		];
		/**
		* Client plugin body: register the tavern view tab. The registration rides
		* the slot service's effect wrapper, so plugin unload removes the tab.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			const tavernStore = createTavernStore();
			const sessions = ctx.sessions;
			/**
			* Live retain counts per play session.
			*
			* The tavern opens archived plays and sends into them without switching the
			* global current Session, so it has to own a Client reference: `binding()`
			* and `scope()` only borrow a generation someone else already retains and
			* return undefined for every other session. Borrowing is why opening an old
			* play used to leave the view permanently "未绑定".
			*/
			const retained = /* @__PURE__ */ new Map();
			/** Drop one view's reference, tearing the session scope down with the last one. */
			const releasePlay = (id) => {
				const entry = retained.get(id);
				if (entry === void 0) return;
				entry.count -= 1;
				if (entry.count > 0) return;
				retained.delete(id);
				entry.reference.release();
			};
			/** Build the view-facing handle for one live reference. */
			const handleFor = (reference) => {
				const binding = reference.binding;
				const chat = ctx.uiConversation.binding(binding).target("chat");
				let released = false;
				return {
					session: binding.session,
					reference,
					async send(text) {
						const { session } = await reference.ready;
						const result = await session.prompt([{ type: "text", text }], "queue");
						if (!result.ok) throw new Error(`发送失败：${result.error.code}: ${result.error.message}`);
					},
					async cancel() {
						const { session } = await reference.ready;
						const result = await session.cancel();
						if (!result.ok) throw new Error(`停止失败：${result.error.code}: ${result.error.message}`);
					},
					chat,
					ready: reference.ready,
					release: () => {
						if (released) return;
						released = true;
						releasePlay(binding.sessionId);
					}
				};
			};
			/**
			* Retain one play session for a view and hand back its live sources.
			* @param id - durable session id of the play.
			* @returns the retained handle; `release()` must be called when the view stops showing it.
			*/
			const retainPlay = (id) => {
				const existing = retained.get(id);
				if (existing !== void 0) {
					const handle = handleFor(existing.reference);
					existing.count += 1;
					return handle;
				}
				const reference = sessions.retain(id, { source: "tavernView" });
				let handle;
				try {
					handle = handleFor(reference);
				} catch (error) {
					reference.release();
					throw error;
				}
				retained.set(id, {
					reference,
					count: 1
				});
				return handle;
			};
			ctx.effect(() => () => {
				for (const entry of retained.values()) entry.reference.release();
				retained.clear();
			}, "dsh-tavern: play session references");
			const injected = { retainSession: (id) => retainPlay(id) };
			ctx.slots.inject("conversation.view", () => ctx.slots.register({
				name: "conversation.view",
				id: "tavern",
				order: 20,
				label: () => "酒馆",
				store: tavernStore,
				children: {
					"tavern.reasoning.body": { kind: "single", scope: "session" }
				},
				inject: (_sessionId) => injected
			}, TavernView));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map