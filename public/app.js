const state = {
  reference: {
    categories: [],
    suppliers: [],
    users: [],
    products: []
  },
  products: [],
  purchaseOrders: [],
  salesOrders: [],
  lowStock: [],
  transactions: []
};

const titles = {
  dashboard: 'Warehouse Dashboard',
  products: 'Products and Stock',
  orders: 'Inbound and Outbound Orders',
  reports: 'Inventory Reports'
};

const currency = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  maximumFractionDigits: 0
});

const number = new Intl.NumberFormat('en-PK');

function $(selector, root = document) {
  return root.querySelector(selector);
}

function $all(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  return String(value).slice(0, 10);
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString([], {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function selectedUserId() {
  return $('#activeUserSelect').value || '1';
}

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload.error || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.details = payload.details;
    throw error;
  }

  return payload.data;
}

function showToast(message, variant = 'success') {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.toggle('is-error', variant === 'error');
  toast.classList.add('is-visible');

  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove('is-visible');
  }, 3400);
}

function setDbStatus(isOnline, message) {
  const status = $('#dbStatus');
  status.classList.toggle('is-online', isOnline);
  status.classList.toggle('is-offline', !isOnline);
  status.lastChild.textContent = ` ${message}`;
}

function emptyRow(columns, label = 'No records found') {
  return `<tr><td class="table-empty" colspan="${columns}">${escapeHtml(label)}</td></tr>`;
}

function statusBadge(status) {
  const normalized = String(status).toLowerCase();
  const className = normalized.includes('partial')
    ? 'partial'
    : normalized.includes('received')
      ? 'received'
      : normalized.includes('fulfilled')
        ? 'fulfilled'
        : normalized.includes('pending')
          ? 'pending'
          : normalized.includes('out')
            ? 'out'
            : '';

  return `<span class="badge ${className}">${escapeHtml(status)}</span>`;
}

function renderSelect(select, items, idField, labelField, placeholder, selectedValue = '') {
  select.innerHTML = [
    `<option value="">${escapeHtml(placeholder)}</option>`,
    ...items.map((item) => {
      const id = item[idField];
      const label = item[labelField];
      const selected = String(id) === String(selectedValue) ? ' selected' : '';
      return `<option value="${escapeHtml(id)}"${selected}>${escapeHtml(label)}</option>`;
    })
  ].join('');
}

function renderProductSelect(select, selectedValue = '') {
  select.innerHTML = [
    '<option value="">Select product</option>',
    ...state.reference.products.map((product) => {
      const selected = String(product.product_id) === String(selectedValue) ? ' selected' : '';
      return `<option value="${product.product_id}" data-price="${product.unit_price}"${selected}>${escapeHtml(product.sku)} - ${escapeHtml(product.product_name)}</option>`;
    })
  ].join('');
}

function renderReferenceSelects() {
  $all('select[data-ref="categories"]').forEach((select) => {
    renderSelect(select, state.reference.categories, 'category_id', 'category_name', 'Select category', select.value);
  });

  $all('select[data-ref="suppliers"]').forEach((select) => {
    renderSelect(select, state.reference.suppliers, 'supplier_id', 'supplier_name', 'Select supplier', select.value);
  });

  $all('select[data-ref="products"]').forEach((select) => {
    renderProductSelect(select, select.value);
  });

  const activeUserSelect = $('#activeUserSelect');
  renderSelect(activeUserSelect, state.reference.users, 'user_id', 'full_name', 'Select user', activeUserSelect.value || '1');
}

function renderKpis(summary) {
  const items = [
    ['Active Products', number.format(summary.active_products || 0), 'SKUs ready for warehouse use'],
    ['Stock Units', number.format(summary.total_units || 0), 'Quantity currently on hand'],
    ['Inventory Value', currency.format(summary.inventory_value || 0), 'Based on unit sale price'],
    ['Low Stock', number.format(summary.low_stock_count || 0), `${number.format(summary.open_purchase_orders || 0)} open purchase orders`],
    ['Suppliers', number.format(summary.active_suppliers || 0), 'Active vendor records'],
    ['Sales Pending', number.format(summary.open_sales_orders || 0), 'Outbound orders waiting'],
    ['Purchase Pending', number.format(summary.open_purchase_orders || 0), 'Inbound orders waiting'],
    ['System Status', 'Live', 'Connected to MySQL schema']
  ];

  $('#kpiGrid').innerHTML = items.map(([label, value, meta]) => `
    <article class="kpi-card">
      <div class="kpi-label">${escapeHtml(label)}</div>
      <div class="kpi-value">${escapeHtml(value)}</div>
      <div class="kpi-meta">${escapeHtml(meta)}</div>
    </article>
  `).join('');
}

function renderDashboard(data) {
  renderKpis(data.summary || {});

  $('#lowStockCount').textContent = `${data.lowStock.length} items`;
  $('#dashboardLowStockRows').innerHTML = data.lowStock.length
    ? data.lowStock.map((item) => `
      <tr>
        <td class="sku">${escapeHtml(item.sku)}</td>
        <td>${escapeHtml(item.product_name)}</td>
        <td>${number.format(item.quantity_on_hand)}</td>
        <td>${number.format(item.reorder_level)}</td>
      </tr>
    `).join('')
    : emptyRow(4, 'No low-stock items');

  $('#recentTransactionRows').innerHTML = data.recentTransactions.length
    ? data.recentTransactions.map((item) => `
      <tr>
        <td>${statusBadge(item.transaction_type)}</td>
        <td>${escapeHtml(item.product_name)}</td>
        <td>${number.format(item.quantity)}</td>
        <td>${escapeHtml(formatDateTime(item.transaction_time))}</td>
      </tr>
    `).join('')
    : emptyRow(4, 'No transactions found');
}

function renderProducts() {
  const search = $('#productSearch').value.trim().toLowerCase();
  const rows = state.products.filter((product) => {
    if (!search) {
      return true;
    }

    return [
      product.sku,
      product.product_name,
      product.category_name,
      product.supplier_name
    ].some((value) => String(value || '').toLowerCase().includes(search));
  });

  $('#productRows').innerHTML = rows.length
    ? rows.map((product) => {
      const stockRatio = product.reorder_level > 0
        ? Math.min(100, Math.round((product.quantity_on_hand / product.reorder_level) * 100))
        : 100;
      const isLow = Boolean(product.is_low_stock);

      return `
        <tr>
          <td class="sku">${escapeHtml(product.sku)}</td>
          <td>${escapeHtml(product.product_name)}</td>
          <td>${escapeHtml(product.category_name)}</td>
          <td>${escapeHtml(product.supplier_name || '-')}</td>
          <td>
            <div class="stock-meter">
              <span>${number.format(product.quantity_on_hand)} ${isLow ? '<span class="badge low">Low</span>' : ''}</span>
              <span class="stock-bar ${isLow ? 'is-low' : ''}"><span style="width:${stockRatio}%"></span></span>
            </div>
          </td>
          <td>${currency.format(product.inventory_value || 0)}</td>
        </tr>
      `;
    }).join('')
    : emptyRow(6, 'No products found');
}

function renderOrders() {
  $('#purchaseOrderRows').innerHTML = state.purchaseOrders.length
    ? state.purchaseOrders.map((order) => {
      const canReceive = !['RECEIVED', 'CANCELLED'].includes(order.status);
      return `
        <tr>
          <td class="sku">PO-${order.purchase_order_id}</td>
          <td>${escapeHtml(order.supplier_name)}</td>
          <td>${statusBadge(order.status)}</td>
          <td>${currency.format(order.total_cost || 0)}</td>
          <td>${number.format(order.total_received || 0)} / ${number.format(order.total_ordered || 0)}</td>
          <td class="row-actions">
            <button class="button button-secondary" data-receive-po="${order.purchase_order_id}" ${canReceive ? '' : 'disabled'}>Receive</button>
          </td>
        </tr>
      `;
    }).join('')
    : emptyRow(6, 'No purchase orders found');

  $('#salesOrderRows').innerHTML = state.salesOrders.length
    ? state.salesOrders.map((order) => {
      const canFulfill = order.status === 'PENDING';
      return `
        <tr>
          <td class="sku">SO-${order.sales_order_id}</td>
          <td>${escapeHtml(order.destination)}</td>
          <td>${statusBadge(order.status)}</td>
          <td>${currency.format(order.total_value || 0)}</td>
          <td>${number.format(order.total_requested || 0)}</td>
          <td class="row-actions">
            <button class="button button-secondary" data-fulfill-so="${order.sales_order_id}" ${canFulfill ? '' : 'disabled'}>Fulfill</button>
          </td>
        </tr>
      `;
    }).join('')
    : emptyRow(6, 'No sales orders found');
}

function renderReports() {
  $('#lowStockRows').innerHTML = state.lowStock.length
    ? state.lowStock.map((item) => `
      <tr>
        <td class="sku">${escapeHtml(item.sku)}</td>
        <td>${escapeHtml(item.product_name)}</td>
        <td>${number.format(item.quantity_on_hand)}</td>
        <td>${number.format(item.shortage_quantity)}</td>
      </tr>
    `).join('')
    : emptyRow(4, 'No low-stock records');

  $('#transactionRows').innerHTML = state.transactions.length
    ? state.transactions.map((item) => {
      const reference = item.purchase_order_id
        ? `PO-${item.purchase_order_id}`
        : item.sales_order_id
          ? `SO-${item.sales_order_id}`
          : '-';

      return `
        <tr>
          <td>${item.transaction_id}</td>
          <td>${statusBadge(item.transaction_type)}</td>
          <td>${escapeHtml(item.sku)} - ${escapeHtml(item.product_name)}</td>
          <td>${number.format(item.quantity)}</td>
          <td>${escapeHtml(item.performed_by_name)}</td>
          <td>${escapeHtml(reference)}</td>
          <td>${escapeHtml(formatDateTime(item.transaction_time))}</td>
        </tr>
      `;
    }).join('')
    : emptyRow(7, 'No transaction records');
}

function createLineItem(type) {
  const wrapper = document.createElement('div');
  wrapper.className = 'line-item';
  const priceField = type === 'purchase' ? 'unit_cost' : 'unit_price';
  const quantityField = type === 'purchase' ? 'quantity_ordered' : 'quantity_requested';
  const priceLabel = type === 'purchase' ? 'Unit cost' : 'Unit price';

  wrapper.innerHTML = `
    <label>
      Product
      <select name="product_id" data-ref="products" required></select>
    </label>
    <label>
      Qty
      <input name="${quantityField}" type="number" min="1" step="1" required>
    </label>
    <label>
      ${priceLabel}
      <input name="${priceField}" type="number" min="0" step="0.01" required>
    </label>
    <button class="icon-button" data-remove-line type="button" aria-label="Remove line">X</button>
  `;

  const productSelect = $('select[name="product_id"]', wrapper);
  renderProductSelect(productSelect);
  productSelect.addEventListener('change', () => {
    const option = productSelect.selectedOptions[0];
    const price = option ? option.dataset.price : '';
    const priceInput = $(`input[name="${priceField}"]`, wrapper);
    if (price && !priceInput.value) {
      priceInput.value = price;
    }
  });

  return wrapper;
}

function ensureOneLineItem(container, type) {
  if (container.children.length === 0) {
    container.append(createLineItem(type));
  }
}

async function refreshAll() {
  try {
    const reference = await api('/reference');
    state.reference = reference;
    renderReferenceSelects();
    ensureOneLineItem($('#purchaseItems'), 'purchase');
    ensureOneLineItem($('#salesItems'), 'sales');

    const [dashboard, products, purchaseOrders, salesOrders, lowStock, transactions] = await Promise.all([
      api('/dashboard'),
      api('/products'),
      api('/purchase-orders'),
      api('/sales-orders'),
      api('/inventory/low-stock'),
      api('/transactions?limit=50')
    ]);

    state.products = products;
    state.purchaseOrders = purchaseOrders;
    state.salesOrders = salesOrders;
    state.lowStock = lowStock;
    state.transactions = transactions;

    renderDashboard(dashboard);
    renderProducts();
    renderOrders();
    renderReports();
    setDbStatus(true, 'Database online');
  } catch (error) {
    setDbStatus(false, 'Database offline');
    showToast(error.message, 'error');
  }
}

async function handleSubmit(form, handler) {
  try {
    await handler();
    form.reset();
    await refreshAll();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function collectLineItems(container, type) {
  const quantityField = type === 'purchase' ? 'quantity_ordered' : 'quantity_requested';
  const priceField = type === 'purchase' ? 'unit_cost' : 'unit_price';

  return $all('.line-item', container).map((row) => ({
    product_id: $(`[name="product_id"]`, row).value,
    [quantityField]: $(`[name="${quantityField}"]`, row).value,
    [priceField]: $(`[name="${priceField}"]`, row).value
  }));
}

function bindNavigation() {
  $all('[data-view-target]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const view = button.dataset.viewTarget;

      $all('[data-view]').forEach((section) => {
        section.classList.toggle('is-active', section.dataset.view === view);
      });

      $all('.nav-item').forEach((item) => {
        item.classList.toggle('is-active', item.dataset.viewTarget === view);
      });

      $('#viewTitle').textContent = titles[view] || 'Warehouse Inventory System';
      window.location.hash = view;
    });
  });
}

function bindForms() {
  $('#refreshButton').addEventListener('click', refreshAll);
  $('#productSearch').addEventListener('input', renderProducts);

  $('#supplierForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    handleSubmit(form, async () => {
      await api('/suppliers', {
        method: 'POST',
        body: JSON.stringify(formToObject(form))
      });
      showToast('Supplier added');
    });
  });

  $('#categoryForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    handleSubmit(form, async () => {
      await api('/categories', {
        method: 'POST',
        body: JSON.stringify(formToObject(form))
      });
      showToast('Category added');
    });
  });

  $('#productForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    handleSubmit(form, async () => {
      await api('/products', {
        method: 'POST',
        body: JSON.stringify({
          ...formToObject(form),
          performed_by: selectedUserId()
        })
      });
      showToast('Product added');
    });
  });

  $('#adjustmentForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    handleSubmit(form, async () => {
      await api('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          ...formToObject(form),
          performed_by: selectedUserId()
        })
      });
      showToast('Inventory adjusted');
    });
  });

  $('[data-add-purchase-item]').addEventListener('click', () => {
    $('#purchaseItems').append(createLineItem('purchase'));
  });

  $('[data-add-sales-item]').addEventListener('click', () => {
    $('#salesItems').append(createLineItem('sales'));
  });

  document.addEventListener('click', async (event) => {
    const removeButton = event.target.closest('[data-remove-line]');
    if (removeButton) {
      const row = removeButton.closest('.line-item');
      const container = row.parentElement;
      row.remove();
      ensureOneLineItem(container, container.id === 'purchaseItems' ? 'purchase' : 'sales');
      return;
    }

    const receiveButton = event.target.closest('[data-receive-po]');
    if (receiveButton) {
      try {
        await api(`/purchase-orders/${receiveButton.dataset.receivePo}/receive`, {
          method: 'POST',
          body: JSON.stringify({ performed_by: selectedUserId() })
        });
        showToast('Purchase order received');
        await refreshAll();
      } catch (error) {
        showToast(error.message, 'error');
      }
      return;
    }

    const fulfillButton = event.target.closest('[data-fulfill-so]');
    if (fulfillButton) {
      try {
        await api(`/sales-orders/${fulfillButton.dataset.fulfillSo}/fulfill`, {
          method: 'POST',
          body: JSON.stringify({ performed_by: selectedUserId() })
        });
        showToast('Sales order fulfilled');
        await refreshAll();
      } catch (error) {
        showToast(error.message, 'error');
      }
    }
  });

  $('#purchaseOrderForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    handleSubmit(form, async () => {
      await api('/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({
          ...formToObject(form),
          created_by: selectedUserId(),
          items: collectLineItems($('#purchaseItems'), 'purchase')
        })
      });
      $('#purchaseItems').replaceChildren();
      ensureOneLineItem($('#purchaseItems'), 'purchase');
      showToast('Purchase order saved');
    });
  });

  $('#salesOrderForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    handleSubmit(form, async () => {
      await api('/sales-orders', {
        method: 'POST',
        body: JSON.stringify({
          ...formToObject(form),
          created_by: selectedUserId(),
          items: collectLineItems($('#salesItems'), 'sales')
        })
      });
      $('#salesItems').replaceChildren();
      ensureOneLineItem($('#salesItems'), 'sales');
      showToast('Sales order saved');
    });
  });
}

function activateInitialView() {
  const view = window.location.hash.replace('#', '') || 'dashboard';
  const target = $(`[data-view-target="${view}"]`);

  if (target) {
    target.click();
  }
}

bindNavigation();
bindForms();
activateInitialView();
refreshAll();
