const container = document.getElementById('game-container');
const checkButton = document.getElementById('check-sudoku');
const resetButton = document.getElementById('reset-sudoku');


function createEmptyBoard() {
    return Array.from({ length: 9 }, () => Array(9).fill(0));
}


function isValid(board, row, col, num) {
    for (let i = 0; i < 9; i++) {
        if (board[row][i] === num || board[i][col] === num) return false;
        const boxRow = 3 * Math.floor(row / 3) + Math.floor(i / 3);
        const boxCol = 3 * Math.floor(col / 3) + i % 3;
        if (board[boxRow][boxCol] === num) return false;
    }
    return true;
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


function removeNumbers(board, clues = 30) {
    let attempts = 81 - clues;
    while (attempts > 0) {
        const row = Math.floor(Math.random() * 9);
        const col = Math.floor(Math.random() * 9);
        if (board[row][col] !== 0) {
            board[row][col] = 0;
            attempts--;
        }
    }
    return board;
}

// random
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


function generateRandomSudoku() {
    const board = createEmptyBoard();
    fillBoard(board);
    return removeNumbers(board, 30); 
}


function createBoard(sudokuPuzzle) {
    container.innerHTML = ''; 

    sudokuPuzzle.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            const cellElement = document.createElement('div');
            cellElement.classList.add('cell');
            
            if (cell !== 0) {
              
                cellElement.textContent = cell;
            } else {
          
                const input = document.createElement('input');
                input.type = 'number';
                input.min = '1';
                input.max = '9';
                input.addEventListener('input', () => {
                    if (input.value < 1 || input.value > 9) input.value = '';
                });
                cellElement.appendChild(input);
            }

            container.appendChild(cellElement);
        });
    });
}


function checkSudoku() {
    const cells = document.querySelectorAll('.cell');
    const grid = [];

    cells.forEach((cell, index) => {
        const row = Math.floor(index / 9);
        const col = index % 9;
        if (!grid[row]) grid[row] = [];
        const input = cell.querySelector('input');
        const value = input ? parseInt(input.value) : parseInt(cell.textContent);
        grid[row][col] = value || 0;
    });

    let isValid = true;

    function checkGroup(numbers) {
        const seen = new Set();
        for (let num of numbers) {
            if (num !== 0) {
                if (seen.has(num)) return false;
                seen.add(num);
            }
        }
        return true;
    }

    for (let i = 0; i < 9; i++) {
        const row = grid[i];
        const col = grid.map(row => row[i]);
        if (!checkGroup(row) || !checkGroup(col)) isValid = false;
    }

    for (let i = 0; i < 9; i += 3) {
        for (let j = 0; j < 9; j += 3) {
            const subGrid = [];
            for (let x = 0; x < 3; x++) {
                for (let y = 0; y < 3; y++) {
                    subGrid.push(grid[i + x][j + y]);
                }
            }
            if (!checkGroup(subGrid)) isValid = false;
        }
    }

    if (isValid) {
        alert('Congratulations! The Sudoku is correct!');
    } else {
        alert('There are mistakes in your Sudoku.');
    }
}


function resetSudoku() {
    const newPuzzle = generateRandomSudoku();
    createBoard(newPuzzle);
}

checkButton.addEventListener('click', checkSudoku);
resetButton.addEventListener('click', resetSudoku);


resetSudoku();
