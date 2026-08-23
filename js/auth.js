// ==========================================================
// auth.js - Sistem Autentikasi & Verifikasi Peserta (v1.3.4)
// ==========================================================

/**
 * Memuat database daftar peserta dari peserta.json
 */
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

/**
 * Mengisi otomatis field readonly identitas setelah verifikasi berhasil
 */
function autoFillIdentitas(dataPeserta) {
    const setInputValue = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || "";
    };

    setInputValue("sekolah", dataPeserta.sekolah || dataPeserta.instansi || dataPeserta["Asal Instansi"]);
    setInputValue("kelas", dataPeserta.kelas || dataPeserta.jurusan || dataPeserta["Pekerjaan / Jurusan"] || dataPeserta["Bidang Kerja"]);
    setInputValue("nisn", dataPeserta.nisn || dataPeserta.nik || dataPeserta["NIK / NISN / NIM"]);
    
    const daerah = dataPeserta.daerah || `${dataPeserta["Asal Kabupaten"] || ''}, ${dataPeserta["Asal Provinsi"] || ''}`.replace(/^,\s*|,\s*$/g, '');
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
async function cekVerifikasiPeserta() {
    const kodeInput = document.getElementById("kode-ujian-input").value.trim().toUpperCase();
    const inputNama = document.getElementById("nama").value.trim().toUpperCase();
    
    // Format tampilan input ke Capital
    document.getElementById("nama").value = inputNama;
    document.getElementById("kode-ujian-input").value = kodeInput;

    const elMsg = document.getElementById("pesan-error-login");
    const btnLanjut = document.getElementById("btn-lanjut-info");
    const btnCek = document.getElementById("btn-cek-verifikasi");

    // Reset tampilan status
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
        return;
    }

    if (btnCek) btnCek.disabled = true;

    try {
        // Ambil data jika belum ada di state
        if (!App.daftarPesertaValid || App.daftarPesertaValid.length === 0) {
            await loadDaftarPeserta();
        }

        // Pencarian data yang cocok (Support Multi Key Matching)
        const match = App.daftarPesertaValid.find((p) => {
            const namaP = String(p.nama || p["Nama Lengkap"] || p.Nama || "").trim().toUpperCase();
            const kodeP = String(p.kode_ujian || p["Kode Kegiatan"] || p.kode || p["Kode Ujian"] || "").trim().toUpperCase();
            return namaP === inputNama && kodeP === kodeInput;
        });

        if (match) {
            App.isVerified = true;
            App.verifiedPesertaData = match;

            // Isi Otomatis Field Readonly
            autoFillIdentitas(match);

            // Tampilkan Notifikasi Sukses
            if (elMsg) {
                elMsg.className = "error-msg alert alert-success";
                elMsg.style.display = "block";
                elMsg.innerHTML = `✅ <strong>VERIFIKASI BERHASIL!</strong> Data peserta ditemukan. Silakan periksa detail di bawah.`;
            }

            if (btnLanjut) btnLanjut.style.display = "block";

        } else {
            App.isVerified = false;
            App.verifiedPesertaData = null;

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
        }
    } catch (err) {
        console.error(err);
        if (elMsg) {
            elMsg.className = "error-msg alert alert-danger";
            elMsg.style.display = "block";
            elMsg.innerHTML = `⚠️ Terjadi kesalahan: ${err.message}`;
        }
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
            if (errorElement) {
                errorElement.className = "error-msg alert alert-danger";
                errorElement.style.display = "block";
                errorElement.innerHTML = "⚠️ Silakan masukkan Token Ujian!";
            }
            return;
        }

        btnSubmit.disabled = true;
        btnSubmit.textContent = "Memuat Soal Ujian...";

        // MEMBACA FILE DARI FOLDER json/
        const targetJsonFile = `json/${kodeInput}-Soal.json`;

        try {
            const pesertaMatch = App.verifiedPesertaData;

            // Fetch File Soal JSON
            const res = await fetch(targetJsonFile);
            if (!res.ok) {
                throw new Error(`Paket Soal '${kodeInput}' tidak ditemukan di lokasi (${targetJsonFile}) atau belum dipublikasikan!`);
            }
            
            const data = await res.json();

            if (inputToken !== data.token) {
                throw new Error("Token Ujian salah atau tidak berlaku!");
            }

            // Simpan State Ke Global App
            App.soalData = data;
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
                sekolah: getVal("sekolah") || pesertaMatch["Asal Instansi"] || pesertaMatch.sekolah || "-",
                kelas: getVal("kelas") || pesertaMatch["Pekerjaan / Jurusan"] || pesertaMatch.kelas || "-",
                nisn: getVal("nisn") || pesertaMatch["NIK / NISN / NIM"] || pesertaMatch.nisn || "-",
                daerah: getVal("daerah") || "-",
                email: pesertaMatch["Email (Terverifikasi)"] || pesertaMatch.email || "-",
                no_hp: pesertaMatch["No HP / WA"] || pesertaMatch.hp || "-",
                skema_tarif: pesertaMatch["Skema Tarif"] || "-",
                bidang_kategori: pesertaMatch["Bidang / Kategori"] || "-",
                kode_ujian: App.currentKodeUjian,
                mode_ujian: App.modeUjian
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
            
            // 1. sub_lembaga (Contoh: "PILAR JUARA - KELAS BISA")
            // Ditampilkan pada Header Sub-Lembaga di bawah Lembaga Utama
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

            // 2. nama_kegiatan (Contoh: "SIMULASI OSN")
            // Ditampilkan pada Tabel Informasi Ujian CBT (<span id="disp-nama-kegiatan">)
            const valNamaKegiatan = data.nama_kegiatan || data.nama_kegiatan_ujian || "-";
            if (document.getElementById("disp-nama-kegiatan")) {
                document.getElementById("disp-nama-kegiatan").textContent = valNamaKegiatan;
            }

            // Render Detail Box Informasi Ujian CBT (Page 2)
            if (document.getElementById("disp-kode-ujian")) {
                document.getElementById("disp-kode-ujian").textContent = `${App.currentKodeUjian} (${App.modeUjian})`;
            }
            if (document.getElementById("disp-durasi")) {
                document.getElementById("disp-durasi").textContent = `${App.timerDurationMinutes} Menit`;
            }
            if (document.getElementById("disp-jumlah-soal")) {
                document.getElementById("disp-jumlah-soal").textContent = `${App.questionsData.length} Soal`;
            }

            // Pindah Tampilan ke Halaman 2 (Informasi Ujian)
            document.getElementById("page-login").classList.add("hidden");
            document.getElementById("page-info").classList.remove("hidden");
            window.scrollTo(0, 0);

        } catch (err) {
            console.error(err);
            if (errorElement) {
                errorElement.className = "error-msg alert alert-danger";
                errorElement.style.display = "block";
                errorElement.textContent = err.message;
            }
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = "Verifikasi & Lanjut ke Petunjuk >>";
        }
    });
});
