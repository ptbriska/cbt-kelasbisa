// main.js
import { App } from './state.js';
import { cekVerifikasiPeserta } from './auth.js';
import { startTimer, handleVisibilityChange, handleWindowBlur } from './security.js';
import { loadQuestion, renderNumberGrid, navigasi } from './exam.js';
import { submitJawaban } from './scoring.js';

document.addEventListener("DOMContentLoaded", () => {

    // 1. Event Listener Button Verifikasi Peserta
    const btnCek = document.getElementById("btn-cek-verifikasi");
    if (btnCek) {
        btnCek.addEventListener("click", function(e) {
            e.preventDefault();
            cekVerifikasiPeserta();
        });
    }

    // 2. Submit Form Identitas (Load Soal JSON & Verifikasi Token)
    const formIdentitas = document.getElementById("form-identitas");
    if (formIdentitas) {
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

                const res = await fetch(targetJsonFile);
                if (!res.ok) {
                    throw new Error(`Kode Ujian '${kodeInput}' tidak ditemukan atau belum dipublikasikan!`);
                }

                const data = await res.json();

                if (inputToken !== data.token) {
                    throw new Error("Token Ujian salah atau tidak berlaku untuk paket ini!");
                }

                // Set Config Ujian ke State Global
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
                        throw new Error("AKSES DITOLAK: Anda sudah pernah menyelesaikan ujian CBT ini!");
                    }
                }

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

                // Update Header & Logo Dinamis
                if (data.header_title) {
                    const el = document.getElementById("disp-header-title");
                    if (el) el.textContent = data.header_title;
                }
                if (data.header_sub) {
                    const el = document.getElementById("disp-header-sub");
                    if (el) el.textContent = data.header_sub;
                }

                if (data.logo) {
                    const logoInfo = document.getElementById("logo-lembaga-info");
                    const logoCbt = document.getElementById("logo-lembaga-cbt");
                    if (logoInfo) logoInfo.src = data.logo;
                    if (logoCbt) logoCbt.src = data.logo;
                }
                if (data.lembaga) {
                    const dispLembagaInfo = document.getElementById("disp-lembaga-info");
                    const dispLembagaCbt = document.getElementById("disp-lembaga-cbt");
                    if (dispLembagaInfo) dispLembagaInfo.textContent = data.lembaga;
                    if (dispLembagaCbt) dispLembagaCbt.textContent = data.lembaga;
                }
                if (data.sub_lembaga) {
                    const dispSub = document.getElementById("disp-sub-lembaga");
                    const dispSubInfo = document.getElementById("disp-sub-lembaga-info");
                    const dispSubCbt = document.getElementById("disp-sub-lembaga-cbt");
                    if (dispSub) dispSub.textContent = data.sub_lembaga;
                    if (dispSubInfo) dispSubInfo.textContent = data.sub_lembaga;
                    if (dispSubCbt) dispSubCbt.textContent = data.sub_lembaga;
                }

                document.getElementById("disp-kode-ujian").textContent = `${App.currentKodeUjian} (${App.modeUjian})`;
                document.getElementById("disp-durasi").textContent = App.timerDurationMinutes;
                document.getElementById("disp-jumlah-soal").textContent = App.questionsData.length;

                document.getElementById("page-login").classList.add("hidden");
                document.getElementById("page-info").classList.remove("hidden");
                window.scrollTo(0, 0);

            } catch (err) {
                console.error(err);
                errorElement.className = "text-danger mt-2 alert alert-danger";
                errorElement.textContent = err.message;
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = "Lanjut ke Petunjuk >>";
            }
        });
    }

    // 3. Expose Fungsi ke Global (Window) untuk Handler Inline HTML
    window.navigasi = navigasi;

    window.toggleMulaiButton = function() {
        const isChecked = document.getElementById("check-setuju").checked;
        const btnMulai = document.getElementById("btn-mulai-ujian");
        if (isChecked) {
            btnMulai.disabled = false;
            btnMulai.classList.remove("btn-start-disabled");
        } else {
            btnMulai.disabled = true;
            btnMulai.classList.add("btn-start-disabled");
        }
    };

    window.kembaliKePage1 = function() {
        document.getElementById("page-info").classList.add("hidden");
        document.getElementById("page-login").classList.remove("hidden");
        window.scrollTo(0, 0);
    };

    window.mulaiUjianPenuh = function() {
        document.getElementById("page-info").classList.add("hidden");
        document.getElementById("page-cbt").classList.remove("hidden");

        document.getElementById("disp-nama").textContent = App.userIdentitas.nama;
        document.getElementById("disp-nisn").textContent = `${App.userIdentitas.nisn} (${App.userIdentitas.kelas})`;

        App.isExamStarted = true;
        renderNumberGrid();
        loadQuestion(App.currentIndex);
        startTimer(App.timerDurationMinutes * 60);

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleWindowBlur);
    };

    window.konfirmasiSubmit = function() {
        const total = App.questionsData.length;
        const dijawab = Object.keys(App.userAnswers).length;

        if (confirm(`Anda telah menjawab ${dijawab} dari ${total} soal.\nYakin ingin mengakhiri ujian CBT?`)) {
            submitJawaban();
        }
    };

    window.konfirmasiKeluar = function() {
        if (confirm("Apakah Anda yakin ingin keluar dari halaman ujian CBT? Seluruh progres ujian Anda akan terhenti.")) {
            location.reload();
        }
    };

    window.toggleNavigator = function() {
        const sidebar = document.querySelector(".sidebar-nav");
        if (sidebar) {
            sidebar.classList.toggle("hidden");
        }
    };
});
