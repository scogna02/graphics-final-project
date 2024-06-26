let camera, scene, renderer; // ThreeJS globals
let world; // CannonJs world
let lastTime; // Last timestamp of animation
let stack; // Parts that stay solid on top of each other
let overhangs; // Overhanging parts that fall down
let gameEnded;
let gameStart;
let maxScore = 0; // define max score
let goForward = true; // define a value for going forward or backward
let difficulty = 1; // define a value for difficulty
const boxHeight = 0.5; // Height of each layer
const originalBoxSize = 2.5; // Original width and height of a box

const scoreElement = document.getElementById("score");
const maxscoreElement = document.getElementById("max-score");
const instructionsElement = document.getElementById("instructions");
const resultsElement = document.getElementById("results");
const difficultyElement = document.getElementById("difficulty");
const gameMusic = document.getElementById("game-music");


init();


function init() {
  gameEnded = false;
  gameStart = false;
  lastTime = 0;
  stack = [];
  overhangs = [];

  // Initialize CannonJS
  world = new CANNON.World();
  world.gravity.set(0, -10, 0); // Gravity pulls things down
  world.broadphase = new CANNON.NaiveBroadphase(); 
  world.solver.iterations = 40;

  // Initialize ThreeJs
  const aspect = window.innerWidth / window.innerHeight;
  const width = 15;
  const height = width / aspect;

  camera = new THREE.OrthographicCamera(
    width / -2, // left
    width / 2, // right
    height / 2, // top
    height / -2, // bottom
    0, // near plane
    100 // far plane
  );

  camera.position.set(4, 4, 4);
  camera.lookAt(0, 0, 0);

  scene = new THREE.Scene();

  // Foundation
  addLayer(0, 0, originalBoxSize, originalBoxSize);

  // First layer
  addLayer(-10, 0, originalBoxSize, originalBoxSize, "x");

  // Set up lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(10, 20, 0);

  // Enable shadows
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 10;
  dirLight.shadow.camera.bottom = -10;
  dirLight.shadow.camera.left = -10;
  dirLight.shadow.camera.right = 10;

  scene.add(dirLight);

  // Set up renderer
  renderer = new THREE.WebGLRenderer({ antialias: true }); // Anti-aliasing smoothens edges of objects
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor('#D0CBC7', 1);
  renderer.setAnimationLoop(animation);

  // add shadows
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

  document.body.appendChild(renderer.domElement); 

}

function startGame() {
  gameStart = true;
  gameEnded = false;
  lastTime = 0;
  stack = [];
  overhangs = [];

  renderer.setClearColor('#D0CBC7', 1);

  // start the game music
  gameMusic.currentTime = 0;
  gameMusic.play();


  instructionsElement.classList.add("hide");

  if (instructionsElement) instructionsElement.style.display = "none";
  if (resultsElement) resultsElement.style.display = "none";
  if (scoreElement) scoreElement.innerText = 0;
  if (maxscoreElement) maxscoreElement.textContent = "Best Score: " + maxScore;

  if (world) {
    // Remove every object from world
    while (world.bodies.length > 0) {
      world.remove(world.bodies[0]);
    }
  }

  if (scene) {
    // Remove every Mesh from the scene
    while (scene.children.find((c) => c.type == "Mesh")) {
      const mesh = scene.children.find((c) => c.type == "Mesh");
      scene.remove(mesh);
    }

    // Base layer
    addLayer(0, 0, originalBoxSize, originalBoxSize);

    // First layer
    addLayer(-10, 0, originalBoxSize, originalBoxSize, "x");
  }

  if (camera) {
    // Reset camera positions
    camera.position.set(4, 4, 4);
    camera.lookAt(0, 0, 0);
  }
}

function addLayer(x, z, width, depth, direction) {
  const y = boxHeight * stack.length; // Add the new box one layer higher
  const layer = generateBox(x, y, z, width, depth, false);
  layer.direction = direction;
  stack.push(layer);
}

function addOverhang(x, z, width, depth) {
  const y = boxHeight * (stack.length - 1); // Add the new box one the same layer
  const overhang = generateBox(x, y, z, width, depth, true);
  overhangs.push(overhang);
}

function generateBox(x, y, z, width, depth, falls) {
  // ThreeJS
  const geometry = new THREE.BoxGeometry(width, boxHeight, depth);
  const color = new THREE.Color(`hsl(${0 + stack.length * 6}, 100%, 50%)`);
  const material = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true; // Enable the mesh to cast shadow
  mesh.receiveShadow = true; // Enable the mesh to receive shadow
  
  scene.add(mesh);

  // CannonJS
  const shape = new CANNON.Box(
    new CANNON.Vec3(width / 2, boxHeight / 2, depth / 2)
  );
  let mass = falls ? 5 : 0; // If it falls, give it mass
  mass *= width / originalBoxSize; // Reduce mass proportionately by size
  mass *= depth / originalBoxSize; // Reduce mass proportionately by size
  const body = new CANNON.Body({ mass, shape });
  body.position.set(x, y, z);
  world.addBody(body);

  return {
    threejs: mesh,
    cannonjs: body,
    width,
    depth
  };
}

function cutBox(topLayer, overlap, size, delta) {
  const direction = topLayer.direction;
  const newWidth = direction == "x" ? overlap : topLayer.width;
  const newDepth = direction == "z" ? overlap : topLayer.depth;

  // Update metadata
  topLayer.width = newWidth;
  topLayer.depth = newDepth;

  // Update ThreeJS model
  topLayer.threejs.scale[direction] = overlap / size;
  topLayer.threejs.position[direction] -= delta / 2;

  // Update CannonJS model
  topLayer.cannonjs.position[direction] -= delta / 2;

  // Replace shape to a smaller one (in CannonJS you can't simply just scale a shape)
  const shape = new CANNON.Box(
    new CANNON.Vec3(newWidth / 2, boxHeight / 2, newDepth / 2)
  );
  topLayer.cannonjs.shapes = [];
  topLayer.cannonjs.addShape(shape);
  
}

window.addEventListener("mousedown", eventHandler);
window.addEventListener("touchstart", eventHandler);
window.addEventListener("keydown", function (event) {
  if (event.key == " " && gameStart) {
    event.preventDefault();
    eventHandler();
    return;
  }
  if (event.key == "R" || event.key == "r") {
    event.preventDefault();
    startGame();
    return;
  }
  if (event.key == "S" || event.key == "s") {
    event.preventDefault();
    startGame();
    return;
  }
  // make a game harder by making it faster
  if (event.key === "H" || event.key === "h") {
    event.preventDefault();
    difficulty += 0.2;
    if (difficulty >= 1.4) {
      difficulty = 1.4;
    }
    updateDifficultyDisplay();
    return;
  }
  if (event.key === "E" || event.key === "e") {
    event.preventDefault();
    difficulty -= 0.2;
    if (difficulty < 1) {
      difficulty = 1;
    }
    updateDifficultyDisplay();
    return;
  }
});

function updateDifficultyDisplay() {
  let difficultyText;
  if (difficulty === 1) {
    difficultyText = "Easy";
  } else if (difficulty === 1.2) {
    difficultyText = "Medium";
  } else {
    difficultyText = "Hard";
  }
  difficultyElement.innerText = `Difficulty: ${difficultyText}`;
}

function eventHandler() {
  updateMove();
}

function updateMove() {

  if (!gameStart) return; // Do nothing if the game has not started

  if (gameEnded) return;

  const topLayer = stack[stack.length - 1];
  const previousLayer = stack[stack.length - 2];

  const direction = topLayer.direction;

  const size = direction == "x" ? topLayer.width : topLayer.depth;
  const delta =
    topLayer.threejs.position[direction] -
    previousLayer.threejs.position[direction];
  const overhangSize = Math.abs(delta);
  const overlap = size - overhangSize;

  if (overlap > 0) {
    cutBox(topLayer, overlap, size, delta);

    // Overhang
    const overhangShift = (overlap / 2 + overhangSize / 2) * Math.sign(delta);
    const overhangX =
      direction == "x"
        ? topLayer.threejs.position.x + overhangShift
        : topLayer.threejs.position.x;
    const overhangZ =
      direction == "z"
        ? topLayer.threejs.position.z + overhangShift
        : topLayer.threejs.position.z;
    const overhangWidth = direction == "x" ? overhangSize : topLayer.width;
    const overhangDepth = direction == "z" ? overhangSize : topLayer.depth;

    addOverhang(overhangX, overhangZ, overhangWidth, overhangDepth);

    // Next layer
    const nextX = direction == "x" ? topLayer.threejs.position.x : -10; // If we cut in x, next box is on z
    const nextZ = direction == "z" ? topLayer.threejs.position.z : -10; // If we cut in z, next box is on x
    const newWidth = topLayer.width; // New layer has the same size as the cut top layer
    const newDepth = topLayer.depth; 
    const nextDirection = direction == "x" ? "z" : "x";

    if (scoreElement) scoreElement.innerText = stack.length - 1;
    addLayer(nextX, nextZ, newWidth, newDepth, nextDirection);

    // update max score
    if (stack.length - 1 > maxScore) {
      maxScore = stack.length - 2;
      if (maxscoreElement) maxscoreElement.textContent = "Best Score: " + maxScore;
    }

    // make the background color darker while the score is going up
    if (stack.length - 1 > 1) {
      renderer.setClearColor('#D0CBC7', 1 - (stack.length - 2) * 0.02);
    }

    // play sound
    audio.play();

  } else {
    missedTheSpot();
  }
}

function missedTheSpot() {
  const topLayer = stack[stack.length - 1]; 

  // Turn to top layer into an overhang and let it fall down
  addOverhang(
    topLayer.threejs.position.x,
    topLayer.threejs.position.z,
    topLayer.width,
    topLayer.depth
  );
  world.remove(topLayer.cannonjs);
  scene.remove(topLayer.threejs);

  gameEnded = true;

  // stop the game music
  gameMusic.pause();

  if (resultsElement) resultsElement.style.display = "flex";
}

function animation(time) {
  if (lastTime) {
    const timePassed = time - lastTime;
    const speed = 0.008 * difficulty;

    const topLayer = stack[stack.length - 1];

    // If game hasn't started, don't move the box
    const boxShouldMove = !gameEnded && gameStart;

    if (boxShouldMove) {
      
      // if the box is beyond 10, go backward
      if (topLayer.threejs.position[topLayer.direction] > 10) {
        goForward = false;
      }

      // if the box is beyond -10, go forward
      if (topLayer.threejs.position[topLayer.direction] < -10 && !goForward) {
        goForward = true;
      }

      // if the box is going forward
      if (goForward) {
        topLayer.threejs.position[topLayer.direction] += speed * timePassed;
        topLayer.cannonjs.position[topLayer.direction] += speed * timePassed;
      } 

      // if the box is going backward
      if (!goForward) {
        topLayer.threejs.position[topLayer.direction] -= speed * timePassed;
        topLayer.cannonjs.position[topLayer.direction] -= speed * timePassed;
      }
    }

    // 4 is the initial camera height
    if (camera.position.y < boxHeight * (stack.length - 2) + 4) {
      camera.position.y += speed * timePassed;
    }

    updatePhysics(timePassed);
    renderer.render(scene, camera);
  }
  lastTime = time;
}

function updatePhysics(timePassed) {
  world.step(timePassed / 1000); // Step the physics world

  // Copy coordinates from Cannon.js to Three.js
  overhangs.forEach((element) => {
    element.threejs.position.copy(element.cannonjs.position);
    element.threejs.quaternion.copy(element.cannonjs.quaternion);
  });
}

window.addEventListener("resize", () => {
  // Adjust camera
  console.log("resize", window.innerWidth, window.innerHeight);
  const aspect = window.innerWidth / window.innerHeight;
  const width = 15;
  const height = width / aspect;

  camera.top = height / 2;
  camera.bottom = height / -2;

  // Reset renderer
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.render(scene, camera);
});