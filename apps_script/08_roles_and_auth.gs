/** Roles and auth handlers **/
function lookupRol(email) {
	if (!email) return null;
	var sh = getSheet(CONFIG.SHEETS.ROLES);
	var data = sheetToObjects(sh);
	for (var i = 0; i < data.length; i++) {
		if (String(data[i].email || '').trim().toLowerCase() === email.toLowerCase()) {
			return String(data[i].rol || '').trim();
		}
	}
	return null;
}

function handleGetSessionInfo() {
	try {
		var email = Session.getActiveUser().getEmail();
		var rol = lookupRol(email);
		return { ok: true, email: email || null, rol: rol || null };
	} catch (err) { return { ok: false, error: String(err) }; }
}

function handleLogin(payload) {
	try {
		var email = String(payload.email || '').trim();
		var password = String(payload.password || '');
		if (!email || !password) return { ok: false, error: 'email and password are required' };
		var res = verifyCredentials(email, password);
		if (!res.ok) return { ok: false, error: res.error || 'Invalid credentials' };
		return { ok: true, email: res.email, rol: res.rol };
	} catch (err) { return { ok: false, error: String(err) }; }
}

function handleCrearRol(payload) {
	try {
		var isDraft = !!payload._draft;
		var email = String(payload.email || '').trim();
		var rol = String(payload.rol || '').trim();
		if (!isDraft && (!email || !rol)) return { ok: false, error: 'email y rol son requeridos.' };
		var rowObj = {};
		rowObj['email'] = email;
		rowObj['rol'] = rol;
		appendRowToSheetByHeader(CONFIG.SHEETS.ROLES, rowObj);
		return { ok: true };
	} catch (err) { return { ok: false, error: String(err) }; }
}

// verifyCredentials helper is used here; it expects getHeaderMap/sheetToObjects available in utils
function verifyCredentials(email, password) {
	if (!email) return { ok: false, error: 'email required' };
	var sh = getSheet(CONFIG.SHEETS.ROLES);
	var hdr = getHeaderMap(sh);
	if (hdr['email'] !== undefined && hdr['password'] !== undefined && hdr['rol'] !== undefined) {
		var data = sheetToObjects(sh);
		for (var i = 0; i < data.length; i++) {
			var row = data[i];
			if (String(row['email'] || '').trim().toLowerCase() === email.toLowerCase()
					&& String(row['password'] || '') === password) {
				return { ok: true, email: email, rol: String(row['rol'] || '').trim() };
			}
		}
		return { ok: false, error: 'Invalid credentials' };
	}
	var lr = sh.getLastRow();
	if (lr < 2) return { ok: false, error: 'No roles defined' };
	var values = sh.getRange(2, 1, lr - 1, 3).getValues();
	for (var r = 0; r < values.length; r++) {
		var row = values[r];
		var e = String(row[0] || '').trim();
		var p = String(row[1] || '');
		var ro = String(row[2] || '').trim();
		if (e.toLowerCase() === email.toLowerCase() && p === password) {
			return { ok: true, email: email, rol: ro };
		}
	}
	return { ok: false, error: 'Invalid credentials' };
}

API_HANDLERS = API_HANDLERS || {};
API_HANDLERS['crearRol'] = handleCrearRol;
API_HANDLERS['login'] = handleLogin;
API_HANDLERS['getSessionInfo'] = handleGetSessionInfo;
