// ==========================================================
// auth.js - Sistem Autentikasi & Verifikasi Peserta (v1.5.0)
// Synchronized | Dynamic Multi-Type Rules Loader | Fast-Fetch
// ==========================================================

// Pastikan Objek App Selalu Ada
window.App = window.App || {};

/**
 * Memuat database daftar peserta dari peserta.json
 */
async function loadDaftarPeserta() {
    try {
        const response = await fetch("peserta.json");
        if (response.ok) {
            const data = await response.json();
            window.App.daftarPesertaValid = Array.isArray(data) ? data : [];
        } else {
            window.App.daftarPesertaValid = [];
            console.warn("File peserta.json tidak ditemukan atau respon server bukan OK.");
        }
    } catch (err) {
        window.App.daftarPesertaValid = [];
        console.error("Gagal membaca peserta.json:", err);
    }
}

/**
 * Mengisi otomatis field readonly identitas setelah verifikasi berhasil
 */
function autoFillIdentitas(dataPeserta) {
    if (!dataPeserta) return;

    const setInputValue = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || "";
    };

    setInputValue("sekolah", dataPeserta.sekolah || dataPeserta.instansi || dataPeserta["Asal Instansi"]);
    setInputValue("kelas", dataPeserta.kelas || dataPeserta.jurusan || dataPeserta["Pekerjaan / Jurusan"] || dataPeserta["Bidang Kerja"]);
    setInputValue("nisn", dataPeserta.nisn || dataPeserta.nik || dataPeserta["NIK / NISN / NIM"]);
    
    const daerah = dataPeserta.daerah || `${dataPeserta["Asal Kabupaten"] || dataPeserta.kabupaten || ''}, ${dataPeserta["Asal Provinsi"] || dataPeserta.provinsi || ''}`.replace(/^,\s*|,\s*$/g, '');
    setInputValue("daerah", daerah);
    
    setInputValue("email", dataPeserta.email || dataPeserta["Email (Terverifikasi)"]);
    setInputValue("hp", dataPeserta.hp || dataPeserta.no_hp || dataPeserta["No HP / WA"]);
}

/**
 * Mengosongkan seluruh field identitas apabila verifikasi gagal
 */
function clearIdentitasForm() {
    const clearValue = (id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    };
    ["sekolah", "kelas", "nisn", "daerah", "email", "hp"].forEach(clearValue);
}

/**
 * Verifikasi Peserta Tahap 1 (Cek Kombinasi Nama & Kode Ujian)
 */
async function cekVerifikasiPeserta(e) {
    if (e && typeof e.preventDefault === "function") {
        e.preventDefault();
    }

    const elKode = document.getElementById("kode-ujian-input");
    const elNama = document.getElementById("nama");
    const elMsg = document.getElementById("pesan-error-login");
    const btnLanjut = document.getElementById("btn-lanjut-info");
    const btnCek = document.getElementById("btn-cek-verifikasi");

    if (!elKode || !elNama) {
        alert("Terjadi kesalahan elemen HTML: Input Kode / Nama tidak ditemukan!");
        return false;
    }

    const kodeInput = elKode.value.trim().toUpperCase();
    const inputNama = elNama.value.trim().toUpperCase();
    
    // Format tampilan input ke Capital
    elKode.value = kodeInput;
    elNama.value = inputNama;

    // Reset tampilan status pesan
    if (elMsg) {
        elMsg.className = "error-msg";
        elMsg.style.display = "none";
        elMsg.innerHTML = "";
    }

    // Validasi Input Kosong
    if (!kodeInput || !inputNama) {
        if (elMsg) {
            elMsg.className = "error-msg alert alert-danger";
            elMsg.style.display = "block";
            elMsg.innerHTML = "⚠️ Harap isi <strong>Kode Ujian</strong> dan <strong>Nama Lengkap</strong> terlebih dahulu!";
        }
        if (btnLanjut) btnLanjut.style.display = "none";
        return false;
    }

    if (btnCek) btnCek.disabled = true;

    try {
        // Ambil data jika belum ada di state
        if (!window.App.daftarPesertaValid || !Array.isArray(window.App.daftarPesertaValid) || window.App.daftarPesertaValid.length === 0) {
            await loadDaftarPeserta();
        }

        const listPeserta = window.App.daftarPesertaValid || [];

        // Pencarian data yang cocok (Support Multi Key Matching)
        const match = listPeserta.find((p) => {
            if (!p) return false;
            const namaP = String(p.nama || p["Nama Lengkap"] || p.Nama || "").trim().toUpperCase();
            const kodeP = String(p.kode_ujian || p["Kode Kegiatan"] || p.kode || p["Kode Ujian"] || "").trim().toUpperCase();
            return namaP === inputNama && kodeP === kodeInput;
        });

        if (match) {
            window.App.isVerified = true;
            window.App.verifiedPesertaData = match;

            // Isi Otomatis Field Readonly
            autoFillIdentitas(match);

            // Tampilkan Notifikasi Sukses
            if (elMsg) {
                elMsg.className = "error-msg alert alert-success";
                elMsg.style.display = "block";
                elMsg.innerHTML = `✅ <strong>VERIFIKASI BERHASIL!</strong> Data peserta ditemukan. Silakan periksa detail di bawah.`;
            }

            if (btnLanjut) btnLanjut.style.display = "block";
            return true;

        } else {
            window.App.isVerified = false;
            window.App.verifiedPesertaData = null;

            if (btnLanjut) btnLanjut.style.display = "none";
            clearIdentitasForm();

            // TAMPILKAN NOTIFIKASI GAGAL + TOMBOL WHATSAPP
            if (elMsg) {
                elMsg.className = "error-msg alert alert-danger";
                elMsg.style.display = "block";
                elMsg.innerHTML = `
                    <div style="margin-bottom: 8px;">⚠️ <strong>VERIFIKASI GAGAL:</strong> Kombinasi Nama <strong>'${inputNama}'</strong> dan Kode <strong>'${kodeInput}'</strong> tidak ditemukan dalam sistem!</div>
                    <div style="margin-bottom: 8px; font-size: 13px;">Silakan hubungi Admin untuk bantuan pendaftaran:</div>
                    <a href="https://wa.me/6285711000363?text=Halo%20Admin,%20saya%20gagal%20verifikasi%20CBT%20dengan%20Nama:%20${encodeURIComponent(inputNama)}%20dan%20Kode:%20${encodeURIComponent(kodeInput)}" 
                       target="_blank" 
                       class="btn-wa-help" 
                       style="display: inline-flex; align-items: center; gap: 8px; background-color: #25D366; color: #ffffff !important; padding: 10px 16px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; margin-top: 6px; box-shadow: 0 2px 5px rgba(0,0,0,0.15);">
                        <i class="fa-brands fa-whatsapp" style="font-size: 18px;"></i> Hubungi Admin WhatsApp
                    </a>
                `;
            }
            return false;
        }
    } catch (err) {
        console.error(err);
        if (elMsg) {
            elMsg.className = "error-msg alert alert-danger";
            elMsg.style.display = "block";
            elMsg.innerHTML = `⚠️ Terjadi kesalahan: ${err.message}`;
        }
        return false;
    } finally {
        if (btnCek) btnCek.disabled = false;
    }
}

// ==========================================================
// INISIALISASI EVENT LISTENER & FORM HANDLER
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
    // Attach event klik ke tombol Cek Verifikasi secara otomatis
    const btnCek = document.getElementById("btn-cek-verifikasi");
    if (btnCek) {
        btnCek.addEventListener("click", cekVerifikasiPeserta);
    }

    const formIdentitas = document.getElementById("form-identitas");
    if (!formIdentitas) return;

    formIdentitas.addEventListener("submit", async function(e) {
        e.preventDefault();
        
        const elKode = document.getElementById("kode-ujian-input");
        const elToken = document.getElementById("token-input");
        const elNama = document.getElementById("nama");

        const kodeInput = elKode ? elKode.value.trim().toUpperCase() : "";
        const inputToken = elToken ? elToken.value.trim() : "";
        const inputNama = elNama ? elNama.value.trim().toUpperCase() : "";
        
        const errorElement = document.getElementById("pesan-error-login");
        const btnSubmit = document.getElementById("btn-lanjut-info");

        if (!window.App.isVerified || !window.App.verifiedPesertaData) {
            const isOk = await cekVerifikasiPeserta();
            if (!isOk) return;
        }

        if (!inputToken) {
            if (errorElement) {
                errorElement.className = "error-msg alert alert-danger";
                errorElement.style.display = "block";
                errorElement.innerHTML = "⚠️ Silakan masukkan Token Ujian!";
            }
            return;
        }

        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.textContent = "Memuat Soal Ujian...";
        }

        const targetJsonFile = `json/${kodeInput}-Soal.json`;

        try {
            const pesertaMatch = window.App.verifiedPesertaData || {};

            const res = await fetch(targetJsonFile);
            if (!res.ok) {
                throw new Error(`Paket Soal '${kodeInput}' tidak ditemukan di lokasi (${targetJsonFile}) atau belum dipublikasikan!`);
            }
            
            const data = await res.json();

            if (inputToken !== data.token) {
                throw new Error("Token Ujian salah atau tidak berlaku!");
            }

            // Simpan State Utama Ke Global App
            window.App.soalData = data;
            window.App.questionsDataConfig = data;
            window.App.currentKodeUjian = kodeInput;
            window.App.validToken = data.token || "";
            window.App.timerDurationMinutes = data.timer_menit || 60;
            window.App.questionsData = data.questions || [];
            window.App.modeUjian = (data.mode_ujian || "LATIHAN").toUpperCase();
            
            // Injeksi Scoring Rules Dinamis v1.5.0 dari JSON
            if (data.scoring_rules) {
                window.App.scoringRules = data.scoring_rules;
            } else if (data.skor_config) {
                window.App.scoringRules = data.skor_config;
            }

            // Inisialisasi Tempat Simpan Hasil Keamanan
            window.App.warningCount = 0;
            window.App.warningLogs = [];
            window.App.cheatingSnapshots = [];

            // Proteksi Sekali Submit jika Mode SIMULASI
            if (window.App.modeUjian === "SIMULASI") {
                const lockKey = `SUBMITTED_${window.App.currentKodeUjian}_${inputNama}`;
                if (localStorage.getItem(lockKey) === "TRUE") {
                    throw new Error("AKSES DITOLAK: Anda sudah pernah menyelesaikan ujian ini!");
                }
            }

            const getVal = id => {
                const el = document.getElementById(id);
                return el ? el.value.trim() : "";
            };

            window.App.userIdentitas = {
                nama: pesertaMatch["Nama Lengkap"] || pesertaMatch.nama || inputNama,
                sekolah: getVal("sekolah") || pesertaMatch["Asal Instansi"] || pesertaMatch.sekolah || "-",
                kelas: getVal("kelas") || pesertaMatch["Pekerjaan / Jurusan"] || pesertaMatch.kelas || "-",
                nisn: getVal("nisn") || pesertaMatch["NIK / NISN / NIM"] || pesertaMatch.nisn || "-",
                daerah: getVal("daerah") || "-",
                email: pesertaMatch["Email (Terverifikasi)"] || pesertaMatch.email || "-",
                no_hp: pesertaMatch["No HP / WA"] || pesertaMatch.hp || "-",
                skema_tarif: pesertaMatch["Skema Tarif"] || "-",
                bidang_kategori: pesertaMatch["Bidang / Kategori"] || "-",
                kode_ujian: window.App.currentKodeUjian,
                mode_ujian: window.App.modeUjian
            };

            // Update DOM Header & Logo
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
            
            const valSubLembaga = data.sub_lembaga || data.sub_header || "-";
            if (document.getElementById("disp-sub-lembaga-info")) {
                document.getElementById("disp-sub-lembaga-info").textContent = valSubLembaga;
            }
            if (document.getElementById("disp-sub-lembaga")) {
                document.getElementById("disp-sub-lembaga").textContent = valSubLembaga;
            }
            if (document.getElementById("disp-sub-lembaga-cbt")) {
                document.getElementById("disp-sub-lembaga-cbt").textContent = valSubLembaga;
            }

            const valNamaKegiatan = data.nama_kegiatan || data.nama_kegiatan_ujian || "-";
            if (document.getElementById("disp-nama-kegiatan")) {
                document.getElementById("disp-nama-kegiatan").textContent = valNamaKegiatan;
            }

            if (document.getElementById("disp-kode-ujian")) {
                document.getElementById("disp-kode-ujian").textContent = `${window.App.currentKodeUjian} (${window.App.modeUjian})`;
            }
            if (document.getElementById("disp-durasi")) {
                document.getElementById("disp-durasi").textContent = `${window.App.timerDurationMinutes} Menit`;
            }
            if (document.getElementById("disp-jumlah-soal")) {
                document.getElementById("disp-jumlah-soal").textContent = `${window.App.questionsData.length} Soal`;
            }

            // Pindah Tampilan ke Halaman 2 (Petunjuk & Tata Tertib)
            const pLogin = document.getElementById("page-login");
            const pInfo = document.getElementById("page-info");
            if (pLogin) pLogin.classList.add("hidden");
            if (pInfo) pInfo.classList.remove("hidden");
            window.scrollTo(0, 0);

        } catch (err) {
            console.error(err);
            if (errorElement) {
                errorElement.className = "error-msg alert alert-danger";
                errorElement.style.display = "block";
                errorElement.textContent = err.message;
            }
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.textContent = "Verifikasi & Lanjut ke Petunjuk >>";
            }
        }
    });
});
