minknap.out.js: minknap.c Makefile
	emcc minknap.c \
		-sEXPORTED_FUNCTIONS=_minknap,_malloc,_free \
		-sEXPORTED_RUNTIME_METHODS=ccall,cwrap,getValue,setValue \
		-sALLOW_MEMORY_GROWTH=1 \
		-s TOTAL_STACK=32MB \
		-o minknap.out.js

