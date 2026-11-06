import { THRESHOLDS } from './helpers.js';
import { adminRead } from './scenarios/admin-read.js';
import { adminWrite } from './scenarios/admin-write.js';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: THRESHOLDS.smoke,
};

export default function () {
  adminRead();
  if (__VU % 2 === 0) adminWrite();
}
