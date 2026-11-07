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
