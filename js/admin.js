/**
 * NextGenAI — Optional Free Firebase Spark Admin Controller
 * Loads Firebase 11.6.0 (pinned version) from Google's official gstatic CDN
 * ONLY when js/firebase-config.js has enabled: true.
 */
const FIREBASE_VERSION = '11.6.0';

const disabledPanel = document.getElementById('admin-disabled-panel');
const loginPanel = document.getElementById('admin-login-panel');
const workspace = document.getElementById('admin-workspace');
const signoutBtn = document.getElementById('admin-signout');
const loginForm = document.getElementById('admin-login-form');
const loginError = document.getElementById('login-error');
const projectListEl = document.getElementById('admin-project-list');
const toastEl = document.getElementById('toast');

let toastTimer = null;
let workingData = null;

function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('is-visible');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 3400);
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

function createField(labelText, inputEl) {
  const wrap = document.createElement('div');
  wrap.className = 'form-field';
  const lbl = document.createElement('label');
  lbl.className = 'form-label';
  lbl.textContent = labelText;
  wrap.appendChild(lbl);
  wrap.appendChild(inputEl);
  return wrap;
}

function renderProjectEditors() {
  if (!projectListEl || !workingData) return;
  projectListEl.textContent = '';

  const projects = workingData.projects || [];
  projects.forEach((proj, idx) => {
    const card = document.createElement('div');
    card.className = 'admin-project-item';

    const head = document.createElement('div');
    head.className = 'admin-project-head';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'admin-project-label';
    titleSpan.textContent = `#${idx + 1} — ${proj.title || 'Untitled Project'}`;

    const controls = document.createElement('div');
    controls.className = 'admin-actions';

    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.className = 'btn btn--ghost btn--sm';
    upBtn.textContent = 'Move Up';
    upBtn.disabled = idx === 0;
    upBtn.addEventListener('click', () => {
      if (idx === 0) return;
      [projects[idx - 1], projects[idx]] = [projects[idx], projects[idx - 1]];
      renderProjectEditors();
    });

    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.className = 'btn btn--ghost btn--sm';
    downBtn.textContent = 'Move Down';
    downBtn.disabled = idx === projects.length - 1;
    downBtn.addEventListener('click', () => {
      if (idx === projects.length - 1) return;
      [projects[idx + 1], projects[idx]] = [projects[idx], projects[idx + 1]];
      renderProjectEditors();
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn--ghost btn--sm';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => {
      projects.splice(idx, 1);
      renderProjectEditors();
    });

    controls.append(upBtn, downBtn, delBtn);
    head.append(titleSpan, controls);
    card.appendChild(head);

    const row1 = document.createElement('div');
    row1.className = 'form-row-2';

    const titleIn = document.createElement('input');
    titleIn.className = 'form-control';
    titleIn.value = proj.title || '';
    titleIn.addEventListener('input', () => {
      proj.title = titleIn.value;
      titleSpan.textContent = `#${idx + 1} — ${proj.title || 'Untitled Project'}`;
    });

    const catSelect = document.createElement('select');
    catSelect.className = 'form-control';
    ['PWAs', 'Web Apps', 'Tools'].forEach((optVal) => {
      const opt = document.createElement('option');
      opt.value = optVal;
      opt.textContent = optVal;
      if (proj.category === optVal) opt.selected = true;
      catSelect.appendChild(opt);
    });
    catSelect.addEventListener('change', () => {
      proj.category = catSelect.value;
    });

    row1.append(createField('Title', titleIn), createField('Category', catSelect));
    card.appendChild(row1);

    const descIn = document.createElement('textarea');
    descIn.className = 'form-control';
    descIn.value = proj.shortDescription || '';
    descIn.addEventListener('input', () => {
      proj.shortDescription = descIn.value;
    });
    card.appendChild(createField('Short Description', descIn));

    const row2 = document.createElement('div');
    row2.className = 'form-row-2';

    const tagsIn = document.createElement('input');
    tagsIn.className = 'form-control';
    tagsIn.value = Array.isArray(proj.tags) ? proj.tags.join(', ') : '';
    tagsIn.addEventListener('input', () => {
      proj.tags = tagsIn.value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    });

    const statusSelect = document.createElement('select');
    statusSelect.className = 'form-control';
    ['Live', 'Beta', 'Coming Soon'].forEach((st) => {
      const opt = document.createElement('option');
      opt.value = st;
      opt.textContent = st;
      if (proj.status === st) opt.selected = true;
      statusSelect.appendChild(opt);
    });
    statusSelect.addEventListener('change', () => {
      proj.status = statusSelect.value;
    });

    row2.append(createField('Tags (comma separated)', tagsIn), createField('Status', statusSelect));
    card.appendChild(row2);

    const row3 = document.createElement('div');
    row3.className = 'form-row-2';

    const liveIn = document.createElement('input');
    liveIn.className = 'form-control';
    liveIn.placeholder = 'https://your-app.netlify.app';
    liveIn.value = proj.liveUrl || '';
    liveIn.addEventListener('input', () => {
      proj.liveUrl = liveIn.value.trim();
    });

    const ghIn = document.createElement('input');
    ghIn.className = 'form-control';
    ghIn.placeholder = 'https://github.com/you/repo (optional)';
    ghIn.value = proj.githubUrl || '';
    ghIn.addEventListener('input', () => {
      proj.githubUrl = ghIn.value.trim();
    });

    row3.append(createField('Live URL', liveIn), createField('GitHub URL (optional)', ghIn));
    card.appendChild(row3);

    const imgIn = document.createElement('input');
    imgIn.className = 'form-control';
    imgIn.placeholder = './assets/images/my-project.webp (leave blank for gradient placeholder)';
    imgIn.value = proj.image || '';
    imgIn.addEventListener('input', () => {
      proj.image = imgIn.value.trim();
    });
    card.appendChild(createField('Preview Image Path (optional)', imgIn));

    const featWrap = document.createElement('label');
    featWrap.className = 'admin-checkbox-row';
    const featCb = document.createElement('input');
    featCb.type = 'checkbox';
    featCb.checked = Boolean(proj.featured);
    featCb.addEventListener('change', () => {
      proj.featured = featCb.checked;
    });
    featWrap.append(featCb, document.createTextNode('Mark as Featured project'));
    card.appendChild(featWrap);

    projectListEl.appendChild(card);
  });
}

function hydrateContactFields() {
  const c = (workingData && workingData.contact) || {};
  const s = c.socials || {};
  const map = {
    'edit-email': c.email || '',
    'edit-phone': c.phone || '',
    'edit-whatsapp': c.whatsapp || '',
    'edit-location': c.location || '',
    'edit-github': s.github || '',
    'edit-linkedin': s.linkedin || '',
    'edit-facebook': s.facebook || '',
    'edit-youtube': s.youtube || '',
  };
  Object.keys(map).forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.value = map[id];
  });
}

function collectContactFields() {
  const getVal = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };
  workingData.contact = Object.assign({}, workingData.contact, {
    email: getVal('edit-email'),
    phone: getVal('edit-phone'),
    whatsapp: getVal('edit-whatsapp'),
    location: getVal('edit-location'),
    socials: Object.assign({}, (workingData.contact && workingData.contact.socials) || {}, {
      github: getVal('edit-github'),
      linkedin: getVal('edit-linkedin'),
      facebook: getVal('edit-facebook'),
      youtube: getVal('edit-youtube'),
    }),
  });
}

function downloadSiteDataBackup() {
  collectContactFields();
  const payload = 'window.SITE_DATA = ' + JSON.stringify(workingData, null, 2) + ';\n';
  const blob = new Blob([payload], { type: 'application/javascript;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'site-data.js';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Downloaded updated site-data.js backup.');
}

async function bootAdmin() {
  const fb = window.NEXTGENAI_FIREBASE;
  if (!fb || fb.enabled !== true || !fb.config || !fb.config.projectId || fb.config.projectId === 'YOUR_PROJECT_ID') {
    disabledPanel.classList.remove('is-hidden');
    return;
  }

  const [appMod, authMod, fsMod] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`),
  ]);

  const app = appMod.initializeApp(fb.config);
  const auth = authMod.getAuth(app);
  const db = fsMod.getFirestore(app);
  const docRef = fsMod.doc(db, fb.collection || 'site_content', fb.documentId || 'main');

  async function loadContent() {
    workingData = deepClone(window.SITE_DATA || {});
    try {
      const snap = await fsMod.getDoc(docRef);
      if (snap.exists()) {
        const remote = snap.data();
        if (Array.isArray(remote.projects)) workingData.projects = remote.projects;
        if (remote.contact) workingData.contact = Object.assign({}, workingData.contact, remote.contact);
      }
    } catch (err) {
      showToast('Loaded local js/site-data.js defaults (no remote document yet).');
    }
    renderProjectEditors();
    hydrateContactFields();
  }

  authMod.onAuthStateChanged(auth, async (user) => {
    if (user) {
      loginPanel.classList.add('is-hidden');
      workspace.classList.remove('is-hidden');
      signoutBtn.classList.remove('is-hidden');
      await loadContent();
    } else {
      workspace.classList.add('is-hidden');
      signoutBtn.classList.add('is-hidden');
      loginPanel.classList.remove('is-hidden');
    }
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    try {
      await authMod.signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      loginError.textContent = 'Sign-in failed. Check your Firebase Admin email and password.';
    }
  });

  signoutBtn.addEventListener('click', async () => {
    await authMod.signOut(auth);
    showToast('Signed out.');
  });

  document.getElementById('btn-add-project').addEventListener('click', () => {
    workingData.projects = workingData.projects || [];
    workingData.projects.unshift({
      id: 'project-' + Date.now(),
      title: 'New Project',
      category: 'Web Apps',
      shortDescription: 'Describe what this project solves in 1–2 sentences.',
      longDescription: '',
      highlights: [],
      tags: ['Web Apps'],
      image: '',
      imageFallback: '',
      gallery: [],
      liveUrl: '',
      githubUrl: '',
      status: 'Beta',
      featured: false,
    });
    renderProjectEditors();
  });

  document.getElementById('btn-export-js').addEventListener('click', downloadSiteDataBackup);

  document.getElementById('btn-save-cloud').addEventListener('click', async () => {
    collectContactFields();
    try {
      await fsMod.setDoc(
        docRef,
        {
          projects: workingData.projects || [],
          contact: workingData.contact || {},
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      showToast('Saved changes to Cloud Firestore.');
    } catch (err) {
      showToast('Save failed — verify Firestore rules allow your admin account to write.');
    }
  });
}

bootAdmin();
