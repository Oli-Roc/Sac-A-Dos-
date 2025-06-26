- runs [eabfit](git@github.com:wknechtel/3d-bin-pack.git) and upped to be compilable
- runs [packingsolver](https://github.com/fontanf/packingsolver.git)
- takes better result of both

### usage ###

- clone packingsolver: `git clone git@github.com:fontanf/packingsolver.git packingsolver`
- run their build instruction (provided in README)
```
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release --parallel && cmake --install build --config Release --prefix install
```

- assumes packingsolver was cloned in this directory

- build eabfit: `(cd eabfit && make build)`

### Run ###

- `bun run.ts example.json`. This generates `threedata.js`

### Visualize ###

- in `visu` folder: install deps `pnpm i`
- run `pnpm start`. By default, will load data from `threedata.js`