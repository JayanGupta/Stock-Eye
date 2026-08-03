/* ═══════════════════════════════════════════════════════════════════
   Stock-Eye — Dashboard Application Logic
   ═══════════════════════════════════════════════════════════════════ */

const API = '';

// ── Chart.js Defaults ──────────────────────────────────────────────
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = "'Inter', sans-serif";

const CHART_COLORS = [
    '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#3b82f6',
    '#ef4444', '#14b8a6', '#a855f7', '#eab308', '#f43f5e', '#6366f1',
];

const CATEGORY_BADGE = {
    'Fruit': 'badge-fruit',
    'Vegetable': 'badge-vegetable',
    'Dairy': 'badge-dairy',
    'Meat': 'badge-meat',
    'Grains': 'badge-grains',
    'Beverages': 'badge-beverages',
};

// ── State ──────────────────────────────────────────────────────────
let inventoryData = [];
let chartInstances = {};
let dashboardSalesData = []; // Store fetched data so we can toggle


// ── Navigation ─────────────────────────────────────────────────────
const PAGE_META = {
    dashboard: { title: 'Dashboard', subtitle: 'Overview of your warehouse operations' },
    inventory: { title: 'Inventory', subtitle: 'Manage your warehouse stock' },
    detection: { title: 'Detection', subtitle: 'AI-powered object detection' },
    analytics: { title: 'Analytics', subtitle: 'Sales intelligence & insights' },
    forecast: { title: 'Forecast', subtitle: 'Demand forecasting & restocking' },
    terminal: { title: 'Billing Terminal', subtitle: 'Generate professional PDF bills' },
};

document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', e => {
        e.preventDefault();
        navigateTo(item.dataset.page);
    });
});

function navigateTo(page) {
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navItem) navItem.classList.add('active');

    // Show page
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');

    // Update header
    const meta = PAGE_META[page] || {};
    document.getElementById('page-title').textContent = meta.title || page;
    document.getElementById('page-subtitle').textContent = meta.subtitle || '';

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');

    // Load page data
    loadPageData(page);
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ── Data Loading ───────────────────────────────────────────────────
async function fetchJSON(url, options = {}) {
    if (typeof options === 'string') options = { method: options };
    try {
        const res = await fetch(API + url, options);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error(`Fetch error: ${url}`, err);
        return null;
    }
}

async function loadPageData(page) {
    switch (page) {
        case 'dashboard': await loadDashboard(); break;
        case 'inventory': await loadInventory(); break;
        case 'analytics': await loadAnalytics(); break;
        case 'forecast': await loadForecast(); break;
        case 'terminal': await loadTerminal(); break;
    }
}

// ── Dashboard ──────────────────────────────────────────────────────
async function loadDashboard() {
    const [stats, sales, categories, topItems] = await Promise.all([
        fetchJSON('/api/inventory/stats'),
        fetchJSON('/api/analytics/sales'),
        fetchJSON('/api/analytics/categories'),
        fetchJSON('/api/analytics/top-items'),
    ]);

    // KPI cards
    if (stats) {
        animateValue('kpi-items', stats.total_items);
        animateValue('kpi-categories', stats.total_categories);
        animateValue('kpi-quantity', stats.total_quantity?.toLocaleString());
        animateValue('kpi-revenue', '₹' + (stats.total_revenue || 0).toLocaleString());
        animateValue('kpi-wastage', stats.total_wastage?.toLocaleString());
        animateValue('kpi-avg-price', '₹' + (stats.avg_price || 0).toLocaleString());
    }

    // Sales chart
    if (sales && sales.length) {
        dashboardSalesData = sales;
        updateDashboardChart(); // use toggle state
    }

    // Category doughnut
    if (categories && categories.length) {
        renderChart('chart-categories', 'doughnut', {
            labels: categories.map(c => c.category),
            datasets: [{
                data: categories.map(c => c.total_revenue),
                backgroundColor: CHART_COLORS.slice(0, categories.length),
                borderColor: 'transparent',
                borderWidth: 2,
                hoverOffset: 8,
            }]
        }, {
            cutout: '65%',
            plugins: {
                legend: { position: 'right', labels: { padding: 16, usePointStyle: true, pointStyleWidth: 10 } }
            }
        });
    }

    // Top items table
    if (topItems && topItems.length) {
        const maxRev = Math.max(...topItems.map(i => i.total_sales));
        document.getElementById('top-items-body').innerHTML = topItems.map((item, idx) => {
            const pct = Math.round((item.total_sales / maxRev) * 100);
            const badgeClass = CATEGORY_BADGE[item.category] || '';
            return `<tr>
                <td style="color:var(--text-muted)">${idx + 1}</td>
                <td><strong>${item.item}</strong></td>
                <td><span class="badge ${badgeClass}">${item.category}</span></td>
                <td>${item.quantity_sold}</td>
                <td>₹${item.total_sales.toLocaleString()}</td>
                <td>
                    <div class="mini-bar">
                        <div class="mini-bar-fill" style="width:${pct}%;background:${CHART_COLORS[idx % CHART_COLORS.length]}"></div>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }
}

// ── Dashboard Interactive Toggles ──────────────────────────────────
function updateDashboardChart() {
    if (!dashboardSalesData || !dashboardSalesData.length) return;

    const type = document.getElementById('dashboard-chart-toggle').value;
    const isRevenue = type === 'revenue';

    renderChart('chart-sales', 'line', {
        labels: dashboardSalesData.map(s => s.month),
        datasets: [{
            label: isRevenue ? 'Revenue (₹)' : 'Volume (Units)',
            data: dashboardSalesData.map(s => isRevenue ? s.revenue : s.units_sold),
            borderColor: isRevenue ? '#06b6d4' : '#8b5cf6',
            backgroundColor: isRevenue ? 'rgba(6,182,212,0.1)' : 'rgba(139,92,246,0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: isRevenue ? '#06b6d4' : '#8b5cf6',
            pointBorderColor: isRevenue ? '#06b6d4' : '#8b5cf6',
            pointRadius: 4,
            pointHoverRadius: 6,
        }]
    }, {
        scales: {
            y: {
                ticks: {
                    callback: v => isRevenue ? '₹' + v.toLocaleString() : v.toLocaleString()
                }
            }
        }
    });
}

// ── Inventory ──────────────────────────────────────────────────────
async function loadInventory() {
    const [items, categories] = await Promise.all([
        fetchJSON('/api/inventory'),
        fetchJSON('/api/inventory/categories'),
    ]);

    if (items) {
        inventoryData = items;
        renderInventoryTable(items);
    }

    // Populate category filter
    if (categories) {
        const sel = document.getElementById('inv-category-filter');
        const current = sel.value;
        sel.innerHTML = '<option value="">All Categories</option>' +
            categories.map(c => `<option value="${c}">${c}</option>`).join('');
        sel.value = current;
    }
}

function renderInventoryTable(items) {
    document.getElementById('inventory-body').innerHTML = items.map(item => {
        const badgeClass = CATEGORY_BADGE[item.category] || '';
        return `<tr>
            <td style="color:var(--text-muted)">${item.id}</td>
            <td><strong>${item.item}</strong></td>
            <td><span class="badge ${badgeClass}">${item.category}</span></td>
            <td>${item.quantity}</td>
            <td>₹${item.price.toLocaleString()}</td>
            <td>${item.quantity_sold}</td>
            <td>₹${item.total_sales.toLocaleString()}</td>
            <td>${item.wastage}</td>
            <td>${item.expiry_date || '—'}</td>
            <td>
                <button class="btn btn-ghost btn-sm" onclick="openEditModal(${item.id})">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteItem(${item.id})">🗑️</button>
            </td>
        </tr>`;
    }).join('');
}

function filterInventory() {
    const search = document.getElementById('inv-search').value.toLowerCase();
    const cat = document.getElementById('inv-category-filter').value;
    const filtered = inventoryData.filter(item => {
        const matchSearch = !search || item.item.toLowerCase().includes(search);
        const matchCat = !cat || item.category === cat;
        return matchSearch && matchCat;
    });
    renderInventoryTable(filtered);
}

// ── Item CRUD ──────────────────────────────────────────────────────
function openAddModal() {
    document.getElementById('modal-title').textContent = 'Add New Item';
    document.getElementById('modal-submit').textContent = 'Add Item';
    document.getElementById('edit-id').value = '';
    document.getElementById('item-form').reset();
    document.getElementById('item-modal').classList.add('active');
}

async function openEditModal(id) {
    const item = await fetchJSON(`/api/inventory/${id}`);
    if (!item) return;

    document.getElementById('modal-title').textContent = 'Edit Item';
    document.getElementById('modal-submit').textContent = 'Save Changes';
    document.getElementById('edit-id').value = id;
    document.getElementById('f-item').value = item.item;
    document.getElementById('f-category').value = item.category;
    document.getElementById('f-quantity').value = item.quantity;
    document.getElementById('f-price').value = item.price;
    document.getElementById('f-mfg').value = item.manufacturing_date || '';
    document.getElementById('f-expiry').value = item.expiry_date || '';
    document.getElementById('f-sold').value = item.quantity_sold;
    document.getElementById('f-wastage').value = item.wastage;
    document.getElementById('item-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('item-modal').classList.remove('active');
}

async function saveItem(e) {
    e.preventDefault();
    const editId = document.getElementById('edit-id').value;
    const price = parseFloat(document.getElementById('f-price').value) || 0;
    const sold = parseInt(document.getElementById('f-sold').value) || 0;

    const body = {
        item: document.getElementById('f-item').value,
        category: document.getElementById('f-category').value,
        quantity: parseInt(document.getElementById('f-quantity').value) || 0,
        price: price,
        manufacturing_date: document.getElementById('f-mfg').value || null,
        expiry_date: document.getElementById('f-expiry').value || null,
        quantity_sold: sold,
        total_sales: price * sold,
        wastage: parseInt(document.getElementById('f-wastage').value) || 0,
    };

    const url = editId ? `/api/inventory/${editId}` : '/api/inventory';
    const method = editId ? 'PUT' : 'POST';

    try {
        const res = await fetch(API + url, {
            method, headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (res.ok) {
            toast(editId ? 'Item updated!' : 'Item added!');
            closeModal();
            await loadInventory();
        } else {
            toast('Error saving item', true);
        }
    } catch (err) {
        toast('Network error', true);
    }
}

async function deleteItem(id) {
    if (!confirm('Delete this item?')) return;
    try {
        const res = await fetch(API + `/api/inventory/${id}`, { method: 'DELETE' });
        if (res.ok) {
            toast('Item deleted');
            await loadInventory();
        }
    } catch (err) {
        toast('Error deleting item', true);
    }
}

// ── Detection ──────────────────────────────────────────────────────
let selectedFile = null;

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    selectedFile = file;

    const reader = new FileReader();
    reader.onload = ev => {
        document.getElementById('preview-img').src = ev.target.result;
        document.getElementById('upload-preview').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

async function runDetection() {
    if (!selectedFile) return;
    const btn = document.getElementById('detect-btn');
    btn.innerHTML = '<span class="spinner"></span> Detecting...';
    btn.disabled = true;

    const formData = new FormData();
    formData.append('file', selectedFile);
    const filterInput = document.getElementById('filter-classes').value.trim();
    if (filterInput) {
        formData.append('filter_classes', filterInput);
    }

    try {
        const res = await fetch(API + '/api/detect', { method: 'POST', body: formData });
        if (!res.ok) {
            const err = await res.json();
            toast(err.detail || 'Detection failed', true);
            return;
        }
        const data = await res.json();

        // Show results
        document.getElementById('detection-empty').style.display = 'none';
        document.getElementById('detection-results').style.display = 'block';
        document.getElementById('result-img').src = data.annotated_image;
        document.getElementById('result-count').textContent = data.total_objects;

        // Detection list
        document.getElementById('detection-list').innerHTML = data.detections.map(d => {
            const pct = Math.round(d.confidence * 100);
            return `<li>
                <span>${d.class_label}</span>
                <span style="display:flex;align-items:center;gap:8px">
                    <span style="font-size:0.78rem;color:var(--text-muted)">${pct}%</span>
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width:${pct}%"></div>
                    </div>
                </span>
            </li>`;
        }).join('');

        toast(`Detected ${data.total_objects} objects`);
    } catch (err) {
        toast('Detection service unavailable', true);
    } finally {
        btn.innerHTML = '🔍 Run Detection';
        btn.disabled = false;
    }
}

// ── Analytics ──────────────────────────────────────────────────────
async function loadAnalytics() {
    const [sales, categories, wastage, topItems] = await Promise.all([
        fetchJSON('/api/analytics/sales'),
        fetchJSON('/api/analytics/categories'),
        fetchJSON('/api/analytics/wastage'),
        fetchJSON('/api/analytics/top-items?limit=10'),
    ]);

    // Revenue Growth Trend (Line)
    if (sales && sales.length) {
        renderChart('chart-revenue-trend', 'line', {
            labels: sales.map(s => s.month),
            datasets: [{
                label: 'Revenue (₹)',
                data: sales.map(s => s.revenue),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#10b981',
                pointHoverRadius: 6,
            }]
        }, {
            scales: {
                y: { ticks: { callback: v => '₹' + v.toLocaleString() } }
            }
        });
    }

    // Category Revenue (Doughnut)
    if (categories && categories.length) {
        renderChart('chart-cat-revenue', 'doughnut', {
            labels: categories.map(c => c.category),
            datasets: [{
                data: categories.map(c => c.total_revenue),
                backgroundColor: CHART_COLORS.slice(0, categories.length),
                borderColor: 'transparent',
                borderWidth: 2,
                hoverOffset: 8,
            }]
        }, {
            cutout: '65%',
            plugins: {
                legend: { position: 'right', labels: { padding: 16, usePointStyle: true, pointStyleWidth: 10 } }
            }
        });
    }

    // Top Earners (Horizontal Bar)
    if (topItems && topItems.length) {
        // limit to 10
        const top10 = topItems.slice(0, 10);
        renderChart('chart-top-sales', 'bar', {
            labels: top10.map(t => t.item),
            datasets: [{
                label: 'Revenue (₹)',
                data: top10.map(t => t.total_sales),
                backgroundColor: 'rgba(59, 130, 246, 0.4)',
                borderColor: '#3b82f6',
                borderWidth: 1,
                borderRadius: 4,
            }]
        }, { indexAxis: 'y' });
    }

    // Units sold chart
    if (sales && sales.length) {
        renderChart('chart-units', 'bar', {
            labels: sales.map(s => s.month),
            datasets: [{
                label: 'Units Sold',
                data: sales.map(s => s.units_sold),
                backgroundColor: CHART_COLORS.map(c => c + '80'),
                borderColor: CHART_COLORS,
                borderWidth: 1,
                borderRadius: 6,
                maxBarThickness: 40,
            }]
        });
    }

    // Wastage chart
    if (wastage && wastage.length) {
        renderChart('chart-wastage', 'bar', {
            labels: wastage.map(w => w.category),
            datasets: [{
                label: 'Wastage %',
                data: wastage.map(w => w.wastage_pct),
                backgroundColor: 'rgba(239, 68, 68, 0.4)',
                borderColor: '#ef4444',
                borderWidth: 1,
                borderRadius: 6,
                maxBarThickness: 50,
            }]
        }, {
            indexAxis: 'y',
        });
    }

    // Categories table
    if (categories && categories.length) {
        document.getElementById('categories-body').innerHTML = categories.map(c => {
            const badgeClass = CATEGORY_BADGE[c.category] || '';
            return `<tr>
                <td><span class="badge ${badgeClass}">${c.category}</span></td>
                <td>${c.item_count}</td>
                <td>${c.total_stock.toLocaleString()}</td>
                <td>${c.total_sold.toLocaleString()}</td>
                <td>₹${c.total_revenue.toLocaleString()}</td>
                <td>${c.total_wastage.toLocaleString()}</td>
                <td>₹${c.avg_price.toLocaleString()}</td>
            </tr>`;
        }).join('');
    }
}

// ── Forecast ───────────────────────────────────────────────────────
let forecastData = [];

async function loadForecast() {
    const forecast = await fetchJSON('/api/analytics/forecast');
    if (!forecast) return;

    forecastData = forecast;
    renderForecastTable(forecastData);
}

function renderForecastTable(data) {
    const critical = data.filter(f => f.risk_level === 'critical').length;
    const warning = data.filter(f => f.risk_level === 'warning').length;
    const safe = data.filter(f => f.risk_level === 'safe').length;
    const totalRestock = data.reduce((sum, f) => sum + (f.recommended_restock || 0), 0);

    animateValue('fc-critical', critical);
    animateValue('fc-warning', warning);
    animateValue('fc-safe', safe);
    animateValue('fc-restock', totalRestock);

    document.getElementById('forecast-body').innerHTML = data.map(f => {
        const badgeClass = CATEGORY_BADGE[f.category] || '';
        const confColor = f.confidence_score > 80 ? 'var(--accent-green)' : (f.confidence_score > 50 ? 'var(--accent-orange)' : 'var(--accent-red)');
        return `<tr>
            <td><strong>${f.item}</strong></td>
            <td><span class="badge ${badgeClass}">${f.category}</span></td>
            <td>${f.current_stock}</td>
            <td>${f.daily_demand}</td>
            <td>${f.days_remaining} days</td>
            <td>
                <span class="risk-indicator">
                    <span class="risk-dot ${f.risk_level}"></span>
                    <span class="badge badge-${f.risk_level}">${f.risk_level.toUpperCase()}</span>
                </span>
            </td>
            <td>${f.recommended_restock > 0 ? f.recommended_restock + ' units' : '—'}</td>
            <td><strong style="color:${confColor}">${f.confidence_score}%</strong></td>
            <td>
                <button class="btn btn-sm btn-ghost" onclick="sellItem(${f.id})" style="border-color:var(--accent-cyan);color:var(--accent-cyan);padding:4px 8px;font-size:0.7rem;">Sell 1</button>
                <button class="btn btn-sm btn-ghost" onclick="wasteItem(${f.id})" style="border-color:var(--accent-red);color:var(--accent-red);padding:4px 8px;font-size:0.7rem;margin-left:4px;">Waste 1</button>
            </td>
        </tr>`;
    }).join('');
}

function filterForecast() {
    const search = document.getElementById('forecast-search').value.toLowerCase();
    const filtered = forecastData.filter(f => f.item.toLowerCase().includes(search));
    renderForecastTable(filtered);
}

// ── Simulation Actions ─────────────────────────────────────────────
async function sellItem(id) {
    await fetchJSON(`/api/inventory/${id}/sell`, 'POST');
    toast("Item sold. Recalculating ML Forecast...");
    await loadForecast();
    await loadDashboard();
}

async function wasteItem(id) {
    await fetchJSON(`/api/inventory/${id}/waste`, 'POST');
    toast("Item wasted. Recalculating ML Forecast...");
    await loadForecast();
    await loadDashboard();
}

async function simulateActivity() {
    toast("Simulating warehouse activity across catalog...");
    await fetchJSON(`/api/inventory/simulate/bulk`, 'POST');
    setTimeout(async () => {
        await loadForecast();
        await loadDashboard();
        toast("Simulation complete! Forecast and Metrics updated.", false);
    }, 500); // UI breathing room
}

// ── Terminal / Billing ──────────────────────────────────────────────
let billItems = [];
let terminalInventory = [];

async function loadTerminal() {
    terminalInventory = await fetchJSON('/api/inventory');
    if (!terminalInventory) return;

    const sel = document.getElementById('bill-item-select');
    sel.innerHTML = terminalInventory.map(i => `<option value="${i.id}">${i.item} (₹${i.price}) - In Stock: ${i.quantity}</option>`).join('');
    renderBillTable();
}

function addBillItem() {
    const itemId = parseInt(document.getElementById('bill-item-select').value);
    const qty = parseInt(document.getElementById('bill-item-qty').value);

    if (!itemId || !qty || qty <= 0) return;

    const itemData = terminalInventory.find(i => i.id === itemId);
    if (!itemData) return;

    if (qty > itemData.quantity) {
        toast(`Not enough stock. Only ${itemData.quantity} available.`, true);
        return;
    }

    // Check if item already in bill
    const existing = billItems.find(i => i.id === itemId);
    if (existing) {
        if (existing.quantity + qty > itemData.quantity) {
            toast(`Total exceeds stock capability`, true);
            return;
        }
        existing.quantity += qty;
    } else {
        billItems.push({
            id: itemData.id,
            item: itemData.item,
            price: itemData.price,
            quantity: qty
        });
    }
    document.getElementById('bill-item-qty').value = 1;
    renderBillTable();
}

function removeBillItem(id) {
    billItems = billItems.filter(i => i.id !== id);
    renderBillTable();
}

function renderBillTable() {
    let html = '';
    let total = 0;
    billItems.forEach(item => {
        const lineTotal = item.price * item.quantity;
        total += lineTotal;
        html += `<tr>
            <td><strong>${item.item}</strong></td>
            <td>${item.quantity}</td>
            <td>₹${item.price.toFixed(2)}</td>
            <td>₹${lineTotal.toFixed(2)}</td>
            <td><button class="btn btn-sm btn-danger" onclick="removeBillItem(${item.id})">❌</button></td>
        </tr>`;
    });

    if (billItems.length === 0) {
        html = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No items in bill yet.</td></tr>`;
    }

    document.getElementById('bill-items-body').innerHTML = html;
    document.getElementById('bill-total-due').textContent = `₹${total.toFixed(2)}`;
}

async function generateBill() {
    if (billItems.length === 0) {
        toast("Please add items to bill first", true);
        return;
    }

    const customer = document.getElementById('bill-customer').value.trim() || 'Walk-in Customer';
    const payload = {
        customer_name: customer,
        items: billItems.map(i => ({ item: i.item, quantity: i.quantity, price: i.price }))
    };

    try {
        const btn = document.querySelector('button[onclick="generateBill()"]');
        const origText = btn.innerHTML;
        btn.innerHTML = 'Generating...';
        btn.disabled = true;

        const res = await fetch(API + '/api/billing/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("API failed");

        const data = await res.json();
        toast("Bill successfully generated!");
        window.open(data.download_url, '_blank');

        // Reset
        billItems = [];
        document.getElementById('bill-customer').value = '';
        renderBillTable();

        btn.innerHTML = origText;
        btn.disabled = false;

    } catch (err) {
        toast("Failed to generate bill", true);
        const btn = document.querySelector('button[onclick="generateBill()"]');
        btn.innerHTML = '🧾 Generate PDF Bill';
        btn.disabled = false;
    }
}

// ── Chart Helper ───────────────────────────────────────────────────
function renderChart(canvasId, type, data, extraOpts = {}) {
    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    chartInstances[canvasId] = new Chart(ctx, {
        type,
        data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: type === 'doughnut',
                    ...(extraOpts.plugins?.legend || {}),
                },
                tooltip: {
                    backgroundColor: 'rgba(17,22,39,0.95)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    titleFont: { weight: '600' },
                    padding: 12,
                    cornerRadius: 8,
                },
            },
            scales: type === 'doughnut' ? {} : {
                x: {
                    grid: { display: false },
                    ...(extraOpts.indexAxis === 'y' ? {} : {}),
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { callback: v => type === 'bar' && extraOpts.indexAxis !== 'y' ? v.toLocaleString() : v },
                },
            },
            ...(extraOpts.indexAxis ? { indexAxis: extraOpts.indexAxis } : {}),
            ...(extraOpts.cutout ? { cutout: extraOpts.cutout } : {}),
        },
    });
}

// ── Helpers ─────────────────────────────────────────────────────────
function animateValue(elementId, targetValue) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = targetValue;
}

function toast(msg, isError = false) {
    const t = document.getElementById('toast');
    document.getElementById('toast-icon').textContent = isError ? '❌' : '✅';
    document.getElementById('toast-msg').textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Init ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
});
