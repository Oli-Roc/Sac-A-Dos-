minknap.out.js: minknap.c Makefile
	emcc minknap.c \
		-sEXPORTED_FUNCTIONS=_minknap,_malloc,_free \
		-sEXPORTED_RUNTIME_METHODS=ccall,cwrap,getValue,setValue \
		-sALLOW_MEMORY_GROWTH=1 \
		-sEXPORT_ES6=1 \
		-sMODULARIZE=1 \
		-sENVIRONMENT='web' \
		-s TOTAL_STACK=32MB \
		-o minknap.out.mjs

