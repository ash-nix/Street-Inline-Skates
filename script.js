let scene, camera, renderer, skater, clock;
let moon, stars = [];
let score = 0;
let speed = 0.275;
let lateralVelocity = 0;
let segments = [];
let obstacles = [];
let barriers = [];
let cracks = [];
let decorationObjects = [];
let isGameOver = false;
let isJumping = false;
let jumpY = 0;
let jumpVelocity = 0;
let animTime = 0;
const gravity = 0.015;

let roadCursorZ = 0;
let lastDecorZ = 0;

let lastCarZ_Left = 0;
let lastCarZ_Right = 0;
const MIN_CAR_SPACING = 12;

let leftLegGroup, rightLegGroup, leftShin, rightShin, leftBoot, rightBoot;
let leftArmGroup, rightArmGroup, leftForearm, rightForearm;

const KEYS = {};
const SETTINGS = {
    roadWidth: 12,
    segmentLength: 5,
    visibleSegments: 45,
    maxSpeed: 0.60,
    minSpeed: 0.275,
    accel: 0.0025,
    friction: 0.994,
    brakeDecel: 0.006,
    turnSpeed: 0.016,
    trafficSpeed: 0.24,
    spawnChance: 0.15,
    barrierChance: 0.4,
    jumpPower: 0.22
};

const BUILDING_COLORS = [
    0x2c3e50, 0x34495e, 0x16a085, 0x27ae60,
    0x2980b9, 0x8e44ad, 0xf39c12, 0xd35400,
    0xc0392b, 0xbdc3c7, 0x7f8c8d, 0x1abc9c
];

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.Fog(0x050510, 30, 160);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(10, 30, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0x4040ff, 0x000000, 0.6);
    scene.add(hemiLight);

    createSkater();
    createInitialRoad();
    createSky();

    clock = new THREE.Clock();

    window.addEventListener('keydown', e => KEYS[e.code] = true);
    window.addEventListener('keyup', e => KEYS[e.code] = false);
    window.addEventListener('resize', onWindowResize);

    if ('ontouchstart' in window) {
        document.getElementById('mobile-controls').style.display = 'flex';
        setupMobileEvents();
    }

    animate();
}

function createSky() {
    // Moon - moved closer to ensure it stays within frustum and visible
    const moonGeo = new THREE.SphereGeometry(6, 32, 32);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xfffca1, fog: false });
    moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(-40, 50, -60);
    moon.renderOrder = 999; // Ensure it draws over fog
    scene.add(moon);

    // Stars
    const starGeo = new THREE.SphereGeometry(0.15, 8, 8);
    for (let i = 0; i < 300; i++) {
        const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
        const star = new THREE.Mesh(starGeo, starMat);

        const radius = 150;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);

        star.position.set(
            radius * Math.sin(phi) * Math.cos(theta),
            Math.abs(radius * Math.sin(phi) * Math.sin(theta)) + 10,
            radius * Math.cos(phi)
        );

        star.userData.flickerOffset = Math.random() * Math.PI * 2;
        star.userData.flickerSpeed = 0.5 + Math.random() * 2;

        scene.add(star);
        stars.push(star);
    }
}

function createSkater() {
    skater = new THREE.Group();
    skater.position.y = 0.42;

    const bodyMat = new THREE.MeshPhongMaterial({ color: 0xeeeeee });
    const limbMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const skinMat = new THREE.MeshPhongMaterial({ color: 0xffdbac });
    const skateMat = new THREE.MeshPhongMaterial({ color: 0xffcc00 });
    const wheelMat = new THREE.MeshPhongMaterial({ color: 0xffffff });

    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 1.25;

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.3), bodyMat);
    chest.position.y = 0.2;
    chest.castShadow = true;
    torsoGroup.add(chest);

    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3), limbMat);
    hips.position.y = -0.15;
    hips.castShadow = true;
    torsoGroup.add(hips);

    skater.add(torsoGroup);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.1), skinMat);
    neck.position.y = 1.8;
    skater.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), skinMat);
    head.position.y = 1.95;
    skater.add(head);

    const helmet = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshPhongMaterial({ color: 0xffcc00 })
    );
    helmet.position.y = 1.98;
    skater.add(helmet);

    function createArm(isLeft) {
        const group = new THREE.Group();
        group.position.set(isLeft ? -0.35 : 0.35, 1.7, 0);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), bodyMat);
        arm.position.y = -0.25;
        group.add(arm);
        const forearm = new THREE.Group();
        forearm.position.y = -0.45;
        const fmesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.1), skinMat);
        fmesh.position.y = -0.2;
        forearm.add(fmesh);
        group.add(forearm);
        return { group, forearm };
    }

    const leftArm = createArm(true);
    const rightArm = createArm(false);
    leftArmGroup = leftArm.group; rightArmGroup = rightArm.group;
    leftForearm = leftArm.forearm; rightForearm = rightArm.forearm;
    skater.add(leftArmGroup); skater.add(rightArmGroup);

    function createLeg(isLeft) {
        const group = new THREE.Group();
        group.position.set(isLeft ? -0.2 : 0.2, 1.1, 0);
        const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.55, 0.24), limbMat);
        thigh.position.y = -0.27;
        group.add(thigh);
        const shin = new THREE.Group();
        shin.position.y = -0.55;
        const smesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), limbMat);
        smesh.position.y = -0.27;
        shin.add(smesh);

        const boot = new THREE.Group();
        boot.position.y = -0.55;
        const bmesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.25, 0.45), skateMat);
        bmesh.position.y = -0.1;
        boot.add(bmesh);

        const wheelGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 8);
        wheelGeo.rotateZ(Math.PI / 2);
        for (let i = 0; i < 4; i++) {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.position.set(0, -0.25, -0.15 + (i * 0.1));
            boot.add(wheel);
        }

        shin.add(boot);
        group.add(shin);
        return { group, shin, boot };
    }

    const lLeg = createLeg(true); const rLeg = createLeg(false);
    leftLegGroup = lLeg.group; rightLegGroup = rLeg.group;
    leftShin = lLeg.shin; rightShin = rLeg.shin;
    leftBoot = lLeg.boot; rightBoot = rLeg.boot;
    skater.add(leftLegGroup); skater.add(rightLegGroup);

    scene.add(skater);
}

function createInitialRoad() {
    roadCursorZ = 0;
    lastDecorZ = 0;
    lastCarZ_Left = 0;
    lastCarZ_Right = 0;
    for (let i = 0; i < SETTINGS.visibleSegments; i++) {
        addSegment(0, roadCursorZ, true);
        roadCursorZ -= SETTINGS.segmentLength;
    }
}

function createDecoration(x, z, side) {
    const group = new THREE.Group();
    const sideOffset = (SETTINGS.roadWidth / 2 + 4) * side;
    group.position.set(x + sideOffset, 0, z);

    const roll = Math.random();
    if (roll > 0.3) {
        const h = 8 + Math.random() * 15;
        const w = 5 + Math.random() * 3;
        const d = 5;
        const color = BUILDING_COLORS[Math.floor(Math.random() * BUILDING_COLORS.length)];
        const mat = new THREE.MeshPhongMaterial({ color: color });
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        b.position.y = h / 2;
        group.add(b);

        const winRows = Math.floor(h / 1.8);
        const winCols = Math.floor(d / 1.4);
        const winGeo = new THREE.PlaneGeometry(0.8, 1.0);
        const winMatOn = new THREE.MeshBasicMaterial({ color: 0xfffca1 });
        const winMatOff = new THREE.MeshBasicMaterial({ color: 0x111111 });

        const facingRoadX = (w / 2 + 0.02) * (side === 1 ? -1 : 1);

        for (let r = 0; r < winRows; r++) {
            for (let c = 0; c < winCols; c++) {
                const win = new THREE.Mesh(winGeo, Math.random() > 0.3 ? winMatOff : winMatOn);
                win.position.set(facingRoadX, (r + 1) * 1.5 - (h / 2), (c - (winCols - 1) / 2) * 1.4);
                win.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
                b.add(win);
            }
        }
    } else {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6), new THREE.MeshPhongMaterial({ color: 0x444444 }));
        pole.position.y = 3;
        group.add(pole);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.1), new THREE.MeshPhongMaterial({ color: 0x444444 }));
        arm.position.set(-0.7 * side, 6, 0);
        group.add(arm);
        const light = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffaa }));
        light.position.set(-1.4 * side, 5.9, 0);
        group.add(light);
    }
    scene.add(group);
    decorationObjects.push(group);
}

function addSegment(x, z, initial = false) {
    const geo = new THREE.PlaneGeometry(SETTINGS.roadWidth, SETTINGS.segmentLength);
    const mat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0, z - SETTINGS.segmentLength / 2);
    mesh.receiveShadow = true;

    for (let side of [-1, 1]) {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(0.1, SETTINGS.segmentLength), new THREE.MeshBasicMaterial({ color: 0x444444 }));
        line.position.set(side * 3, 0.01, 0);
        mesh.add(line);
    }

    scene.add(mesh);
    segments.push(mesh);

    if (Math.abs(z - lastDecorZ) >= 12) {
        createDecoration(x, z - SETTINGS.segmentLength / 2, 1);
        createDecoration(x, z - SETTINGS.segmentLength / 2, -1);
        lastDecorZ = z;
    }

    if (!initial || Math.abs(z) > 20) {
        if (Math.random() < SETTINGS.barrierChance) {
            spawnCentralBarrier(z);
        }

        const roll = Math.random();
        if (roll < SETTINGS.spawnChance) {
            spawnCar(x, z);
        } else if (roll < 0.05) {
            spawnCrack(x, z);
        }
    }
}

function spawnCentralBarrier(z) {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, SETTINGS.segmentLength), new THREE.MeshPhongMaterial({ color: 0x666666 }));
    base.position.y = 0.25;
    group.add(base);

    let hasFence = false;
    if (Math.random() > 0.4) {
        hasFence = true;
        const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.2);
        const poleMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
        const rails = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, SETTINGS.segmentLength), poleMat);
        rails.position.y = 1.0;
        group.add(rails);

        for (let i = 0; i < 3; i++) {
            const p = new THREE.Mesh(poleGeo, poleMat);
            p.position.set(0, 0.6, -SETTINGS.segmentLength / 2 + (i * 2.5));
            group.add(p);
        }
    }

    group.position.set(0, 0, z - SETTINGS.segmentLength / 2);
    scene.add(group);
    barriers.push({
        mesh: group,
        width: 0.6,
        height: hasFence ? 1.2 : 0.5,
        zStart: z - SETTINGS.segmentLength,
        zEnd: z
    });
}

function spawnCar(x, z) {
    const isLeft = Math.random() > 0.5;

    if (isLeft) {
        if (Math.abs(z - lastCarZ_Left) < MIN_CAR_SPACING) return;
        lastCarZ_Left = z;
    } else {
        if (Math.abs(z - lastCarZ_Right) < MIN_CAR_SPACING) return;
        lastCarZ_Right = z;
    }

    const laneOffset = isLeft ? -4.5 : 4.5;
    const finalX = x + laneOffset;
    const spawnZ = z - SETTINGS.segmentLength / 2;

    const colors = [0xff3300, 0x0066ff, 0xeeeeee, 0x333333, 0xffcc00];
    const carGroup = new THREE.Group();

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 4), new THREE.MeshPhongMaterial({ color: colors[Math.floor(Math.random() * colors.length)] }));
    body.position.y = 0.7;
    body.castShadow = true;
    carGroup.add(body);

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 2.2), new THREE.MeshPhongMaterial({ color: 0x111111 }));
    top.position.set(0, 1.5, -0.2);
    carGroup.add(top);

    const headLightGeo = new THREE.BoxGeometry(0.4, 0.2, 0.1);
    const headLightMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    const leftHead = new THREE.Mesh(headLightGeo, headLightMat);
    leftHead.position.set(-0.6, 0.6, -2.01);
    carGroup.add(leftHead);
    const rightHead = new THREE.Mesh(headLightGeo, headLightMat);
    rightHead.position.set(0.6, 0.6, -2.01);
    carGroup.add(rightHead);

    const tailLightGeo = new THREE.BoxGeometry(0.4, 0.15, 0.1);
    const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const leftTail = new THREE.Mesh(tailLightGeo, tailLightMat);
    leftTail.position.set(-0.6, 0.6, 2.01);
    carGroup.add(leftTail);
    const rightTail = new THREE.Mesh(tailLightGeo, tailLightMat);
    rightTail.position.set(0.6, 0.6, 2.01);
    carGroup.add(rightTail);

    carGroup.position.set(finalX, 0, spawnZ);
    if (isLeft) carGroup.rotation.y = Math.PI;

    scene.add(carGroup);
    obstacles.push({
        mesh: carGroup,
        carSpeed: SETTINGS.trafficSpeed * (0.8 + Math.random() * 0.4),
        isToward: isLeft,
        lane: isLeft ? 'left' : 'right'
    });
}

function spawnCrack(x, z) {
    const geo = new THREE.PlaneGeometry(1.5, 0.2);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x000000 }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x + (Math.random() - 0.5) * 8, 0.01, z - SETTINGS.segmentLength / 2);
    scene.add(mesh);
    cracks.push({ mesh });
}

function setupMobileEvents() {
    const ids = { 'btn-left': 'ArrowLeft', 'btn-right': 'ArrowRight', 'btn-down': 'ArrowDown', 'btn-up': 'ArrowUp', 'btn-jump': 'Space' };
    Object.entries(ids).forEach(([id, code]) => {
        const el = document.getElementById(id);
        el.ontouchstart = (e) => { e.preventDefault(); KEYS[code] = true; };
        el.ontouchend = (e) => { e.preventDefault(); KEYS[code] = false; };
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function resetGame() {
    isGameOver = false; speed = SETTINGS.minSpeed; score = 0; lateralVelocity = 0;
    roadCursorZ = 0; lastDecorZ = 0;
    lastCarZ_Left = 0; lastCarZ_Right = 0;
    skater.position.set(0, 0.42, 0); skater.rotation.set(0, 0, 0);
    [segments, obstacles, cracks, decorationObjects, barriers].forEach(arr => {
        arr.forEach(o => scene.remove(o.mesh || o));
    });
    segments = []; obstacles = []; cracks = []; decorationObjects = []; barriers = [];
    createInitialRoad();
    document.getElementById('game-over').style.display = 'none';
}

function updateSkater(delta) {
    if (isGameOver) return;

    const isBraking = KEYS['ArrowDown'] || KEYS['KeyS'];

    if (isBraking) speed = Math.max(0, speed - SETTINGS.brakeDecel);
    else if (KEYS['ArrowUp'] || KEYS['KeyW']) speed = Math.min(SETTINGS.maxSpeed, speed + SETTINGS.accel);
    else {
        if (speed > SETTINGS.minSpeed) speed *= SETTINGS.friction;
        else speed = Math.min(SETTINGS.minSpeed, speed + 0.005);
    }

    skater.position.z -= speed;
    score += speed;

    if (KEYS['ArrowLeft'] || KEYS['KeyA']) {
        lateralVelocity -= SETTINGS.turnSpeed;
        skater.rotation.z = Math.min(skater.rotation.z + 0.05, 0.35);
    } else if (KEYS['ArrowRight'] || KEYS['KeyD']) {
        lateralVelocity += SETTINGS.turnSpeed;
        skater.rotation.z = Math.max(skater.rotation.z - 0.05, -0.35);
    } else {
        lateralVelocity *= 0.9;
        skater.rotation.z *= 0.85;
    }

    skater.position.x += lateralVelocity;
    lateralVelocity *= 0.94;

    const halfRoad = (SETTINGS.roadWidth / 2) - 0.5;
    if (Math.abs(skater.position.x) > halfRoad) {
        skater.position.x = Math.sign(skater.position.x) * halfRoad;
        lateralVelocity = 0;
    }

    if (KEYS['Space'] && !isJumping) {
        isJumping = true;
        jumpVelocity = SETTINGS.jumpPower;
    }

    if (isJumping) {
        jumpY += jumpVelocity;
        jumpVelocity -= gravity;
        if (jumpY <= 0) { jumpY = 0; isJumping = false; }
    }
    skater.position.y = 0.42 + jumpY;

    animTime += delta * (speed * 12 + 2.5);
    const cycle = Math.sin(animTime * 0.4);
    const lerpFactor = 0.15;
    const torsoLean = 0.2 + (speed * 0.4);

    let targets = {
        lx: torsoLean, lz: 0, rx: torsoLean, rz: 0,
        alx: 0.2, arx: 0.2, ry: 0,
        rBootX: 0, rBootY: 0 // For T-Stop rotation
    };

    // T-Stop Animation Logic
    if (isBraking && !isJumping && speed > 0.01) {
        targets.rx = -0.5; // Drag leg back
        targets.rz = 0.15; // Swing out slightly
        targets.rBootY = Math.PI / -2; // Rotate skate 90 degrees (The "T")
        targets.lx = torsoLean - 0.2; // Lean forward on lead leg
        targets.arx = -0.4; // Stabilizing arms
        targets.alx = 0.5;
    } else if (!isJumping && speed > 0.05) {
        // Normal Stride
        if (cycle > 0) {
            targets.rx = -cycle * 0.6; targets.rz = cycle * 0.6;
            targets.arx = cycle * 0.8; targets.ry = -cycle * 0.15;
        } else {
            const c = Math.abs(cycle);
            targets.lx = -c * 0.6; targets.lz = -c * 0.6;
            targets.alx = c * 0.8; targets.ry = c * 0.15;
        }
    }

    // Apply transformations
    leftLegGroup.rotation.x = THREE.MathUtils.lerp(leftLegGroup.rotation.x, targets.lx, lerpFactor);
    leftLegGroup.rotation.z = THREE.MathUtils.lerp(leftLegGroup.rotation.z, targets.lz, lerpFactor);
    rightLegGroup.rotation.x = THREE.MathUtils.lerp(rightLegGroup.rotation.x, targets.rx, lerpFactor);
    rightLegGroup.rotation.z = THREE.MathUtils.lerp(rightLegGroup.rotation.z, targets.rz, lerpFactor);

    // Explicit T-Stop Boot rotation
    rightBoot.rotation.y = THREE.MathUtils.lerp(rightBoot.rotation.y, targets.rBootY, lerpFactor);

    leftArmGroup.rotation.x = THREE.MathUtils.lerp(leftArmGroup.rotation.x, targets.alx, lerpFactor);
    rightArmGroup.rotation.x = THREE.MathUtils.lerp(rightArmGroup.rotation.x, targets.arx, lerpFactor);
    skater.rotation.y = THREE.MathUtils.lerp(skater.rotation.y, targets.ry, lerpFactor);
    skater.children[0].rotation.x = torsoLean;

    camera.position.set(skater.position.x * 0.4, 3.5 + (speed * 2), skater.position.z + 6);
    camera.lookAt(skater.position.x, 1, skater.position.z - 10);

    // Sky elements follow skater
    if (moon) {
        moon.position.z = skater.position.z - 60;
    }
    stars.forEach(star => {
        const sTime = animTime * 0.1 + star.userData.flickerOffset;
        const flicker = Math.sin(sTime * star.userData.flickerSpeed) * 0.5 + 0.5;
        star.scale.set(flicker, flicker, flicker);

        if (star.position.z > skater.position.z + 150) star.position.z -= 300;
        if (star.position.z < skater.position.z - 150) star.position.z += 300;
    });
}

function updateRoad() {
    if (segments[0] && segments[0].position.z > skater.position.z + 10) {
        const oldSeg = segments.shift();
        const nextZ = roadCursorZ - SETTINGS.segmentLength;
        oldSeg.position.set(0, 0, nextZ - SETTINGS.segmentLength / 2);
        roadCursorZ = nextZ;
        segments.push(oldSeg);
        addSegment(0, roadCursorZ);
    }

    [decorationObjects, barriers, cracks, obstacles].forEach(arr => {
        for (let i = arr.length - 1; i >= 0; i--) {
            const item = arr[i].mesh || arr[i];
            if (item.position.z > skater.position.z + 25) {
                scene.remove(item);
                arr.splice(i, 1);
            }
        }
    });

    obstacles.forEach(obs => {
        obs.mesh.position.z += obs.isToward ? obs.carSpeed : -obs.carSpeed;
        const dx = Math.abs(skater.position.x - obs.mesh.position.x);
        const dz = Math.abs(skater.position.z - obs.mesh.position.z);
        if (dz < 2.0 && dx < 0.9 && jumpY < 1.0) endGame("Traffic collision!");
    });

    barriers.forEach(b => {
        const dx = Math.abs(skater.position.x - b.mesh.position.x);
        const dz = Math.abs(skater.position.z - b.mesh.position.z);
        if (dx < 0.35 && dz < SETTINGS.segmentLength / 2) {
            if (jumpY < b.height) endGame("Hit the central barrier!");
        }
    });
}

function endGame(msg) {
    isGameOver = true;
    document.getElementById('fail-msg').innerText = msg;
    document.getElementById('game-over').style.display = 'block';
    document.getElementById('final-dist').innerText = Math.floor(score);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    updateSkater(delta);
    updateRoad();
    document.getElementById('dist').innerText = Math.floor(score);
    document.getElementById('speed').innerText = ((speed / 0.55) * 50).toFixed(1);
    renderer.render(scene, camera);
}

window.onload = init;