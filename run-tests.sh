#!/bin/bash

# Comprehensive test runner for bun-chrome-extension
# Runs tests in multiple environments and reports total failures

RUNS=${1:-3}
TOTAL_FAILURES=0

run_test_suite() {
  local name="$1"
  local dir="$2"
  local failures=0

  echo ""
  echo "========================================"
  echo "Testing: $name"
  echo "========================================"

  cd "$dir" || { echo "Failed to cd to $dir"; return 1; }

  for i in $(seq 1 $RUNS); do
    echo "--- Run $i ---"
    if ! bun test --timeout 30000; then
      ((failures++))
      echo "FAILED on run $i"
    fi
  done

  echo "$name: $failures failures out of $RUNS runs"
  return $failures
}

run_act_tests() {
  local failures=0

  echo ""
  echo "========================================"
  echo "Testing: act (GitHub Actions ubuntu-latest)"
  echo "========================================"

  cd "$SCRIPT_DIR" || { echo "Failed to cd to $SCRIPT_DIR"; return 1; }

  # Check if act is available
  if ! command -v act &> /dev/null; then
    echo "act is not installed, skipping GitHub Actions tests"
    return 0
  fi

  for i in $(seq 1 $RUNS); do
    echo "--- Act Run $i ---"
    if ! act -W .github/workflows/test.yaml pull_request --matrix os:ubuntu-latest; then
      ((failures++))
      echo "FAILED on act run $i"
    fi
  done

  echo "act: $failures failures out of $RUNS runs"
  return $failures
}

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting comprehensive test suite ($RUNS runs each)"
echo "=================================================="

# Test from root folder (bash/WSL)
run_test_suite "Bash - Root folder" "$SCRIPT_DIR"
TOTAL_FAILURES=$((TOTAL_FAILURES + $?))

# Test from dev folder (bash/WSL)
run_test_suite "Bash - Dev folder" "$SCRIPT_DIR/dev"
TOTAL_FAILURES=$((TOTAL_FAILURES + $?))

# Test with act (GitHub Actions simulation)
run_act_tests
TOTAL_FAILURES=$((TOTAL_FAILURES + $?))

echo ""
echo "=================================================="
echo "FINAL RESULTS"
echo "=================================================="
echo "Total failed runs: $TOTAL_FAILURES"

if [ $TOTAL_FAILURES -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Some tests failed!"
  exit 1
fi
