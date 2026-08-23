// exam.js versi 1.3 Logika Merender Soal
import { App } from './state.js';

export function renderNumberGrid() {
    const grid = document.getElementById("number-grid");
    if (!grid) return;
    grid.innerHTML = "";

    App.questionsData.forEach((_, idx) => {
        const circle = document.createElement("div");
        circle.id = `circle-num-${idx}`;
        circle.className = "circle-btn unanswered";
        circle.textContent = idx + 1;
        circle.onclick = () => {
            App.currentIndex = idx;
            loadQuestion(App.currentIndex);
        };
        grid.appendChild(circle);
    });
}

export function loadQuestion(index) {
    const q = App.questionsData[index];
    if (!q) return;

    const displayNo = index + 1; 
    document.getElementById("q-num").textContent = displayNo;
    document.getElementById("q-text").innerHTML = q.Soal;

    const imgContainer = document.getElementById("q-image-container");
    const gambarVal = (q.Gambar && typeof q.Gambar === "string") ? q.Gambar.trim() : "";
    imgContainer.innerHTML = (gambarVal && gambarVal !== "-" && gambarVal.toLowerCase() !== "none") 
        ? `<img src="${gambarVal}" class="img-soal" alt="Gambar Soal">` 
        : "";

    const optionsBox = document.getElementById("options-box");
    optionsBox.innerHTML = "";

    ["A", "B", "C", "D", "E"].forEach(key => {
        if (q[key] && String(q[key]).trim() !== "") {
            const isSelected = App.userAnswers[displayNo] === key;
            const optionRow = document.createElement("div"); 
            optionRow.className = `option-row ${isSelected ? 'selected' : ''}`;
            optionRow.innerHTML = `
                <input type="radio" name="option_${displayNo}" value="${key}" ${isSelected ? 'checked' : ''} style="pointer-events: none;">
                <span class="opt-key">${key}.</span>
                <span class="opt-val">${q[key]}</span>
            `;
            optionRow.onclick = () => {
                App.userAnswers[displayNo] = key;
                loadQuestion(App.currentIndex);
            };
            optionsBox.appendChild(optionRow);
        }
    });

    if (window.MathJax && window.MathJax.typesetPromise) {
        MathJax.typesetPromise([document.getElementById("q-text"), document.getElementById("options-box")])
            .catch(err => console.error(err));
    }

    const btnPrev = document.getElementById("btn-prev");
    const btnNext = document.getElementById("btn-next");
    if (btnPrev) btnPrev.disabled = (index === 0);
    if (btnNext) btnNext.disabled = (index === App.questionsData.length - 1);

    updateGridStatus();
}

function updateGridStatus() {
    App.questionsData.forEach((_, idx) => {
        const circle = document.getElementById(`circle-num-${idx}`);
        if (!circle) return;
        circle.className = `circle-btn ${App.userAnswers[idx + 1] ? 'answered' : 'unanswered'} ${idx === App.currentIndex ? 'active' : ''}`;
    });
}

export function navigasi(direction) {
    const newIndex = App.currentIndex + direction;
    if (newIndex >= 0 && newIndex < App.questionsData.length) {
        App.currentIndex = newIndex;
        loadQuestion(App.currentIndex);
    }
}
