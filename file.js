// Three.js setup
let scene, camera, renderer;

// Board setup
const ROWS = 20;
const COLS = 25;
const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

let ground;
let walls = [];

// Define the shapes of the Tetriminos
const TETRIMINOS = {
  I: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
  ],
  T: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
  ],
  S: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
  ],
  Z: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
  ],
  J: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
  ],
  L: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
  ]
};

let currentTetrimino;

// Initialize the scene
init();

// Initialize the scene, camera, and renderer
function init() {
    scene = new THREE.Scene();
    
    // Set up camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(COLS / 2 - 0.5, ROWS / 2, 20);
    camera.lookAt(COLS / 2 - 0.5, ROWS / 2, 0);

    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(COLS, 0.1);
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.set(COLS / 2 - 0.5, 0, 0);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Create walls
    const wallGeometry = new THREE.PlaneGeometry(ROWS, 0.1);
    const wallMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    // Left wall
    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.position.set(0, ROWS / 2, 0);
    leftWall.rotation.z = Math.PI / 2;
    scene.add(leftWall);
    walls.push(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.position.set(COLS - 1, ROWS / 2, 0);
    rightWall.rotation.z = Math.PI / 2;
    scene.add(rightWall);
    walls.push(rightWall);
    
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    // Spawn the initial Tetrimino
    spawnNewTetrimino();
    
    // Start the animation loop
    animate();
}



// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Function to create a Tetrimino mesh
function createTetriminoMesh(shape) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: getRandomColor() });
    const tetrimino = new THREE.Group();
    
    shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const cube = new THREE.Mesh(geometry, material);
                cube.position.set(x, -y, 0);
                //console.log(x, -y, 0)
                tetrimino.add(cube);
            }
        });
    });
    
    return tetrimino;
}

// Function to get a random color
function getRandomColor() {
    return Math.random() * 0xffffff;
}


// Modify the spawnNewTetrimino function
function spawnNewTetrimino() {
  const tetriminoTypes = Object.keys(TETRIMINOS);
  const randomType = tetriminoTypes[Math.floor(Math.random() * tetriminoTypes.length)];
  const newTetrimino = createTetriminoMesh(TETRIMINOS[randomType]);
  
  newTetrimino.position.set(Math.floor(COLS / 2) - 1, ROWS - 1, 0); // Start position
  scene.add(newTetrimino);
  
  if (currentTetrimino) {
      // Remove the old Tetrimino from the scene
      scene.remove(currentTetrimino);
  }
  
  currentTetrimino = newTetrimino;
}


// Modify the moveTetrimino function
function moveTetrimino(tetrimino, x, y) {
  const newPosition = tetrimino.position.clone();
  newPosition.x += x;
  newPosition.y += y;

  if (!checkCollision(tetrimino, newPosition)) {
      tetrimino.position.copy(newPosition);
  } else if (y < 0) {
      // If we're moving down and there's a collision, we've hit something below
      lockTetrimino(tetrimino);
  }
}

// Rotate a Tetrimino
function rotateTetrimino(tetrimino) {
    const matrix = getTetriminoMatrix(tetrimino);
    const N = matrix.length;
    const rotatedMatrix = rotateMatrix(matrix);

    // Store the original positions
    const originalPositions = tetrimino.children.map(child => child.position.clone());

    // Apply the rotation
    applyMatrixToTetrimino(tetrimino, rotatedMatrix);

    // Check for collision
    if (checkCollision(tetrimino, tetrimino.position)) {
        // If rotation causes a collision, revert to original positions
        tetrimino.children.forEach((child, index) => {
            child.position.copy(originalPositions[index]);
        });
    }
}

function rotateMatrix(matrix) {
    const N = matrix.length;
    const rotated = Array.from({ length: N }, () => Array(N).fill(0));

    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            rotated[j][N - 1 - i] = matrix[i][j];
        }
    }

    return rotated;
}

function applyMatrixToTetrimino(tetrimino, matrix) {
    const N = matrix.length;
    let index = 0;

    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            if (matrix[i][j]) {
                tetrimino.children[index].position.set(j, -i, 0);
                index++;
            }
        }
    }
}

function getTetriminoMatrix(tetrimino) {
    const size = Math.ceil(Math.sqrt(tetrimino.children.length));
    const matrix = Array.from({ length: size }, () => Array(size).fill(0));

    tetrimino.children.forEach((cube) => {
        const x = Math.round(cube.position.x);
        const y = Math.abs(Math.round(cube.position.y));
        matrix[y][x] = 1;
    });

    return matrix;
}


// Modify the checkCollision function
function checkCollision(tetrimino, position) {
  const roundedY = Math.round(position.y);
  const roundedX = Math.round(position.x);

  // Check collision with ground
  if (roundedY <= -ROWS / 2) {
      lockTetrimino(tetrimino);
      return true;
  }

  // Check collision with walls
  if (roundedX < 0 || roundedX + tetrimino.children.length > COLS) {
      console.log("Wall collision!");
      return true;
  }

  // Check collision with other pieces
  for (let y = 0; y < tetrimino.children.length; y++) {
      for (let x = 0; x < tetrimino.children.length; x++) {
          if (tetrimino.children[y * tetrimino.children.length + x]) {
              const worldY = ROWS - 1 - (roundedY - y);
              const worldX = roundedX + x;

              if (worldY < 0 || worldY >= ROWS || worldX < 0 || worldX >= COLS || board[worldY][worldX]) {
                  if (y === 0) {
                        //console.log(worldY, worldX);

                      lockTetrimino(tetrimino);
                  }
                  return true;
              }
          }
      }
  }

  return false;
}


// Add this new function to lock the Tetrimino in place
function lockTetrimino(tetrimino) {
  const position = tetrimino.position;
  const roundedY = Math.round(position.y);
  const roundedX = Math.round(position.x);

  tetrimino.children.forEach((cube, i) => {
      const x = roundedX + (i % tetrimino.children.length);
      const y = ROWS - 1 - (roundedY - Math.floor(i / tetrimino.children.length));
      console.log(x, roundedX, y, roundedY);
      if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
          board[y][x] = 1;
          
      }
  });

  scene.remove(tetrimino);
  addLockedPiece(tetrimino);
  spawnNewTetrimino();
}

// Add this new function to add the locked piece to the scene
function addLockedPiece(tetrimino) {
  const lockedPiece = tetrimino.clone();
  lockedPiece.position.copy(tetrimino.position);
  lockedPiece.rotation.copy(tetrimino.rotation);
  scene.add(lockedPiece);
}



// Handle keyboard input for Tetrimino movement
document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
        moveTetrimino(currentTetrimino, -1, 0);
    } else if (event.key === 'ArrowRight') {
        moveTetrimino(currentTetrimino, 1, 0);
    } else if (event.key === 'ArrowDown') {
        moveTetrimino(currentTetrimino, 0, -1);
    } else if (event.key === 'ArrowUp') {
        rotateTetrimino(currentTetrimino);
    }
});

// Drop Tetrimino over time
let dropCounter = 0;
const dropInterval = 1000; // 1 second
let lastTime = 0;

function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;
    
    dropCounter += deltaTime;
    if (dropCounter >= dropInterval) {
        moveTetrimino(currentTetrimino, 0, -1);
        dropCounter = 0;
    }
    
    renderer.render(scene, camera);
    requestAnimationFrame(update);
}

// Start the update loop
update();