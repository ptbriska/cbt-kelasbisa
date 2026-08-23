// ==========================================================
// auth.js - Sistem Autentikasi & Verifikasi Peserta (v1.3.0)
// ==========================================================

async function loadDaftarPeserta() {
    try {
        const response = await fetch("peserta.json");
        if (response.ok) {
            const data = await response.json();
            App.daftarPesertaValid = Array.isArray(data) ? data : [];
        } else {
            App.daftarPesertaValid = [];
            console.warn("File peserta.json tidak ditemukan.");
        }
    } catch (err) {
        App.daftarPesertaValid = [];
        console.error("Gagal membaca peserta.json:", err);
    }
}

function autoFillIdentitas(dataPeserta) {
    const setInputValue = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || "";
    };

    setInputValue("sekolah", dataPeserta.sekolah || dataPeserta.instansi || dataPeserta["Asal Instansi"]);
    setInputValue("kelas", dataPeserta.kelas || dataPeserta.jurusan || dataPeserta["Pekerjaan / Jurusan"]);
    setInputValue("nisn", dataPeserta.nisn || dataPeserta.nik || dataPeserta["NIK / NISN / NIM"]);
    
    const daerah = dataPeserta.daerah || `${dataPeserta["Asal Kabupaten"] || ''}, ${dataPeserta["Asal Provinsi"] || ''}`.replace(/^,\s*|,\s*$/g, '');
    setInputValue("daerah", daerah);
    
    setInputValue("email", dataPeserta.email || dataPeserta["Email (Terverifikasi)"]);
    setInputValue("hp", dataPeserta.hp || dataPeserta.no_hp || dataPeserta["No HP / WA"]);
}

function clearIdentitasForm() {
    const clearValue = (id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    };
    ["sekolah", "kelas", "nisn", "daerah", "email", "hp"].forEach(clearValue);
}

async function cekVerifikasiPeserta() {
    const kodeInput = document.getElementById("kode-ujian-input").value.trim().toUpperCase();
    const inputNamaRaw = document.getElementById("nama").value.trim();
    const inputNama = inputNamaRaw.toUpperCase();
    
    document.getElementById("nama").value = inputNama;

    const errorElement = document.getElementById("pesan-error-login");
    const btnLanjut = document.getElementById("btn-lanjut-info");
    const btnCek = document.getElementById("btn-cek-verifikasi");

    if (!inputNama || !kodeInput) {
        errorElement.className = "error-msg alert alert-danger";
        errorElement.style.display = "block";
        errorElement.innerHTML = "⚠️ Silakan masukkan <strong>Nama Lengkap</strong> dan <strong>Kode Ujian</strong>!";
        return;
    }

    if (btnCek) btnCek.disabled = true;
    errorElement.className = "error-msg alert alert-info";
    errorElement.style.display = "block";
    errorElement.innerHTML = "🔄 Memeriksa database peserta...";

    try {
        await loadDaftarPeserta();

        if (!App.daftarPesertaValid || App.daftarPesertaValid.length === 0) {
            throw new Error("Database peserta.json tidak ditemukan atau kosong!");
        }

        // Matching Fleksibel
        const pesertaMatch = App.daftarPesertaValid.find(p => {
            const namaP = String(p.nama || p["Nama Lengkap"] || "").trim().toUpperCase();
            const kodeP = String(p.kode_ujian || p["Kode Kegiatan"] || p.kode || "").trim().toUpperCase();
            return namaP === inputNama && kodeP === kodeInput;
        });

        if (pesertaMatch) {
            App.isVerified = true;
            App.verifiedPesertaData = pesertaMatch;

            autoFillIdentitas(pesertaMatch);

            errorElement.className = "error-msg alert alert-success";
            errorElement.style.display = "block";
            errorElement.innerHTML = "✅ <strong>VERIFIKASI BERHASIL!</strong> Data peserta ditemukan.";

            if (btnLanjut) {
                btnLanjut.style.display = "inline-block";
                btnLanjut.disabled = false;
            }
        } else {
            App.isVerified = false;
            App.verifiedPesertaData = null;

            if (btnLanjut) btnLanjut.style.display = "none";
            clearIdentitasForm();

            errorElement.className = "error-msg alert alert-danger";
            errorElement.style.display = "block";
            errorElement.innerHTML = `
                <div>⚠️ <strong>VERIFIKASI GAGAL:</strong> Kombinasi Nama '<b>${inputNama}</b>' dan Kode '<b>${kodeInput}</b>' tidak ditemukan!</div>
                <div style="margin-top: 6px;">Silakan hubungi Admin via:</div>
                <a href="https://wa.me/6285711000363?text=Halo%20Admin,%20saya%20gagal%20verifikasi%20CBT%20dengan%20Nama:%20${encodeURIComponent(inputNama)}%20dan%20Kode:%20${encodeURIComponent(kodeInput)}" target="_blank" style="color: #25D366; font-weight: bold; text-decoration: underline;">
                    <i class="fa-brands fa-whatsapp"></i> Hubungi WhatsApp Admin
                </a>
            `;
        }
    } catch (err) {
        console.error(err);
        App.isVerified = false;
        App.verifiedPesertaData = null;
        if (btnLanjut) btnLanjut.style.display = "none";
        clearIdentitasForm();

        errorElement.className = "error-msg alert alert-danger";
        errorElement.style.display = "block";
        errorElement.innerHTML = err.message;
    } finally {
        if (btnCek) btnCek.disabled = false;
    }
}

// ==========================================================
// SUBMIT FORM IDENTITAS & FETCH SOAL (PINDAH KE PAGE 2)
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
    const formIdentitas = document.getElementById("form-identitas");
    if (!formIdentitas) return;

    formIdentitas.addEventListener("submit", async function(e) {
        e.preventDefault();
        
        const kodeInput = document.getElementById("kode-ujian-input").value.trim().toUpperCase();
        const inputToken = document.getElementById("token-input").value.trim();
        const inputNama = document.getElementById("nama").value.trim().toUpperCase();
        
        const errorElement = document.getElementById("pesan-error-login");
        const btnSubmit = document.getElementById("btn-lanjut-info");

        if (!App.isVerified || !App.verifiedPesertaData) {
            await cekVerifikasiPeserta();
            if (!App.isVerified) return;
        }

        if (!inputToken) {
            errorElement.className = "error-msg alert alert-danger";
            errorElement.style.display = "block";
            errorElement.innerHTML = "⚠️ Silakan masukkan Token Ujian!";
            return;
        }

        btnSubmit.disabled = true;
        btnSubmit.textContent = "Memuat Soal Ujian...";

        const targetJsonFile = `${kodeInput}-Soal.json`;

        try {
            const pesertaMatch = App.verifiedPesertaData;

            const res = await fetch(targetJsonFile);
            if (!res.ok) {
                throw new Error(`Paket Soal '${kodeInput}' tidak ditemukan atau belum dipublikasikan!`);
            }
            
            const data = await res.json();

            if (inputToken !== data.token) {
                throw new Error("Token Ujian salah atau tidak berlaku!");
            }

            // Simpan State Ke Global App
            App.questionsDataConfig = data;
            App.currentKodeUjian = kodeInput;
            App.validToken = data.token || "";
            App.timerDurationMinutes = data.timer_menit || 60;
            App.questionsData = data.questions || [];
            App.modeUjian = (data.mode_ujian || "LATIHAN").toUpperCase();
            App.modePenilaian = (data.mode_penilaian || "1A").toUpperCase();
            App.skorConfig = data.skor_config || {};

            // Proteksi Sekali Submit jika Mode SIMULASI
            if (App.modeUjian === "SIMULASI") {
                const lockKey = `SUBMITTED_${App.currentKodeUjian}_${inputNama}`;
                if (localStorage.getItem(lockKey) === "TRUE") {
                    throw new Error("AKSES DITOLAK: Anda sudah pernah menyelesaikan ujian ini!");
                }
            }

            // Simpan Identitas Peserta ke App
            const getVal = id => {
                const el = document.getElementById(id);
                return el ? el.value.trim() : "";
            };

            App.userIdentitas = {
                nama: pesertaMatch["Nama Lengkap"] || pesertaMatch.nama || inputNama,
                sekolah: getVal("sekolah") || "-",
                kelas: getVal("kelas") || "-",
                nisn: getVal("nisn") || "-",
                daerah: getVal("daerah") || "-",
                email: pesertaMatch["Email (Terverifikasi)"] || pesertaMatch.email || "-",
                no_hp: pesertaMatch["No HP / WA"] || pesertaMatch.hp || "-",
                skema_tarif: pesertaMatch["Skema Tarif"] || "-",
                bidang_kategori: pesertaMatch["Bidang / Kategori"] || "-",
                kode_ujian: App.currentKodeUjian,
                mode_ujian: App.modeUjian
            };

            // Update DOM Header & Info Kegiatan
            if (data.header_title && document.getElementById("disp-header-title")) {
                document.getElementById("disp-header-title").textContent = data.header_title;
            }
            if (data.header_sub && document.getElementById("disp-header-sub")) {
                document.getElementById("disp-header-sub").textContent = data.header_sub;
            }

            if (data.logo) {
                if (document.getElementById("logo-lembaga-info")) document.getElementById("logo-lembaga-info").src = data.logo;
                if (document.getElementById("logo-lembaga-cbt")) document.getElementById("logo-lembaga-cbt").src = data.logo;
            }
            if (data.lembaga) {
                if (document.getElementById("disp-lembaga-info")) document.getElementById("disp-lembaga-info").textContent = data.lembaga;
                if (document.getElementById("disp-lembaga-cbt")) document.getElementById("disp-lembaga-cbt").textContent = data.lembaga;
            }
            if (data.sub_lembaga) {
                if (document.getElementById("disp-sub-lembaga")) document.getElementById("disp-sub-lembaga").textContent = data.sub_lembaga;
                if (document.getElementById("disp-sub-lembaga-info")) document.getElementById("disp-sub-lembaga-info").textContent = data.sub_lembaga;
                if (document.getElementById("disp-sub-lembaga-cbt")) document.getElementById("disp-sub-lembaga-cbt").textContent = data.sub_lembaga;
            }

            document.getElementById("disp-kode-ujian").textContent = `${App.currentKodeUjian} (${App.modeUjian})`;
            document.getElementById("disp-durasi").textContent = App.timerDurationMinutes;
            document.getElementById("disp-jumlah-soal").textContent = App.questionsData.length;

            // Navigasi Tampilan Halaman
            document.getElementById("page-login").classList.add("hidden");
            document.getElementById("page-info").classList.remove("hidden");
            window.scrollTo(0, 0);

        } catch (err) {
            console.error(err);
            errorElement.className = "error-msg alert alert-danger";
            errorElement.style.display = "block";
            errorElement.textContent = err.message;
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = "Verifikasi & Lanjut ke Petunjuk >>";
        }
    });
});
