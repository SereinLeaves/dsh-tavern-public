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
		function SceneRail(props) {
			const ids = props.play.sceneCharacterIds ?? props.play.characterIds.slice(0, 1);
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
							className: "tv-scene-character" + (present ? " tv-scene-present" : ""),
							disabled: props.busy,
							title: present ? "让" + character.name + "接话（生成回复）" : "让" + character.name + "出场并生成回复",
							"aria-label": present ? character.name + "，在场，点击接话" : character.name + "，未出场，点击出场",
							onClick: () => props.onEnter(character.id),
							children: [
								(0, react_jsx_runtime.jsx)(CharacterAvatar, { src: character.avatar, name: character.name }),
								(0, react_jsx_runtime.jsx)("span", { className: "tv-scene-name", children: character.name }),
								(0, react_jsx_runtime.jsx)("span", { className: "tv-scene-status", children: present ? "在场 · 接话" : "未出场" })
							]
						}, character.id);
					})
				]
			});
		}
