// =============================================
// Smart AI Deployment v3.6 — King Ultra Safety
// نسخة كاملة بعد إصلاح مشكلة الملك على خط المواجهة
// =============================================

/*
إضافات هذا الإصدار:
✅ منع الملك نهائيًا من خط المواجهة
✅ Fallback ذكي لو الخريطة ضيقة
✅ إعادة تموضع تلقائي لو بدون حماية
✅ حلقة حماية إجبارية
✅ حراس أقوى (فارس + جنود)
*/

// ===============================
// شخصيات AI
// ===============================
export const AI_PERSONALITIES = {
  REALISTIC: 'realistic',
  AGGRESSIVE: 'aggressive',
  DEFENSIVE: 'defensive',
  UNPREDICTABLE: 'unpredictable'
};

// ===============================
// أدوات عامة
// ===============================
const key = c => `${c.x},${c.y}`;
const noise = (amount = 2) => (Math.random() - 0.5) * amount;
const planHistoryByMap = new Map();

function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(36);
}

function getPersistentHistoryKey(mapSig) {
  return `ai_plan_history_${hashString(mapSig)}`;
}

function loadPersistentPlanHistory(mapSig) {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(getPersistentHistoryKey(mapSig));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function savePersistentPlanHistory(mapSig, seenSet) {
  if (typeof localStorage === 'undefined') return;
  try {
    const latest = Array.from(seenSet).slice(-25);
    localStorage.setItem(getPersistentHistoryKey(mapSig), JSON.stringify(latest));
  } catch {
    // ignore storage quota or serialization issues
  }
}

function mapSignature(map) {
  const cellsSig = (map?.cells || [])
    .map(c => `${c.x},${c.y}:${c.type}:${c.zone}`)
    .sort()
    .join('|');
  return `${map?.width || 0}x${map?.height || 0}|${cellsSig}`;
}

function planSignature(plan) {
  return plan
    .map(step => `${step.unit}@${step.x},${step.y}`)
    .sort()
    .join('|');
}

function getAICells(map) {
  return map.cells.filter(c => c.zone === 'ai');
}

function centerLineX(map) {
  return Math.floor(map.width / 2);
}

const boundaryDistanceCache = new WeakMap();

function buildCellIndex(map) {
  const index = new Map();
  map.cells.forEach(c => index.set(key(c), c));
  return index;
}

function getBoundaryDistanceMap(map) {
  if (boundaryDistanceCache.has(map)) {
    return boundaryDistanceCache.get(map);
  }

  const aiCells = getAICells(map);
  const cellIndex = buildCellIndex(map);
  const distance = new Map();
  const queue = [];

  aiCells.forEach(cell => {
    distance.set(key(cell), Number.POSITIVE_INFINITY);
  });

  aiCells.forEach(cell => {
    const neighbors = getNeighbors(cell, map);
    const touchesPlayerZone = neighbors.some(n => n.zone !== 'ai');
    if (touchesPlayerZone) {
      const cellKey = key(cell);
      distance.set(cellKey, 0);
      queue.push(cell);
    }
  });

  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    const currentKey = key(current);
    const currentDistance = distance.get(currentKey);

    const neighbors = getNeighbors(current, map).filter(n => n.zone === 'ai');
    neighbors.forEach(next => {
      const nextKey = key(next);
      const nextDistance = distance.get(nextKey);
      if (currentDistance + 1 < nextDistance) {
        distance.set(nextKey, currentDistance + 1);
        queue.push(cellIndex.get(nextKey) || next);
      }
    });
  }

  boundaryDistanceCache.set(map, distance);
  return distance;
}

function frontlineDistance(cell, map) {
  const distanceMap = getBoundaryDistanceMap(map);
  const d = distanceMap.get(key(cell));
  return Number.isFinite(d) ? d : 0;
}

// ===============================
// الجيران
// ===============================
function getNeighbors(cell, map) {
  const dirs = [
    { x: 1, y: 0 }, { x: -1, y: 0 },
    { x: 0, y: 1 }, { x: 0, y: -1 },
    { x: 1, y: 1 }, { x: 1, y: -1 },
    { x: -1, y: 1 }, { x: -1, y: -1 }
  ];

  return dirs
    .map(d => ({ x: cell.x + d.x, y: cell.y + d.y }))
    .map(pos => map.cells.find(c => c.x === pos.x && c.y === pos.y))
    .filter(Boolean);
}

function isOnFrontline(cell, map) {
  return frontlineDistance(cell, map) <= 0;
}

function isBoundaryCell(cell, map) {
  if (!cell || cell.zone !== 'ai') return true;

  const neighbors = getNeighbors(cell, map);
  const touchesNonAI = neighbors.some(n => n.zone !== 'ai');
  const nearFrontline = frontlineDistance(cell, map) <= 1;

  return touchesNonAI || nearFrontline;
}

function boardEdgeDistance(cell, map) {
  if (!cell || !map) return 0;
  const dx = Math.min(cell.x, (map.width - 1) - cell.x);
  const dy = Math.min(cell.y, (map.height - 1) - cell.y);
  return Math.min(dx, dy);
}

function isBoardEdgeCell(cell, map) {
  return boardEdgeDistance(cell, map) <= 0;
}

function boardEdgePenalty(cell, map) {
  const d = boardEdgeDistance(cell, map);
  if (d <= 0) return -6;
  if (d === 1) return -3;
  return 0;
}

function nearestOccupiedDistance(cell, occ) {
  if (!occ || occ.size === 0) return 3;

  let best = Number.POSITIVE_INFINITY;
  occ.forEach(posKey => {
    const [ox, oy] = posKey.split(',').map(Number);
    const d = Math.abs(cell.x - ox) + Math.abs(cell.y - oy);
    if (d < best) best = d;
  });

  return Number.isFinite(best) ? best : 3;
}

function mobilityScore(cell, map, occ = new Set(), unitType = 'soldier') {
  const immediate = getNeighbors(cell, map)
    .filter(n => n.zone === 'ai' && n.type !== 'water' && !occ.has(key(n)));

  const secondRingKeys = new Set();
  immediate.forEach(n => {
    getNeighbors(n, map)
      .filter(m => m.zone === 'ai' && m.type !== 'water' && !occ.has(key(m)))
      .forEach(m => secondRingKeys.add(key(m)));
  });

  const immediateCount = immediate.length;
  const secondRingCount = secondRingKeys.size;

  switch (unitType) {
    case 'queen':
      return (immediateCount * 1.0) + (secondRingCount * 0.25);
    case 'knight':
      return (immediateCount * 0.9) + (secondRingCount * 0.28);
    case 'archer':
      return (immediateCount * 0.85) + (secondRingCount * 0.18);
    case 'king':
      return (immediateCount * 0.65) + (secondRingCount * 0.12);
    default:
      return (immediateCount * 0.45) + (secondRingCount * 0.08);
  }
}

function controlPressureScore(cell, map, occ = new Set(), unitType = 'soldier') {
  const frontline = frontlineDistance(cell, map);
  const frontlineControl = Math.max(0, 3 - frontline);
  const support = getNeighbors(cell, map).filter(n => n.zone === 'ai' && occ.has(key(n))).length;
  const spread = Math.min(nearestOccupiedDistance(cell, occ), 4);

  if (unitType === 'soldier') {
    return (frontlineControl * 1.8) + (support * 0.6) + (spread * 0.5);
  }
  if (unitType === 'archer') {
    return (frontlineControl * 1.0) + (support * 0.5);
  }
  if (unitType === 'knight') {
    return (frontlineControl * 0.8) + (spread * 0.6);
  }

  return (frontlineControl * 0.45) + (support * 0.35);
}

function realSafety(cell, map) {
  const neighbors = getNeighbors(cell, map);
  let score = 0;

  neighbors.forEach(n => {
    if (n.type === 'mountain') score += 2;
    if (n.type === 'water') score -= 1;
  });

  return score;
}

function safeCellScore(cell, map, weights, occ = new Set(), unitType = 'soldier') {
  const frontlineBuffer = frontlineDistance(cell, map);
  const terrainBonus = cell.type === 'mountain' ? 3 : (cell.type === 'land' ? 1 : -6);
  const boundaryPenalty = isBoundaryCell(cell, map) ? -8 : 0;
  const boardPenalty = boardEdgePenalty(cell, map);
  const neighborValue = realSafety(cell, map) * 1.6;
  const mobility = mobilityScore(cell, map, occ, unitType);
  const safetyWeight = typeof weights?.safety === 'number' ? weights.safety : 1.6;

  return (frontlineBuffer * safetyWeight) + terrainBonus + boundaryPenalty + boardPenalty + neighborValue + mobility;
}

// ===============================
// تحليل الخريطة
// ===============================
function analyzeMap(map) {
  const ai = getAICells(map);
  return {
    land: ai.filter(c => c.type === 'land'),
    mountains: ai.filter(c => c.type === 'mountain'),
    water: ai.filter(c => c.type === 'water')
  };
}

// ===============================
// معاملات الشخصية
// ===============================
function getPersonalityWeights(type) {
  switch (type) {
    case AI_PERSONALITIES.AGGRESSIVE:
      return { safety: 0.6, frontline: 2.2, randomness: 1.5 };
    case AI_PERSONALITIES.DEFENSIVE:
      return { safety: 2.5, frontline: 0.8, randomness: 0.5 };
    case AI_PERSONALITIES.UNPREDICTABLE:
      return { safety: 1.2, frontline: 1.2, randomness: 3.5 };
    default:
      return { safety: 1.6, frontline: 1.4, randomness: 1.0 };
  }
}

function getDeploymentStyle(personality, variationSeed = 0) {
  const styleIndex = Math.abs(variationSeed) % 6;

  const baseStyles = [
    {
      name: 'balanced-control',
      safetyDelta: 0.0,
      frontlineDelta: 0.0,
      randomnessDelta: 0.25,
      kingDepthBoost: 0,
      kingSafeOffset: 2,
      queenBacklineBias: 1.0,
      archerControlBias: 1.0,
      knightMobilityBias: 1.0,
      soldierControlBias: 1.0,
      sentryCount: 3,
      ringMin: 3,
      pieceOrder: 'standard',
      laneTarget: 0.5,
      depthTarget: 0.62,
      spatialIntensity: 0.9
    },
    {
      name: 'fortress',
      safetyDelta: 0.8,
      frontlineDelta: -0.35,
      randomnessDelta: 0.1,
      kingDepthBoost: 1,
      kingSafeOffset: 3,
      queenBacklineBias: 1.35,
      archerControlBias: 1.15,
      knightMobilityBias: 0.9,
      soldierControlBias: 1.25,
      sentryCount: 4,
      ringMin: 4,
      pieceOrder: 'defensive',
      laneTarget: 0.5,
      depthTarget: 0.78,
      spatialIntensity: 1.1
    },
    {
      name: 'spearhead',
      safetyDelta: -0.25,
      frontlineDelta: 0.7,
      randomnessDelta: 0.45,
      kingDepthBoost: 0,
      kingSafeOffset: 2,
      queenBacklineBias: 0.75,
      archerControlBias: 1.2,
      knightMobilityBias: 1.35,
      soldierControlBias: 1.3,
      sentryCount: 2,
      ringMin: 3,
      pieceOrder: 'aggressive',
      laneTarget: 0.5,
      depthTarget: 0.4,
      spatialIntensity: 1.15
    },
    {
      name: 'flank-pressure',
      safetyDelta: 0.15,
      frontlineDelta: 0.35,
      randomnessDelta: 0.55,
      kingDepthBoost: 0,
      kingSafeOffset: 2,
      queenBacklineBias: 0.95,
      archerControlBias: 1.05,
      knightMobilityBias: 1.2,
      soldierControlBias: 1.15,
      sentryCount: 3,
      ringMin: 3,
      pieceOrder: 'flank',
      laneTarget: 0.25,
      depthTarget: 0.56,
      spatialIntensity: 1.2
    },
    {
      name: 'right-hook',
      safetyDelta: -0.05,
      frontlineDelta: 0.5,
      randomnessDelta: 0.75,
      kingDepthBoost: 0,
      kingSafeOffset: 2,
      queenBacklineBias: 0.85,
      archerControlBias: 1.25,
      knightMobilityBias: 1.4,
      soldierControlBias: 1.2,
      sentryCount: 2,
      ringMin: 3,
      pieceOrder: 'flank',
      laneTarget: 0.75,
      depthTarget: 0.5,
      spatialIntensity: 1.3
    },
    {
      name: 'center-crush',
      safetyDelta: 0.05,
      frontlineDelta: 0.55,
      randomnessDelta: 0.65,
      kingDepthBoost: 0,
      kingSafeOffset: 2,
      queenBacklineBias: 0.9,
      archerControlBias: 1.1,
      knightMobilityBias: 1.25,
      soldierControlBias: 1.35,
      sentryCount: 3,
      ringMin: 3,
      pieceOrder: 'aggressive',
      laneTarget: 0.5,
      depthTarget: 0.48,
      spatialIntensity: 1.25
    }
  ];

  const style = { ...baseStyles[styleIndex] };

  if (personality === AI_PERSONALITIES.DEFENSIVE) {
    style.safetyDelta += 0.45;
    style.frontlineDelta -= 0.2;
    style.ringMin = Math.max(style.ringMin, 4);
    style.sentryCount = Math.max(style.sentryCount, 3);
  } else if (personality === AI_PERSONALITIES.AGGRESSIVE) {
    style.safetyDelta -= 0.15;
    style.frontlineDelta += 0.35;
    style.knightMobilityBias += 0.1;
  }

  return style;
}

function getAIZoneBounds(map) {
  const aiCells = getAICells(map);
  if (!aiCells.length) {
    return { minX: 0, maxX: 1, minY: 0, maxY: 1, spanX: 1, spanY: 1 };
  }

  const xs = aiCells.map(c => c.x);
  const ys = aiCells.map(c => c.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    minX,
    maxX,
    minY,
    maxY,
    spanX: Math.max(1, maxX - minX),
    spanY: Math.max(1, maxY - minY)
  };
}

function styleSpatialBias(cell, map, style = {}, unitType = 'soldier') {
  const bounds = getAIZoneBounds(map);
  const rx = (cell.x - bounds.minX) / bounds.spanX;
  const ry = (cell.y - bounds.minY) / bounds.spanY;
  const laneTarget = typeof style.laneTarget === 'number' ? style.laneTarget : 0.5;
  const depthTarget = typeof style.depthTarget === 'number' ? style.depthTarget : 0.6;
  const intensity = typeof style.spatialIntensity === 'number' ? style.spatialIntensity : 1.0;

  const laneBias = 1 - Math.min(1, Math.abs(ry - laneTarget) * 2);
  const depthBias = 1 - Math.min(1, Math.abs(rx - depthTarget) * 1.6);

  const base = (laneBias * 1.8) + (depthBias * 2.1);
  if (unitType === 'king') {
    return ((depthBias * 2.2) + (laneBias * 0.7)) * intensity;
  }
  if (unitType === 'queen') {
    return ((depthBias * 1.5) + (laneBias * 1.2)) * intensity;
  }
  if (unitType === 'knight') {
    return ((laneBias * 2.0) + (depthBias * 0.9)) * intensity;
  }
  if (unitType === 'archer') {
    return ((laneBias * 1.4) + (depthBias * 1.1)) * intensity;
  }

  return base * intensity;
}

function planDiversityScore(plan) {
  if (!Array.isArray(plan) || plan.length === 0) return 0;

  const xs = plan.map(step => step.x);
  const ys = plan.map(step => step.y);
  const centroidX = xs.reduce((a, b) => a + b, 0) / plan.length;
  const centroidY = ys.reduce((a, b) => a + b, 0) / plan.length;

  const spread = plan.reduce((acc, step) => {
    const dx = step.x - centroidX;
    const dy = step.y - centroidY;
    return acc + Math.sqrt((dx * dx) + (dy * dy));
  }, 0) / plan.length;

  const uniqueRows = new Set(plan.map(step => step.y)).size;
  const uniqueCols = new Set(plan.map(step => step.x)).size;
  return spread + (uniqueRows * 0.22) + (uniqueCols * 0.22);
}

// ===============================
// تقييم الأمان
// ===============================
function safetyScore(cell, map, weights) {
  const dist = frontlineDistance(cell, map);
  const terrainBonus = cell.type === 'mountain' ? 3 : 0;
  const waterPenalty = cell.type === 'water' ? -5 : 0;
  const neighborSafety = realSafety(cell, map) * 1.5;

  return dist * weights.safety + terrainBonus + neighborSafety + waterPenalty;
}

function pickBest(cells, scorer, randomness) {
  const scored = cells.map(c => ({
    c,
    s: scorer(c) + noise(randomness)
  }));

  scored.sort((a, b) => b.s - a.s);
  return scored[0]?.c;
}

// ===============================
// 👑 الملك الآمن جدًا
// ===============================
function placeKing(map, plan, occ, weights, style = {}) {
  const aiCells = getAICells(map);

  // استبعاد خط المواجهة وحدّ الفصل
  let candidates = aiCells.filter(c =>
    c.type !== 'water' &&
    !isOnFrontline(c, map) &&
    !isBoundaryCell(c, map) &&
    !isBoardEdgeCell(c, map)
  );

  // لو قليلين -> صف خلفي إجباري مع عزل عن الحد
  if (candidates.length < 5) {
    const safeX = centerLineX(map) + (style.kingSafeOffset || 2);
    candidates = aiCells.filter(c =>
      c.type !== 'water' &&
      c.x >= safeX &&
      !isBoundaryCell(c, map) &&
      !isBoardEdgeCell(c, map)
    );
  }

  // fallback مرن لو الخريطة ضيقة جدًا
  if (candidates.length === 0) {
    candidates = aiCells.filter(c =>
      c.type === 'land' &&
      !isOnFrontline(c, map)
    );
  }

  let best = pickBest(
    candidates.filter(c => !occ.has(key(c))),
    c => safeCellScore(c, map, weights, occ, 'king') + styleSpatialBias(c, map, style, 'king'),
    weights.randomness
  );

  // fallback نهائي
  if (!best) {
    best = aiCells.find(c =>
      c.type === 'land' &&
      c.x > centerLineX(map) + (1 + (style.kingDepthBoost || 0)) &&
      !isBoardEdgeCell(c, map)
    );
  }

  if (!best) {
    best = aiCells.find(c => c.type !== 'water');
  }

  if (!best) return null;

  occ.add(key(best));
  plan.push({ unit: 'king', x: best.x, y: best.y });
  return best;
}

// ===============================
// حلقة الحماية
// ===============================
function deployKingGuardRing(kingCell, map, plan, occ) {
  if (!kingCell) return [];

  const ring = [];
  const ringKeys = new Set();

  const firstRing = getNeighbors(kingCell, map)
    .filter(c => c.zone === 'ai' && c.type !== 'water' && !isBoundaryCell(c, map) && !isBoardEdgeCell(c, map))
    .sort((a, b) => realSafety(b, map) - realSafety(a, map));

  firstRing.forEach(cell => {
    if (occ.has(key(cell)) || ringKeys.has(key(cell))) return;
    ring.push(cell);
    ringKeys.add(key(cell));
  });

  // fallback: توسيع حلقة الحماية من مستوى ثاني
  if (ring.length < 4) {
    const secondRing = firstRing
      .flatMap(c => getNeighbors(c, map))
      .filter(c => c.zone === 'ai' && c.type === 'land' && !isBoundaryCell(c, map) && !isBoardEdgeCell(c, map))
      .sort((a, b) => safeCellScore(b, map, { safety: 1.4 }, occ, 'soldier') - safeCellScore(a, map, { safety: 1.4 }, occ, 'soldier'));

    secondRing.forEach(cell => {
      if (ring.length >= 6) return;
      if (occ.has(key(cell)) || ringKeys.has(key(cell)) || key(cell) === key(kingCell)) return;
      ring.push(cell);
      ringKeys.add(key(cell));
    });
  }

  ring.forEach(cell => occ.add(key(cell)));
  return ring;
}

// ===============================
// حراس الملك
// ===============================
function deployKingGuards(ringCells, plan) {
  ringCells.slice(0, 4).forEach((c, i) => {
    plan.push({
      unit: i === 0 ? 'knight' : 'soldier',
      x: c.x,
      y: c.y,
      role: 'guard'
    });
  });
}

// ===============================
// الوزير
// ===============================
function placeQueen(kingCell, map, plan, occ, weights, style = {}) {
  const ai = getAICells(map);
  const queenBacklineBias = style.queenBacklineBias || 1.0;

  const best = pickBest(
    ai.filter(c => !occ.has(key(c)) && c.type !== 'water' && !isBoardEdgeCell(c, map)),
    c =>
      safeCellScore(c, map, weights, occ, 'queen') +
      mobilityScore(c, map, occ, 'queen') +
      styleSpatialBias(c, map, style, 'queen') -
      (Math.abs(c.x - kingCell.x) * queenBacklineBias),
    weights.randomness
  );

  if (!best) return;

  occ.add(key(best));
  plan.push({ unit: 'queen', x: best.x, y: best.y });
}

// ===============================
// الرماة
// ===============================
function placeArchers(map, plan, occ, weights, style = {}) {
  const archCells = getAICells(map).filter(c => c.type !== 'water');
  const archerControlBias = style.archerControlBias || 1.0;

  for (let i = 0; i < 2; i++) {
    const best = pickBest(
      archCells.filter(c => !occ.has(key(c))),
      c =>
        frontlineDistance(c, map) * weights.frontline +
        (realSafety(c, map) * 0.6) +
        mobilityScore(c, map, occ, 'archer') +
        (controlPressureScore(c, map, occ, 'archer') * archerControlBias) +
        styleSpatialBias(c, map, style, 'archer') +
        boardEdgePenalty(c, map),
      weights.randomness
    );

    if (best) {
      occ.add(key(best));
      plan.push({ unit: 'archer', x: best.x, y: best.y });
    }
  }
}

// ===============================
// الفرسان
// ===============================
function placeKnights(features, map, plan, occ, weights, style = {}) {
  const pool = [...features.mountains, ...getAICells(map)];
  const knightMobilityBias = style.knightMobilityBias || 1.0;

  for (let i = 0; i < 2; i++) {
    const best = pickBest(
      pool.filter(c => !occ.has(key(c))),
      c =>
        frontlineDistance(c, map) * weights.frontline +
        safeCellScore(c, map, weights, occ, 'knight') * 0.35 +
        mobilityScore(c, map, occ, 'knight') * (1.3 * knightMobilityBias) +
        styleSpatialBias(c, map, style, 'knight') +
        controlPressureScore(c, map, occ, 'knight'),
      weights.randomness
    );

    if (best) {
      occ.add(key(best));
      plan.push({ unit: 'knight', x: best.x, y: best.y });
    }
  }
}

// ===============================
// المراكب
// ===============================
function placeBoats(features, plan, occ) {
  features.water.slice(0, 2).forEach(w => {
    if (!occ.has(key(w))) {
      occ.add(key(w));
      plan.push({ unit: 'boat', x: w.x, y: w.y });
    }
  });
}

// ===============================
// الجنود
// ===============================
function placeSoldiers(map, plan, occ, weights, style = {}) {
  const land = getAICells(map).filter(c => c.type === 'land');
  const soldierControlBias = style.soldierControlBias || 1.0;

  const frontlineLand = land.filter(c =>
    !occ.has(key(c)) &&
    frontlineDistance(c, map) <= 1 &&
    !isBoardEdgeCell(c, map)
  );

  const sentryCount = Math.min(style.sentryCount || 3, frontlineLand.length, 8);

  for (let i = 0; i < sentryCount; i++) {
    const sentry = pickBest(
      frontlineLand.filter(c => !occ.has(key(c))),
      c =>
        controlPressureScore(c, map, occ, 'soldier') +
        mobilityScore(c, map, occ, 'soldier') +
        styleSpatialBias(c, map, style, 'soldier') +
        safeCellScore(c, map, weights, occ, 'soldier') * 0.2,
      weights.randomness * 0.6
    );

    if (sentry) {
      occ.add(key(sentry));
      plan.push({ unit: 'soldier', x: sentry.x, y: sentry.y, role: 'control' });
    }
  }

  for (let i = sentryCount; i < 8; i++) {
    const best = pickBest(
      land.filter(c => !occ.has(key(c))),
      c =>
        frontlineDistance(c, map) * weights.frontline * 0.55 +
        safeCellScore(c, map, weights, occ, 'soldier') * 0.25 +
        (controlPressureScore(c, map, occ, 'soldier') * soldierControlBias) +
        mobilityScore(c, map, occ, 'soldier') +
        styleSpatialBias(c, map, style, 'soldier'),
      weights.randomness
    );

    if (best) {
      occ.add(key(best));
      plan.push({ unit: 'soldier', x: best.x, y: best.y });
    }
  }
}

// ===============================
// الدالة الرئيسية
// ===============================
function buildAIPlan(map, personality = AI_PERSONALITIES.REALISTIC, variationSeed = 0) {
  const plan = [];
  const occ = new Set();

  const weights = getPersonalityWeights(personality);
  const style = getDeploymentStyle(personality, variationSeed);
  const variedWeights = {
    safety: weights.safety + style.safetyDelta,
    frontline: weights.frontline + style.frontlineDelta,
    randomness: weights.randomness + style.randomnessDelta + ((Math.abs(variationSeed % 5)) * 0.18)
  };
  const features = analyzeMap(map);

  // 👑 الملك
  let kingCell = placeKing(map, plan, occ, variedWeights, style);
  if (!kingCell) return plan;

  // حلقة الحماية
  let guardRing = deployKingGuardRing(kingCell, map, plan, occ);

  // لو الحماية ضعيفة -> إعادة تموضع
  if (guardRing.length < (style.ringMin || 3)) {
    const fallback = getAICells(map)
      .filter(c => c.x > kingCell.x + 1 && c.type === 'land' && !isBoundaryCell(c, map) && !isBoardEdgeCell(c, map))
      .sort((a, b) => safeCellScore(b, map, variedWeights, occ, 'king') - safeCellScore(a, map, variedWeights, occ, 'king'))[0];

    if (fallback) {
      plan.pop();
      occ.delete(key(kingCell));

      occ.add(key(fallback));
      plan.push({ unit: 'king', x: fallback.x, y: fallback.y });

      kingCell = fallback;
      guardRing = deployKingGuardRing(kingCell, map, plan, occ);
    }
  }

  // نشر الحراس
  deployKingGuards(guardRing, plan);

  // باقي الجيش
  if (style.pieceOrder === 'aggressive') {
    placeKnights(features, map, plan, occ, variedWeights, style);
    placeArchers(map, plan, occ, variedWeights, style);
    placeQueen(kingCell, map, plan, occ, variedWeights, style);
  } else if (style.pieceOrder === 'defensive') {
    placeQueen(kingCell, map, plan, occ, variedWeights, style);
    placeArchers(map, plan, occ, variedWeights, style);
    placeKnights(features, map, plan, occ, variedWeights, style);
  } else if (style.pieceOrder === 'flank') {
    placeArchers(map, plan, occ, variedWeights, style);
    placeKnights(features, map, plan, occ, variedWeights, style);
    placeQueen(kingCell, map, plan, occ, variedWeights, style);
  } else {
    placeQueen(kingCell, map, plan, occ, variedWeights, style);
    placeArchers(map, plan, occ, variedWeights, style);
    placeKnights(features, map, plan, occ, variedWeights, style);
  }
  placeBoats(features, plan, occ);
  placeSoldiers(map, plan, occ, variedWeights, style);

  return plan;
}

export function generateAIPlan(map, personality = AI_PERSONALITIES.REALISTIC) {
  const mSig = mapSignature(map);
  if (!planHistoryByMap.has(mSig)) {
    planHistoryByMap.set(mSig, loadPersistentPlanHistory(mSig));
  }

  const seen = planHistoryByMap.get(mSig);
  let selectedPlan = [];
  let selectedSig = '';
  const unseenCandidates = [];
  const seedBase = Math.floor(Math.random() * 10000) + (seen.size * 97);

  for (let attempt = 0; attempt < 24; attempt++) {
    const candidatePlan = buildAIPlan(map, personality, seedBase + (attempt * 37));
    const candidateSig = planSignature(candidatePlan);
    if (!seen.has(candidateSig)) {
      unseenCandidates.push({
        plan: candidatePlan,
        sig: candidateSig,
        diversity: planDiversityScore(candidatePlan)
      });
    }
  }

  if (unseenCandidates.length > 0) {
    const ranked = unseenCandidates.sort((a, b) => b.diversity - a.diversity);
    const topWindow = ranked.slice(0, Math.min(8, ranked.length));
    const pickIdx = Math.floor(Math.random() * topWindow.length);
    selectedPlan = topWindow[pickIdx].plan;
    selectedSig = topWindow[pickIdx].sig;
  }

  if (!selectedPlan.length) {
    selectedPlan = buildAIPlan(map, personality, Math.floor(Math.random() * 100));
    selectedSig = planSignature(selectedPlan);
  }

  seen.add(selectedSig);
  savePersistentPlanHistory(mSig, seen);
  return selectedPlan;
}
