const API_URL = "https://partsorder-api-hne6dzfudubdfvg0.westus3-01.azurewebsites.net/api/service-report-list";

const TECHNICIAN_OPTIONS = [
  "Bruno Manoel",
  "Daniel Genson",
  "Dennis Bruns",
  "John Thomes",
  "Kelly Ulrich",
  "Keith Lafave",
  "Matt Adamski",
  "Otavio Ladoruski"
];

const TENANT_OPTIONS = [
  "ROSE ACRES",
  "SUNRISE",
  "GEMPERLE",
  "CAL-MAINE",
  "OPAL FOODS",
  "DAYBREAK",
  "TRILLIUM",
  "CLR EGGS",
  "NELSON",
  "REMBRANDT",
  "GIROUX",
  "FORSMAN FARMS",
  "WILLAMETTE",
  "MICHAEL FOOD"
];

const cardsEl = document.getElementById("cards");
const technicianSearchEl = document.getElementById("technicianSearch");
const tenantSearchEl = document.getElementById("tenantSearch");
const technicianDropdownEl = document.getElementById("technicianDropdown");
const tenantDropdownEl = document.getElementById("tenantDropdown");
const technicianClearEl = document.getElementById("technicianClear");
const tenantClearEl = document.getElementById("tenantClear");
const modalBackdropEl = document.getElementById("modalBackdrop");
const modalContentEl = document.getElementById("modalContent");
const closeModalEl = document.getElementById("closeModal");
const DOWNLOAD_SAS_URL = "https://partsorder-api-hne6dzfudubdfvg0.westus3-01.azurewebsites.net/api/service-report-download-sas";

let allReports = [];

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getVisitDate(report) {
  const from = (report.visitFrom || "").trim();
  return from || report.visitDate || "";
}

function getVisitFrom(report) {
  return (report.visitFrom || "").trim() || report.visitDate || "";
}

function getVisitTo(report) {
  const to = (report.visitTo || "").trim();
  if (to) {
    return to;
  }

  // Keep legacy reports readable when only visitDate exists.
  return getVisitFrom(report);
}

function getCustomerEmails(report) {
  if (report.customerEmailsJson) {
    try {
      const parsed = JSON.parse(report.customerEmailsJson);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch {
      // Fall back to the legacy single-email field.
    }
  }

  return report.customerEmail ? [report.customerEmail] : [];
}

function renderCustomerEmails(report) {
  const emails = getCustomerEmails(report);
  return emails.map((email) => escapeHtml(email)).join("<br>");
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

function createSearchSelect({ inputEl, dropdownEl, clearBtnEl, options, onInput }) {
  let highlightedIndex = -1;
  let visibleOptions = [...options];

  function updateClearButton() {
    clearBtnEl.style.display = inputEl.value.trim() ? "flex" : "none";
  }

  function closeDropdown() {
    dropdownEl.classList.remove("open");
    highlightedIndex = -1;
  }

  function applyValue(value) {
    inputEl.value = value;
    updateClearButton();
    closeDropdown();
    onInput(inputEl.value);
  }

  function renderOptions(list) {
    dropdownEl.innerHTML = "";
    highlightedIndex = -1;

    if (!list.length) {
      dropdownEl.innerHTML = '<div class="ss-no-results">No results found</div>';
      return;
    }

    list.forEach((option) => {
      const optionEl = document.createElement("div");
      optionEl.className = "ss-option";
      optionEl.textContent = option;
      optionEl.addEventListener("mousedown", (event) => {
        event.preventDefault();
        applyValue(option);
      });
      dropdownEl.appendChild(optionEl);
    });
  }

  function refreshOptions() {
    const term = inputEl.value.trim().toLowerCase();
    visibleOptions = options.filter((option) => option.toLowerCase().includes(term));
    renderOptions(visibleOptions);
    dropdownEl.classList.add("open");
  }

  inputEl.addEventListener("focus", refreshOptions);
  inputEl.addEventListener("input", () => {
    updateClearButton();
    refreshOptions();
    onInput(inputEl.value);
  });

  inputEl.addEventListener("keydown", (event) => {
    const optionElements = dropdownEl.querySelectorAll(".ss-option");

    if (event.key === "Escape") {
      closeDropdown();
      return;
    }

    if (!optionElements.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      highlightedIndex = Math.min(highlightedIndex + 1, optionElements.length - 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      highlightedIndex = Math.max(highlightedIndex - 1, 0);
    } else if (event.key === "Enter") {
      if (highlightedIndex >= 0) {
        event.preventDefault();
        applyValue(visibleOptions[highlightedIndex]);
      }
      return;
    } else {
      return;
    }

    optionElements.forEach((element, index) => {
      element.classList.toggle("highlighted", index === highlightedIndex);
    });
    optionElements[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  });

  inputEl.addEventListener("blur", () => {
    window.setTimeout(closeDropdown, 150);
  });

  clearBtnEl.addEventListener("click", () => {
    inputEl.value = "";
    updateClearButton();
    refreshOptions();
    onInput("");
    inputEl.focus();
  });

  updateClearButton();
}

function renderCards(reports) {
  if (!reports.length) {
    cardsEl.innerHTML = `<p class="empty">No reports found.</p>`;
    return;
  }

  cardsEl.innerHTML = reports.map(report => `
    <div class="card" data-report-id="${escapeHtml(report.reportId)}">
      <h3>Report ${escapeHtml(report.reportId)}</h3>
      <div class="card-highlight-grid">
        <div class="card-highlight">
          <div class="card-highlight-label">Technician</div>
          <div class="card-highlight-value">${escapeHtml(report.serviceTechnician)}</div>
        </div>
        <div class="card-highlight">
          <div class="card-highlight-label">Visit date</div>
          <div class="card-highlight-value">${escapeHtml(getVisitDate(report))}</div>
        </div>
      </div>
      <div class="card-details">
        <p><strong>Tenant:</strong> ${escapeHtml(report.tenant)}</p>
        <p><strong>Site:</strong> ${escapeHtml(report.site)}</p>
      </div>
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

function renderAttachments(attachments) {
  if (!attachments || !attachments.length) {
    return `<p class="empty">No attachments informed.</p>`;
  }

  return `
    <div class="info-grid">
      ${attachments.map((attachment, index) => {
        const fileName = attachment.name || `attachment-${index + 1}`;
        const filePath = attachment.path || "";

        return `
          <div class="label">File ${index + 1}</div>
          <div>
            ${filePath ? `<button type="button" class="attachment-download-link" data-attachment-path="${escapeAttribute(filePath)}" data-attachment-name="${escapeAttribute(fileName)}">${escapeHtml(fileName)}</button>` : `<span class="empty">${escapeHtml(fileName)}</span>`}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

async function requestAttachmentDownload(path, fileName) {
  const response = await fetch(DOWNLOAD_SAS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      blobPath: path,
      fileName: fileName
    })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || result.error || "Failed to prepare attachment download.");
  }

  const downloadUrl = result.downloadUrl || result.url || result.sasUrl;

  if (!downloadUrl) {
    throw new Error("Download response is incomplete.");
  }

  window.open(downloadUrl, "_blank", "noopener,noreferrer");
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
        <div class="label">Customer Email</div><div>${renderCustomerEmails(report)}</div>
        <div class="label">Visit from</div><div>${escapeHtml(getVisitFrom(report))}</div>
        <div class="label">Visit to</div><div>${escapeHtml(getVisitTo(report))}</div>
        <div class="label">Affected Buildings</div><div>${escapeHtml(report.buildingsAffected)}</div>
      </div>
    </div>

    <div class="section">
      <h3>Visit Details</h3>
      <div class="info-grid">
          <div class="label">Visit Purpose</div><div class="preserve-lines">${escapeHtml(report.visitPurpose)}</div>
          <div class="label">Results</div><div class="preserve-lines">${escapeHtml(report.results)}</div>
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

    <div class="section">
      <h3>Attachments</h3>
      ${renderAttachments(report.attachments)}
    </div>
  `;

  modalContentEl.querySelectorAll(".attachment-download-link").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await requestAttachmentDownload(button.dataset.attachmentPath || "", button.dataset.attachmentName || "");
      } catch (error) {
        console.error(error);
        alert(error.message || "Failed to download attachment.");
      }
    });
  });

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

createSearchSelect({
  inputEl: technicianSearchEl,
  dropdownEl: technicianDropdownEl,
  clearBtnEl: technicianClearEl,
  options: TECHNICIAN_OPTIONS,
  onInput: filterReports
});

createSearchSelect({
  inputEl: tenantSearchEl,
  dropdownEl: tenantDropdownEl,
  clearBtnEl: tenantClearEl,
  options: TENANT_OPTIONS,
  onInput: filterReports
});

async function loadReports() {
  cardsEl.innerHTML = `<p class="empty">Loading reports...</p>`;

  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Failed to load reports.");
    }

    allReports = data.reports || [];
    filterReports();
  } catch (error) {
    console.error(error);
    cardsEl.innerHTML = `<p class="empty">Failed to load reports.</p>`;
  }
}

window.serviceReportAuthReady
  .then(() => {
    if (window.serviceReportAuth.isAuthorized()) {
      loadReports();
    }
  })
  .catch((error) => {
    console.error("Authentication initialization error:", error);
    cardsEl.innerHTML = `<p class="empty">Failed to initialize authentication.</p>`;
  });