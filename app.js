/* ============================================================
   MTCV Builder — Application Logic (v2 - robust)
   JD-BUILDER: Gather → Scope → Decompose → Output → Authorize → Package
   ============================================================ */

(function () {
  'use strict';

  // ============ STATE ============
  let currentStep = 1;
  const totalSteps = 6;
  let scopeCount = 0;

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

  // ============ DOM HELPERS ============
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  function esc(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ============ NAVIGATION ============
  function goToStep(step) {
    if (step < 1 || step > totalSteps) return;
    currentStep = step;

    // Update step content visibility
    document.querySelectorAll('.step-content').forEach(function (el) {
      if (parseInt(el.getAttribute('data-step')) === step) {
        el.classList.add('active');
        el.style.display = 'block';
      } else {
        el.classList.remove('active');
        el.style.display = 'none';
      }
    });

    // Update step progress indicators
    document.querySelectorAll('.step-item').forEach(function (el) {
      var s = parseInt(el.getAttribute('data-step'));
      el.classList.remove('active', 'done');
      if (s === step) el.classList.add('active');
      else if (s < step) el.classList.add('done');
    });

    // Update step lines
    var lines = document.querySelectorAll('.step-line');
    lines.forEach(function (el, idx) {
      el.classList.remove('done', 'active');
      if (idx + 1 < step) el.classList.add('done');
      else if (idx + 1 === step) el.classList.add('active');
    });

    // Nav buttons
    var btnPrev = document.getElementById('btnPrev');
    var btnNext = document.getElementById('btnNext');
    if (btnPrev) btnPrev.disabled = (step === 1);
    if (btnNext) btnNext.textContent = (step === totalSteps) ? '👁️ Xem trước' : 'Tiếp theo →';

    var info = document.getElementById('stepInfoText');
    if (info) info.textContent = 'Bước ' + step + ' / ' + totalSteps + ' — ' + STEP_NAMES[step];

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function switchView(viewName) {
    // Tabs
    document.querySelectorAll('.view-tab').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-view') === viewName);
    });

    // Views
    var formView = document.getElementById('formView');
    var previewView = document.getElementById('previewView');
    var checklistView = document.getElementById('checklistView');
    var wizardNav = document.getElementById('wizardNav');

    if (formView) formView.style.display = (viewName === 'form') ? 'block' : 'none';
    if (previewView) previewView.style.display = (viewName === 'preview') ? 'block' : 'none';
    if (checklistView) checklistView.style.display = (viewName === 'checklist') ? 'block' : 'none';
    if (wizardNav) wizardNav.style.display = (viewName === 'form') ? 'flex' : 'none';

    if (viewName === 'preview') renderPreview();
    if (viewName === 'checklist') updateChecklistScore();
  }

  // ============ SCOPE BUILDER ============
  function addScopeItem(verb, obj, impact) {
    verb = verb || '';
    obj = obj || '';
    impact = impact || '';
    scopeCount++;
    var num = scopeCount;
    var container = document.getElementById('scopeContainer');
    if (!container) return;

    var div = document.createElement('div');
    div.className = 'scope-builder';
    div.setAttribute('data-scope-num', num);
    div.innerHTML =
      '<div class="scope-builder-header">' +
        '<div class="scope-builder-num">' + num + '</div>' +
        '<button class="btn-remove js-remove-scope" title="Xoá">✕</button>' +
      '</div>' +
      '<div class="scope-parts">' +
        '<div class="form-group">' +
          '<label class="form-label">Động từ</label>' +
          '<input class="form-input scope-verb js-scope-input" placeholder="VD: Tư vấn, bán hàng và chăm sóc" value="' + esc(verb) + '">' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Tân ngữ</label>' +
          '<input class="form-input scope-obj js-scope-input" placeholder="VD: khách hàng về SP/DV của công ty" value="' + esc(obj) + '">' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Tác động</label>' +
          '<input class="form-input scope-impact js-scope-input" placeholder="VD: nhằm đạt doanh số theo mục tiêu" value="' + esc(impact) + '">' +
        '</div>' +
      '</div>' +
      '<div class="scope-preview"><em class="text-muted">Câu phạm vi sẽ hiển thị ở đây...</em></div>';
    container.appendChild(div);
    updateScopePreviewFor(div);
  }

  function updateScopePreviewFor(builder) {
    if (!builder) return;
    var verb = (builder.querySelector('.scope-verb') || {}).value || '';
    var obj = (builder.querySelector('.scope-obj') || {}).value || '';
    var impact = (builder.querySelector('.scope-impact') || {}).value || '';
    var prev = builder.querySelector('.scope-preview');
    if (!prev) return;
    verb = verb.trim(); obj = obj.trim(); impact = impact.trim();
    if (!verb && !obj && !impact) {
      prev.innerHTML = '<em class="text-muted">Câu phạm vi sẽ hiển thị ở đây...</em>';
    } else {
      prev.innerHTML = '<span class="verb">' + esc(verb) + '</span> ' + esc(obj) + ' <span class="impact">' + esc(impact) + '</span>';
    }
  }

  function reindexScopes() {
    scopeCount = 0;
    document.querySelectorAll('.scope-builder').forEach(function (el) {
      scopeCount++;
      el.setAttribute('data-scope-num', scopeCount);
      var numEl = el.querySelector('.scope-builder-num');
      if (numEl) numEl.textContent = scopeCount;
    });
  }

  // ============ DYNAMIC TABLE ROWS ============
  function addTaskRow(tbodyId, content, weight, result) {
    content = content || ''; weight = weight || ''; result = result || '';
    var tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    var idx = tbody.rows.length + 1;
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td class="col-stt"><span class="stt-num">' + idx + '</span></td>' +
      '<td><input class="cell-input task-content" placeholder="Nội dung nhiệm vụ..." value="' + esc(content) + '"></td>' +
      '<td class="col-weight"><input class="cell-input task-weight js-weight-input" type="number" min="0" max="100" placeholder="%" value="' + esc(weight) + '" style="text-align:center"></td>' +
      '<td><input class="cell-input task-result" placeholder="Danh từ + mức độ thành công" value="' + esc(result) + '"></td>' +
      '<td class="col-action"><button class="btn-remove js-remove-row">✕</button></td>';
    tbody.appendChild(tr);
  }

  function addCoopRow(who, what) {
    who = who || ''; what = what || '';
    var tbody = document.getElementById('coopBody');
    if (!tbody) return;
    var idx = tbody.rows.length + 1;
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td class="col-stt"><span class="stt-num">' + idx + '</span></td>' +
      '<td><input class="cell-input coop-who" placeholder="VD: Phòng Marketing" value="' + esc(who) + '"></td>' +
      '<td><input class="cell-input coop-what" placeholder="VD: Chạy quảng cáo, viết bài trên Fanpage" value="' + esc(what) + '"></td>' +
      '<td class="col-action"><button class="btn-remove js-remove-row">✕</button></td>';
    tbody.appendChild(tr);
  }

  function reindexTableRows(tbody) {
    if (!tbody) return;
    Array.from(tbody.rows).forEach(function (tr, i) {
      var stt = tr.querySelector('.stt-num');
      if (stt) stt.textContent = i + 1;
    });
  }

  function recalcWeights() {
    var total = 0;
    document.querySelectorAll('#strategicBody .task-weight, #mainTaskBody .task-weight').forEach(function (inp) {
      total += parseFloat(inp.value) || 0;
    });
    var el = document.getElementById('mainTotalWeight');
    if (el) {
      el.textContent = total + '%';
      el.className = 'total-value' + (total > 70 ? ' over text-danger' : (total === 70 ? ' text-success' : ''));
    }
  }

  // ============ RIGHTS ============
  function addRightItem(listId, value) {
    value = value || '';
    var list = document.getElementById(listId);
    if (!list) return;
    var div = document.createElement('div');
    div.className = 'rights-item';
    div.innerHTML =
      '<span style="color:var(--text-muted);margin-top:8px;">•</span>' +
      '<input class="cell-input right-text" placeholder="Nhập quyền hạn..." value="' + esc(value) + '">' +
      '<button class="btn-remove js-remove-right">✕</button>';
    list.appendChild(div);
  }

  // ============ SKILLS ============
  function addSkillItem(value) {
    value = value || '';
    var list = document.getElementById('skillsList');
    if (!list) return;
    var count = list.children.length + 1;
    var div = document.createElement('div');
    div.className = 'rights-item';
    div.innerHTML =
      '<span class="skill-num" style="color:var(--text-muted);margin-top:8px;font-weight:600;font-size:0.8rem;min-width:24px">' + count + '.</span>' +
      '<input class="cell-input skill-text" placeholder="VD: Kỹ năng đàm phán" value="' + esc(value) + '">' +
      '<button class="btn-remove js-remove-skill">✕</button>';
    list.appendChild(div);
  }

  function reindexSkills() {
    var list = document.getElementById('skillsList');
    if (!list) return;
    Array.from(list.children).forEach(function (el, i) {
      var num = el.querySelector('.skill-num');
      if (num) num.textContent = (i + 1) + '.';
    });
  }

  // ============ CHECKLIST ============
  function initChecklist() {
    var container = document.getElementById('checklistItems');
    if (!container) return;
    CHECKLIST_ITEMS.forEach(function (text, i) {
      var div = document.createElement('div');
      div.className = 'checklist-item';
      div.innerHTML =
        '<div class="checklist-checkbox js-check" data-idx="' + i + '"></div>' +
        '<div class="checklist-text">' + (i + 1) + '. ' + text + '</div>';
      container.appendChild(div);
    });
  }

  function updateChecklistScore() {
    var checked = document.querySelectorAll('.checklist-checkbox.checked').length;
    var total = CHECKLIST_ITEMS.length;
    var numEl = document.querySelector('#checklistScore .score-num');
    if (numEl) {
      numEl.textContent = checked + '/' + total;
      numEl.style.color = checked === total ? 'var(--success)' : checked >= 10 ? 'var(--warning)' : 'var(--danger)';
    }
  }

  // ============ VERB PANEL ============
  function updateVerbPanel() {
    var levelSel = document.getElementById('jobLevel');
    var level = levelSel ? levelSel.value : '';
    var labelEl = document.getElementById('verbLevelLabel');
    var tagsEl = document.getElementById('verbTags');
    if (!labelEl || !tagsEl) return;

    if (!level || !VERBS[level]) {
      labelEl.textContent = '—';
      tagsEl.innerHTML = '<span class="text-muted" style="font-size:0.8rem">Chọn cấp bậc ở Bước 1 để xem gợi ý</span>';
      return;
    }
    var labels = { leader: 'Lãnh đạo cấp cao', manager: 'Quản lý cấp trung', expert: 'Chuyên gia', staff: 'Nhân viên' };
    labelEl.textContent = labels[level] || level;
    tagsEl.innerHTML = VERBS[level].map(function (v) {
      return '<span class="verb-tag js-verb-tag" data-verb="' + esc(v) + '">' + esc(v) + '</span>';
    }).join('');
  }

  function toggleStrategicSection() {
    var levelSel = document.getElementById('jobLevel');
    var level = levelSel ? levelSel.value : '';
    var isManager = (level === 'leader' || level === 'manager');
    var section = document.getElementById('strategicSection');
    if (!section) return;
    section.classList.toggle('hidden', !isManager);
    section.style.display = isManager ? 'block' : 'none';
    if (isManager) {
      var tbody = document.getElementById('strategicBody');
      if (tbody && tbody.rows.length === 0) {
        addTaskRow('strategicBody', 'Xây dựng chiến lược và kế hoạch phát triển', '10', '');
        addTaskRow('strategicBody', 'Phân công, giám sát công việc cho nhân viên', '5', '');
        addTaskRow('strategicBody', 'Đào tạo, huấn luyện, phát triển năng lực nhân viên', '5', '');
      }
    }
  }

  // ============ COLLECT DATA ============
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }

  function collectData() {
    var company = val('companyName') === 'custom' ? val('customCompanyName') : val('companyName');

    var scopes = [];
    document.querySelectorAll('.scope-builder').forEach(function (builder) {
      var verb = (builder.querySelector('.scope-verb') || {}).value || '';
      var obj = (builder.querySelector('.scope-obj') || {}).value || '';
      var impact = (builder.querySelector('.scope-impact') || {}).value || '';
      verb = verb.trim(); obj = obj.trim(); impact = impact.trim();
      if (verb || obj || impact) scopes.push({ verb: verb, obj: obj, impact: impact });
    });

    var strategicTasks = collectTableRows('strategicBody');
    var mainTasks = collectTableRows('mainTaskBody');

    var coops = [];
    document.querySelectorAll('#coopBody tr').forEach(function (tr) {
      var who = (tr.querySelector('.coop-who') || {}).value || '';
      var what = (tr.querySelector('.coop-what') || {}).value || '';
      who = who.trim(); what = what.trim();
      if (who || what) coops.push({ who: who, what: what });
    });

    var infoRights = collectRights('infoRightsList');
    var decisionRights = collectRights('decisionRightsList');
    var hrRights = collectRights('hrRightsList');

    var skills = [];
    document.querySelectorAll('#skillsList .skill-text').forEach(function (inp) {
      if (inp.value.trim()) skills.push(inp.value.trim());
    });

    return {
      company: company,
      position: val('positionName'),
      department: val('department'),
      level: val('jobLevel'),
      reportDirect: val('reportDirect'),
      reportIndirect: val('reportIndirect'),
      numReports: parseInt(val('numReports')) || 0,
      substitute: val('substitute'),
      empName: val('empName'),
      empCode: val('empCode'),
      empEmail: val('empEmail'),
      empMobile: val('empMobile'),
      scopes: scopes,
      strategicTasks: strategicTasks,
      mainTasks: mainTasks,
      coops: coops,
      internalWork: val('internalWork'),
      reportWork: val('reportWork'),
      otherWork: val('otherWork'),
      complianceWork: val('complianceWork'),
      infoRights: infoRights,
      decisionRights: decisionRights,
      hrRights: hrRights,
      workConditions: val('workConditions'),
      reqEducation: val('reqEducation'),
      reqExperience: val('reqExperience'),
      reqQualities: val('reqQualities'),
      skills: skills
    };
  }

  function collectTableRows(tbodyId) {
    var rows = [];
    document.querySelectorAll('#' + tbodyId + ' tr').forEach(function (tr) {
      var content = (tr.querySelector('.task-content') || {}).value || '';
      var weight = (tr.querySelector('.task-weight') || {}).value || '';
      var result = (tr.querySelector('.task-result') || {}).value || '';
      content = content.trim();
      if (content) rows.push({ content: content, weight: weight.trim(), result: result.trim() });
    });
    return rows;
  }

  function collectRights(listId) {
    var items = [];
    document.querySelectorAll('#' + listId + ' .right-text').forEach(function (inp) {
      if (inp.value.trim()) items.push(inp.value.trim());
    });
    return items;
  }

  // ============ RENDER PREVIEW ============
  function renderPreview() {
    var d = collectData();
    var today = new Date().toLocaleDateString('vi-VN');
    var levelLabel = { leader: 'Lãnh đạo', manager: 'Quản lý', expert: 'Chuyên gia', staff: 'Nhân viên' }[d.level] || '';

    var h = '';
    h += '<h1>BẢN MÔ TẢ CÔNG VIỆC</h1>';
    h += '<div class="doc-subtitle">Vị trí: <strong>' + (esc(d.position) || '___') + '</strong></div>';
    h += '<div class="doc-meta">' + (esc(d.company) || '___') + ' · Ngày: ' + today + '</div>';

    // Info
    h += '<h2>Thông tin</h2>';
    h += '<table>';
    h += '<tr><td style="width:35%;font-weight:600">Chức danh</td><td>' + (esc(d.position) || '___') + '</td></tr>';
    h += '<tr><td style="font-weight:600">Đơn vị</td><td>' + (esc(d.department) || '___') + '</td></tr>';
    h += '<tr><td style="font-weight:600">Cấp bậc</td><td>' + esc(levelLabel) + '</td></tr>';
    if (d.empName) h += '<tr><td style="font-weight:600">Họ và tên</td><td>' + esc(d.empName) + '</td></tr>';
    if (d.empCode) h += '<tr><td style="font-weight:600">Mã nhân viên</td><td>' + esc(d.empCode) + '</td></tr>';
    if (d.empEmail) h += '<tr><td style="font-weight:600">E-mail</td><td>' + esc(d.empEmail) + '</td></tr>';
    if (d.empMobile) h += '<tr><td style="font-weight:600">Mobile</td><td>' + esc(d.empMobile) + '</td></tr>';
    h += '<tr><td style="font-weight:600">Người thay thế khi vắng mặt</td><td>' + (esc(d.substitute) || '___') + '</td></tr>';
    h += '</table>';

    // Scope
    h += '<h2>Phạm vi Công việc</h2>';
    if (d.scopes.length) {
      d.scopes.forEach(function (s) {
        h += '<div class="scope-item"><span class="scope-verb">' + esc(s.verb) + '</span> ' + esc(s.obj) + ' <span class="scope-impact">' + esc(s.impact) + '</span></div>';
      });
    } else {
      h += '<div class="empty-notice">(Chưa nhập phạm vi công việc)</div>';
    }

    // Reporting
    h += '<h2>Quan hệ Công việc</h2>';
    h += '<table>';
    h += '<tr><td style="width:40%;font-weight:600">Báo cáo trực tiếp cho</td><td>' + (esc(d.reportDirect) || '___') + '</td></tr>';
    h += '<tr><td style="font-weight:600">Báo cáo gián tiếp cho</td><td>' + (esc(d.reportIndirect) || '___') + '</td></tr>';
    h += '</table>';

    // Responsibilities
    h += '<h2>Các Trách nhiệm Chính</h2>';
    if (d.strategicTasks.length > 0) {
      h += '<h3>I. Nhiệm vụ Chiến lược</h3>';
      h += renderTaskTable(d.strategicTasks, 1);
    }
    var mainLabel = d.strategicTasks.length > 0 ? 'II' : 'I';
    h += '<h3>' + mainLabel + '. Nhiệm vụ Chính (70%)</h3>';
    if (d.mainTasks.length) {
      h += renderTaskTable(d.mainTasks, d.strategicTasks.length + 1);
    } else {
      h += '<div class="empty-notice">(Chưa nhập nhiệm vụ chính)</div>';
    }

    // Cooperation
    var coopLabel = d.strategicTasks.length > 0 ? 'III' : 'II';
    h += '<h3>' + coopLabel + '. Phối hợp & Hỗ trợ (15%)</h3>';
    if (d.coops.length) {
      h += '<table><thead><tr><th>Phối hợp với</th><th>Trong công việc</th></tr></thead><tbody>';
      d.coops.forEach(function (c) {
        h += '<tr><td>' + esc(c.who) + '</td><td>' + esc(c.what) + '</td></tr>';
      });
      h += '</tbody></table>';
    }

    // Supplementary
    var nums = romanSequence(coopLabel);
    h += '<h3>' + nums[0] + '. Công việc nội bộ bộ phận (5%)</h3>';
    h += renderTextBlock(d.internalWork, 'Hoàn thành đúng yêu cầu');
    h += '<h3>' + nums[1] + '. Báo cáo (5%)</h3>';
    h += renderTextBlock(d.reportWork, 'Báo cáo chính xác, đúng kỳ');
    h += '<h3>' + nums[2] + '. Nhiệm vụ khác (5%)</h3>';
    h += renderTextBlock(d.otherWork, 'Hoàn thành đúng yêu cầu');
    h += '<h3>' + nums[3] + '. Chấp hành Nội quy lao động (5%)</h3>';
    h += renderTextBlock(d.complianceWork, 'Không vi phạm');

    // Rights
    h += '<h2>Quyền hạn</h2>';
    h += renderRightsSection('Thông tin', d.infoRights);
    h += renderRightsSection('Ra quyết định', d.decisionRights);
    h += renderRightsSection('Nhân sự', d.hrRights);
    if (d.workConditions) h += '<p style="margin-top:8px"><strong>Điều kiện làm việc:</strong> ' + esc(d.workConditions) + '</p>';

    // Requirements
    h += '<h2>Yêu cầu cho Vị trí</h2>';
    h += '<table><thead><tr><th style="width:5%"></th><th>Tiêu chuẩn</th><th style="width:8%">Đạt</th></tr></thead><tbody>';
    h += '<tr><td colspan="2" style="font-weight:600">1. Tiêu chuẩn về học vấn</td><td style="text-align:center">✓</td></tr>';
    if (d.reqEducation) d.reqEducation.split('\n').forEach(function (l) { if (l.trim()) h += '<tr><td></td><td>' + esc(l) + '</td><td style="text-align:center">✓</td></tr>'; });
    h += '<tr><td colspan="2" style="font-weight:600">2. Tiêu chuẩn về kinh nghiệm</td><td></td></tr>';
    if (d.reqExperience) d.reqExperience.split('\n').forEach(function (l) { if (l.trim()) h += '<tr><td></td><td>' + esc(l) + '</td><td style="text-align:center">✓</td></tr>'; });
    h += '<tr><td colspan="2" style="font-weight:600">3. Tiêu chuẩn về con người</td><td style="text-align:center">✓</td></tr>';
    if (d.reqQualities) d.reqQualities.split('\n').forEach(function (l) { if (l.trim()) h += '<tr><td></td><td>' + esc(l) + '</td><td></td></tr>'; });
    h += '<tr><td colspan="2" style="font-weight:600">4. Tiêu chuẩn về kỹ năng</td><td></td></tr>';
    d.skills.forEach(function (s, i) { h += '<tr><td></td><td>' + (i + 1) + '. ' + esc(s) + '</td><td style="text-align:center">✓</td></tr>'; });
    h += '</tbody></table>';

    // Commitment
    h += '<h2>Cam kết Thực hiện</h2>';
    h += '<div class="sign-grid">';
    h += '<div class="sign-box"><div class="sign-title">Người hướng dẫn</div><p style="font-size:11px;color:#888;font-style:italic">Người ký tên dưới đây đã hướng dẫn kỹ cách thức thực hiện công việc chi tiết theo Bản mô tả công việc này.</p><div class="sign-line"></div><div class="sign-caption">Ký, ghi rõ họ tên</div></div>';
    h += '<div class="sign-box"><div class="sign-title">Người nhận việc</div><p style="font-size:11px;color:#888;font-style:italic">Người ký tên dưới đây đã hiểu kỹ và cam kết thực hiện đúng theo Bản mô tả công việc này.</p><div class="sign-line"></div><div class="sign-caption">Ký, ghi rõ họ tên</div></div>';
    h += '</div>';

    var previewDoc = document.getElementById('previewDoc');
    if (previewDoc) previewDoc.innerHTML = h;
  }

  function renderTaskTable(tasks, startIdx) {
    var h = '<table><thead><tr><th style="width:5%">STT</th><th>Nội dung</th><th style="width:8%">%</th><th>Kết quả đầu ra</th></tr></thead><tbody>';
    tasks.forEach(function (t, i) {
      h += '<tr><td style="text-align:center">' + (startIdx + i) + '</td><td>' + esc(t.content) + '</td><td style="text-align:center">' + esc(t.weight) + '%</td><td>' + esc(t.result) + '</td></tr>';
    });
    h += '</tbody></table>';
    return h;
  }

  function renderTextBlock(text, resultLabel) {
    if (!text) return '';
    var lines = text.split('\n').filter(function (l) { return l.trim(); });
    var h = '<table><thead><tr><th>Nội dung</th><th style="width:35%">Yêu cầu kết quả</th></tr></thead><tbody>';
    lines.forEach(function (line, i) {
      h += '<tr><td>' + esc(line) + '</td><td>' + (i === 0 ? esc(resultLabel) : '') + '</td></tr>';
    });
    h += '</tbody></table>';
    return h;
  }

  function renderRightsSection(title, items) {
    if (!items.length) return '';
    var h = '<h3>' + esc(title) + ':</h3><ul style="margin:4px 0 12px 20px">';
    items.forEach(function (item) { h += '<li style="margin:3px 0">' + esc(item) + '</li>'; });
    h += '</ul>';
    return h;
  }

  function romanSequence(base) {
    var map = { 'II': ['III', 'IV', 'V', 'VI'], 'III': ['IV', 'V', 'VI', 'VII'] };
    return map[base] || ['III', 'IV', 'V', 'VI'];
  }

  // ============ EXPORT MARKDOWN ============
  function slugify(text) {
    return (text || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, '') || 'vi-tri';
  }

  function generateMarkdown() {
    var d = collectData();
    var today = new Date().toISOString().split('T')[0];
    var slug = slugify(d.position);

    var md = '---\ntype: job-description\ntags: [mo-ta-cong-viec, ' + slugify(d.department) + ', ' + slug + ']\n';
    md += 'company: ' + d.company + '\ndepartment: ' + d.department + '\nposition: ' + d.position + '\n';
    md += 'reports-to: ' + d.reportDirect + '\nversion: v1.0\nstatus: active\ncreated: ' + today + '\nupdated: ' + today + '\n---\n\n';
    md += '# Bản Mô Tả Công Việc — ' + d.position + '\n\n';
    md += '> **Phòng ban:** ' + d.department + '\n> **Ngày ban hành:** ' + today + ' | **Lần sửa đổi:** 0\n\n---\n\n';

    md += '## Thông tin Chung\n\n| Thông tin | Chi tiết |\n|:---|:---|\n';
    md += '| Chức danh | ' + d.position + ' |\n';
    md += '| Phòng ban | ' + d.department + ' |\n';
    md += '| Báo cáo trực tiếp | ' + d.reportDirect + ' |\n';
    md += '| Báo cáo gián tiếp | ' + (d.reportIndirect || '—') + ' |\n';
    md += '| Quản lý trực tiếp | ' + (d.numReports > 0 ? d.numReports + ' người' : 'Không') + ' |\n';
    md += '| Người thay thế khi vắng mặt | ' + (d.substitute || '—') + ' |\n';

    if (d.empName) {
      md += '\n### Thông tin Cá nhân\n\n| Mục | Chi tiết |\n|:---|:---|\n';
      md += '| Họ và tên | ' + d.empName + ' |\n| Mã NV | ' + (d.empCode || '—') + ' |\n| Email | ' + (d.empEmail || '—') + ' |\n| Mobile | ' + (d.empMobile || '—') + ' |\n';
    }

    md += '\n## Phạm vi Công việc\n\n';
    d.scopes.forEach(function (s, i) { md += (i + 1) + '. **' + s.verb + '** ' + s.obj + ' **' + s.impact + '**\n'; });

    md += '\n## Trách nhiệm Chính (70%)\n';
    if (d.strategicTasks.length > 0) {
      md += '\n### Nhiệm vụ Chiến lược\n\n| STT | Nội dung | Tỷ trọng | Kết quả đầu ra |\n|:---:|:---|:---:|:---|\n';
      d.strategicTasks.forEach(function (t, i) { md += '| ' + (i + 1) + ' | ' + t.content + ' | ' + t.weight + '% | ' + t.result + ' |\n'; });
    }
    md += '\n### Nhiệm vụ Chính\n\n| STT | Nội dung | Tỷ trọng | Kết quả đầu ra |\n|:---:|:---|:---:|:---|\n';
    var offset = d.strategicTasks.length;
    d.mainTasks.forEach(function (t, i) { md += '| ' + (offset + i + 1) + ' | ' + t.content + ' | ' + t.weight + '% | ' + t.result + ' |\n'; });

    md += '\n## Phối hợp & Hỗ trợ (15%)\n\n| Phối hợp với | Trong công việc |\n|:---|:---|\n';
    d.coops.forEach(function (c) { md += '| ' + c.who + ' | ' + c.what + ' |\n'; });

    md += '\n## Công việc Bổ sung\n\n| Phần | Tỷ trọng |\n|:---|:---:|\n';
    md += '| Công việc nội bộ bộ phận | 5% |\n| Báo cáo | 5% |\n| Nhiệm vụ khác | 5% |\n| Chấp hành nội quy | 5% |\n| **Tổng** | **100%** |\n';

    md += '\n## Quyền hạn\n\n### Quyền thông tin\n';
    d.infoRights.forEach(function (r) { md += '- ' + r + '\n'; });
    md += '\n### Quyền ra quyết định\n';
    d.decisionRights.forEach(function (r) { md += '- ' + r + '\n'; });
    md += '\n### Quyền nhân sự\n';
    d.hrRights.forEach(function (r) { md += '- ' + r + '\n'; });
    if (d.workConditions) md += '\n**Điều kiện làm việc:** ' + d.workConditions + '\n';

    md += '\n## Yêu cầu Vị trí\n\n| Nhóm | Yêu cầu |\n|:---|:---|\n';
    md += '| **Học vấn** | ' + d.reqEducation.replace(/\n/g, ' · ') + ' |\n';
    md += '| **Kinh nghiệm** | ' + d.reqExperience.replace(/\n/g, ' · ') + ' |\n';
    md += '| **Phẩm chất** | ' + d.reqQualities.replace(/\n/g, ' · ') + ' |\n';
    md += '| **Kỹ năng** | ' + d.skills.map(function (s, i) { return (i + 1) + '. ' + s; }).join(' · ') + ' |\n';

    md += '\n---\n\n## Cam kết Thực hiện\n\n| | Họ tên | Chữ ký | Ngày |\n|:---|:---|:---|:---|\n';
    md += '| **Người nhận việc** | ___________ | ___________ | ___/___/___ |\n';
    md += '| **Người hướng dẫn** | ___________ | ___________ | ___/___/___ |\n';
    md += '| **Trưởng phòng** | ___________ | ___________ | ___/___/___ |\n';

    md += '\n---\n\n## 🔗 Liên kết\n\n- [[so-do-to-chuc]] — Sơ đồ tổ chức\n- [[kpi]] — KPI vị trí\n- [[co-che-luong]] — Cơ chế lương thưởng\n';
    return md;
  }

  function downloadMarkdown() {
    var md = generateMarkdown();
    var d = collectData();
    var filename = slugify(d.position || 'mtcv') + '.md';
    var blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Đã tải file ' + filename, 'success');
  }

  function copyMarkdown() {
    var md = generateMarkdown();
    navigator.clipboard.writeText(md).then(function () {
      showToast('Đã copy Markdown vào clipboard!', 'success');
    }).catch(function () {
      // Fallback
      var ta = document.createElement('textarea');
      ta.value = md;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Đã copy Markdown!', 'success');
    });
  }

  // ============ TOAST ============
  function showToast(msg, type) {
    type = type || 'success';
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();
    var div = document.createElement('div');
    div.className = 'toast ' + type;
    div.innerHTML = (type === 'success' ? '✅' : '⚠️') + ' ' + msg;
    document.body.appendChild(div);
    setTimeout(function () { if (div.parentNode) div.remove(); }, 3000);
  }

  // ============ EVENT DELEGATION ============
  function bindAllEvents() {
    // === NEXT / PREV buttons ===
    document.getElementById('btnNext').addEventListener('click', function (e) {
      e.preventDefault();
      if (currentStep === totalSteps) {
        switchView('preview');
      } else {
        goToStep(currentStep + 1);
      }
    });

    document.getElementById('btnPrev').addEventListener('click', function (e) {
      e.preventDefault();
      goToStep(currentStep - 1);
    });

    // === Step indicators click ===
    document.querySelectorAll('.step-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var step = parseInt(this.getAttribute('data-step'));
        if (step) goToStep(step);
      });
    });

    // === View tabs ===
    document.querySelectorAll('.view-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        switchView(this.getAttribute('data-view'));
      });
    });

    // === Company select ===
    document.getElementById('companyName').addEventListener('change', function () {
      var wrap = document.getElementById('customCompanyWrap');
      if (wrap) {
        wrap.style.display = (this.value === 'custom') ? 'flex' : 'none';
        wrap.classList.toggle('hidden', this.value !== 'custom');
      }
    });

    // === Job level ===
    document.getElementById('jobLevel').addEventListener('change', function () {
      updateVerbPanel();
      toggleStrategicSection();
    });

    // === Add scope ===
    document.getElementById('addScope').addEventListener('click', function () {
      if (scopeCount >= 3) { showToast('Tối đa 3 phạm vi công việc', 'error'); return; }
      addScopeItem();
    });

    // === Add skill ===
    document.getElementById('addSkill').addEventListener('click', function () {
      var count = document.querySelectorAll('#skillsList .rights-item').length;
      if (count >= 8) { showToast('Khuyến nghị chỉ 4–6 kỹ năng', 'error'); return; }
      addSkillItem();
    });

    // === Generic add-row buttons ===
    document.querySelectorAll('.btn-add-row[data-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = this.getAttribute('data-target');
        var type = this.getAttribute('data-type');
        if (type === 'right') addRightItem(target);
        else if (target === 'coopBody') addCoopRow();
        else addTaskRow(target);
      });
    });

    // === Export buttons ===
    document.getElementById('btnExportMd').addEventListener('click', downloadMarkdown);
    document.getElementById('btnCopyMd').addEventListener('click', copyMarkdown);
    document.getElementById('btnPrint').addEventListener('click', function () {
      renderPreview();
      switchView('preview');
      setTimeout(function () { window.print(); }, 300);
    });

    // === EVENT DELEGATION for dynamic elements ===
    document.addEventListener('click', function (e) {
      var target = e.target;

      // Remove scope
      if (target.classList.contains('js-remove-scope')) {
        var builder = target.closest('.scope-builder');
        if (document.querySelectorAll('.scope-builder').length <= 1) {
          showToast('Cần ít nhất 1 phạm vi công việc', 'error');
          return;
        }
        if (builder) builder.remove();
        reindexScopes();
        return;
      }

      // Remove table row
      if (target.classList.contains('js-remove-row')) {
        var tr = target.closest('tr');
        if (tr) {
          var tbody = tr.parentElement;
          tr.remove();
          reindexTableRows(tbody);
          recalcWeights();
        }
        return;
      }

      // Remove right
      if (target.classList.contains('js-remove-right')) {
        var item = target.closest('.rights-item');
        if (item) item.remove();
        return;
      }

      // Remove skill
      if (target.classList.contains('js-remove-skill')) {
        var skillItem = target.closest('.rights-item');
        if (skillItem) skillItem.remove();
        reindexSkills();
        return;
      }

      // Checklist toggle
      if (target.classList.contains('js-check')) {
        target.classList.toggle('checked');
        updateChecklistScore();
        return;
      }

      // Verb tag click
      if (target.classList.contains('js-verb-tag')) {
        var verb = target.getAttribute('data-verb');
        var inputs = document.querySelectorAll('.scope-verb');
        var inserted = false;
        inputs.forEach(function (inp) {
          if (!inserted && !inp.value.trim()) {
            inp.value = verb;
            inp.focus();
            updateScopePreviewFor(inp.closest('.scope-builder'));
            inserted = true;
          }
        });
        if (!inserted && inputs.length > 0) {
          var last = inputs[inputs.length - 1];
          last.value = last.value ? last.value + ', ' + verb.toLowerCase() : verb;
          last.focus();
          updateScopePreviewFor(last.closest('.scope-builder'));
        }
        return;
      }
    });

    // === INPUT delegation for scope preview + weight recalc ===
    document.addEventListener('input', function (e) {
      var target = e.target;

      // Scope input changed
      if (target.classList.contains('js-scope-input')) {
        var builder = target.closest('.scope-builder');
        if (builder) updateScopePreviewFor(builder);
        return;
      }

      // Weight input changed
      if (target.classList.contains('js-weight-input')) {
        recalcWeights();
        return;
      }
    });
  }

  // ============ INIT ============
  function init() {
    try {
      // Init form data
      addScopeItem();
      for (var i = 0; i < 4; i++) addTaskRow('mainTaskBody');
      for (var j = 0; j < 2; j++) addCoopRow();

      // Init rights with defaults
      addRightItem('infoRightsList', 'Được nhận tất cả các thông tin liên quan đến hoạt động của công ty trong phạm vi chức năng');
      addRightItem('infoRightsList', 'Được đại diện cho Công ty làm việc với khách hàng trong phạm vi chức năng');
      addRightItem('decisionRightsList', 'Quyết định trực tiếp các vấn đề phát sinh trong phạm vi được phân công');
      addRightItem('decisionRightsList', 'Tham gia vào quá trình ra quyết định có liên quan');
      addRightItem('hrRightsList', 'Đề xuất, kiến nghị, góp ý quy trình thực hiện công việc, chế độ khen thưởng kỷ luật');

      // Init skills
      for (var k = 0; k < 4; k++) addSkillItem();

      // Init checklist
      initChecklist();
      updateVerbPanel();
    } catch (err) {
      console.error('[MTCV Builder] Init error:', err);
    }

    // ALWAYS bind events even if init fails
    try {
      bindAllEvents();
    } catch (err) {
      console.error('[MTCV Builder] Event binding error:', err);
    }

    // Ensure step 1 is visible
    goToStep(1);

    // Hide preview & checklist views
    var pv = document.getElementById('previewView');
    var cv = document.getElementById('checklistView');
    if (pv) pv.style.display = 'none';
    if (cv) cv.style.display = 'none';
  }

  // Start when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
