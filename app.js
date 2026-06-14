/* ============================================================
   MTCV Builder — Application Logic
   JD-BUILDER: Gather → Scope → Decompose → Output → Authorize → Package
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ============ STATE ============
  let currentStep = 1;
  const totalSteps = 6;

  const STEP_NAMES = {
    1: 'Thông tin Chung',
    2: 'Phạm vi Công việc',
    3: 'Trách nhiệm Chính',
    4: 'Phối hợp & Bổ sung',
    5: 'Quyền hạn',
    6: 'Yêu cầu Vị trí'
  };

  const VERBS = {
    leader: ['Uỷ quyền', 'Giao việc', 'Phê duyệt', 'Kiểm tra', 'Phát triển chiến lược', 'Ra quyết định', 'Định hướng', 'Giám sát tổng thể'],
    manager: ['Lập kế hoạch', 'Sàng lọc', 'Phân tích', 'Trình bày', 'Rà soát', 'Phát hiện', 'Cập nhật', 'Điều phối', 'Theo dõi', 'Quyết định', 'Chuyển giao', 'Đánh giá', 'Giám sát', 'Đào tạo'],
    expert: ['Thực hiện', 'Khảo sát', 'Phân tích', 'Thiết kế', 'Triển khai', 'Nghiên cứu', 'Tư vấn', 'Đề xuất'],
    staff: ['Theo dõi', 'Kiểm tra', 'Điều phối', 'Thực hiện', 'Sắp xếp', 'Lưu trữ', 'Ghi chép', 'Tổng hợp', 'Chuẩn bị', 'Tư vấn', 'Chăm sóc', 'Xử lý', 'Cân đối']
  };

  const CHECKLIST_ITEMS = [
    'Viết cho VỊ TRÍ, không cho cá nhân?',
    'Phạm vi CV có đủ 3 yếu tố (Động từ + Tân ngữ + Tác động)?',
    'Trách nhiệm chính sắp xếp giảm dần theo mức độ quan trọng?',
    'Trách nhiệm viết theo nhóm, không xen kẽ lộn xộn?',
    'Break-down nhiệm vụ TP = tổng NV bên dưới?',
    'Kết quả đầu ra có đủ 2 yếu tố (Danh từ + Mức độ thành công)?',
    'KHÔNG có con số cụ thể trong kết quả đầu ra?',
    'Phối hợp viết đúng (việc CỦA phòng kia, không phải việc mình)?',
    'Quyền hạn đủ 3 nhóm?',
    'Yêu cầu vị trí đủ 4 nhóm?',
    'Kỹ năng chỉ liệt kê 4–6 cái cơ bản?',
    'Tổng tỷ trọng = 100%?',
    'Độ dài 3–4 trang (không quá dài)?',
    'Dùng động từ chủ động, nguyên thể?',
    'Không dùng tên riêng cá nhân?'
  ];

  // ============ DOM REFS ============
  const $  = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  // ============ INIT ============
  initScopeItems();
  initMainTasks();
  initCoopRows();
  initRights();
  initSkills();
  initChecklist();
  bindEvents();
  updateVerbPanel();

  // ============ NAVIGATION ============
  function goToStep(step) {
    if (step < 1 || step > totalSteps) return;
    // Mark previous steps done
    for (let i = 1; i < step; i++) markStepDone(i);
    // Update active
    currentStep = step;
    $$('.step-content').forEach(el => el.classList.remove('active'));
    $(`.step-content[data-step="${step}"]`).classList.add('active');
    // Step progress
    $$('.step-item').forEach((el, idx) => {
      const s = idx + 1;
      el.classList.toggle('active', s === step);
      el.classList.toggle('done', s < step);
    });
    $$('.step-line').forEach((el, idx) => {
      const s = idx + 1;
      el.classList.toggle('done', s < step);
      el.classList.toggle('active', s === step);
    });
    // Nav buttons
    $('#btnPrev').disabled = step === 1;
    const isLast = step === totalSteps;
    $('#btnNext').textContent = isLast ? '👁️ Xem trước' : 'Tiếp theo →';
    $('#stepInfoText').textContent = `Bước ${step} / ${totalSteps} — ${STEP_NAMES[step]}`;
    // Scroll top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function markStepDone(step) {
    const item = $(`.step-item[data-step="${step}"]`);
    if (item) item.classList.add('done');
  }

  // ============ VIEW TABS ============
  function switchView(viewName) {
    $$('.view-tab').forEach(t => t.classList.toggle('active', t.dataset.view === viewName));
    $('#formView').classList.toggle('active', viewName === 'form');
    $('#previewView').classList.toggle('active', viewName === 'preview');
    $('#checklistView').classList.toggle('active', viewName === 'checklist');
    $('#formView').style.display = viewName === 'form' ? 'block' : 'none';
    $('#previewView').style.display = viewName === 'preview' ? 'block' : 'none';
    $('#checklistView').style.display = viewName === 'checklist' ? 'block' : 'none';
    $('#wizardNav').style.display = viewName === 'form' ? 'flex' : 'none';
    if (viewName === 'preview') renderPreview();
    if (viewName === 'checklist') updateChecklistScore();
  }

  // ============ SCOPE ITEMS ============
  let scopeCount = 0;

  function addScopeItem(verb = '', obj = '', impact = '') {
    scopeCount++;
    const num = scopeCount;
    const div = document.createElement('div');
    div.className = 'scope-builder';
    div.dataset.scopeNum = num;
    div.innerHTML = `
      <div class="scope-builder-header">
        <div class="scope-builder-num">${num}</div>
        <button class="btn-remove" onclick="removeScope(this)" title="Xoá">✕</button>
      </div>
      <div class="scope-parts">
        <div class="form-group">
          <label class="form-label">Động từ</label>
          <input class="form-input scope-verb" placeholder="VD: Tư vấn, bán hàng và chăm sóc" value="${esc(verb)}" oninput="updateScopePreview(this)">
        </div>
        <div class="form-group">
          <label class="form-label">Tân ngữ</label>
          <input class="form-input scope-obj" placeholder="VD: khách hàng về SP/DV của công ty" value="${esc(obj)}" oninput="updateScopePreview(this)">
        </div>
        <div class="form-group">
          <label class="form-label">Tác động</label>
          <input class="form-input scope-impact" placeholder="VD: nhằm đạt doanh số theo mục tiêu" value="${esc(impact)}" oninput="updateScopePreview(this)">
        </div>
      </div>
      <div class="scope-preview">
        <em class="text-muted">Câu phạm vi sẽ hiển thị ở đây...</em>
      </div>
    `;
    $('#scopeContainer').appendChild(div);
    updateScopePreviewFor(div);
  }

  function initScopeItems() {
    addScopeItem();
  }

  window.removeScope = function(btn) {
    const builder = btn.closest('.scope-builder');
    if ($$('.scope-builder').length <= 1) { showToast('Cần ít nhất 1 phạm vi công việc', 'error'); return; }
    builder.remove();
    reindexScopes();
  };

  function reindexScopes() {
    scopeCount = 0;
    $$('.scope-builder').forEach(el => {
      scopeCount++;
      el.dataset.scopeNum = scopeCount;
      el.querySelector('.scope-builder-num').textContent = scopeCount;
    });
  }

  window.updateScopePreview = function(input) {
    updateScopePreviewFor(input.closest('.scope-builder'));
  };

  function updateScopePreviewFor(builder) {
    const verb = builder.querySelector('.scope-verb').value.trim();
    const obj = builder.querySelector('.scope-obj').value.trim();
    const impact = builder.querySelector('.scope-impact').value.trim();
    const prev = builder.querySelector('.scope-preview');
    if (!verb && !obj && !impact) {
      prev.innerHTML = '<em class="text-muted">Câu phạm vi sẽ hiển thị ở đây...</em>';
    } else {
      prev.innerHTML = `<span class="verb">${esc(verb)}</span> ${esc(obj)} <span class="impact">${esc(impact)}</span>`;
    }
  }

  // ============ DYNAMIC TABLE ROWS ============
  function addTaskRow(tbodyId, content = '', weight = '', result = '') {
    const tbody = document.getElementById(tbodyId);
    const idx = tbody.rows.length + 1;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-stt"><span class="stt-num">${idx}</span></td>
      <td><input class="cell-input task-content" placeholder="Nội dung nhiệm vụ..." value="${esc(content)}"></td>
      <td class="col-weight"><input class="cell-input task-weight" type="number" min="0" max="100" placeholder="%" value="${esc(weight)}" style="text-align:center" oninput="recalcWeights()"></td>
      <td><input class="cell-input task-result" placeholder="Danh từ + mức độ thành công" value="${esc(result)}"></td>
      <td class="col-action"><button class="btn-remove" onclick="removeRow(this)">✕</button></td>
    `;
    tbody.appendChild(tr);
  }

  function addCoopRow(content1 = '', content2 = '') {
    const tbody = document.getElementById('coopBody');
    const idx = tbody.rows.length + 1;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-stt"><span class="stt-num">${idx}</span></td>
      <td><input class="cell-input coop-who" placeholder="VD: Phòng Marketing" value="${esc(content1)}"></td>
      <td><input class="cell-input coop-what" placeholder="VD: Chạy quảng cáo, viết bài trên Fanpage" value="${esc(content2)}"></td>
      <td class="col-action"><button class="btn-remove" onclick="removeRow(this)">✕</button></td>
    `;
    tbody.appendChild(tr);
  }

  function initMainTasks() {
    // Pre-fill empty rows
    for (let i = 0; i < 4; i++) addTaskRow('mainTaskBody');
  }

  function initCoopRows() {
    for (let i = 0; i < 2; i++) addCoopRow();
  }

  window.removeRow = function(btn) {
    const tr = btn.closest('tr');
    const tbody = tr.parentElement;
    tr.remove();
    reindexTableRows(tbody);
    recalcWeights();
  };

  function reindexTableRows(tbody) {
    Array.from(tbody.rows).forEach((tr, i) => {
      const stt = tr.querySelector('.stt-num');
      if (stt) stt.textContent = i + 1;
    });
  }

  window.recalcWeights = function() {
    let total = 0;
    $$('#strategicBody .task-weight, #mainTaskBody .task-weight').forEach(input => {
      total += parseFloat(input.value) || 0;
    });
    const el = $('#mainTotalWeight');
    el.textContent = total + '%';
    el.classList.toggle('over', total > 70);
    el.classList.toggle('text-success', total === 70);
  };

  // ============ RIGHTS ============
  function addRightItem(listId, value = '') {
    const list = document.getElementById(listId);
    const div = document.createElement('div');
    div.className = 'rights-item';
    div.innerHTML = `
      <span style="color:var(--text-muted);margin-top:8px;">•</span>
      <input class="cell-input right-text" placeholder="Nhập quyền hạn..." value="${esc(value)}">
      <button class="btn-remove" onclick="this.closest('.rights-item').remove()">✕</button>
    `;
    list.appendChild(div);
  }

  function initRights() {
    addRightItem('infoRightsList', 'Được nhận tất cả các thông tin liên quan đến hoạt động của công ty trong phạm vi chức năng');
    addRightItem('infoRightsList', 'Được đại diện cho Công ty làm việc với khách hàng trong phạm vi chức năng');
    addRightItem('decisionRightsList', 'Quyết định trực tiếp các vấn đề phát sinh trong phạm vi được phân công');
    addRightItem('decisionRightsList', 'Tham gia vào quá trình ra quyết định có liên quan');
    addRightItem('hrRightsList', 'Đề xuất, kiến nghị, góp ý quy trình thực hiện công việc, chế độ khen thưởng kỷ luật');
  }

  // ============ SKILLS ============
  function addSkillItem(value = '') {
    const list = document.getElementById('skillsList');
    const count = list.children.length + 1;
    const div = document.createElement('div');
    div.className = 'rights-item';
    div.innerHTML = `
      <span style="color:var(--text-muted);margin-top:8px;font-weight:600;font-size:0.8rem;min-width:24px">${count}.</span>
      <input class="cell-input skill-text" placeholder="VD: Kỹ năng đàm phán" value="${esc(value)}">
      <button class="btn-remove" onclick="removeSkill(this)">✕</button>
    `;
    list.appendChild(div);
  }

  window.removeSkill = function(btn) {
    const item = btn.closest('.rights-item');
    const list = item.parentElement;
    item.remove();
    // Reindex
    Array.from(list.children).forEach((el, i) => {
      const num = el.querySelector('span');
      if (num) num.textContent = (i + 1) + '.';
    });
  };

  function initSkills() {
    for (let i = 0; i < 4; i++) addSkillItem();
  }

  // ============ CHECKLIST ============
  function initChecklist() {
    const container = $('#checklistItems');
    CHECKLIST_ITEMS.forEach((text, i) => {
      const div = document.createElement('div');
      div.className = 'checklist-item';
      div.innerHTML = `
        <div class="checklist-checkbox" data-idx="${i}" onclick="toggleCheck(this)"></div>
        <div class="checklist-text">${i + 1}. ${text}</div>
      `;
      container.appendChild(div);
    });
  }

  window.toggleCheck = function(el) {
    el.classList.toggle('checked');
    updateChecklistScore();
  };

  function updateChecklistScore() {
    const checked = $$('.checklist-checkbox.checked').length;
    const total = CHECKLIST_ITEMS.length;
    $('#checklistScore .score-num').textContent = `${checked}/${total}`;
    const scoreEl = $('#checklistScore .score-num');
    scoreEl.style.color = checked === total ? 'var(--success)' : checked >= 10 ? 'var(--warning)' : 'var(--danger)';
  }

  // ============ VERB PANEL ============
  function updateVerbPanel() {
    const level = $('#jobLevel').value;
    const labelEl = $('#verbLevelLabel');
    const tagsEl = $('#verbTags');

    if (!level || !VERBS[level]) {
      labelEl.textContent = '—';
      tagsEl.innerHTML = '<span class="text-muted" style="font-size:0.8rem">Chọn cấp bậc ở Bước 1 để xem gợi ý</span>';
      return;
    }

    const labels = { leader: 'Lãnh đạo cấp cao', manager: 'Quản lý cấp trung', expert: 'Chuyên gia', staff: 'Nhân viên' };
    labelEl.textContent = labels[level] || level;
    tagsEl.innerHTML = VERBS[level].map(v => `<span class="verb-tag" onclick="insertVerb('${v}')">${v}</span>`).join('');
  }

  window.insertVerb = function(verb) {
    // Find first empty scope verb input
    const inputs = $$('.scope-verb');
    for (const inp of inputs) {
      if (!inp.value.trim()) { inp.value = verb; inp.focus(); updateScopePreview(inp); return; }
    }
    // All filled, append to last
    const last = inputs[inputs.length - 1];
    if (last) {
      last.value = last.value ? last.value + ', ' + verb.toLowerCase() : verb;
      last.focus();
      updateScopePreview(last);
    }
  };

  // ============ STRATEGIC SECTION TOGGLE ============
  function toggleStrategicSection() {
    const level = $('#jobLevel').value;
    const isManager = level === 'leader' || level === 'manager';
    const section = $('#strategicSection');
    section.classList.toggle('hidden', !isManager);
    if (isManager && $('#strategicBody').rows.length === 0) {
      addTaskRow('strategicBody', 'Xây dựng chiến lược và kế hoạch phát triển', '10', '');
      addTaskRow('strategicBody', 'Phân công, giám sát công việc cho nhân viên', '5', '');
      addTaskRow('strategicBody', 'Đào tạo, huấn luyện, phát triển năng lực nhân viên', '5', '');
    }
  }

  // ============ COMPANY CUSTOM ============
  function toggleCustomCompany() {
    const val = $('#companyName').value;
    $('#customCompanyWrap').classList.toggle('hidden', val !== 'custom');
  }

  // ============ COLLECT DATA ============
  function collectData() {
    const company = $('#companyName').value === 'custom' ? $('#customCompanyName').value : $('#companyName').value;
    const level = $('#jobLevel').value;

    // Scopes
    const scopes = [];
    $$('.scope-builder').forEach(builder => {
      const verb = builder.querySelector('.scope-verb').value.trim();
      const obj = builder.querySelector('.scope-obj').value.trim();
      const impact = builder.querySelector('.scope-impact').value.trim();
      if (verb || obj || impact) scopes.push({ verb, obj, impact });
    });

    // Tasks
    const strategicTasks = collectTableRows('strategicBody');
    const mainTasks = collectTableRows('mainTaskBody');

    // Cooperation
    const coops = [];
    $$('#coopBody tr').forEach(tr => {
      const who = tr.querySelector('.coop-who')?.value?.trim() || '';
      const what = tr.querySelector('.coop-what')?.value?.trim() || '';
      if (who || what) coops.push({ who, what });
    });

    // Rights
    const infoRights = collectRights('infoRightsList');
    const decisionRights = collectRights('decisionRightsList');
    const hrRights = collectRights('hrRightsList');

    // Skills
    const skills = [];
    $$('#skillsList .skill-text').forEach(inp => {
      if (inp.value.trim()) skills.push(inp.value.trim());
    });

    return {
      company,
      position: $('#positionName').value.trim(),
      department: $('#department').value.trim(),
      level,
      reportDirect: $('#reportDirect').value.trim(),
      reportIndirect: $('#reportIndirect').value.trim(),
      numReports: parseInt($('#numReports').value) || 0,
      substitute: $('#substitute').value.trim(),
      empName: $('#empName').value.trim(),
      empCode: $('#empCode').value.trim(),
      empEmail: $('#empEmail').value.trim(),
      empMobile: $('#empMobile').value.trim(),
      scopes,
      strategicTasks,
      mainTasks,
      coops,
      internalWork: $('#internalWork').value.trim(),
      reportWork: $('#reportWork').value.trim(),
      otherWork: $('#otherWork').value.trim(),
      complianceWork: $('#complianceWork').value.trim(),
      infoRights,
      decisionRights,
      hrRights,
      workConditions: $('#workConditions').value.trim(),
      reqEducation: $('#reqEducation').value.trim(),
      reqExperience: $('#reqExperience').value.trim(),
      reqQualities: $('#reqQualities').value.trim(),
      skills
    };
  }

  function collectTableRows(tbodyId) {
    const rows = [];
    $$(`#${tbodyId} tr`).forEach(tr => {
      const content = tr.querySelector('.task-content')?.value?.trim() || '';
      const weight = tr.querySelector('.task-weight')?.value?.trim() || '';
      const result = tr.querySelector('.task-result')?.value?.trim() || '';
      if (content) rows.push({ content, weight, result });
    });
    return rows;
  }

  function collectRights(listId) {
    const items = [];
    $$(`#${listId} .right-text`).forEach(inp => {
      if (inp.value.trim()) items.push(inp.value.trim());
    });
    return items;
  }

  // ============ RENDER PREVIEW ============
  function renderPreview() {
    const d = collectData();
    const today = new Date().toLocaleDateString('vi-VN');
    const levelLabel = { leader: 'Lãnh đạo', manager: 'Quản lý', expert: 'Chuyên gia', staff: 'Nhân viên' }[d.level] || '';

    let html = '';

    // Title
    html += `<h1>BẢN MÔ TẢ CÔNG VIỆC</h1>`;
    html += `<div class="doc-subtitle">Vị trí: <strong>${esc(d.position) || '___'}</strong></div>`;
    html += `<div class="doc-meta">${esc(d.company) || '___'} · Ngày: ${today}</div>`;

    // Personal info
    html += `<h2>Thông tin</h2>`;
    html += `<table>
      <tr><td style="width:35%;font-weight:600">Chức danh</td><td>${esc(d.position) || '___'}</td></tr>
      <tr><td style="font-weight:600">Đơn vị</td><td>${esc(d.department) || '___'}</td></tr>
      <tr><td style="font-weight:600">Cấp bậc</td><td>${esc(levelLabel)}</td></tr>`;
    if (d.empName) html += `<tr><td style="font-weight:600">Họ và tên</td><td>${esc(d.empName)}</td></tr>`;
    if (d.empCode) html += `<tr><td style="font-weight:600">Mã nhân viên</td><td>${esc(d.empCode)}</td></tr>`;
    if (d.empEmail) html += `<tr><td style="font-weight:600">E-mail</td><td>${esc(d.empEmail)}</td></tr>`;
    if (d.empMobile) html += `<tr><td style="font-weight:600">Mobile</td><td>${esc(d.empMobile)}</td></tr>`;
    html += `<tr><td style="font-weight:600">Người thay thế khi vắng mặt</td><td>${esc(d.substitute) || '___'}</td></tr>`;
    html += `</table>`;

    // Scope
    html += `<h2>Phạm vi Công việc</h2>`;
    if (d.scopes.length) {
      d.scopes.forEach(s => {
        html += `<div class="scope-item"><span class="scope-verb">${esc(s.verb)}</span> ${esc(s.obj)} <span class="scope-impact">${esc(s.impact)}</span></div>`;
      });
    } else {
      html += `<div class="empty-notice">(Chưa nhập phạm vi công việc)</div>`;
    }

    // Reporting
    html += `<h2>Quan hệ Công việc</h2>`;
    html += `<table>
      <tr><td style="width:40%;font-weight:600">Báo cáo trực tiếp cho</td><td>${esc(d.reportDirect) || '___'}</td></tr>
      <tr><td style="font-weight:600">Báo cáo gián tiếp cho</td><td>${esc(d.reportIndirect) || '___'}</td></tr>
    </table>`;

    // Responsibilities
    html += `<h2>Các Trách nhiệm Chính</h2>`;

    // Strategic
    if (d.strategicTasks.length > 0) {
      html += `<h3>I. Nhiệm vụ Chiến lược</h3>`;
      html += renderTaskTable(d.strategicTasks, 1);
    }

    // Main
    const mainStart = d.strategicTasks.length > 0 ? 'II' : 'I';
    html += `<h3>${mainStart}. Nhiệm vụ Chính (70%)</h3>`;
    if (d.mainTasks.length) {
      html += renderTaskTable(d.mainTasks, d.strategicTasks.length + 1);
    } else {
      html += `<div class="empty-notice">(Chưa nhập nhiệm vụ chính)</div>`;
    }

    // Cooperation
    const coopNum = d.strategicTasks.length > 0 ? 'III' : 'II';
    html += `<h3>${coopNum}. Phối hợp & Hỗ trợ (15%)</h3>`;
    if (d.coops.length) {
      html += `<table><thead><tr><th>Phối hợp với</th><th>Trong công việc</th></tr></thead><tbody>`;
      d.coops.forEach(c => {
        html += `<tr><td>${esc(c.who)}</td><td>${esc(c.what)}</td></tr>`;
      });
      html += `</tbody></table>`;
    }

    // Supplementary
    html += `<h3>${nextRoman(coopNum)}. Công việc nội bộ bộ phận (5%)</h3>`;
    html += renderTextBlock(d.internalWork, 'Hoàn thành đúng yêu cầu');

    html += `<h3>${nextRoman(coopNum, 2)}. Báo cáo (5%)</h3>`;
    html += renderTextBlock(d.reportWork, 'Báo cáo chính xác, đúng kỳ');

    html += `<h3>${nextRoman(coopNum, 3)}. Nhiệm vụ khác (5%)</h3>`;
    html += renderTextBlock(d.otherWork, 'Hoàn thành đúng yêu cầu');

    html += `<h3>${nextRoman(coopNum, 4)}. Chấp hành Nội quy lao động (5%)</h3>`;
    html += renderTextBlock(d.complianceWork, 'Không vi phạm');

    // Rights
    html += `<h2>Quyền hạn</h2>`;
    html += renderRightsSection('Thông tin', d.infoRights);
    html += renderRightsSection('Ra quyết định', d.decisionRights);
    html += renderRightsSection('Nhân sự', d.hrRights);
    if (d.workConditions) {
      html += `<p style="margin-top:8px"><strong>Điều kiện làm việc:</strong> ${esc(d.workConditions)}</p>`;
    }

    // Requirements
    html += `<h2>Yêu cầu cho Vị trí</h2>`;
    html += `<table>
      <thead><tr><th style="width:5%"></th><th>Tiêu chuẩn</th><th style="width:8%">Đạt</th></tr></thead>
      <tbody>
        <tr><td colspan="2" style="font-weight:600">1. Tiêu chuẩn về học vấn</td><td style="text-align:center">✓</td></tr>
        ${d.reqEducation.split('\n').map(l => `<tr><td></td><td>${esc(l)}</td><td style="text-align:center">✓</td></tr>`).join('')}
        <tr><td colspan="2" style="font-weight:600">2. Tiêu chuẩn về kinh nghiệm</td><td style="text-align:center"></td></tr>
        ${d.reqExperience.split('\n').map(l => `<tr><td></td><td>${esc(l)}</td><td style="text-align:center">✓</td></tr>`).join('')}
        <tr><td colspan="2" style="font-weight:600">3. Tiêu chuẩn về con người</td><td style="text-align:center">✓</td></tr>
        ${d.reqQualities.split('\n').map(l => `<tr><td></td><td>${esc(l)}</td><td></td></tr>`).join('')}
        <tr><td colspan="2" style="font-weight:600">4. Tiêu chuẩn về kỹ năng</td><td style="text-align:center"></td></tr>
        ${d.skills.map((s, i) => `<tr><td></td><td>${i + 1}. ${esc(s)}</td><td style="text-align:center">✓</td></tr>`).join('')}
      </tbody>
    </table>`;

    // Commitment
    html += `<h2>Cam kết Thực hiện</h2>`;
    html += `<div class="sign-grid">
      <div class="sign-box">
        <div class="sign-title">Người hướng dẫn</div>
        <p style="font-size:11px;color:#888;font-style:italic">Người ký tên dưới đây đã hướng dẫn kỹ cách thức thực hiện công việc chi tiết theo Bản mô tả công việc này.</p>
        <div class="sign-line"></div>
        <div class="sign-caption">Ký, ghi rõ họ tên</div>
      </div>
      <div class="sign-box">
        <div class="sign-title">Người nhận việc</div>
        <p style="font-size:11px;color:#888;font-style:italic">Người ký tên dưới đây đã hiểu kỹ và cam kết thực hiện đúng theo Bản mô tả công việc này.</p>
        <div class="sign-line"></div>
        <div class="sign-caption">Ký, ghi rõ họ tên</div>
      </div>
    </div>`;

    $('#previewDoc').innerHTML = html;
  }

  function renderTaskTable(tasks, startIdx) {
    let html = `<table>
      <thead><tr><th style="width:5%">STT</th><th>Nội dung</th><th style="width:8%">%</th><th>Kết quả đầu ra</th></tr></thead>
      <tbody>`;
    tasks.forEach((t, i) => {
      html += `<tr><td style="text-align:center">${startIdx + i}</td><td>${esc(t.content)}</td><td style="text-align:center">${esc(t.weight)}%</td><td>${esc(t.result)}</td></tr>`;
    });
    html += `</tbody></table>`;
    return html;
  }

  function renderTextBlock(text, resultLabel) {
    if (!text) return '';
    const lines = text.split('\n').filter(l => l.trim());
    let html = '<table><thead><tr><th>Nội dung</th><th style="width:35%">Yêu cầu kết quả</th></tr></thead><tbody>';
    lines.forEach((line, i) => {
      html += `<tr><td>${esc(line)}</td><td>${i === 0 ? esc(resultLabel) : ''}</td></tr>`;
    });
    html += '</tbody></table>';
    return html;
  }

  function renderRightsSection(title, items) {
    if (!items.length) return '';
    let html = `<h3>${esc(title)}:</h3><ul style="margin:4px 0 12px 20px">`;
    items.forEach(item => { html += `<li style="margin:3px 0">${esc(item)}</li>`; });
    html += '</ul>';
    return html;
  }

  function nextRoman(base, offset = 1) {
    const map = { 'II': ['III', 'IV', 'V', 'VI', 'VII'], 'III': ['IV', 'V', 'VI', 'VII', 'VIII'] };
    return (map[base] || ['IV', 'V', 'VI', 'VII'])[offset - 1] || 'V';
  }

  // ============ EXPORT MARKDOWN ============
  function generateMarkdown() {
    const d = collectData();
    const today = new Date().toISOString().split('T')[0];
    const slug = (d.position || 'vi-tri').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, '');

    let md = `---
type: job-description
tags: [mo-ta-cong-viec, ${slugify(d.department)}, ${slug}]
company: ${d.company}
department: ${d.department}
position: ${d.position}
reports-to: ${d.reportDirect}
version: v1.0
status: active
created: ${today}
updated: ${today}
---

# Bản Mô Tả Công Việc — ${d.position}

> **Phòng ban:** ${d.department}
> **Ngày ban hành:** ${today} | **Lần sửa đổi:** 0

---

## Thông tin Chung

| Thông tin | Chi tiết |
|:---|:---|
| Chức danh | ${d.position} |
| Phòng ban | ${d.department} |
| Báo cáo trực tiếp | ${d.reportDirect} |
| Báo cáo gián tiếp | ${d.reportIndirect || '—'} |
| Quản lý trực tiếp | ${d.numReports > 0 ? d.numReports + ' người' : 'Không'} |
| Người thay thế khi vắng mặt | ${d.substitute || '—'} |
`;

    if (d.empName) {
      md += `
### Thông tin Cá nhân

| Mục | Chi tiết |
|:---|:---|
| Họ và tên | ${d.empName} |
| Mã nhân viên | ${d.empCode || '—'} |
| Email | ${d.empEmail || '—'} |
| Mobile | ${d.empMobile || '—'} |
`;
    }

    // Scope
    md += `\n## Phạm vi Công việc\n\n`;
    d.scopes.forEach((s, i) => {
      md += `${i + 1}. **${s.verb}** ${s.obj} **${s.impact}**\n`;
    });

    // Responsibilities
    md += `\n## Trách nhiệm Chính (70%)\n`;

    if (d.strategicTasks.length > 0) {
      md += `\n### Nhiệm vụ Chiến lược\n\n`;
      md += `| STT | Nội dung | Tỷ trọng | Kết quả đầu ra |\n|:---:|:---|:---:|:---|\n`;
      d.strategicTasks.forEach((t, i) => {
        md += `| ${i + 1} | ${t.content} | ${t.weight}% | ${t.result} |\n`;
      });
    }

    md += `\n### Nhiệm vụ Chính\n\n`;
    md += `| STT | Nội dung | Tỷ trọng | Kết quả đầu ra |\n|:---:|:---|:---:|:---|\n`;
    const offset = d.strategicTasks.length;
    d.mainTasks.forEach((t, i) => {
      md += `| ${offset + i + 1} | ${t.content} | ${t.weight}% | ${t.result} |\n`;
    });

    // Cooperation
    md += `\n## Phối hợp & Hỗ trợ (15%)\n\n`;
    md += `| Phối hợp với | Trong công việc |\n|:---|:---|\n`;
    d.coops.forEach(c => {
      md += `| ${c.who} | ${c.what} |\n`;
    });

    // Supplementary
    md += `\n## Công việc Bổ sung\n\n`;
    md += `| Phần | Tỷ trọng |\n|:---|:---:|\n`;
    md += `| Công việc nội bộ bộ phận | 5% |\n`;
    md += `| Báo cáo (ngày/tuần/tháng/quý) | 5% |\n`;
    md += `| Nhiệm vụ khác được giao | 5% |\n`;
    md += `| Chấp hành nội quy lao động | 5% |\n`;
    md += `| **Tổng** | **100%** |\n`;

    // Rights
    md += `\n## Quyền hạn\n`;
    md += `\n### Quyền thông tin\n`;
    d.infoRights.forEach(r => { md += `- ${r}\n`; });
    md += `\n### Quyền ra quyết định\n`;
    d.decisionRights.forEach(r => { md += `- ${r}\n`; });
    md += `\n### Quyền nhân sự\n`;
    d.hrRights.forEach(r => { md += `- ${r}\n`; });
    if (d.workConditions) md += `\n**Điều kiện làm việc:** ${d.workConditions}\n`;

    // Requirements
    md += `\n## Yêu cầu Vị trí\n\n`;
    md += `| Nhóm | Yêu cầu |\n|:---|:---|\n`;
    md += `| **Học vấn** | ${d.reqEducation.replace(/\n/g, ' · ')} |\n`;
    md += `| **Kinh nghiệm** | ${d.reqExperience.replace(/\n/g, ' · ')} |\n`;
    md += `| **Phẩm chất** | ${d.reqQualities.replace(/\n/g, ' · ')} |\n`;
    md += `| **Kỹ năng** | ${d.skills.map((s, i) => `${i + 1}. ${s}`).join(' · ')} |\n`;

    // Commitment
    md += `\n---\n\n## Cam kết Thực hiện\n\n`;
    md += `| | Họ tên | Chữ ký | Ngày |\n|:---|:---|:---|:---|\n`;
    md += `| **Người nhận việc** | ___________ | ___________ | ___/___/___ |\n`;
    md += `| **Người hướng dẫn** | ___________ | ___________ | ___/___/___ |\n`;
    md += `| **Trưởng phòng** | ___________ | ___________ | ___/___/___ |\n`;

    // Links
    md += `\n---\n\n## 🔗 Liên kết\n\n`;
    md += `- [[so-do-to-chuc]] — Sơ đồ tổ chức\n`;
    md += `- [[kpi]] — KPI vị trí\n`;
    md += `- [[co-che-luong]] — Cơ chế lương thưởng\n`;

    return md;
  }

  function slugify(text) {
    return (text || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, '') || 'phong-ban';
  }

  function downloadMarkdown() {
    const md = generateMarkdown();
    const d = collectData();
    const filename = slugify(d.position || 'mtcv') + '.md';
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã tải file ' + filename, 'success');
  }

  function copyMarkdown() {
    const md = generateMarkdown();
    navigator.clipboard.writeText(md).then(() => {
      showToast('Đã copy Markdown vào clipboard!', 'success');
    }).catch(() => {
      showToast('Không thể copy. Hãy thử lại.', 'error');
    });
  }

  // ============ PRINT ============
  function printDoc() {
    renderPreview();
    switchView('preview');
    setTimeout(() => window.print(), 300);
  }

  // ============ TOAST ============
  function showToast(msg, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.className = `toast ${type}`;
    div.innerHTML = `${type === 'success' ? '✅' : '⚠️'} ${msg}`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  }

  // ============ UTILITY ============
  function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ============ EVENT BINDINGS ============
  function bindEvents() {
    // Step navigation
    $('#btnNext').addEventListener('click', () => {
      if (currentStep === totalSteps) { switchView('preview'); return; }
      goToStep(currentStep + 1);
    });
    $('#btnPrev').addEventListener('click', () => goToStep(currentStep - 1));

    // Click on step
    $$('.step-item').forEach(item => {
      item.addEventListener('click', () => goToStep(parseInt(item.dataset.step)));
    });

    // View tabs
    $$('.view-tab').forEach(tab => {
      tab.addEventListener('click', () => switchView(tab.dataset.view));
    });

    // Company
    $('#companyName').addEventListener('change', toggleCustomCompany);

    // Job level → verb panel + strategic section
    $('#jobLevel').addEventListener('change', () => {
      updateVerbPanel();
      toggleStrategicSection();
    });

    // Add scope
    $('#addScope').addEventListener('click', () => {
      if (scopeCount >= 3) { showToast('Tối đa 3 phạm vi công việc', 'error'); return; }
      addScopeItem();
    });

    // Add rows (generic)
    $$('.btn-add-row[data-target]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        const type = btn.dataset.type;
        if (type === 'right') {
          addRightItem(target);
        } else if (target === 'coopBody') {
          addCoopRow();
        } else {
          addTaskRow(target);
        }
      });
    });

    // Add skill
    $('#addSkill').addEventListener('click', () => {
      const count = $$('#skillsList .rights-item').length;
      if (count >= 8) { showToast('Khuyến nghị chỉ 4–6 kỹ năng', 'error'); return; }
      addSkillItem();
    });

    // Export
    $('#btnExportMd').addEventListener('click', downloadMarkdown);
    $('#btnCopyMd').addEventListener('click', copyMarkdown);
    $('#btnPrint').addEventListener('click', printDoc);
  }

});
