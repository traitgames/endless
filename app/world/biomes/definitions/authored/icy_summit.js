const definition = Object.freeze({
  "id": "icy_summit",
  "label": "Icy Summit",
  "category": "temperate",
  "colors": {
    "ground": "#a1acb4",
    "water": "#6b8ba5",
    "fog": "#d5dce4"
  },
  "terrainProfile": {
    "noiseAlgorithm": "ridged",
    "noiseScaleMultiplier": 0.82,
    "baseHeightMultiplier": 1.34,
    "ridgeScaleMultiplier": 1.48,
    "ridgeHeightMultiplier": 1.28,
    "octaves": 5,
    "lacunarity": 2,
    "gain": 0.47,
    "warpStrength": 0.05,
    "warpScaleMultiplier": 1.5,
    "secondaryAmount": 0.1,
    "heightOffset": 1.1
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.26,
  "humidityBand": "hydric",
  "isMountainVariant": true,
  "baseBiomeId": "rocky_mountains",
  "detailTextureId": 1
});

export default definition;
