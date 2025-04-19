mulknap.out.js: mulknap.c
	emcc mulknap.c \
	-sEXPORTED_FUNCTIONS=_mulknap,_malloc,_free \
	-sEXPORTED_RUNTIME_METHODS=ccall,cwrap,getValue,setValue \
	-sINITIAL_MEMORY=1082130432 \
	-sALLOW_MEMORY_GROWTH=1 \
	-sEXPORT_ES6=1 \
	-sMODULARIZE=1 \
	-sENVIRONMENT='web' \
	-o mulknap.out.js

#emcc mulknap.c -sEXPORTED_FUNCTIONS=_mulknap,_malloc,_free -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,getValue,setValue -sINITIAL_MEMORY=128000000 -o debug.out.js
#emcc debug.c -sEXPORTED_FUNCTIONS=_mulknap,_malloc,_free -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,getValue,setValue -o debug.out.js
