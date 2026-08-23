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

    setInputValue("sekolah", dataPeserta["Asal Instansi"]);
    setInputValue("kelas", dataPeserta["Pekerjaan / Jurusan"]);
    setInputValue("nisn", dataPeserta["NIK / NISN / NIM"]);
    setInputValue("daerah", `${dataPeserta["Asal Kabupaten"] || ''}, ${dataPeserta["Asal Provinsi"] || ''}`.replace(/^,\s*|,\s*$/g, ''));
    setInputValue("email", dataPeserta["Email (Terverifikasi)"]);
    setInputValue("hp", dataPeserta["No HP / WA"]);
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
        errorElement.className = "text-danger mt-2 alert alert-danger";
        errorElement.innerHTML = "Silakan masukkan Nama Lengkap dan Kode Ujian!";
        return;
    }

    if (btnCek) btnCek.disabled = true;
    errorElement.className = "text-info mt-2 alert alert-info";
    errorElement.innerHTML = "Memeriksa database peserta...";

    try {
        await loadDaftarPeserta();

        if (!App.daftarPesertaValid || App.daftarPesertaValid.length === 0) {
            throw new Error("Database peserta.json tidak ditemukan atau kosong!");
        }

        const pesertaMatch = App.daftarPesertaValid.find(p => 
            String(p["Kode Kegiatan"] || "").trim().toUpperCase() === kodeInput &&
            String(p["Nama Lengkap"] || "").trim().toUpperCase() === inputNama
        );

        if (pesertaMatch) {
            App.isVerified = true;
            App.verifiedPesertaData = pesertaMatch;

            autoFillIdentitas(pesertaMatch);

            errorElement.className = "text-success mt-2 alert alert-success";
            errorElement.innerHTML = "<strong>Selamat Anda Terverifikasi</strong>";

            if (btnLanjut) {
                btnLanjut.style.display = "inline-block";
                btnLanjut.disabled = false;
            }
        } else {
            App.isVerified = false;
            App.verifiedPesertaData = null;

            if (btnLanjut) btnLanjut.style.display = "none";

            errorElement.className = "text-danger mt-2 alert alert-danger";
            errorElement.innerHTML = `
                Maaf, <strong>VERIFIKASI GAGAL</strong>: Kombinasi Nama '<b>${inputNama}</b>' dan Kode '<b>${kodeInput}</b>' tidak ditemukan! <br>
                Silakan hubungi Admin via <a href="https://wa.me/6285711000363" target="_blank" style="color: #25D366; font-weight: bold; text-decoration: underline;">WhatsApp Admin</a>.
            `;
        }
    } catch (err) {
        console.error(err);
        App.isVerified = false;
        App.verifiedPesertaData = null;
        if (btnLanjut) btnLanjut.style.display = "none";

        errorElement.className = "text-danger mt-2 alert alert-danger";
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
            errorElement.className = "text-danger mt-2 alert alert-danger";
            errorElement.innerHTML = "Silakan masukkan Token Ujian!";
            return;
        }

        btnSubmit.disabled = true;
        btnSubmit.textContent = "Memuat Soal Ujian...";

        const targetJsonFile = `${kodeInput}-Soal.json`;

        try {
            const pesertaMatch = App.verifiedPesertaData;

            // Fetch File Soal JSON
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
                nama: pesertaMatch["Nama Lengkap"] || inputNama,
                sekolah: getVal("sekolah") || pesertaMatch["Asal Instansi"] || "-",
                kelas: getVal("kelas") || pesertaMatch["Pekerjaan / Jurusan"] || "-",
                nisn: getVal("nisn") || pesertaMatch["NIK / NISN / NIM"] || "-",
                daerah: getVal("daerah") || `${pesertaMatch["Asal Kabupaten"] || ''}, ${pesertaMatch["Asal Provinsi"] || ''}`.replace(/^,\s*|,\s*$/g, '') || "-",
                email: pesertaMatch["Email (Terverifikasi)"] || "-",
                no_hp: pesertaMatch["No HP / WA"] || "-",
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
            errorElement.className = "text-danger mt-2 alert alert-danger";
            errorElement.textContent = err.message;
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = "Verifikasi & Lanjut ke Petunjuk >>";
        }
    });
});
