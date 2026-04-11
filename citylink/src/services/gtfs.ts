import { LRT_STATIONS } from '../config';

/**
 * GTFS-RT Style Simulation Engine (Goal §6).
 * Maintains virtual train and bus positions in background.
 */

// Simulation constants
const NS_INTERVAL_MINS = 8;
const EW_INTERVAL_MINS = 10;
const BUS_INTERVAL_MINS = 15;

const TRANSIT_COLORS = {
  NS: '#22C97A', // Green Line
  EW: '#3D8EF0', // Blue Line
  BUS: '#F0A830', // Orange (Anbessa)
};

let _state = {
  trains: [],
  lastUpdate: Date.now(),
};

const _listeners = new Set<(trains: any[]) => void>();
let _timer = null;

// Initialize trains/buses based on current time to ensure consistency across reloads
function init() {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const seconds = now.getSeconds();

  const trains = [];

  // NS Line - 2 trains
  ['ns-a', 'ns-b'].forEach((id, i) => {
    const totalCycleSecs = NS_INTERVAL_MINS * 60;
    const offsetSecs = i * (totalCycleSecs / 2);
    const posSecs = (mins * 60 + seconds + offsetSecs) % totalCycleSecs;

    trains.push({
      id,
      line: 'NS',
      color: TRANSIT_COLORS.NS,
      name: 'LRT N–S (Green)',
      dir: i === 0 ? 'Southbound' : 'Northbound',
      stations: LRT_STATIONS.NS,
      etaSecs: totalCycleSecs - posSecs,
      stIdx: Math.floor((posSecs / totalCycleSecs) * LRT_STATIONS.NS.length),
      occupancy: 0.4 + Math.random() * 0.4,
      icon: 'train',
    });
  });

  // EW Line - 2 trains
  ['ew-a', 'ew-b'].forEach((id, i) => {
    const totalCycleSecs = EW_INTERVAL_MINS * 60;
    const offsetSecs = i * (totalCycleSecs / 2);
    const posSecs = (mins * 60 + seconds + offsetSecs) % totalCycleSecs;

    trains.push({
      id,
      line: 'EW',
      color: TRANSIT_COLORS.EW,
      name: 'LRT E–W (Blue)',
      dir: i === 0 ? 'Eastbound' : 'Westbound',
      stations: LRT_STATIONS.EW,
      etaSecs: totalCycleSecs - posSecs,
      stIdx: Math.floor((posSecs / totalCycleSecs) * LRT_STATIONS.EW.length),
      occupancy: 0.5 + Math.random() * 0.3,
      icon: 'train',
    });
  });

  // Anbessa/Sheger Buses - 3 buses
  ['bus-1', 'bus-2', 'bus-3'].forEach((id, i) => {
    const totalCycleSecs = BUS_INTERVAL_MINS * 60;
    const offsetSecs = i * (totalCycleSecs / 3);
    const posSecs = (mins * 60 + seconds + offsetSecs) % totalCycleSecs;

    trains.push({
      id,
      line: 'BUS',
      color: TRANSIT_COLORS.BUS,
      name: i === 2 ? 'Sheger Express' : 'Anbessa Bus',
      dir: 'City Loop',
      stations: ['Piazza', 'Bole', 'Mexico', 'Mercato', 'Stadium'],
      etaSecs: totalCycleSecs - posSecs,
      stIdx: Math.floor((posSecs / totalCycleSecs) * 5),
      occupancy: 0.6 + Math.random() * 0.3,
      icon: 'bus',
    });
  });

  _state = { trains, lastUpdate: Date.now() };
}

function tick() {
  const now = Date.now();
  const elapsed = (now - _state.lastUpdate) / 1000;
  _state.lastUpdate = now;

  _state.trains.forEach((t) => {
    t.etaSecs -= elapsed;
    if (t.etaSecs <= 0) {
      let intervalMins = 10;
      if (t.line === 'NS') intervalMins = NS_INTERVAL_MINS;
      if (t.line === 'EW') intervalMins = EW_INTERVAL_MINS;
      if (t.line === 'BUS') intervalMins = BUS_INTERVAL_MINS;

      t.etaSecs = intervalMins * 60;
      t.stIdx = (t.stIdx + 1) % t.stations.length;
      t.occupancy = Math.min(1, Math.max(0.1, t.occupancy + (Math.random() - 0.5) * 0.15));
    }
  });

  _notify();
}

function _notify() {
  _listeners.forEach((l) => l([..._state.trains]));
}

export const GTFSService = {
  start: () => {
    if (_timer) return;
    init();
    _timer = setInterval(tick, 1000);
  },
  stop: () => {
    if (_timer) clearInterval(_timer);
    _timer = null;
  },
  subscribe: (callback) => {
    // Lazy start if not running
    if (!_timer) GTFSService.start();
    
    _listeners.add(callback);
    callback([..._state.trains]);
    return () => {
      _listeners.delete(callback);
      // Auto stop if no more listeners (Optional: keep a buffer if needed)
      if (_listeners.size === 0) GTFSService.stop();
    };
  },
  getState: () => [..._state.trains],
};
