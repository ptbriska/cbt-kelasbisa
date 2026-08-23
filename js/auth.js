// auth.js
import { App } from './state.js';

export async function loadDaftarPeserta() {
    try {
        const response = await fetch("peserta.json");
        if (response.ok) {
            const data = await response.json();
            App.daftarPesertaValid = Array.isArray(data) ? data : [];
        } else {
            App.daftarPesertaValid = [];
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

export async function cekVerifikasiPeserta() {
    const kodeInput = document.getElementById("kode-ujian-input").value.trim().toUpperCase();
    const inputNamaRaw = document.getElementById("nama").value.trim();
    const inputNama = inputNamaRaw.toUpperCase();
    document.getElementById("nama").value = inputNama;

    const errorElement = document.getElementById("pesan-error-login");
    const btnLanjut = document.getElementById("btn-lanjut-info");
    const btnCek = document.getElementById("btn-cek-verifikasi");

    if (!inputNama || !kodeInput) {
        errorElement.className = "text-danger mt-2 alert alert-danger";
        errorElement.innerHTML = "Silakan masukkan Nama dan Kode Kegiatan!";
        return;
    }

    if (btnCek) btnCek.disabled = true;
    errorElement.className = "text-info mt-2 alert alert-info";
    errorElement.innerHTML = "Memeriksa database...";

    try {
        await loadDaftarPeserta();
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
            errorElement.innerHTML = `VERIFIKASI GAGAL! Hubungi Admin.`;
        }
    } catch (err) {
        errorElement.className = "text-danger mt-2 alert alert-danger";
        errorElement.innerHTML = err.message;
    } finally {
        if (btnCek) btnCek.disabled = false;
    }
}
