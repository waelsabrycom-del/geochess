
// ========== ظ…طھط؛ظٹط±ط§طھ ط¹ط§ظ…ط© ==========
let mapSize = 8;
let cellSize = 40;
let cellGap = 2;
let mapData = {};
let previewSyncTimer = null;
let lastUnitsSignature = '';

// ========== ط§ظ„ط¯ظˆط§ظ„ ط§ظ„ط£ط³ط§ط³ظٹط© ==========

// ط¬ظ„ط¨ ظ…ط¹ط±ظ‘ظپ ط§ظ„ظ…ط¹ط±ظƒط© ظ…ظ† URL
function getGameIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('gameId');
}

// طھط­ظ…ظٹظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط¹ط±ظƒط©
async function loadBattleData() {
  const gameId = getGameIdFromURL();
  
  if (!gameId) {
    showError('â‌Œ ظ…ط¹ط±ظ‘ظپ ط§ظ„ظ…ط¹ط±ظƒط© ط؛ظٹط± ظ…ظˆط¬ظˆط¯ ظپظٹ ط§ظ„ط±ط§ط¨ط·');
    return;
  }
  
  try {
    const API_URL = `${window.location.origin}/api`;
    console.log(`ًں“¥ ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط¹ط±ظƒط© ط±ظ‚ظ…: ${gameId}`);
    
    const response = await fetch(`${API_URL}/games/${gameId}`);
    const data = await response.json();
    
    if (!data.success || !data.game) {
      showError('â‌Œ ط§ظ„ظ…ط¹ط±ظƒط© ط؛ظٹط± ظ…ظˆط¬ظˆط¯ط© ط£ظˆ طھظˆظ‚ظپطھ');
      return;
    }
    
    mapData = data.game;
    console.log('âœ… طھظ… طھط­ظ…ظٹظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط¹ط±ظƒط©:', mapData);
    
    // طھط­ط¯ظٹط« ط§ظ„ظ…ط¹ظ„ظˆظ…ط§طھ ط§ظ„ط£ط³ط§ط³ظٹط©
    updateBattleInfo();
    
    // طھط­ظ…ظٹظ„ ط§ظ„ط®ط±ظٹط·ط© ظˆط¹ط±ط¶ ط§ظ„ظˆط­ط¯ط§طھ
    await initializePreview();

    // ط¨ط¯ط، ظ…ط²ط§ظ…ظ†ط© ط§ظ„طھط­ط±ظƒط§طھ ط§ظ„ط­ظٹط© ظ„ظ„ظ…ط¹ط§ظٹظ†ط©
    startPreviewAutoSync();
    
    // ط¥ط®ظپط§ط، ط­ط§ظ„ط© ط§ظ„طھط­ظ…ظٹظ„
    const loadingState = document.getElementById('loading-state');
    if (loadingState) {
      loadingState.style.display = 'none';
    }
    
  } catch(err) {
    console.error('â‌Œ ط®ط·ط£ ظپظٹ طھط­ظ…ظٹظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط¹ط±ظƒط©:', err);
    showError('â‌Œ ط­ط¯ط« ط®ط·ط£ ظپظٹ طھط­ظ…ظٹظ„ ط§ظ„ظ…ط¹ط±ظƒط©');
  }
}

function buildUnitsSignature(unitsList) {
  return (unitsList || [])
    .map((unit) => `${unit.type || 'unknown'}:${unit.row},${unit.col}:${unit.color || 'white'}`)
    .sort()
    .join('|');
}

function clearRenderedUnits() {
  document.querySelectorAll('.map-cell .placed-unit').forEach((unit) => unit.remove());
}

// طھط­ط¯ظٹط« ظ…ط¹ظ„ظˆظ…ط§طھ ط§ظ„ظ…ط¹ط±ظƒط©
function updateBattleInfo() {
  // ط§ط³ظ… ط§ظ„ظ…ط¹ط±ظƒط©
  const battleNameEl = document.getElementById('battle-name-display');
  if (battleNameEl && mapData.game_name) {
    battleNameEl.textContent = mapData.game_name;
  }
  
  // ط§ط³ظ… ط§ظ„ط®ط±ظٹط·ط©
  const mapNameEl = document.getElementById('map-name-display');
  if (mapNameEl && mapData.map_name) {
    mapNameEl.textContent = mapData.map_name;
  }
  
  // ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ„ط§ط¹ط¨ظٹظ†
  const player1Name = mapData.host_name || 'ط§ظ„ظ„ط§ط¹ط¨ 1';
  const player2Name = mapData.guest_name || 'ط§ظ„ظ„ط§ط¹ط¨ 2';
  const player1Color = mapData.host_color || 'white';
  const player2Color = mapData.guest_color || 'black';
  
  // طھط­ط¯ظٹط« ط£ط³ظ…ط§ط، ط§ظ„ظ„ط§ط¹ط¨ظٹظ†
  document.getElementById('player1-preview-name').textContent = player1Name;
  document.getElementById('player2-preview-name').textContent = player2Name;
  
  // طھط­ط¯ظٹط« ط£ظ„ظˆط§ظ† ط§ظ„ط¹ظ„ظ…
  const player1Flag = document.getElementById('player1-preview-flag');
  const player2Flag = document.getElementById('player2-preview-flag');
  
  if (player1Flag) {
    player1Flag.style.backgroundColor = player1Color === 'white' ? '#ffffff' : '#000000';
  }
  if (player2Flag) {
    player2Flag.style.backgroundColor = player2Color === 'white' ? '#ffffff' : '#000000';
  }
}

// ط¯ط§ظ„ط© ظ…ط³ط§ط¹ط¯ط© ظ„طھط­ظ…ظٹظ„ ط§ظ„ط®ط±ظٹط·ط© ظ…ظ† ط§ظ„ط³ظٹط±ظپط± (ط¨ط­ط« ط°ظƒظٹ ط¹ظ† ط§ظ„ظ…ظ„ظپ)
async function loadMapFile(mapName) {
  const API_URL = `${window.location.origin}/api`;
  
  try {
    // ط·ظ„ط¨ ظ…ظ† ط§ظ„ط³ظٹط±ظپط± ظ„ظ„ط¨ط­ط« ط¹ظ† ط§ظ„ظ…ظ„ظپ
    const response = await fetch(`${API_URL}/maps/find/${mapName}`);
    const result = await response.json();
    
    if (result.success && result.data) {
      console.log(`âœ… طھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ظ…ظ„ظپ ط§ظ„ط®ط±ظٹط·ط©: ${result.filename}`);
      return result.data;
    } else {
      throw new Error(result.message || 'ظ„ظ… ظٹطھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ط§ظ„ط®ط±ظٹط·ط©');
    }
  } catch(err) {
    console.warn(`âڑ ï¸ڈ ظپط´ظ„ ط§ظ„ط¨ط­ط« ط¹ظ† ${mapName}:`, err.message);
    throw err;
  }
}

// طھظˆط­ظٹط¯ ط´ظƒظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„ط®ط±ظٹط·ط© (ظٹط¯ط¹ظ… grid ط§ظ„ظ‚ط¯ظٹظ…ط© ظˆ data ط§ظ„ط¬ط¯ظٹط¯ط©)
function normalizeMapGrid(mapFile) {
  if (!mapFile) return null;

  if (Array.isArray(mapFile.grid)) {
    return mapFile.grid;
  }

  if (Array.isArray(mapFile.data)) {
    const width = Number(mapFile.width) || 8;
    const height = Number(mapFile.height) || 8;
    const grid = Array.from({ length: height }, () => Array(width).fill('plain'));

    mapFile.data.forEach((cell) => {
      const row = Number(cell.row);
      const col = Number(cell.col);
      if (Number.isNaN(row) || Number.isNaN(col)) return;
      if (row < 0 || row >= height || col < 0 || col >= width) return;

      const terrain = cell.type === 'normal' ? 'plain' : cell.type;
      grid[row][col] = terrain || 'plain';
    });

    return grid;
  }

  return null;
}

// طھظ‡ظٹط¦ط© ظ…ط¹ط§ظٹظ†ط© ط§ظ„ط®ط±ظٹط·ط©
async function initializePreview() {
  try {
    // ط¬ظ„ط¨ ط¨ظٹط§ظ†ط§طھ ط§ظ„ط®ط±ظٹط·ط© ط§ظ„ط¯ظٹظ†ط§ظ…ظٹظƒظٹط©
    const gameSettings = mapData.game_settings ? JSON.parse(mapData.game_settings) : {};
    const mapName = gameSettings.mapName || mapData.map_name || '8X8_2026';
    
    console.log(`ًں—؛ï¸ڈ ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ ط§ظ„ط®ط±ظٹط·ط©: ${mapName}`);
    
    // ط¬ظ„ط¨ ظ…ظ„ظپ ط§ظ„ط®ط±ظٹط·ط© ظ…ط¹ ط§ظ„ط¨ط­ط« ط§ظ„ط°ظƒظٹ
    const mapFile = await loadMapFile(mapName);
    const normalizedGrid = normalizeMapGrid(mapFile);
    
    if (!normalizedGrid) {
      throw new Error('â‌Œ ظ…ظ„ظپ ط§ظ„ط®ط±ظٹط·ط© ط؛ظٹط± طµط­ظٹط­');
    }
    
    mapSize = normalizedGrid.length;
    
    // طھط¹ظٹظٹظ† ط­ط¬ظ… ط§ظ„ط®ظ„ظٹط© ط¨ظ†ط§ط،ظ‹ ط¹ظ„ظ‰ ط­ط¬ظ… ط§ظ„ط®ط±ظٹط·ط©
    cellSize = Math.max(24, Math.min(50, 500 / mapSize));
    cellGap = Math.max(1, Math.floor(cellSize / 15));
    
    // طھط­ط¯ظٹط« CSS variables
    const wrapper = document.getElementById('map-grid-wrapper');
    wrapper.style.setProperty('--cell-size', `${cellSize}px`);
    wrapper.style.setProperty('--cell-gap', `${cellGap}px`);
    
    // ط¨ظ†ط§ط، ط§ظ„ط®ط±ظٹط·ط©
    buildMapGrid(normalizedGrid);
    
    // ط¹ط±ط¶ ط§ظ„ظˆط­ط¯ط§طھ ط§ظ„ظ…ظˆط¶ظˆط¹ط©
    await displayPlacedUnits();
    
    console.log('âœ… طھظ… طھظ‡ظٹط¦ط© ظ…ط¹ط§ظٹظ†ط© ط§ظ„ط®ط±ظٹط·ط©');
    
  } catch(err) {
    console.error('â‌Œ ط®ط·ط£ ظپظٹ طھظ‡ظٹط¦ط© ط§ظ„ظ…ط¹ط§ظٹظ†ط©:', err);
    
    // ظ…ط­ط§ظˆظ„ط© ط¥ظ†ط´ط§ط، ط®ط±ظٹط·ط© ط§ظپطھط±ط§ط¶ظٹط© ط¨ط¯ظ„ط§ظ‹ ظ…ظ† ط§ظ„ظپط´ظ„ ط§ظ„ظƒط§ظ…ظ„
    console.log('ًں”„ ظ…ط­ط§ظˆظ„ط© ط¥ظ†ط´ط§ط، ط®ط±ظٹط·ط© ط§ظپطھط±ط§ط¶ظٹط©...');
    try {
      // ط¥ظ†ط´ط§ط، ط®ط±ظٹط·ط© ط¨ط­ط¬ظ… 8x8 ط§ظپطھط±ط§ط¶ظٹ
      const defaultGridSize = 8;
      const defaultGrid = [];
      for (let i = 0; i < defaultGridSize; i++) {
        defaultGrid[i] = [];
        for (let j = 0; j < defaultGridSize; j++) {
          // ط¹ط´ظˆط§ط¦ظٹ ط¨ظٹظ† plain ظˆ water ط¨ط´ظƒظ„ ط¨ط³ظٹط·
          defaultGrid[i][j] = Math.random() > 0.8 ? 'water' : 'plain';
        }
      }
      
      mapSize = defaultGridSize;
      cellSize = 50;
      cellGap = 2;
      
      const wrapper = document.getElementById('map-grid-wrapper');
      wrapper.style.setProperty('--cell-size', `${cellSize}px`);
      wrapper.style.setProperty('--cell-gap', `${cellGap}px`);
      
      buildMapGrid(defaultGrid);
      await displayPlacedUnits();
      
      console.log('âœ… طھظ… ط¥ظ†ط´ط§ط، ط®ط±ظٹط·ط© ط§ظپطھط±ط§ط¶ظٹط©');
      
      // ط¹ط±ط¶ طھظ†ط¨ظٹظ‡ ظ„ظ„ظ…ط³طھط®ط¯ظ…
      const mapNameEl = document.getElementById('map-name-display');
      if (mapNameEl) {
        mapNameEl.textContent = 'ط®ط±ظٹط·ط© ط§ظپطھط±ط§ط¶ظٹط©';
      }
    } catch(fallbackErr) {
      console.error('â‌Œ ظپط´ظ„ ط­طھظ‰ ط¥ظ†ط´ط§ط، ط§ظ„ط®ط±ظٹط·ط© ط§ظ„ط§ظپطھط±ط§ط¶ظٹط©:', fallbackErr);
      showError(`â‌Œ ظپط´ظ„ طھط­ظ…ظٹظ„ ط§ظ„ط®ط±ظٹط·ط©: ${err.message}`);
    }
  }

}

// ط¨ظ†ط§ط، ط´ط¨ظƒط© ط§ظ„ط®ط±ظٹط·ط©
function buildMapGrid(grid) {
  const mapGrid = document.getElementById('map-grid');
  const axisTop = document.getElementById('map-axis-top');
  const axisRight = document.getElementById('map-axis-right');
  
  mapGrid.innerHTML = '';
  axisTop.innerHTML = '';
  axisRight.innerHTML = '';
  
  // ظ…ط­ط§ظˆط± ط§ظ„ط£ظپظ‚ظٹط© (ط§ظ„ط­ط±ظˆظپ)
  for (let col = 0; col < mapSize; col++) {
    const cell = document.createElement('div');
    cell.textContent = String.fromCharCode(65 + col);
    axisTop.appendChild(cell);
  }
  
  // ظ…ط­ط§ظˆط± ط§ظ„ط¹ظ…ظˆط¯ظٹط© (ط§ظ„ط£ط±ظ‚ط§ظ…)
  for (let row = 0; row < mapSize; row++) {
    const cell = document.createElement('div');
    cell.textContent = mapSize - row;
    axisRight.appendChild(cell);
  }
  
  // ط¨ظ†ط§ط، ط§ظ„ط®ظ„ط§ظٹط§
  mapGrid.style.gridTemplateColumns = `repeat(${mapSize}, var(--cell-size, 40px))`;
  
  for (let row = 0; row < mapSize; row++) {
    for (let col = 0; col < mapSize; col++) {
      const cell = document.createElement('div');
      cell.className = 'map-cell hover:bg-white/5 transition-colors relative';
      cell.setAttribute('data-row', row);
      cell.setAttribute('data-col', col);
      const isBlack = (row + col) % 2 === 0;
      const terrain = grid[row] && grid[row][col] ? grid[row][col] : 'plain';
      
      // ظ†ظپط³ ظ†ظ…ط· طµظپط­ط© ط§ظ„ظ„ط¹ط¨ط©: ط±ظ‚ط¹ط© ط´ط·ط±ظ†ط¬ + طھط¶ط§ط±ظٹط³
      if (terrain === 'water') {
        cell.classList.add('cell-water');
        cell.style.backgroundColor = 'rgba(59, 130, 246, 0.7)';
      } else if (terrain === 'mountain') {
        cell.classList.add('cell-mountain', 'mountain-cell');
        cell.style.backgroundColor = isBlack ? '#4a4a4a' : '#e2e2e2';
        cell.setAttribute('data-is-black', isBlack ? 'true' : 'false');
      } else if (terrain === 'forest') {
        cell.classList.add('cell-forest');
        cell.style.backgroundColor = 'rgba(21, 128, 61, 0.6)';
      } else {
        // plain / normal
        cell.style.backgroundColor = isBlack ? '#4a4a4a' : '#e2e2e2';
      }
      
      mapGrid.appendChild(cell);
    }
  }
  
  console.log(`âœ… طھظ… ط¨ظ†ط§ط، ط´ط¨ظƒط© ${mapSize}x${mapSize}`);
}

// ط¬ظ„ط¨ ط§ظ„ظˆط­ط¯ط§طھ ظ…ظ† API ظƒط¨ط¯ظٹظ„ ط¹ظ†ط¯ظ…ط§ طھظƒظˆظ† placed_units_data ظپط§ط±ط؛ط©
async function loadUnitsFromApi() {
  const gameId = getGameIdFromURL();
  if (!gameId) return [];

  const API_URL = `${window.location.origin}/api`;
  const response = await fetch(`${API_URL}/games/${gameId}/units`);
  const data = await response.json();

  if (!data.success || !data.units) {
    return [];
  }

  const player1Units = Array.isArray(data.units.player1Units) ? data.units.player1Units : [];
  const player2Units = Array.isArray(data.units.player2Units) ? data.units.player2Units : [];
  return [...player1Units, ...player2Units];
}

// ط¹ط±ط¶ ط§ظ„ظˆط­ط¯ط§طھ ط§ظ„ظ…ظˆط¶ظˆط¹ط©
async function displayPlacedUnits() {
  try {
    let unitsList = [];

    if (mapData.placed_units_data) {
      const placedUnits = typeof mapData.placed_units_data === 'string'
        ? JSON.parse(mapData.placed_units_data)
        : mapData.placed_units_data;

      unitsList = Object.entries(placedUnits).map(([posKey, unit]) => {
        const [row, col] = String(posKey).split(',').map(Number);
        return {
          row,
          col,
          type: unit?.type,
          name: unit?.name,
          color: unit?.color
        };
      });
      console.log(`ًںژ® ط¹ط¯ط¯ ط§ظ„ظˆط­ط¯ط§طھ ط§ظ„ظ…ظˆط¶ظˆط¹ط© (ظ…ظ† game): ${unitsList.length}`);
    } else {
      unitsList = await loadUnitsFromApi();
      console.log(`ًںژ® ط¹ط¯ط¯ ط§ظ„ظˆط­ط¯ط§طھ ط§ظ„ظ…ظˆط¶ظˆط¹ط© (ظ…ظ† units API): ${unitsList.length}`);
    }

    const nextSignature = buildUnitsSignature(unitsList);
    if (nextSignature === lastUnitsSignature) {
      return;
    }

    // ظ…ط³ط­ ط§ظ„ظˆط­ط¯ط§طھ ط§ظ„ظ‚ط¯ظٹظ…ط© ظ‚ط¨ظ„ ط¥ط¹ط§ط¯ط© ط§ظ„ط±ط³ظ… (ظ„ط¥ط¸ظ‡ط§ط± ط§ظ„طھط­ط±ظƒط§طھ ط¨ط´ظƒظ„ طµط­ظٹط­)
    clearRenderedUnits();

    if (!unitsList.length) {
      lastUnitsSignature = nextSignature;
      console.log('âڑ ï¸ڈ ظ„ط§ طھظˆط¬ط¯ ظˆط­ط¯ط§طھ ظ…ظˆط¶ظˆط¹ط©');
      return;
    }
    
    for (const unit of unitsList) {
      const row = Number(unit.row);
      const col = Number(unit.col);
      if (Number.isNaN(row) || Number.isNaN(col)) continue;
      
      const cell = document.querySelector(`.map-cell[data-row="${row}"][data-col="${col}"]`);
      if (!cell) continue;
      
      const unitElement = document.createElement('div');
      unitElement.className = 'placed-unit';
      unitElement.setAttribute('data-unit-type', unit.type || 'unknown');
      unitElement.setAttribute('data-unit-color', unit.color || 'white');
      unitElement.style.cssText = 'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;';
      
      if (unit.html) {
        unitElement.innerHTML = unit.html;
      } else {
        const fallbackName = unit.name || unit.type || 'unit';
        unitElement.innerHTML = `<span style="font-size: 14px; color: ${unit.color === 'black' ? '#000' : '#fff'};">${fallbackName}</span>`;
      }
      
      cell.appendChild(unitElement);
    }

    lastUnitsSignature = nextSignature;
    
    console.log('âœ… طھظ… ط¹ط±ط¶ ط§ظ„ظˆط­ط¯ط§طھ ط§ظ„ظ…ظˆط¶ظˆط¹ط©');
    
  } catch(err) {
    console.error('â‌Œ ط®ط·ط£ ظپظٹ ط¹ط±ط¶ ط§ظ„ظˆط­ط¯ط§طھ:', err);
  }
}

// ظ…ط²ط§ظ…ظ†ط© ط¯ظˆط±ظٹط© ظ„ط¥ط¸ظ‡ط§ط± ط§ظ„طھط­ط±ظƒط§طھ ظ…ط¨ط§ط´ط±ط© ظپظٹ ط§ظ„ظ…ط¹ط§ظٹظ†ط©
async function syncPreviewUnits() {
  try {
    await displayPlacedUnits();
  } catch (err) {
    console.warn('âڑ ï¸ڈ ظپط´ظ„ ظ…ط²ط§ظ…ظ†ط© ط§ظ„ظ…ط¹ط§ظٹظ†ط©:', err?.message || err);
  }
}

function startPreviewAutoSync() {
  if (previewSyncTimer) {
    clearInterval(previewSyncTimer);
  }

  // طھط´ط؛ظٹظ„ ط£ظˆظ„ ظ…ط²ط§ظ…ظ†ط© ظ…ط¨ط§ط´ط±ط© ط«ظ… ظ…طھط§ط¨ط¹ط© ط¯ظˆط±ظٹط©
  syncPreviewUnits();
  previewSyncTimer = setInterval(syncPreviewUnits, 1500);
  console.log('ًں”„ طھظ… طھظپط¹ظٹظ„ ط§ظ„ظ…ط²ط§ظ…ظ†ط© ط§ظ„ط­ظٹط© ظ„ظ„ظ…ط¹ط§ظٹظ†ط© ظƒظ„ 1.5 ط«ط§ظ†ظٹط©');
}

// ط¹ط±ط¶ ط±ط³ط§ظ„ط© ط®ط·ط£
function showError(message) {
  const container = document.getElementById('preview-container');
  if (container) {
    container.innerHTML = `
      <div class="text-center">
        <span class="material-symbols-outlined text-6xl text-red-400">error</span>
        <p class="text-white font-bold mt-2">${message}</p>
        <button id="try-again-btn" class="mt-4 px-4 py-2 rounded bg-primary/20 border border-primary text-primary hover:bg-primary/30 transition-colors">
          ط¥ط¹ط§ط¯ط© ط§ظ„ظ…ط­ط§ظˆظ„ط©
        </button>
      </div>
    `;
    
    document.getElementById('try-again-btn')?.addEventListener('click', () => {
      window.location.reload();
    });
  }
  
  const loadingState = document.getElementById('loading-state');
  if (loadingState) {
    loadingState.style.display = 'none';
  }
}

// ط±ط¨ط· ط§ظ„ط£ط²ط±ط§ط±
document.addEventListener('DOMContentLoaded', () => {
  const backBtn = document.getElementById('back-to-home');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }
  
  // طھط­ظ…ظٹظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط¹ط±ظƒط©
  loadBattleData();
});

window.addEventListener('beforeunload', () => {
  if (previewSyncTimer) {
    clearInterval(previewSyncTimer);
    previewSyncTimer = null;
  }
});

console.log('âœ… طµظپط­ط© ظ…ط¹ط§ظٹظ†ط© ط§ظ„ظ…ط¹ط±ظƒط© ط¬ط§ظ‡ط²ط©');

