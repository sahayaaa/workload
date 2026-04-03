// ==========================================
// 1. KONFIGURASI FIREBASE & PUSAT KENDALI
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

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- LOGIKA SAKLAR (PROTEKSI) ---, True: terkunci, False: terbuka
let isLocked = true;

// Monitor status kunci dari Firebase secara Real-time
db.ref('app_settings/is_locked').on('value', (snapshot) => {
    isLocked = snapshot.val() || false;
    const btnSimpan = document.querySelector('#taskForm button[type="submit"]');
    const btnReset = document.getElementById('btnReset');

    if (isLocked) {
        if(btnSimpan) {
            btnSimpan.disabled = true;
            btnSimpan.innerHTML = "🔒 Database Terkunci";
            btnSimpan.style.opacity = "0.6";
            btnSimpan.style.cursor = "not-allowed";
        }
        if(btnReset) btnReset.style.display = "none";
    } else {
        if(btnSimpan) {
            btnSimpan.disabled = false;
            btnSimpan.innerHTML = "Simpan Plotting";
            btnSimpan.style.opacity = "1";
            btnSimpan.style.cursor = "pointer";
        }
        if(btnReset) btnReset.style.display = "block";
    }
});

// PUSAT KENDALI BATAS POIN
const LIMIT_OVERLOAD = 18; 
const LIMIT_WASPADA = 12;  

// ==========================================
// 2. DATABASE NAMA STAFF & POIN
// ==========================================
const daftarNama = {
    "Redaksi": ["Faiz", "Nada", "Dania", "Gisel", "Maharani Mantika Nailah", "Nayla Enzethiana", "Shenny Nurhidayah", "Audrina Rustari"],
    "PSDM": ["Lili", "Rifa", "Aga", "Lydia Wahyu Melvina", "Nofari Tazkia Aulia", "Rizal Tsaniya", "Arfita Zahra Waryono Amsa", "Yaffa Cantika Putri"],
    "Medkraf": ["irfan", "putri", "Amalya Azahra Agyata Paramastri", "Sifa Anisa", "Syahrul Bisma ", "Dinan Alfa ", "Evelyne Rheiva"],
    "Jaker": ["Bintang", "Salwa", "Indy", "Rasyid al hakim", "Yaumiedka Vitra Naviry", "Anisa Nuraini Nastiti", "Siti Zahra Supriyadi"],
    "Lainnya": ["Staff Luar 1", "Staff Luar 2"]
};

const poinJabatan = {
    "Ketua Pelaksana": 5, "Wakil Ketua Pelaksana": 4, "Sekretaris": 4, "Bendahara": 4,
    "Koor Acara": 4, "Koor Humas": 4, "Koor Logistik": 4, "Koor PDD": 4, "Koor Sponsorship": 4, "Koor Konsumsi": 4,
    "Staff Acara": 3, "Staff Humas": 3, "Staff Logistik": 3, "Staff PDD": 3, "Staff Sponsorship": 3, "Staff Konsumsi": 3,
};

// ==========================================
// 3. LOGIKA UTAMA (RENDER & STATISTIK)
// ==========================================

db.ref('plotting').on('value', (snapshot) => {
    renderTabel(snapshot.val());
});

function renderTabel(data) {
    const bodyTabel = document.getElementById('bodyTabel');
    const fDivisi = document.getElementById('filterDivisi').value;
    const fProker = document.getElementById('filterProker').value; 
    const sStatus = document.getElementById('sortStatus').value;
    const search = document.getElementById('searchNama').value.toLowerCase();
    
    let countOverload = 0;
    let countWaspada = 0;
    let countAman = 0;

    bodyTabel.innerHTML = '';
    if (!data) {
        updateStats(0, 0, 0);
        return;
    }

    const rekapObj = {};
    Object.keys(data).forEach(id => {
        const item = data[id];
        if (fDivisi !== "Semua" && item.divisiKategori !== fDivisi) return;
        if (search && !item.nama.toLowerCase().includes(search)) return;

        if (!rekapObj[item.nama]) {
            rekapObj[item.nama] = { nama: item.nama, divisi: item.divisi, total: 0, list: [] };
        }
        rekapObj[item.nama].total += item.bobot;
        rekapObj[item.nama].list.push({ ...item, fbId: id });
    });

    let rekapArray = Object.values(rekapObj);

    rekapArray.forEach(staff => {
        if (staff.total > LIMIT_OVERLOAD) countOverload++;
        else if (staff.total >= LIMIT_WASPADA) countWaspada++;
        else countAman++;
    });
    updateStats(countOverload, countWaspada, countAman);

    if (sStatus === "BebanTinggi") rekapArray.sort((a, b) => b.total - a.total);
    else if (sStatus === "BebanRendah") rekapArray.sort((a, b) => a.total - b.total);

    rekapArray.forEach(d => {
        const isInvolvedInProker = fProker === "Semua" || d.list.some(j => j.event === fProker);

        if (isInvolvedInProker) {
            let sClass = d.total > LIMIT_OVERLOAD ? 'status-overload' : (d.total >= LIMIT_WASPADA ? 'status-warning' : 'status-aman');
            let sText = d.total > LIMIT_OVERLOAD ? 'Overload' : (d.total >= LIMIT_WASPADA ? 'Waspada' : 'Aman');
            
            let jobItems = d.list.map(job => {
                const isFiltered = (fProker !== "Semua" && job.event === fProker);
                const highlightStyle = isFiltered ? 'style="background: var(--bg-highlight); color: var(--text-highlight); border-left: 4px solid #2563eb;"' : '';
                
                // Tombol hapus akan disembunyikan/dimatikan jika isLocked true
                const delBtnStyle = isLocked ? 'style="display:none"' : '';

                return `
                    <li class="job-item" ${highlightStyle}>
                        <span>${job.event} - <strong>${job.job}</strong> (${job.bobot})</span>
                        <button class="btn-del" ${delBtnStyle} onclick="hapusSatu('${job.fbId}')">🗑️</button>
                    </li>
                `;
            }).join('');

            bodyTabel.innerHTML += `
                <tr>
                    <td><strong>${d.nama}</strong><br><small>${d.divisi}</small></td>
                    <td><ul>${jobItems}</ul></td>
                    <td><strong>${d.total} Poin</strong></td>
                    <td><span class="status-badge ${sClass}">${sText}</span></td>
                </tr>
            `;
        }
    });
}

function updateStats(ov, ws, am) {
    document.getElementById('countOverload').innerText = ov;
    document.getElementById('countWaspada').innerText = ws;
    document.getElementById('countAman').innerText = am;
}

// ==========================================
// 4. EVENT LISTENERS
// ==========================================

document.getElementById('divisiAsal').addEventListener('change', (e) => {
    const selNama = document.getElementById('namaStaff');
    const containerLainnya = document.getElementById('containerCatatan');
    selNama.innerHTML = '<option value="">-- Pilih Nama Staff --</option>';
    
    if (e.target.value) {
        selNama.disabled = false;
        const list = daftarNama[e.target.value] || [];
        list.forEach(n => {
            const opt = document.createElement('option');
            opt.value = n; opt.innerText = n; selNama.appendChild(opt);
        });
        containerLainnya.style.display = (e.target.value === 'Lainnya' ? 'block' : 'none');
    } else {
        selNama.disabled = true;
        containerLainnya.style.display = 'none';
    }
});

document.getElementById('jabatan').addEventListener('change', (e) => {
    const p = poinJabatan[e.target.value] || 3;
    document.getElementById('bobot').value = p;
    document.getElementById('outputBobot').innerText = p + " Poin";
});

document.getElementById('bobot').addEventListener('input', (e) => {
    document.getElementById('outputBobot').innerText = e.target.value + " Poin";
});

// SIMPAN DENGAN PROTEKSI SAKLAR
document.getElementById('taskForm').addEventListener('submit', (e) => {
    e.preventDefault();

    if (isLocked) {
        alert("🔒 Database sedang dikunci oleh Pemimpin Umum.");
        return;
    }

    const div = document.getElementById('divisiAsal').value;
    const namaS = document.getElementById('namaStaff').value;
    if(!namaS) { alert("Pilih nama staff dulu!"); return; }

    const dataBaru = {
        divisi: div === 'Lainnya' ? `Lainnya (${document.getElementById('catatanDivisi').value})` : div,
        divisiKategori: div,
        nama: namaS,
        event: document.getElementById('namaEvent').value,
        job: document.getElementById('jabatan').value,
        bobot: parseInt(document.getElementById('bobot').value)
    };
    
    db.ref('plotting').push(dataBaru).then(() => {
        e.target.reset();
        document.getElementById('namaStaff').disabled = true;
        document.getElementById('outputBobot').innerText = "3 Poin";
        document.getElementById('containerCatatan').style.display = 'none';
    });
});

// HAPUS DENGAN PROTEKSI SAKLAR
window.hapusSatu = (id) => {
    if (isLocked) {
        alert("🔒 Mode View-Only aktif. Tidak bisa menghapus.");
        return;
    }
    if(confirm("Hapus item plotting ini?")) {
        db.ref('plotting/' + id).remove();
    }
};

// RESET DENGAN PROTEKSI SAKLAR
document.getElementById('btnReset').addEventListener('click', () => {
    if (isLocked) return; // Tombolnya sendiri sudah disembunyikan di atas
    
    if(confirm("⚠️ PERINGATAN: Ini akan menghapus SELURUH data plotting staff. Lanjutkan?")) {
        db.ref('plotting').remove();
    }
});

const triggerRender = () => {
    db.ref('plotting').once('value', s => renderTabel(s.val()));
};

document.getElementById('searchNama').addEventListener('input', triggerRender);
document.getElementById('filterDivisi').addEventListener('change', triggerRender);
document.getElementById('filterProker').addEventListener('change', triggerRender);
document.getElementById('sortStatus').addEventListener('change', triggerRender);

const btnDark = document.getElementById('darkModeToggle');
btnDark.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    btnDark.innerText = isDark ? "☀️ Mode Terang" : "🌙 Mode Gelap";
});
