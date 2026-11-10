import * as migration_20261110_173025_initial from './20261110_173025_initial';

export const migrations = [
  {
    up: migration_20261110_173025_initial.up,
    down: migration_20261110_173025_initial.down,
    name: '20261110_173025_initial'
  },
];
