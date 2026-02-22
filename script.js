class Calculator {
    constructor(previousOperandTextElement, currentOperandTextElement) {
        this.previousOperandTextElement = previousOperandTextElement;
        this.currentOperandTextElement = currentOperandTextElement;
        this.history = JSON.parse(localStorage.getItem('calcHistory')) || [];
        this.clear();
        this.updateHistoryUI();
    }
    clear() {
        this.currentOperand = '0';
        this.previousOperand = '';
        this.operation = undefined;
        this.shouldResetScreen = false;
    }
    delete() {
        if (this.currentOperand === '0') return;
        this.currentOperand = this.currentOperand.length === 1 ? '0' : this.currentOperand.toString().slice(0, -1);
    }
    appendNumber(number) {
        if (number === '.' && this.currentOperand.includes('.')) return;
        if (this.currentOperand === '0' && number !== '.') {
            this.currentOperand = number.toString();
        } else if (this.shouldResetScreen) {
            this.currentOperand = number.toString();
            this.shouldResetScreen = false;
        } else {
            this.currentOperand = this.currentOperand.toString() + number.toString();
        }
    }
    chooseOperation(operation) {
        if (this.currentOperand === '') return;
        if (this.previousOperand !== '') this.compute();
        this.operation = operation;
        this.previousOperand = this.currentOperand;
        this.currentOperand = '';
    }
    compute() {
        let computation;
        const prev = parseFloat(this.previousOperand);
        const current = parseFloat(this.currentOperand);
        if (isNaN(prev) || isNaN(current)) return;
        switch (this.operation) {
            case '+': computation = prev + current; break;
            case '-': computation = prev - current; break;
            case '*': computation = prev * current; break;
            case '/':
                if (current === 0) { alert("Cannot divide by zero"); this.clear(); return; }
                computation = prev / current; break;
            case '%': computation = prev % current; break;
            case '^': computation = Math.pow(prev, current); break;
            default: return;
        }
        this.addToHistory({
            expression: `${this.previousOperand} ${this.getDisplayOperator(this.operation)} ${this.currentOperand}`,
            result: computation
        });
        this.currentOperand = computation.toString();
        this.operation = undefined;
        this.previousOperand = '';
        this.shouldResetScreen = true;
    }
    computeScientific(func) {
        let computation;
        const current = parseFloat(this.currentOperand);
        if (isNaN(current)) return;
        switch (func) {
            case 'sin': computation = Math.sin(current * Math.PI / 180); break;
            case 'cos': computation = Math.cos(current * Math.PI / 180); break;
            case 'tan': computation = Math.tan(current * Math.PI / 180); break;
            case 'log': computation = Math.log10(current); break;
            case 'sqrt': computation = Math.sqrt(current); break;
            case 'pi': this.currentOperand = Math.PI.toString(); this.shouldResetScreen = false; return;
            case 'e': this.currentOperand = Math.E.toString(); this.shouldResetScreen = false; return;
            case 'pow': this.chooseOperation('^'); return;
            default: return;
        }
        this.addToHistory({ expression: `${func}(${current})`, result: computation });
        this.currentOperand = computation.toString();
        this.shouldResetScreen = true;
    }
    getDisplayOperator(op) {
        const ops = { '*': '×', '/': '÷', '^': '^' };
        return ops[op] || op;
    }
    getDisplayNumber(number) {
        const stringNumber = number.toString();
        const integerDigits = parseFloat(stringNumber.split('.')[0]);
        const decimalDigits = stringNumber.split('.')[1];
        let integerDisplay = isNaN(integerDigits) ? '' : integerDigits.toLocaleString('en', { maximumFractionDigits: 0 });
        return decimalDigits != null ? `${integerDisplay}.${decimalDigits}` : integerDisplay;
    }
    updateDisplay() {
        this.currentOperandTextElement.innerText = this.getDisplayNumber(this.currentOperand);
        this.previousOperandTextElement.innerText = this.operation != null ?
            `${this.getDisplayNumber(this.previousOperand)} ${this.getDisplayOperator(this.operation)}` : '';
    }
    addToHistory(calculation) {
        this.history.unshift(calculation);
        if (this.history.length > 20) this.history.pop();
        localStorage.setItem('calcHistory', JSON.stringify(this.history));
        this.updateHistoryUI();
    }
    updateHistoryUI() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;
        if (this.history.length === 0) {
            historyList.innerHTML = '<div class="empty-msg">No calculations yet</div>';
            return;
        }
        historyList.innerHTML = this.history.map(item => `
            <div class="history-item" onclick="useHistoryValue('${item.result}')">
                <div class="exp">${item.expression} =</div>
                <div class="res">${this.getDisplayNumber(item.result)}</div>
            </div>
        `).join('');
    }
    clearHistory() {
        this.history = [];
        localStorage.removeItem('calcHistory');
        this.updateHistoryUI();
    }
}

class SoundEngine {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = false;
    }
    play(type) {
        if (!this.enabled) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain); gain.connect(this.ctx.destination);
        if (type === 'click') {
            osc.frequency.setValueAtTime(800, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
            osc.start(); osc.stop(this.ctx.currentTime + 0.1);
        } else if (type === 'success') {
            osc.type = 'triangle'; osc.frequency.setValueAtTime(400, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1000, this.ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
            osc.start(); osc.stop(this.ctx.currentTime + 0.2);
        }
    }
}

class DigitalMatrix {
    constructor() {
        this.canvas = document.getElementById('particle-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.fontSize = 16;
        this.columns = 0;
        this.drops = [];
        this.chars = '0123456789+-*/=√πe%'.split('');
        this.sparks = [];
        this.accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#39ff14';
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.animate();
        window.addEventListener('click', (e) => this.explode(e.clientX, e.clientY));
    }
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.columns = Math.floor(this.canvas.width / this.fontSize);
        this.drops = Array(this.columns).fill(1).map(() => Math.random() * -100);
    }
    explode(x, y) {
        for (let i = 0; i < 20; i++) {
            this.sparks.push({
                x, y, char: this.chars[Math.floor(Math.random() * this.chars.length)],
                vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15, life: 1
            });
        }
    }
    animate() {
        this.ctx.fillStyle = 'rgba(5, 8, 10, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.font = this.fontSize + 'px monospace';
        for (let i = 0; i < this.drops.length; i++) {
            const char = this.chars[Math.floor(Math.random() * this.chars.length)];
            this.ctx.fillStyle = Math.random() > 0.95 ? '#ffffff' : this.accentColor;
            this.ctx.globalAlpha = 0.4;
            this.ctx.fillText(char, i * this.fontSize, this.drops[i] * this.fontSize);
            if (this.drops[i] * this.fontSize > this.canvas.height && Math.random() > 0.975) this.drops[i] = 0;
            this.drops[i]++;
        }
        this.sparks = this.sparks.filter(s => {
            s.x += s.vx; s.y += s.vy; s.life -= 0.02;
            if (s.life <= 0) return false;
            this.ctx.fillStyle = '#ffffff'; this.ctx.globalAlpha = s.life;
            this.ctx.fillText(s.char, s.x, s.y); return true;
        });
        this.ctx.globalAlpha = 1;
        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const soundEngine = new SoundEngine();
    window.matrixInstance = new DigitalMatrix();
    const container = document.querySelector('.calculator-container');
    const displaySection = document.querySelector('.display-section');

    document.addEventListener('mousemove', (e) => {
        const xAxis = (window.innerWidth / 2 - e.pageX) / 50;
        const yAxis = (window.innerHeight / 2 - e.pageY) / 50;
        if (container) { container.style.transition = 'none'; container.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`; }
    });
    document.addEventListener('mouseleave', () => {
        if (container) { container.style.transition = 'transform 0.5s ease-out'; container.style.transform = `rotateY(0deg) rotateX(0deg)`; }
    });

    function triggerFlash() {
        if (!displaySection) return;
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-color');
        displaySection.style.backgroundColor = accent.replace(')', ', 0.15)').replace('rgb', 'rgba');
        setTimeout(() => { displaySection.style.backgroundColor = 'rgba(0, 0, 0, 0.3)'; }, 100);
    }

    setInterval(() => {
        const now = new Date();
        const d = document.getElementById('hud-date'), t = document.getElementById('hud-temp'), f = document.getElementById('hud-freq');
        if (d) d.innerText = now.toLocaleDateString();
        if (t) t.innerText = (30 + Math.random() * 5).toFixed(1) + '°C';
        if (f) f.innerText = (4.0 + Math.random() * 0.5).toFixed(2) + ' GHz';
    }, 1000);

    const prevEl = document.getElementById('previous-operand'), currEl = document.getElementById('current-operand');
    const calculator = new Calculator(prevEl, currEl);
    const modeToggle = document.getElementById('mode-toggle'), copyBtn = document.getElementById('copy-btn'), soundToggle = document.getElementById('sound-toggle');
    const themeToggle = document.getElementById('theme-toggle'), historyToggle = document.getElementById('history-toggle'), clearHistoryBtn = document.getElementById('clear-history');
    const sciRows = document.querySelectorAll('.sci-row'), converterPanel = document.getElementById('converter-panel'), historyPanel = document.getElementById('history-panel');

    // Unit Converter
    const unitType = document.getElementById('unit-type'), unitFrom = document.getElementById('unit-from'), unitTo = document.getElementById('unit-to');
    const unitFromType = document.getElementById('unit-from-type'), unitToType = document.getElementById('unit-to-type');
    const units = { length: { m: 1, km: 1000, ft: 0.3048, mile: 1609.34 }, weight: { kg: 1, g: 0.001, lb: 0.453592, oz: 0.0283495 }, temp: 'special' };

    function updateUnits() {
        const type = unitType.value;
        const opts = Object.keys(units[type === 'temp' ? 'weight' : type]);
        const html = (type === 'temp' ? ['Celsius', 'Fahrenheit', 'Kelvin'] : opts).map(u => `<option value="${u}">${u}</option>`).join('');
        unitFromType.innerHTML = html; unitToType.innerHTML = html;
    }
    function convert() {
        const val = parseFloat(unitFrom.value); if (isNaN(val)) return;
        const type = unitType.value, from = unitFromType.value, to = unitToType.value;
        if (type === 'temp') {
            let c = (from === 'Celsius') ? val : (from === 'Fahrenheit' ? (val - 32) * 5 / 9 : val - 273.15);
            unitTo.value = (to === 'Celsius' ? c : (to === 'Fahrenheit' ? c * 9 / 5 + 32 : c + 273.15)).toFixed(4);
        } else {
            unitTo.value = (val * (units[type][from] / units[type][to])).toFixed(4);
        }
    }
    if (unitType) {
        unitType.addEventListener('change', updateUnits); unitFrom.addEventListener('input', convert);
        unitFromType.addEventListener('change', convert); unitToType.addEventListener('change', convert); updateUnits();
    }

    modeToggle.addEventListener('click', () => {
        soundEngine.play('click');
        const isSci = Array.from(sciRows).some(r => r.classList.contains('active'));
        if (!isSci) { sciRows.forEach(r => r.classList.add('active')); converterPanel.classList.remove('active'); }
        else if (!converterPanel.classList.contains('active')) { sciRows.forEach(r => r.classList.remove('active')); converterPanel.classList.add('active'); }
        else { converterPanel.classList.remove('active'); }
        modeToggle.style.color = (isSci || converterPanel.classList.contains('active')) ? 'var(--accent-color)' : 'var(--text-primary)';
    });
    soundToggle.addEventListener('click', () => {
        soundEngine.enabled = !soundEngine.enabled;
        soundToggle.style.color = soundEngine.enabled ? 'var(--accent-color)' : 'var(--text-primary)';
        if (soundEngine.enabled) soundEngine.play('success');
    });
    copyBtn.addEventListener('click', () => {
        soundEngine.play('click');
        navigator.clipboard.writeText(currEl.innerText).then(() => {
            copyBtn.style.color = 'var(--accent-color)';
            setTimeout(() => copyBtn.style.color = 'var(--text-primary)', 1000);
            const u = new SpeechSynthesisUtterance("Result copied: " + currEl.innerText);
            u.rate = 1.2; speechSynthesis.speak(u);
        });
    });
    document.querySelectorAll('[data-value]').forEach(b => b.addEventListener('click', () => {
        soundEngine.play('click'); triggerFlash(); calculator.appendNumber(b.getAttribute('data-value')); calculator.updateDisplay();
    }));
    document.querySelectorAll('[data-operator]').forEach(b => b.addEventListener('click', () => {
        soundEngine.play('click'); triggerFlash(); calculator.chooseOperation(b.getAttribute('data-operator')); calculator.updateDisplay();
    }));
    document.querySelectorAll('[data-func]').forEach(b => b.addEventListener('click', () => {
        soundEngine.play('click'); triggerFlash(); calculator.computeScientific(b.getAttribute('data-func')); calculator.updateDisplay();
    }));
    document.querySelector('[data-action="calculate"]').addEventListener('click', () => {
        soundEngine.play('success'); triggerFlash(); calculator.compute(); calculator.updateDisplay();
    });
    document.querySelector('[data-action="clear-all"]').addEventListener('click', () => {
        soundEngine.play('click'); triggerFlash(); calculator.clear(); calculator.updateDisplay();
    });
    document.querySelector('[data-action="delete"]').addEventListener('click', () => {
        soundEngine.play('click'); triggerFlash(); calculator.delete(); calculator.updateDisplay();
    });
    themeToggle.addEventListener('click', () => {
        soundEngine.play('click');
        document.body.setAttribute('data-theme', document.body.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
    });
    historyToggle.addEventListener('click', () => { soundEngine.play('click'); historyPanel.classList.toggle('active'); });
    const closeHistoryBtn = document.getElementById('close-history');
    if (closeHistoryBtn) closeHistoryBtn.addEventListener('click', () => { soundEngine.play('click'); historyPanel.classList.remove('active'); });
    clearHistoryBtn.addEventListener('click', () => { soundEngine.play('click'); calculator.clearHistory(); });
    window.useHistoryValue = (v) => { soundEngine.play('click'); calculator.currentOperand = v.toString(); calculator.updateDisplay(); };

    document.addEventListener('keydown', (e) => {
        if ((e.key >= '0' && e.key <= '9') || e.key === '.') calculator.appendNumber(e.key);
        else if ('+-*/%'.includes(e.key)) calculator.chooseOperation(e.key);
        else if (e.key === 'Enter' || e.key === '=') calculator.compute();
        else if (e.key === 'Backspace') calculator.delete();
        else if (e.key === 'Escape') calculator.clear();
        calculator.updateDisplay();
    });

    // Color Picker Logic
    const colorOpts = document.querySelectorAll('.color-opt'), customColorInput = document.getElementById('custom-color-input');
    function updateThemeColor(color) {
        document.documentElement.style.setProperty('--accent-color', color);
        document.documentElement.style.setProperty('--accent-glow', `${color}66`);
        document.documentElement.style.setProperty('--grad-1', color);
        document.documentElement.style.setProperty('--btn-bg', `${color}1a`);
        document.documentElement.style.setProperty('--btn-hover', `${color}33`);
        if (window.matrixInstance) window.matrixInstance.accentColor = color;
    }
    colorOpts.forEach(opt => opt.addEventListener('click', () => { updateThemeColor(opt.getAttribute('data-color')); soundEngine.play('success'); }));
    if (customColorInput) customColorInput.addEventListener('input', (e) => updateThemeColor(e.target.value));
});
