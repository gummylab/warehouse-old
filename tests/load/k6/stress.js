import { THRESHOLDS } from './helpers.js';
import { adminRead } from './scenarios/admin-read.js';
import { adminWrite } from './scenarios/admin-write.js';

export const options = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '2m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: THRESHOLDS.stress,
};

export default function () {
  adminRead();
  if (__VU % 2 === 0) adminWrite();
}
