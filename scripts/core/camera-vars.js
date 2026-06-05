// ============================================================
// ============================================================
// CAMERA MODULE — vars (must be before animate loop)
// ============================================================
let camCurrentMode = 'orbit';
let camThirdDist   = 5;
let camThirdHeight = 2;
let camThirdSmooth = 8;
let camShakeAmt    = 0;
let camShakeDecay  = 0;
let camFixedTarget = '';
let camCineSpeed   = 1;
let camPathKFs     = [];
let camPathPlaying = false;
let camPathTime    = 0;
let camPathDuration= 8;
let camSavedPositions = [];
let camLiveTimer   = 0;
const camThirdPos  = new THREE.Vector3();

// MAIN LOOP
// ============================================================
const clock = new THREE.Clock();