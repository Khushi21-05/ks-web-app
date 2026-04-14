// =============================================
//   CreditBook – Frontend JS
//   Backend API: http://localhost:3000
// =============================================

const API = "https://ks-web-app.onrender.com/api/customers";

let allCustomers = [];
let currentCustomerId = null;
let currentFilter = "all";
let currentPage = 1;
const PAGE_SIZE = 10;

// ─── Sidebar & Navigation ────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  sidebar.classList.toggle("open");
  overlay.classList.toggle("show");
}

let currentPageName = "dashboard";

function showPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add("active");

  const navItem = document.getElementById(`nav-${page}`);
  if (navItem) navItem.classList.add("active");

  const titles = {
    "dashboard":      "Dashboard",
    "customers":      "Customers",
    "add-customer":   "Add Customer",
    "transactions":   "All Transactions",
    "detail":         "Customer Detail"
  };
  document.getElementById("pageTitle").textContent = titles[page] || "CreditBook";
  currentPageName = page;

  // Load data
  if (page === "dashboard")    loadDashboard();
  if (page === "customers")    loadCustomers();
  if (page === "transactions") loadAllTransactions();

  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    const sidebar = document.getElementById("sidebar");
    if (sidebar.classList.contains("open")) toggleSidebar();
  }
}

function refreshCurrentPage() {
  showPage(currentPageName);
}

// ─── Server Status ────────────────────────────
async function checkServerStatus() {
  try {
    const res = await fetch(API, { method: "GET", signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      setStatus("online", "Connected");
    } else {
      throw new Error();
    }
  } catch {
    setStatus("offline", "Offline");
  }
}

function setStatus(state, text) {
  document.getElementById("statusDot").className = `status-dot ${state}`;
  document.getElementById("statusText").textContent = text;
}

// ─── Toast ────────────────────────────────────
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  const icons = { success: "✅", error: "❌", info: "ℹ️" };
  toast.innerHTML = `<span>${icons[type]}</span> ${message}`;
  toast.className = `toast show ${type}`;
  setTimeout(() => { toast.className = "toast"; }, 3500);
}

// ─── Format helpers ───────────────────────────
function formatCurrency(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 0 });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getInitials(name) {
  return (name || "?")
    .split(" ")
    .map(w => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str || ""));
  return div.innerHTML;
}

// ─── Animated Counter ─────────────────────────
function animateNumber(id, target, prefix = "") {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const duration = 600;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = prefix + Math.floor(current).toLocaleString("en-IN");
    if (current >= target) {
      el.textContent = prefix + target.toLocaleString("en-IN");
      clearInterval(timer);
    }
  }, 16);
}

// ─── Load Dashboard ───────────────────────────
async function loadDashboard() {
  try {
    const res = await fetch(API);
    if (!res.ok) throw new Error("Server error");
    const customers = await res.json();
    allCustomers = customers;

    const total       = customers.length;
    const totalCredit = customers.reduce((s, c) => s + c.totalCredit, 0);
    const cleared     = customers.filter(c => c.totalCredit === 0).length;
    const pending     = customers.filter(c => c.totalCredit > 0).length;

    animateNumber("totalCustomers", total);
    animateNumber("totalCredit", totalCredit, "₹");
    animateNumber("clearedCustomers", cleared);
    animateNumber("pendingCustomers", pending);

    // Update sidebar badge
    const badge = document.getElementById("customerCountBadge");
    if (badge) badge.textContent = total;

    // Last updated time
    const lu = document.getElementById("lastUpdated");
    if (lu) lu.textContent = "Updated " + new Date().toLocaleTimeString("en-IN");

    // Recent 5 customers
    const tbody = document.getElementById("dashboardTableBody");
    const recent = [...customers].reverse().slice(0, 5);

    if (recent.length === 0) {
      tbody.innerHTML = buildEmptyRow(6, "No customers yet. Add your first customer!");
      return;
    }

    tbody.innerHTML = recent.map((c, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>
          <div class="customer-cell">
            <div class="customer-avatar">${escapeHtml(getInitials(c.name))}</div>
            <div>
              <div class="customer-name">${escapeHtml(c.name)}</div>
            </div>
          </div>
        </td>
        <td>${escapeHtml(c.phone)}</td>
        <td style="font-weight:700; color:${c.totalCredit > 0 ? 'var(--accent-red)' : 'var(--accent-green)'}">
          ${formatCurrency(c.totalCredit)}
        </td>
        <td>
          <span class="badge ${c.totalCredit > 0 ? 'badge-red' : 'badge-green'}">
            ${c.totalCredit > 0 ? "Pending" : "Cleared"}
          </span>
        </td>
        <td>
          <button class="tbl-btn tbl-btn-view" onclick="openDetail('${c._id}')">View</button>
        </td>
      </tr>
    `).join("");

  } catch {
    document.getElementById("dashboardTableBody").innerHTML =
      buildEmptyRow(6, "❌ Failed to load data. Is the server running?");
  }
}

// ─── Load All Customers ───────────────────────
async function loadCustomers() {
  currentPage = 1;
  try {
    const res = await fetch(API);
    if (!res.ok) throw new Error();
    const customers = await res.json();
    allCustomers = customers;

    // Update sidebar badge
    const badge = document.getElementById("customerCountBadge");
    if (badge) badge.textContent = customers.length;

    applyFilterAndRender();
  } catch {
    document.getElementById("customersTableBody").innerHTML =
      buildEmptyRow(7, "❌ Failed to load customers. Is the server running?");
  }
}

// Apply search + filter then render
function applyFilterAndRender() {
  const query = (document.getElementById("searchInput")?.value || "").toLowerCase();

  let filtered = allCustomers.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(query) || c.phone.includes(query);
    const matchFilter =
      currentFilter === "all" ||
      (currentFilter === "pending" && c.totalCredit > 0) ||
      (currentFilter === "cleared" && c.totalCredit === 0);
    return matchSearch && matchFilter;
  });

  renderCustomersTable(filtered);
}

function filterCustomers() {
  currentPage = 1;
  applyFilterAndRender();
}

function setFilter(filter) {
  currentFilter = filter;
  currentPage = 1;
  document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("active"));
  document.getElementById(`filter-${filter}`)?.classList.add("active");
  applyFilterAndRender();
}

function renderCustomersTable(customers) {
  const tbody = document.getElementById("customersTableBody");
  const paginationBar = document.getElementById("customersPagination");

  if (customers.length === 0) {
    tbody.innerHTML = buildEmptyRow(7, "No customers found matching your search.");
    if (paginationBar) paginationBar.innerHTML = "";
    return;
  }

  const totalPages = Math.ceil(customers.length / PAGE_SIZE);
  const paginated  = customers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  tbody.innerHTML = paginated.map((c, i) => `
    <tr>
      <td>${(currentPage - 1) * PAGE_SIZE + i + 1}</td>
      <td>
        <div class="customer-cell">
          <div class="customer-avatar">${escapeHtml(getInitials(c.name))}</div>
          <div>
            <div class="customer-name">${escapeHtml(c.name)}</div>
            <div class="customer-since">${c.createdAt ? formatDateShort(c.createdAt) : ""}</div>
          </div>
        </div>
      </td>
      <td>${escapeHtml(c.phone)}</td>
      <td style="font-weight:700; color:${c.totalCredit > 0 ? 'var(--accent-red)' : 'var(--accent-green)'}">
        ${formatCurrency(c.totalCredit)}
      </td>
      <td>
        <span class="badge ${c.totalCredit > 0 ? 'badge-red' : 'badge-green'}">
          ${c.totalCredit > 0 ? "Pending" : "Cleared"}
        </span>
      </td>
      <td style="color:var(--text-muted); font-size:12px;">${c.createdAt ? formatDateShort(c.createdAt) : "—"}</td>
      <td>
        <button class="tbl-btn tbl-btn-view" onclick="openDetail('${c._id}')">View</button>
        <button class="tbl-btn tbl-btn-delete" onclick="confirmDeleteCustomer('${c._id}', '${escapeHtml(c.name)}')">Delete</button>
      </td>
    </tr>
  `).join("");

  // Render pagination
  if (paginationBar) {
    if (totalPages <= 1) {
      paginationBar.innerHTML = "";
      return;
    }
    let html = "";
    for (let p = 1; p <= totalPages; p++) {
      html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="gotoPage(${p}, ${JSON.stringify(customers.map(c => c._id))})">${p}</button>`;
    }
    paginationBar.innerHTML = html;
  }
}

function gotoPage(p, _ids) {
  currentPage = p;
  applyFilterAndRender();
}

// ─── Add Customer ─────────────────────────────
async function addCustomer(e) {
  e.preventDefault();
  const name  = document.getElementById("custName").value.trim();
  const phone = document.getElementById("custPhone").value.trim();
  const btn   = document.getElementById("addBtn");

  if (!name || !phone) return showToast("Please fill all fields", "error");
  if (phone.length !== 10 || !/^\d{10}$/.test(phone))
    return showToast("Phone must be exactly 10 digits", "error");

  btn.disabled = true;
  btn.innerHTML = `<div class="spinner"></div> Adding...`;

  try {
    const res  = await fetch(`${API}/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || "Failed to add");

    document.getElementById("addCustomerForm").reset();
    showToast(`${name} added successfully! 🎉`, "success");
    setTimeout(() => showPage("customers"), 900);
  } catch (err) {
    showToast(err.message || "Error adding customer", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg> Add Customer`;
  }
}

// ─── Open Customer Detail ─────────────────────
async function openDetail(id) {
  currentCustomerId = id;
  showPage("detail");

  // Reset stats
  ["detailCredit","detailPaid","detailTotalCredited","detailTxCount"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = "—";
  });

  try {
    const res      = await fetch(`${API}/${id}`);
    if (!res.ok) throw new Error("Customer not found");
    const customer = await res.json();

    document.getElementById("detailName").textContent  = customer.name;
    document.getElementById("detailPhone").textContent = "📞 " + customer.phone;
    document.getElementById("pageTitle").textContent   = customer.name;

    // Outstanding
    const creditEl = document.getElementById("detailCredit");
    creditEl.textContent = formatCurrency(customer.totalCredit);

    await loadTransactions(id);
  } catch (err) {
    showToast(err.message || "Could not load customer", "error");
    showPage("customers");
  }
}

// ─── Load Transactions ────────────────────────
async function loadTransactions(id) {
  const tbody = document.getElementById("transactionTableBody");
  tbody.innerHTML = `<tr><td colspan="5" class="loading-row"><div class="spinner"></div> Loading...</td></tr>`;

  try {
    const res          = await fetch(`${API}/transactions/${id}`);
    if (!res.ok) throw new Error();
    const transactions = await res.json();

    // Compute stats from transactions
    let totalCredited = 0, totalPaid = 0;
    transactions.forEach(t => {
      if (t.type === "credit")  totalCredited += t.amount;
      if (t.type === "payment") totalPaid     += t.amount;
    });

    const paidEl = document.getElementById("detailPaid");
    if (paidEl) paidEl.textContent = formatCurrency(totalPaid);

    const creditedEl = document.getElementById("detailTotalCredited");
    if (creditedEl) creditedEl.textContent = formatCurrency(totalCredited);

    const txCountEl = document.getElementById("detailTxCount");
    if (txCountEl) txCountEl.textContent = transactions.length;

    const subtitle = document.getElementById("txSubtitle");
    if (subtitle) subtitle.textContent = `${transactions.length} transaction${transactions.length !== 1 ? "s" : ""}`;

    if (transactions.length === 0) {
      tbody.innerHTML = buildEmptyRow(5, "No transactions yet. Add a credit to get started.");
      return;
    }

    tbody.innerHTML = transactions.map((t, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>
          <span class="badge ${t.type === 'credit' ? 'badge-credit' : 'badge-payment'}">
            ${t.type === 'credit' ? '💳 Credit' : '💰 Payment'}
          </span>
        </td>
        <td style="font-weight:700; color:${t.type === 'credit' ? 'var(--accent-red)' : 'var(--accent-green)'}">
          ${t.type === 'credit' ? '-' : '+'}${formatCurrency(t.amount)}
        </td>
        <td style="color:var(--text-muted); font-size:12.5px;">${escapeHtml(t.note || "—")}</td>
        <td style="color:var(--text-secondary); font-size:12.5px;">${formatDate(t.createdAt)}</td>
      </tr>
    `).join("");
  } catch {
    tbody.innerHTML = buildEmptyRow(5, "Failed to load transactions.");
  }
}

// ─── Add Credit ───────────────────────────────
async function addCredit(e) {
  e.preventDefault();
  const amount = parseFloat(document.getElementById("creditAmount").value);
  const note   = document.getElementById("creditNote")?.value.trim() || "";

  if (!amount || amount <= 0) return showToast("Enter a valid amount", "error");

  const btn = e.submitter;
  if (btn) { btn.disabled = true; btn.textContent = "Adding..."; }

  try {
    const res  = await fetch(`${API}/credit/${currentCustomerId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, note })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message);

    document.getElementById("creditAmount").value = "";
    if (document.getElementById("creditNote")) document.getElementById("creditNote").value = "";
    showToast(`Credit of ${formatCurrency(amount)} added! 💳`, "success");
    openDetail(currentCustomerId);
  } catch (err) {
    showToast(err.message || "Error adding credit", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg> Add Credit`;
    }
  }
}

// ─── Receive Payment ──────────────────────────
async function receivePayment(e) {
  e.preventDefault();
  const amount = parseFloat(document.getElementById("paymentAmount").value);
  const mode   = document.getElementById("paymentMode")?.value || "Cash";

  if (!amount || amount <= 0) return showToast("Enter a valid amount", "error");

  const btn = e.submitter;
  if (btn) { btn.disabled = true; btn.textContent = "Processing..."; }

  try {
    const res  = await fetch(`${API}/payment/${currentCustomerId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, note: `Payment via ${mode}` })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message);

    document.getElementById("paymentAmount").value = "";
    showToast(`Payment of ${formatCurrency(amount)} received! ✅`, "success");
    openDetail(currentCustomerId);
  } catch (err) {
    showToast(err.message || "Error processing payment", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg> Receive Payment`;
    }
  }
}

// ─── Delete Customer (from table) ─────────────
function confirmDeleteCustomer(id, name) {
  openConfirmModal(
    `Delete "${name}"?`,
    "All transactions for this customer will also be permanently deleted.",
    async () => {
      try {
        const res  = await fetch(`${API}/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message);
        showToast(`${name} deleted`, "info");
        loadCustomers();
      } catch (err) {
        showToast(err.message || "Error deleting customer", "error");
      }
    }
  );
}

// ─── Delete from Detail Page ──────────────────
function deleteCurrentCustomer() {
  const name = document.getElementById("detailName").textContent;
  openConfirmModal(
    `Delete "${name}"?`,
    "All transactions for this customer will also be permanently deleted.",
    async () => {
      try {
        const res  = await fetch(`${API}/${currentCustomerId}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message);
        showToast(`${name} deleted`, "info");
        showPage("customers");
      } catch (err) {
        showToast(err.message || "Error deleting customer", "error");
      }
    }
  );
}

// ─── Edit Customer Modal ──────────────────────
function openEditModal() {
  const name  = document.getElementById("detailName").textContent;
  const phone = document.getElementById("detailPhone").textContent.replace("📞 ", "").trim();
  document.getElementById("editName").value  = name;
  document.getElementById("editPhone").value = phone;
  openModal("editModal");
}

async function updateCustomer(e) {
  e.preventDefault();
  const name  = document.getElementById("editName").value.trim();
  const phone = document.getElementById("editPhone").value.trim();

  if (!name || !phone) return showToast("Please fill all fields", "error");
  if (!/^\d{10}$/.test(phone)) return showToast("Phone must be exactly 10 digits", "error");

  try {
    const res  = await fetch(`${API}/${currentCustomerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message);

    closeModal("editModal");
    showToast("Customer updated successfully! ✏️", "success");
    openDetail(currentCustomerId);
  } catch (err) {
    showToast(err.message || "Error updating customer", "error");
  }
}

// ─── All Transactions Page ────────────────────
async function loadAllTransactions() {
  const tbody = document.getElementById("allTransactionsBody");
  tbody.innerHTML = `<tr><td colspan="5" class="loading-row"><div class="spinner"></div> Loading...</td></tr>`;

  try {
    // First get all customers
    const cusRes   = await fetch(API);
    if (!cusRes.ok) throw new Error();
    const customers = await cusRes.json();

    // Build a name map
    const nameMap = {};
    customers.forEach(c => { nameMap[c._id] = c.name; });

    // Fetch transactions for each customer (in parallel, max concurrency)
    const txArrays = await Promise.all(
      customers.map(c =>
        fetch(`${API}/transactions/${c._id}`)
          .then(r => r.json())
          .then(txs => txs.map(t => ({ ...t, customerName: c.name, customerId: c._id })))
          .catch(() => [])
      )
    );

    const allTx = txArrays
      .flat()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (allTx.length === 0) {
      tbody.innerHTML = buildEmptyRow(5, "No transactions recorded yet.");
      return;
    }

    tbody.innerHTML = allTx.map((t, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>
          <div class="customer-cell">
            <div class="customer-avatar">${escapeHtml(getInitials(t.customerName))}</div>
            <span class="customer-name" style="cursor:pointer;text-decoration:underline;text-decoration-color:var(--border);"
              onclick="openDetail('${t.customerId}')">
              ${escapeHtml(t.customerName)}
            </span>
          </div>
        </td>
        <td>
          <span class="badge ${t.type === 'credit' ? 'badge-credit' : 'badge-payment'}">
            ${t.type === 'credit' ? '💳 Credit' : '💰 Payment'}
          </span>
        </td>
        <td style="font-weight:700; color:${t.type === 'credit' ? 'var(--accent-red)' : 'var(--accent-green)'}">
          ${t.type === 'credit' ? '-' : '+'}${formatCurrency(t.amount)}
        </td>
        <td style="color:var(--text-secondary); font-size:12.5px;">${formatDate(t.createdAt)}</td>
      </tr>
    `).join("");
  } catch {
    tbody.innerHTML = buildEmptyRow(5, "Failed to load transactions.");
  }
}

// ─── Print Helpers ────────────────────────────
function printTransactions() {
  window.print();
}

function printCustomerDetail() {
  window.print();
}

// ─── Modal Helpers ────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("open");
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("open");
}

let _confirmCallback = null;

function openConfirmModal(title, subtitle, onConfirm) {
  document.getElementById("confirmText").textContent = title;
  document.querySelector(".confirm-sub").textContent = subtitle;
  _confirmCallback = onConfirm;
  openModal("confirmModal");
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("confirmActionBtn");
  if (btn) {
    btn.addEventListener("click", () => {
      closeModal("confirmModal");
      if (_confirmCallback) { _confirmCallback(); _confirmCallback = null; }
    });
  }
});

// Close modal on backdrop click
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("open");
  }
});

// ─── Empty Row helper ─────────────────────────
function buildEmptyRow(colspan, message) {
  return `
    <tr>
      <td colspan="${colspan}">
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div class="empty-title">${message}</div>
        </div>
      </td>
    </tr>`;
}

// ─── Init ─────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  checkServerStatus();
  loadDashboard();
  setInterval(checkServerStatus, 30000);
});
