function hasLocationChanged(previous, next) {
  if (!previous || !next) return true;
  return Number(previous.latitude) !== Number(next.latitude)
    || Number(previous.longitude) !== Number(next.longitude)
    || String(previous.timezone || "") !== String(next.timezone || "");
}

module.exports = { hasLocationChanged };
