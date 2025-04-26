// Variables globales
const container = document.getElementById('game-container');
const checkButton = document.getElementById('check-sudoku');
const resetButton = document.getElementById('reset-sudoku');
const hintButton = document.getElementById('hint-button');
const messageElement = document.getElementById('message');
const timeElement = document.getElementById('time');
const difficultyElement = document.getElementById('difficulty-level');
const difficultyButtons = document.querySelectorAll('.difficulty-btn');
const settingsButton = document.getElementById('settings-button');
const closeSettingsButton = document.getElementById('close-settings');
const settingsPanel = document.getElementById('settings-panel');
const settingsOverlay = document.getElementById('settings-overlay');
const confettiToggle = document.getElementById('confetti-toggle');
const soundToggle = document.getElementById('sound-toggle');
const volumeSlider = document.getElementById('volume-slider');
const themeSelector = document.getElementById('theme-selector');

// État du jeu
let currentBoard = [];
let solvedBoard = [];
let timerInterval;
let seconds = 0;
let currentDifficulty = 'medium'; // Par défaut : moyen
let difficultyClues = {
    'easy': 45,
    'medium': 35,
    'hard': 25
};
let hintCount = 0; // Compteur d'indices utilisés
const MAX_HINTS = 3; // Nombre maximum d'indices autorisés

// Options du jeu
let confettiEnabled = true; // Animation de victoire
let soundEnabled = true; // Effets sonores
let soundVolume = 0.5; // Volume par défaut à 50%
let currentTheme = 'default'; // Thème par défaut

// Fonctions utilitaires pour le jeu Sudoku
function createEmptyBoard() {
    return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function isValid(board, row, col, num) {
    // Vérifier ligne et colonne
    for (let i = 0; i < 9; i++) {
        if (board[row][i] === num || board[i][col] === num) return false;
    }
    
    // Vérifier la région 3x3
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[boxRow + i][boxCol + j] === num) return false;
        }
    }
    
    return true;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function fillBoard(board) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] === 0) {
                const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                for (let num of numbers) {
                    if (isValid(board, row, col, num)) {
                        board[row][col] = num;
                        if (fillBoard(board)) return true;
                        board[row][col] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function removeNumbers(board, clues) {
    // Créer une copie profonde du tableau pour conserver la solution
    const solution = JSON.parse(JSON.stringify(board));
    
    let attempts = 81 - clues;
    const positions = shuffle(Array.from({ length: 81 }, (_, i) => i));
    
    for (let i = 0; i < attempts; i++) {
        const pos = positions[i];
        const row = Math.floor(pos / 9);
        const col = pos % 9;
        board[row][col] = 0;
    }
    
    return { puzzle: board, solution: solution };
}

function generateRandomSudoku(difficultyLevel = currentDifficulty) {
    const clues = difficultyClues[difficultyLevel];
    const board = createEmptyBoard();
    fillBoard(board);
    const { puzzle, solution } = removeNumbers(board, clues);
    
    currentBoard = JSON.parse(JSON.stringify(puzzle));
    solvedBoard = solution;
    
    return puzzle;
}

// Interface utilisateur
function createBoard(sudokuPuzzle) {
    container.innerHTML = '';
    
    sudokuPuzzle.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            const cellElement = document.createElement('div');
            cellElement.classList.add('cell');
            cellElement.dataset.row = rowIndex;
            cellElement.dataset.col = colIndex;
            
            if (cell !== 0) {
                cellElement.textContent = cell;
                cellElement.classList.add('fixed');
            } else {
                const input = document.createElement('input');
                input.type = 'number';
                input.min = '1';
                input.max = '9';
                
                input.addEventListener('input', (e) => {
                    handleCellInput(e, rowIndex, colIndex);
                });
                input.addEventListener('focus', () => {
                    highlightRelatedCells(rowIndex, colIndex);
                });
                input.addEventListener('blur', () => {
                    removeHighlights();
                });
                
                cellElement.appendChild(input);
            }
            
            container.appendChild(cellElement);
        });
    });
    
    // Réinitialiser le compteur d'indices
    hintCount = 0;
    updateHintButton();
}

function handleCellInput(e, row, col) {
    const value = e.target.value;
    
    // Limiter à un seul chiffre
    if (value.length > 1) {
        e.target.value = value.slice(0, 1);
    }
    
    // Vérifier si la valeur est valide (1-9)
    if (value < 1 || value > 9) {
        e.target.value = '';
    } else {
        // Vérification en temps réel
        const inputValue = parseInt(value);
        const cell = e.target.parentElement;
        
        if (solvedBoard[row][col] === inputValue) {
            playSound('correct');
            cell.classList.add('success');
            cell.classList.remove('error');
            
            // Vérifier si le jeu est terminé
            if (checkBoardCompletion()) {
                gameComplete();
            }
        } else {
            playSound('error');
            cell.classList.add('error');
            cell.classList.remove('success');
        }
    }
}

function highlightRelatedCells(row, col) {
    // Supprimer les mises en surbrillance existantes
    removeHighlights();
    
    // Mettre en surbrillance la rangée, la colonne et la région
    const cells = document.querySelectorAll('.cell');
    
    cells.forEach((cell, index) => {
        const cellRow = parseInt(cell.dataset.row);
        const cellCol = parseInt(cell.dataset.col);
        
        // Même rangée ou colonne
        if (cellRow === row || cellCol === col) {
            cell.classList.add('highlight');
        }
        
        // Même région 3x3
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        
        if (cellRow >= boxRow && cellRow < boxRow + 3 && 
            cellCol >= boxCol && cellCol < boxCol + 3) {
            cell.classList.add('highlight');
        }
    });
}

function removeHighlights() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.classList.remove('highlight');
    });
}

// Vérification
function checkBoardCompletion() {
    const inputs = document.querySelectorAll('.cell input');
    
    for (let input of inputs) {
        if (!input.value) return false;
        
        const row = parseInt(input.parentElement.dataset.row);
        const col = parseInt(input.parentElement.dataset.col);
        
        if (parseInt(input.value) !== solvedBoard[row][col]) {
            return false;
        }
    }
    
    return true;
}

function checkSudoku() {
    const cells = document.querySelectorAll('.cell');
    let errorCount = 0;
    
    cells.forEach(cell => {
        const input = cell.querySelector('input');
        if (input) {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const value = input.value ? parseInt(input.value) : 0;
            
            if (value === 0) {
                // Case vide
                cell.classList.remove('error', 'success');
            } else if (value === solvedBoard[row][col]) {
                // Valeur correcte
                cell.classList.add('success');
                cell.classList.remove('error');
            } else {
                // Valeur incorrecte
                cell.classList.add('error');
                cell.classList.remove('success');
                errorCount++;
            }
        }
    });
    
    if (errorCount > 0) {
        showMessage(`${errorCount} erreur(s) trouvée(s). Essayez encore !`, 'error');
        playSound('error');
    } else if (checkBoardCompletion()) {
        gameComplete();
    } else {
        showMessage('Tout est correct jusqu\'à présent. Continuez !', 'success');
        playSound('correct');
    }
}

function gameComplete() {
    clearInterval(timerInterval);
    
    // Effet visuel élaboré pour la victoire
    const cells = document.querySelectorAll('.cell');
    
    // Animation séquentielle des cellules
    cells.forEach((cell, index) => {
        setTimeout(() => {
            cell.classList.add('completed');
            
            // Effet de pulsation
            cell.style.animation = 'success-pulse 0.5s ease';
            
            // Rotation 3D pour un effet spécial
            if (index % 2 === 0) {
                cell.style.transform = 'rotateY(360deg)';
            } else {
                cell.style.transform = 'rotateX(360deg)';
            }
            
            cell.style.transition = 'transform 0.8s ease';
            
            // Réinitialiser après l'animation
            setTimeout(() => {
                cell.style.transform = '';
            }, 800);
        }, index * 30);
    });
    
    // Message avec animation
    setTimeout(() => {
        showMessage('Félicitations ! Vous avez terminé le Sudoku !', 'success');
        
        // Lancer l'effet de confettis
        launchConfetti();
        
        // Jouer le son de victoire
        playSound('complete');
        
        // Afficher le temps final
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const timeString = `${padZero(minutes)}:${padZero(remainingSeconds)}`;
        
        setTimeout(() => {
            showMessage(`Temps final : ${timeString} - Difficulté : ${difficultyElement.textContent}`, 'success');
        }, 3000);
    }, cells.length * 30 + 500);
}

function showMessage(text, type = 'info') {
    messageElement.textContent = text;
    messageElement.className = 'message';
    messageElement.classList.add(type);
    
    // Réinitialiser le message après un délai
    setTimeout(() => {
        messageElement.style.opacity = '0';
    }, 5000);
}

// Chronomètre
function startTimer() {
    clearInterval(timerInterval);
    seconds = 0;
    updateTimer();
    
    timerInterval = setInterval(() => {
        seconds++;
        updateTimer();
    }, 1000);
}

function updateTimer() {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    timeElement.textContent = `${padZero(minutes)}:${padZero(remainingSeconds)}`;
}

function padZero(num) {
    return num.toString().padStart(2, '0');
}

// Fonctionnalité d'indice améliorée
function giveHint() {
    // Limiter le nombre d'indices
    if (hintCount >= MAX_HINTS) {
        showMessage(`Vous avez utilisé tous vos indices (${MAX_HINTS})`, 'error');
        return;
    }
    
    const emptyCells = [];
    
    // Trouver toutes les cellules vides ou incorrectes
    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell) => {
        const input = cell.querySelector('input');
        if (input && !input.disabled) {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const currentValue = input.value ? parseInt(input.value) : 0;
            const correctValue = solvedBoard[row][col];
            
            if (currentValue !== correctValue) {
                emptyCells.push({ cell, row, col, correctValue });
            }
        }
    });
    
    if (emptyCells.length > 0) {
        // Sélectionner une cellule aléatoire pour donner un indice
        const randomIndex = Math.floor(Math.random() * emptyCells.length);
        const { cell, row, col, correctValue } = emptyCells[randomIndex];
        
        const input = cell.querySelector('input');
        
        // Animation avant de révéler l'indice
        cell.classList.add('hint-animation');
        
        setTimeout(() => {
            input.value = correctValue;
            input.disabled = true;
            
            cell.classList.remove('hint-animation');
            cell.classList.add('hint-revealed');
            cell.classList.add('success');
            cell.classList.remove('error');
            
            // Effet d'onde qui se propage aux cellules liées
            const relatedCells = document.querySelectorAll(`.cell[data-row="${row}"], .cell[data-col="${col}"]`);
            relatedCells.forEach((relCell, index) => {
                setTimeout(() => {
                    relCell.classList.add('hint-wave');
                    setTimeout(() => {
                        relCell.classList.remove('hint-wave');
                    }, 500);
                }, index * 50);
            });
            
            // Incrémenter le compteur d'indices
            hintCount++;
            updateHintButton();
            
            playSound('hint');
            showMessage(`Indice révélé ! (${hintCount}/${MAX_HINTS})`, 'success');
            
            // Vérifier si le jeu est terminé après l'indice
            if (checkBoardCompletion()) {
                gameComplete();
            }
        }, 800);
    } else {
        showMessage('Tout est déjà correct !', 'success');
    }
}

function updateHintButton() {
    hintButton.innerHTML = `<i class="fas fa-lightbulb"></i> Indice (${hintCount}/${MAX_HINTS})`;
    
    if (hintCount >= MAX_HINTS) {
        hintButton.style.opacity = '0.6';
        hintButton.style.cursor = 'not-allowed';
    } else {
        hintButton.style.opacity = '1';
        hintButton.style.cursor = 'pointer';
    }
}

// Effets visuels pour la victoire
function launchConfetti() {
    if (!confettiEnabled) return;
    
    const confettiCount = 200;
    const container = document.querySelector('.container');
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        
        // Varier les couleurs
        const colors = ['#5f6caf', '#845ec2', '#ff6f91', '#00c2a8', '#ffc75f'];
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Varier la taille
        const size = Math.random() * 10 + 5;
        confetti.style.width = `${size}px`;
        confetti.style.height = `${size}px`;
        
        // Position de départ
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.top = '-20px';
        
        // Animation
        confetti.style.animationDuration = `${Math.random() * 3 + 2}s`;
        confetti.style.animationDelay = `${Math.random() * 2}s`;
        
        container.appendChild(confetti);
        
        // Supprimer après l'animation
        setTimeout(() => {
            confetti.remove();
        }, 5000);
    }
}

// Effets sonores améliorés
function playSound(type) {
    if (!soundEnabled) return;
    
    // Créer des sons différents selon l'action
    let frequency;
    let duration;
    let volume = 0.1;
    let waveType;
    
    switch (type) {
        case 'correct':
            frequency = [523.25, 783.99]; // Do et Sol
            duration = 150;
            waveType = 'sine';
            break;
        case 'error':
            frequency = [220, 196]; // La et Sol bas
            duration = 300;
            waveType = 'triangle';
            break;
        case 'hint':
            frequency = [659.25, 783.99]; // Mi et Sol
            duration = 250;
            waveType = 'sine';
            break;
        case 'complete':
            frequency = [523.25, 659.25, 783.99, 1046.50]; // Accord de do majeur
            duration = 600;
            waveType = 'sine';
            volume = 0.15;
            break;
        default:
            frequency = 440;
            duration = 200;
            waveType = 'sine';
    }
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        if (Array.isArray(frequency)) {
            // Jouer un accord (plusieurs notes)
            frequency.forEach((freq, index) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.type = waveType;
                oscillator.frequency.value = freq;
                
                // Appliquer le volume défini par l'utilisateur
                gainNode.gain.value = volume * soundVolume;
                
                // Ajouter un peu de réverbération pour un son plus agréable
                if (audioContext.createConvolver) {
                    const convolver = audioContext.createConvolver();
                    const attack = 0.01;
                    const decay = type === 'complete' ? 1.5 : 0.5;
                    
                    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + attack);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + attack + decay);
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                } else {
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                }
                
                oscillator.start();
                
                setTimeout(() => {
                    oscillator.stop();
                }, duration + (index * 100));
            });
        } else {
            // Jouer une seule note
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.type = waveType;
            oscillator.frequency.value = frequency;
            
            // Appliquer le volume défini par l'utilisateur
            gainNode.gain.value = volume * soundVolume;
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.start();
            
            setTimeout(() => {
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
                setTimeout(() => oscillator.stop(), 100);
            }, duration);
        }
    } catch (e) {
        console.log('WebAudio not supported');
    }
}

// Mise à jour du CSS dynamique
function updateDynamicStyles() {
    // Vérifier si l'élément de style existe déjà
    let styleElement = document.getElementById('dynamic-styles');
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'dynamic-styles';
        document.head.appendChild(styleElement);
    }
    
    const styles = `
        .ripple {
            position: absolute;
            border-radius: 50%;
            background-color: rgba(255, 255, 255, 0.7);
            width: 100%;
            height: 100%;
            transform: scale(0);
            animation: ripple-effect 0.8s ease-out;
            pointer-events: none;
        }
        
        .hint-animation {
            animation: hint-pulse 0.8s ease-in-out infinite alternate;
        }
        
        .hint-revealed {
            animation: reveal 0.5s ease forwards;
        }
        
        .hint-wave {
            animation: wave-pulse 0.5s ease-out;
        }
        
        .completed {
            box-shadow: inset 0 0 10px rgba(0, 194, 168, 0.5);
        }
        
        .confetti {
            position: absolute;
            z-index: 100;
            border-radius: 50%;
            animation: confetti-fall linear forwards;
        }
        
        @keyframes ripple-effect {
            0% { transform: scale(0); opacity: 1; }
            100% { transform: scale(2.5); opacity: 0; }
        }
        
        @keyframes hint-pulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(132, 94, 194, 0.5); }
            100% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(132, 94, 194, 0); }
        }
        
        @keyframes reveal {
            0% { transform: rotateY(0deg); }
            100% { transform: rotateY(360deg); }
        }
        
        @keyframes wave-pulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(132, 94, 194, 0.5); }
            50% { transform: scale(1.05); box-shadow: 0 0 5px 2px rgba(132, 94, 194, 0.3); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(132, 94, 194, 0); }
        }
        
        @keyframes confetti-fall {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
    `;
    
    styleElement.textContent = styles;
}

// Le problème principal de l'application semble être lié à l'ordre d'initialisation
// Assurons-nous que le panneau de paramètres est correctement configuré

// Fonction d'initialisation améliorée
function init() {
    console.log("Initialisation du jeu Sudoku");
    
    // Appliquer les styles dynamiques
    updateDynamicStyles();
    
    // Initialiser les paramètres
    setupSettingsPanel();
    
    // Configurer les boutons de difficulté
    setupDifficultyButtons();
    
    // Ajouter les écouteurs d'événements pour les boutons principaux
    if (checkButton) {
        checkButton.addEventListener('click', checkSudoku);
    }
    
    if (resetButton) {
        resetButton.addEventListener('click', resetSudoku);
    }
    
    if (hintButton) {
        hintButton.addEventListener('click', giveHint);
    }
    
    // Traduire la difficulté pour l'affichage
    const difficultyText = {
        'easy': 'Facile',
        'medium': 'Moyen',
        'hard': 'Difficile'
    };
    difficultyElement.textContent = difficultyText[currentDifficulty];
    
    // Démarrer un nouveau jeu
    resetSudoku();
}

// Gestion du panneau de paramètres de façon simplifiée
function setupSettingsPanel() {
    const settingsButton = document.getElementById('settings-button');
    const closeSettingsButton = document.getElementById('close-settings');
    const settingsPanel = document.getElementById('settings-panel');
    const overlay = document.getElementById('settings-overlay');
    
    if (!settingsButton || !closeSettingsButton || !settingsPanel || !overlay) {
        console.error("Éléments du panneau de paramètres non trouvés");
        return;
    }
    
    // Ouvrir le panneau
    settingsButton.addEventListener('click', function() {
        settingsPanel.classList.add('active');
        overlay.classList.add('active');
        console.log("Panneau de paramètres ouvert");
    });
    
    // Fermer le panneau
    const closeSettings = function() {
        settingsPanel.classList.remove('active');
        overlay.classList.remove('active');
        console.log("Panneau de paramètres fermé");
    };
    
    closeSettingsButton.addEventListener('click', closeSettings);
    overlay.addEventListener('click', closeSettings);
    
    // Options
    const confettiToggle = document.getElementById('confetti-toggle');
    const soundToggle = document.getElementById('sound-toggle');
    const volumeSlider = document.getElementById('volume-slider');
    const themeSelector = document.getElementById('theme-selector');
    
    if (confettiToggle) {
        confettiToggle.addEventListener('change', function(e) {
            confettiEnabled = e.target.checked;
        });
    }
    
    if (soundToggle) {
        soundToggle.addEventListener('change', function(e) {
            soundEnabled = e.target.checked;
        });
    }
    
    if (volumeSlider) {
        volumeSlider.addEventListener('input', function(e) {
            soundVolume = e.target.value / 100;
        });
    }
    
    if (themeSelector) {
        themeSelector.addEventListener('change', function(e) {
            changeTheme(e.target.value);
        });
    }
}

// Fonction pour configurer les boutons de difficulté correctement
function setupDifficultyButtons() {
    console.log("Configuration des boutons de difficulté");
    
    // Mettre à jour visuellement le bouton actif
    difficultyButtons.forEach(button => {
        // Marquer le bouton correspondant à la difficulté actuelle comme actif
        if (button.dataset.difficulty === currentDifficulty) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
        
        // Ajouter l'écouteur d'événement
        button.addEventListener('click', () => {
            // Mise à jour visuelle
            difficultyButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Mettre à jour la difficulté
            currentDifficulty = button.dataset.difficulty;
            const difficultyText = {
                'easy': 'Facile',
                'medium': 'Moyen',
                'hard': 'Difficile'
            };
            difficultyElement.textContent = difficultyText[currentDifficulty];
            
            // Générer un nouveau jeu avec cette difficulté
            resetSudoku();
            
            console.log(`Difficulté changée à : ${currentDifficulty}`);
        });
    });
}

// Fonction pour réinitialiser le jeu
function resetSudoku() {
    console.log("Réinitialisation du jeu Sudoku");
    
    // S'assurer que les styles dynamiques sont appliqués
    updateDynamicStyles();
    
    // Générer une nouvelle grille
    const newPuzzle = generateRandomSudoku(currentDifficulty);
    createBoard(newPuzzle);
    
    // Réinitialiser le chronomètre
    startTimer();
    
    // Message d'information
    showMessage(`Nouveau jeu en difficulté ${difficultyElement.textContent} !`);
}

// Fonction pour changer le thème
function changeTheme(theme) {
    console.log(`Changement de thème vers : ${theme}`);
    currentTheme = theme;
    const root = document.documentElement;
    
    // Réinitialiser les classes de thème
    document.body.classList.remove('theme-dark', 'theme-colorful');
    
    // Appliquer le nouveau thème
    switch(theme) {
        case 'dark':
            root.style.setProperty('--primary-color', '#6b7cb4');
            root.style.setProperty('--secondary-color', '#9b6dd9');
            root.style.setProperty('--background-gradient-1', '#2d3748');
            root.style.setProperty('--background-gradient-2', '#1a202c');
            root.style.setProperty('--fixed-number-color', '#e2e8f0');
            document.body.classList.add('theme-dark');
            break;
        case 'colorful':
            root.style.setProperty('--primary-color', '#ff6b6b');
            root.style.setProperty('--secondary-color', '#48a9fe');
            root.style.setProperty('--accent-color', '#feca57');
            document.body.classList.add('theme-colorful');
            break;
        default: // Thème classique
            root.style.setProperty('--primary-color', '#5f6caf');
            root.style.setProperty('--secondary-color', '#845ec2');
            root.style.setProperty('--accent-color', '#ff6f91');
    }
}

// S'assurer que l'initialisation se fait après le chargement complet de la page
document.addEventListener('DOMContentLoaded', init);
