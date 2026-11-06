import { THRESHOLDS } from './helpers.js';
import { adminRead } from './scenarios/admin-read.js';
import { adminWrite } from './scenarios/admin-write.js';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: THRESHOLDS.load,
};

export default function () {
  adminRead();
  if (__VU % 3 === 0) adminWrite();
}
