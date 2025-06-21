# builds ortools knapsack2d
.PHONY: build
# invoke with filename make run input_file=thefile params=proto_text_format (see knapsack_2d_sat_custom.cc)
.PHONY: run

build: knapsack_2d_sat_custom/knapsack_2d_sat_custom.cc
	[ ! -d "${ORTOOLS_DIR}/examples/knapsack_2d_sat_custom" ] && ln -s ${PWD}/knapsack_2d_sat_custom "${ORTOOLS_DIR}/examples/knapsack_2d_sat_custom" || true
	(cd ${ORTOOLS_DIR} && make run SOURCE=examples/knapsack_2d_sat_custom/knapsack_2d_sat_custom.cc)

run:
	./knapsack_2d_sat_custom/build/bin/knapsack_2d_sat_custom --input $(input_file) --params $(params)