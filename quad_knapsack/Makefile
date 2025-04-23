quadknap.out.js: quadknap.c Makefile
	emcc quadknap.c \
		-sEXPORTED_FUNCTIONS=_quadknap,_mSize,_malloc,_free \
		-sEXPORTED_RUNTIME_METHODS=ccall,cwrap,getValue,setValue \
		-sINITIAL_MEMORY=1082130432 \
		-sALLOW_MEMORY_GROWTH=1 \
		-sEXPORT_ES6=1 \
		-sMODULARIZE=1 \
		-sENVIRONMENT='web' \
		-s TOTAL_STACK=32MB \
		-o quadknap.out.js

