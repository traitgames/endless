const definition = Object.freeze({
  "id": "glacial_summit",
  "label": "Glacial Summit",
  "category": "cold",
  "colors": {
    "ground": "#c1ccd7",
    "water": "#7a96ae",
    "fog": "#e2e8f1"
  },
  "terrainProfile": {
    "noiseAlgorithm": "ridged",
    "noiseScaleMultiplier": 0.76,
    "baseHeightMultiplier": 1.4,
    "ridgeScaleMultiplier": 1.62,
    "ridgeHeightMultiplier": 1.5,
    "octaves": 6,
    "lacunarity": 2.06,
    "gain": 0.46,
    "warpStrength": 0.04,
    "warpScaleMultiplier": 1.48,
    "secondaryAmount": 0.08,
    "heightOffset": 1.4
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.34,
  "humidityBand": "hydric",
  "isMountainVariant": true,
  "baseBiomeId": "rocky_mountains",
  "detailTextureId": 1
});

export default definition;
