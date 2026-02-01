#!/bin/bash
set -e

RUNS=${1:-3}

for i in $(seq 1 $RUNS); do
  echo "=== Run $i ==="
  bun test --timeout 30000
done

echo "All $RUNS runs passed!"
