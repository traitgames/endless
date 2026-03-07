const definition = Object.freeze({
  "id": "montane_woodland",
  "label": "Montane Woodland",
  "category": "hot",
  "colors": {
    "ground": "#7f7f58",
    "water": "#607f82",
    "fog": "#c0bb94",
    "trunk": "#6a4e36",
    "canopy": "#7f9848"
  },
  "terrainProfile": {
    "noiseAlgorithm": "ridged",
    "noiseScaleMultiplier": 0.4,
    "baseHeightMultiplier": 0.4,
    "ridgeScaleMultiplier": 1.01,
    "ridgeHeightMultiplier": 1.01,
    "octaves": 5,
    "lacunarity": 2,
    "gain": 0.48,
    "secondaryAmount": 0.1
  },
  "hasTrees": true,
  "fogDensityMultiplier": 1.02,
  "humidityBand": "mesic",
  "isMountainVariant": true,
  "baseBiomeId": "rocky_mountains",
  "treeStyle": "woodland",
  "treeDensityMultiplier": 0.52,
  "detailTextureId": 5
});

export default definition;
