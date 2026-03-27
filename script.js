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

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

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

// Listener Real-time
db.ref('plotting').on('value', (snapshot) => {
    renderTabel(snapshot.val());
});

function renderTabel(data) {
    const bodyTabel = document.getElementById('bodyTabel');
    const fDivisi = document.getElementById('filterDivisi').value;
    const fProker = document.getElementById('filterProker').value; 
    const sStatus = document.getElementById('sortStatus').value;
    const search = document.getElementById('searchNama').value.toLowerCase();
    
    // Inisialisasi Counter untuk Statistik
    let countOverload = 0;
    let countWaspada = 0;
    let countAman = 0;

    bodyTabel.innerHTML = '';
    if (!data) {
        updateStats(0, 0, 0); // Reset statistik jika data kosong
        return;
    }

    const rekapObj = {};
    Object.keys(data).forEach(id => {
        const item = data[id];
        
        // Filter Dasar (Divisi & Search Nama)
        if (fDivisi !== "Semua" && item.divisiKategori !== fDivisi) return;
        if (search && !item.nama.toLowerCase().includes(search)) return;

        if (!rekapObj[item.nama]) {
            rekapObj[item.nama] = { nama: item.nama, divisi: item.divisi, total: 0, list: [] };
        }
        rekapObj[item.nama].total += item.bobot;
        rekapObj[item.nama].list.push({ ...item, fbId: id });
    });

    let rekapArray = Object.values(rekapObj);

    // Hitung Statistik Berdasarkan Data yang sudah di-filter (kecuali filter proker agar angka tetap sinkron)
    rekapArray.forEach(staff => {
        if (staff.total > 10) countOverload++;
        else if (staff.total >= 6) countWaspada++;
        else countAman++;
    });
    updateStats(countOverload, countWaspada, countAman);

    // Sortir
    if (sStatus === "BebanTinggi") rekapArray.sort((a, b) => b.total - a.total);
    else if (sStatus === "BebanRendah") rekapArray.sort((a, b) => a.total - b.total);

    // Render Baris Tabel
    rekapArray.forEach(d => {
        const isInvolvedInProker = fProker === "Semua" || d.list.some(j => j.event === fProker);

        if (isInvolvedInProker) {
            let sClass = d.total > 10 ? 'status-overload' : (d.total >= 6 ? 'status-warning' : 'status-aman');
            
            let jobItems = d.list.map(job => {
                const isFiltered = (fProker !== "Semua" && job.event === fProker);
                const highlightStyle = isFiltered 
                    ? 'style="background: var(--bg-highlight); color: var(--text-highlight); border-left: 4px solid #2563eb;"' 
                    : '';
                
                return `
                    <li class="job-item" ${highlightStyle}>
                        <span>${job.event} - <strong>${job.job}</strong> (${job.bobot})</span>
                        <button class="btn-del" onclick="hapusSatu('${job.fbId}')">🗑️</button>
                    </li>
                `;
            }).join('');

            bodyTabel.innerHTML += `
                <tr>
                    <td><strong>${d.nama}</strong><br><small>${d.divisi}</small></td>
                    <td><ul>${jobItems}</ul></td>
                    <td><strong>${d.total} Poin</strong></td>
                    <td><span class="status-badge ${sClass}">${d.total > 10 ? 'Overload' : (d.total >= 6 ? 'Waspada' : 'Aman')}</span></td>
                </tr>
            `;
        }
    });
}

// Fungsi untuk memperbarui angka di Box Ringkasan
function updateStats(ov, ws, am) {
    document.getElementById('countOverload').innerText = ov;
    document.getElementById('countWaspada').innerText = ws;
    document.getElementById('countAman').innerText = am;
}

// ==========================================
// 4. EVENT LISTENERS
// ==========================================

// Ganti Nama Staff Berdasarkan Divisi
document.getElementById('divisiAsal').addEventListener('change', (e) => {
    const selNama = document.getElementById('namaStaff');
    const containerLainnya = document.getElementById('containerCatatan');
    
    selNama.innerHTML = '<option value="">-- Pilih Nama Staff --</option>';
    
    if (e.target.value) {
        selNama.disabled = false;
        const list = daftarNama[e.target.value] || [];
        list.forEach(n => {
            const opt = document.createElement('option');
            opt.value = n; 
            opt.innerText = n; 
            selNama.appendChild(opt);
        });
        
        // Tampilkan input manual jika pilih 'Lainnya'
        containerLainnya.style.display = (e.target.value === 'Lainnya' ? 'block' : 'none');
    } else {
        selNama.disabled = true;
        containerLainnya.style.display = 'none';
    }
});

// Update Poin Otomatis saat Jabatan dipilih
document.getElementById('jabatan').addEventListener('change', (e) => {
    const p = poinJabatan[e.target.value] || 3;
    document.getElementById('bobot').value = p;
    document.getElementById('outputBobot').innerText = p + " Poin";
});

// Update Label Slider Poin (jika digeser manual)
document.getElementById('bobot').addEventListener('input', (e) => {
    document.getElementById('outputBobot').innerText = e.target.value + " Poin";
});

// Simpan ke Firebase
document.getElementById('taskForm').addEventListener('submit', (e) => {
    e.preventDefault();
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
        // Reset form tapi jangan reset filter
        e.target.reset();
        document.getElementById('namaStaff').disabled = true;
        document.getElementById('outputBobot').innerText = "3 Poin";
        document.getElementById('containerCatatan').style.display = 'none';
    });
});

// Hapus Item
window.hapusSatu = (id) => {
    if(confirm("Hapus item plotting ini?")) {
        db.ref('plotting/' + id).remove();
    }
};

// Reset Database
document.getElementById('btnReset').addEventListener('click', () => {
    if(confirm("⚠️ PERINGATAN: Ini akan menghapus SELURUH data plotting staff. Lanjutkan?")) {
        db.ref('plotting').remove();
    }
});

// Filter, Search, & Sort (Trigger render ulang)
const triggerRender = () => {
    db.ref('plotting').once('value', s => renderTabel(s.val()));
};

document.getElementById('searchNama').addEventListener('input', triggerRender);
document.getElementById('filterDivisi').addEventListener('change', triggerRender);
document.getElementById('filterProker').addEventListener('change', triggerRender);
document.getElementById('sortStatus').addEventListener('change', triggerRender);

// Dark Mode Toggle
const btnDark = document.getElementById('darkModeToggle');
btnDark.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    btnDark.innerText = isDark ? "☀️ Mode Terang" : "🌙 Mode Gelap";
});
