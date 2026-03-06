// ==========================================
// 1. KONFIGURASI FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyAZPm1-6HrFLlEh1ODxSmt5FzJRkgQFDag",
    authDomain: "beban-kerja-sikap.firebaseapp.com",
    databaseURL: "https://beban-kerja-sikap-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "beban-kerja-sikap",
    storageBucket: "beban-kerja-sikap.firebasestorage.app",
    messagingSenderId: "1041936565604",
    appId: "1:1041936565604:web:be37930b1bd661cdd4e671",
    measurementId: "G-MJRP8H70X0"
};

// Inisialisasi Firebase Compat Mode (Agar Sinkron dengan HTML)
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ==========================================
// 2. DATABASE NAMA STAFF
// ==========================================
const daftarNama = {
    "Redaksi": ["Faiz", "Nada", "Dania", "Gisel", "Maharani Mantika Nailah", "Nayla Enzethiana", "Shenny Nurhidayah", "Audrina Rustari"],
    "PSDM": ["Lili", "Rifa", "Aga", "Lydia Wahyu Melvina", "Nofari Tazkia Aulia", "Rizal Tsaniya", "Arfita Zahra Waryono Amsa", "Yaffa Cantika Putri"],
    "Medkraf": ["irfan", "putri", "Amalya Azahra Agyata Paramastri", "Sifa Anisa", "Syahrul Bisma ", "Dinan Alfa ", "Evelyne Rheiva"],
    "Jaker": ["Bintang", "Salwa", "Indy", "Rasyid al hakim", "Yaumiedka Vitra Naviry", "Anisa Nuraini Nastiti", "Siti Zahra Supriyadi"],
    "Lainnya": ["Staff Luar 1", "Staff Luar 2"]
};

const poinJabatan = {
    "Ketua Pelaksana": 5, "Sekretaris": 4, "Bendahara": 4,
    "Koor Acara": 4, "Koor Humas": 4, "Koor Logistik": 4, "Koor PDD": 4,
    "Staff Acara": 3, "Staff Humas": 3, "Staff Logistik": 3, "Staff PDD": 3
};

// ==========================================
// 3. LOGIKA UTAMA
// ==========================================

// Listener Real-time
db.ref('plotting').on('value', (snapshot) => {
    renderTabel(snapshot.val());
});

function renderTabel(data) {
    const bodyTabel = document.getElementById('bodyTabel');
    const filter = document.getElementById('filterDivisi').value;
    const search = document.getElementById('searchNama').value.toLowerCase();
    
    bodyTabel.innerHTML = '';
    if (!data) return;

    const rekap = {};
    Object.keys(data).forEach(id => {
        const item = data[id];
        if (filter !== "Semua" && item.divisiKategori !== filter) return;
        if (search && !item.nama.toLowerCase().includes(search)) return;

        if (!rekap[item.nama]) {
            rekap[item.nama] = { divisi: item.divisi, total: 0, list: [] };
        }
        rekap[item.nama].total += item.bobot;
        rekap[item.nama].list.push({ ...item, fbId: id });
    });

    for (let nama in rekap) {
        const d = rekap[nama];
        let sClass = d.total > 10 ? 'status-overload' : (d.total >= 6 ? 'status-warning' : 'status-aman');
        
        let jobItems = d.list.map(job => `
            <li class="job-item">
                <span>${job.event} - <strong>${job.job}</strong> (${job.bobot})</span>
                <button class="btn-del" onclick="hapusSatu('${job.fbId}')">🗑️</button>
            </li>
        `).join('');

        bodyTabel.innerHTML += `
            <tr>
                <td><strong>${nama}</strong><br><small>${d.divisi}</small></td>
                <td><ul>${jobItems}</ul></td>
                <td><strong>${d.total} Poin</strong></td>
                <td><span class="status-badge ${sClass}">${d.total > 10 ? 'Overload' : (d.total >= 6 ? 'Waspada' : 'Aman')}</span></td>
            </tr>
        `;
    }
}

// Event: Pilih Divisi (Memperbaiki Nama Staff)
document.getElementById('divisiAsal').addEventListener('change', (e) => {
    const selNama = document.getElementById('namaStaff');
    selNama.innerHTML = '<option value="">-- Pilih Nama Staff --</option>';
    if (e.target.value) {
        selNama.disabled = false;
        (daftarNama[e.target.value] || []).forEach(n => {
            const opt = document.createElement('option');
            opt.value = n; opt.innerText = n; selNama.appendChild(opt);
        });
        document.getElementById('containerCatatan').style.display = (e.target.value === 'Lainnya' ? 'block' : 'none');
    } else {
        selNama.disabled = true;
    }
});

// Event: Jabatan & Bobot
document.getElementById('jabatan').addEventListener('change', (e) => {
    const p = poinJabatan[e.target.value] || 3;
    document.getElementById('bobot').value = p;
    document.getElementById('outputBobot').innerText = p + " Poin";
});

document.getElementById('bobot').addEventListener('input', (e) => {
    document.getElementById('outputBobot').innerText = e.target.value + " Poin";
});

// Simpan Data
document.getElementById('taskForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const div = document.getElementById('divisiAsal').value;
    const dataBaru = {
        divisi: div === 'Lainnya' ? `Lainnya (${document.getElementById('catatanDivisi').value})` : div,
        divisiKategori: div,
        nama: document.getElementById('namaStaff').value,
        event: document.getElementById('namaEvent').value,
        job: document.getElementById('jabatan').value,
        bobot: parseInt(document.getElementById('bobot').value)
    };
    db.ref('plotting').push(dataBaru);
    e.target.reset();
    document.getElementById('namaStaff').disabled = true;
    document.getElementById('outputBobot').innerText = "3 Poin";
});

// Hapus & Reset
window.hapusSatu = (id) => { if(confirm("Hapus item ini?")) db.ref('plotting/' + id).remove(); };
document.getElementById('btnReset').addEventListener('click', () => {
    if(confirm("Hapus SEMUA data?")) db.ref('plotting').remove();
});

// Cari & Filter
document.getElementById('searchNama').addEventListener('input', () => {
    db.ref('plotting').once('value', s => renderTabel(s.val()));
});
document.getElementById('filterDivisi').addEventListener('change', () => {
    db.ref('plotting').once('value', s => renderTabel(s.val()));
});

// ==========================================
// 4. LOGIKA DARK MODE
// ==========================================
const btnDark = document.getElementById('darkModeToggle');
btnDark.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    btnDark.innerText = document.body.classList.contains('dark-mode') ? "☀️ Mode Terang" : "🌙 Mode Gelap";
});