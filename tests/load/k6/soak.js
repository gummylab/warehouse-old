import { THRESHOLDS } from './helpers.js';
import { adminRead } from './scenarios/admin-read.js';
import { adminWrite } from './scenarios/admin-write.js';

export const options = {
  vus: 20,
  duration: '30m',
  thresholds: THRESHOLDS.soak,
};

export default function () {
  adminRead();
  if (__VU % 4 === 0) adminWrite();
  // occasional pause to mimic real usage
  // (sleep is inside scenarios)
}
