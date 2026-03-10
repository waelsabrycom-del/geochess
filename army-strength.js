(function () {
  const ARMY_POWER_WEIGHTS = {
    pawn: 1,
    knight: 10,
    archer: 4,
    rook: 3,
    queen: 40,
    king: 100
  };

  function toSafeNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  }

  function normalizeArmyCounts(input) {
    const counts = {
      pawn: 0,
      knight: 0,
      archer: 0,
      rook: 0,
      queen: 0,
      king: 0
    };

    if (Array.isArray(input)) {
      input.forEach((unit) => {
        const type = String(unit?.type || unit?.unitType || '').toLowerCase();
        if (type === 'pawn' || type === 'infantry') counts.pawn += 1;
        if (type === 'knight') counts.knight += 1;
        if (type === 'archer') counts.archer += 1;
        if (type === 'rook' || type === 'ship') counts.rook += 1;
        if (type === 'queen') counts.queen += 1;
        if (type === 'king') counts.king += 1;
      });
      return counts;
    }

    const source = input && typeof input === 'object' ? input : {};

    counts.pawn = toSafeNumber(source.pawn ?? source.infantry);
    counts.knight = toSafeNumber(source.knight);
    counts.archer = toSafeNumber(source.archer);
    counts.rook = toSafeNumber(source.rook ?? source.ship);
    counts.queen = toSafeNumber(source.queen);
    counts.king = toSafeNumber(source.king);

    return counts;
  }

  function calculateArmyStrength(input) {
    const counts = normalizeArmyCounts(input);

    return (
      counts.pawn * ARMY_POWER_WEIGHTS.pawn +
      counts.knight * ARMY_POWER_WEIGHTS.knight +
      counts.archer * ARMY_POWER_WEIGHTS.archer +
      counts.rook * ARMY_POWER_WEIGHTS.rook +
      counts.queen * ARMY_POWER_WEIGHTS.queen +
      counts.king * ARMY_POWER_WEIGHTS.king
    );
  }

  window.ARMY_POWER_WEIGHTS = ARMY_POWER_WEIGHTS;
  window.normalizeArmyCounts = normalizeArmyCounts;
  window.calculateArmyStrength = calculateArmyStrength;
})();
