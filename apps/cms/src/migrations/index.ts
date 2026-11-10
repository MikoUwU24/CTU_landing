import * as migration_20261110_173025_initial from './20261110_173025_initial';
import * as migration_20261110_190820_site_settings from './20261110_190820_site_settings';

export const migrations = [
  {
    up: migration_20261110_173025_initial.up,
    down: migration_20261110_173025_initial.down,
    name: '20261110_173025_initial',
  },
  {
    up: migration_20261110_190820_site_settings.up,
    down: migration_20261110_190820_site_settings.down,
    name: '20261110_190820_site_settings'
  },
];
