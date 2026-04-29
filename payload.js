/**
 * buildPayload(form, options)
 * Reads all data from the service report form and returns a flat payload object
 * matching the expected API format.
 *
 * @param {HTMLFormElement} form
 * @param {{ reportId?: string, attachments?: Array<{name: string, path: string}> }} options
 * @returns {Object}
 */
function buildPayload(form, options) {
  const data = new FormData(form);
  const get = (name) => (data.get(name) || '').trim();
  const payloadOptions = options || {};
  const attachments = Array.isArray(payloadOptions.attachments) ? payloadOptions.attachments : [];

  const payload = {
    reportId:            payloadOptions.reportId || '',
    serviceTechnician:  get('technician'),
    tenant:             get('tenant'),
    site:               get('site'),
    buildingsAffected:  get('buildingsAffected'),
    visitFrom:          get('visitFrom'),
    visitTo:            get('visitTo'),
    visitPurpose:       get('visitPurpose'),
    results:            get('results'),
    customerEmail:      get('customerEmail'),
  };

  // ── Software updates ──────────────────────────────────────────────────────
  // Rows are indexed 0, 1, 2… (sw_program_0, sw_from_0, …).
  // We iterate until we find no program key, skipping fully-empty rows.
  let swIdx = 0;
  let swCount = 0;

  while (data.has(`sw_program_${swIdx}`) || data.has(`sw_from_${swIdx}`)) {
    const program      = get(`sw_program_${swIdx}`);
    const from         = get(`sw_from_${swIdx}`);
    const to           = get(`sw_to_${swIdx}`);
    const buildingsPcs = get(`sw_building_${swIdx}`);

    // Only include rows that have at least one non-empty field
    if (program || from || to || buildingsPcs) {
      const n = swCount + 1; // 1-based key suffix
      payload[`program${n}`]             = program;
      payload[`program${n}From`]         = from;
      payload[`program${n}To`]           = to;
      payload[`program${n}BuildingsPcs`] = buildingsPcs;
      swCount++;
    }

    swIdx++;
  }

  // ── Hardware items ────────────────────────────────────────────────────────
  // Rows are indexed 0, 1, 2… (hw_item_0, hw_qty_0, …).
  // Formatted as "Item x Qty" separated by "; " to match the expected format.
  const hwParts = [];
  let hwIdx = 0;

  while (data.has(`hw_item_${hwIdx}`) || data.has(`hw_qty_${hwIdx}`)) {
    const item = get(`hw_item_${hwIdx}`);
    const qty  = get(`hw_qty_${hwIdx}`);

    if (item || qty) {
      // Build "Item xQty" — omit the quantity part if blank
      hwParts.push(qty ? `${item} x${qty}` : item);
    }

    hwIdx++;
  }

  payload.hardwareItems = hwParts.join('; ');

  payload.attachmentCount = attachments.length;
  payload.attachmentNamesJson = JSON.stringify(attachments.map(function (attachment) {
    return attachment.name || '';
  }));
  payload.attachmentPathsJson = JSON.stringify(attachments.map(function (attachment) {
    return attachment.path || '';
  }));

  return payload;
}
