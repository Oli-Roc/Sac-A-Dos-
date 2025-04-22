.PHONY: build # Build a C++ program.
.PHONY: run # Run a C++ program.

build: mcknapsack/multi_knapsack.cc
	[ ! -d "${ORTOOLS_DIR}/examples/mcknapsack" ] && ln -s ${PWD}/mcknapsack "${ORTOOLS_DIR}/examples/" || true
	(cd ${ORTOOLS_DIR} && make build SOURCE=examples/mcknapsack)
run: build
	./mcknapsack/build/bin/multi_knapsack