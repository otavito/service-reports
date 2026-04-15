const API_URL = "https://partsorder-api-hne6dzfudubdfvg0.westus3-01.azurewebsites.net/api/service-report-list";

const cardsEl = document.getElementById("cards");
const technicianSearchEl = document.getElementById("technicianSearch");
const tenantSearchEl = document.getElementById("tenantSearch");
const technicianListEl = document.getElementById("technicianList");
const tenantListEl = document.getElementById("tenantList");
const modalBackdropEl = document.getElementById("modalBackdrop");
const modalContentEl = document.getElementById("modalContent");
const closeModalEl = document.getElementById("closeModal");

let allReports = [];

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function renderFilterOptions(reports) {
  technicianListEl.innerHTML = uniqueSorted(
    reports.map(r => r.serviceTechnician)
  ).map(v => `<option value="${escapeHtml(v)}"></option>`).join("");

  tenantListEl.innerHTML = uniqueSorted(
    reports.map(r => r.tenant)
  ).map(v => `<option value="${escapeHtml(v)}"></option>`).join("");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function filterReports() {
  const technician = technicianSearchEl.value.trim().toLowerCase();
  const tenant = tenantSearchEl.value.trim().toLowerCase();

  const filtered = allReports.filter(report => {
    const techMatch =
      !technician ||
      (report.serviceTechnician || "").toLowerCase().includes(technician);

    const tenantMatch =
      !tenant ||
      (report.tenant || "").toLowerCase().includes(tenant);

    return techMatch && tenantMatch;
  });

  renderCards(filtered);
}

function renderCards(reports) {
  if (!reports.length) {
    cardsEl.innerHTML = `<p class="empty">No reports found.</p>`;
    return;
  }

  cardsEl.innerHTML = reports.map(report => `
    <div class="card" data-report-id="${escapeHtml(report.reportId)}">
      <h3>Report ${escapeHtml(report.reportId)}</h3>
      <p><strong>Technician:</strong> ${escapeHtml(report.serviceTechnician)}</p>
      <p><strong>Tenant:</strong> ${escapeHtml(report.tenant)}</p>
      <p><strong>Site:</strong> ${escapeHtml(report.site)}</p>
      <p><strong>Date:</strong> ${escapeHtml(report.visitDate)}</p>
    </div>
  `).join("");

  document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => {
      const reportId = card.dataset.reportId;
      const report = allReports.find(r => String(r.reportId) === String(reportId));
      if (report) openModal(report);
    });
  });
}

function renderSoftwareUpdates(updates) {
  if (!updates || !updates.length) {
    return `<p class="empty">No software updates informed.</p>`;
  }

  return `
    <table>
      <thead>
        <tr>
          <th>Program</th>
          <th>From</th>
          <th>To</th>
          <th>Buildings / PCs</th>
        </tr>
      </thead>
      <tbody>
        ${updates.map(item => `
          <tr>
            <td>${escapeHtml(item.program)}</td>
            <td>${escapeHtml(item.from)}</td>
            <td>${escapeHtml(item.to)}</td>
            <td>${escapeHtml(item.buildingsPcs)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function openModal(report) {
  modalContentEl.innerHTML = `
    <h2>Service Report</h2>

    <div class="section">
      <h3>General Information</h3>
      <div class="info-grid">
        <div class="label">Report ID</div><div>${escapeHtml(report.reportId)}</div>
        <div class="label">Service Technician</div><div>${escapeHtml(report.serviceTechnician)}</div>
        <div class="label">Tenant</div><div>${escapeHtml(report.tenant)}</div>
        <div class="label">Site</div><div>${escapeHtml(report.site)}</div>
        <div class="label">Date</div><div>${escapeHtml(report.visitDate)}</div>
        <div class="label">Affected Buildings</div><div>${escapeHtml(report.buildingsAffected)}</div>
      </div>
    </div>

    <div class="section">
      <h3>Visit Details</h3>
      <div class="info-grid">
        <div class="label">Visit Purpose</div><div>${escapeHtml(report.visitPurpose)}</div>
        <div class="label">Results</div><div>${escapeHtml(report.results)}</div>
      </div>
    </div>

    <div class="section">
      <h3>Software Updates</h3>
      ${renderSoftwareUpdates(report.softwareUpdates)}
    </div>

    <div class="section">
      <h3>Hardware Updates</h3>
      <div class="info-grid">
        <div class="label">Items</div>
        <div>${report.hardwareItems ? escapeHtml(report.hardwareItems) : '<span class="empty">No hardware updates informed.</span>'}</div>
      </div>
    </div>
  `;

  modalBackdropEl.style.display = "flex";
}

closeModalEl.addEventListener("click", () => {
  modalBackdropEl.style.display = "none";
});

modalBackdropEl.addEventListener("click", (event) => {
  if (event.target === modalBackdropEl) {
    modalBackdropEl.style.display = "none";
  }
});

technicianSearchEl.addEventListener("input", filterReports);
tenantSearchEl.addEventListener("input", filterReports);

async function loadReports() {
  cardsEl.innerHTML = `<p class="empty">Loading reports...</p>`;

  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Failed to load reports.");
    }

    allReports = data.reports || [];
    renderFilterOptions(allReports);
    renderCards(allReports);
  } catch (error) {
    console.error(error);
    cardsEl.innerHTML = `<p class="empty">Failed to load reports.</p>`;
  }
}

loadReports();