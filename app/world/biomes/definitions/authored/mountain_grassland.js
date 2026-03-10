const definition = Object.freeze({
  "id": "mountain_grassland",
  "label": "Mountain Grassland",
  "category": "hot",
  "colors": {
    "ground": "#89a06f",
    "water": "#66879a",
    "fog": "#c6d3b5"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 0.9,
    "baseHeightMultiplier": 1.22,
    "ridgeScaleMultiplier": 1.35,
    "ridgeHeightMultiplier": 1.12,
    "octaves": 5,
    "lacunarity": 1.98,
    "gain": 0.48,
    "warpStrength": 0.1,
    "warpScaleMultiplier": 1.55,
    "secondaryAmount": 0.1,
    "heightOffset": 0.8
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.08,
  "humidityBand": "mesic",
  "isMountainVariant": true,
  "baseBiomeId": "rocky_mountains",
  "detailTextureId": 4
});

export default definition;
