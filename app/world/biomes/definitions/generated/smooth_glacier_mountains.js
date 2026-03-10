const definition = Object.freeze({
  "id": "smooth_glacier_mountains",
  "derive": {
    "type": "subdivision",
    "from": "glacier_mountains",
    "mode": "smooth"
  },
  "settings": {
    "colors": {
      "ground": "#d2dbe3",
      "water": "#98c4e5",
      "fog": "#d8e7f4"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 0.8265600000000001,
      "baseHeightMultiplier": 0.8486559999999999,
      "ridgeScaleMultiplier": 1.33812,
      "ridgeHeightMultiplier": 0.29295000000000004,
      "octaves": 3,
      "lacunarity": 2,
      "gain": 0.5,
      "secondaryAmount": 0.022000000000000002,
      "warpStrength": 0.054,
      "warpScaleMultiplier": 1.7,
      "gradientCap": 0.05,
      "gradientSampleMeters": 6,
      "heightOffset": -8
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.19232,
    "humidityBand": "mesic",
    "isMountainVariant": true,
    "baseBiomeId": "glacier",
    "treeDensityMultiplier": 0.7,
    "detailTextureId": 1
  }
});

export default definition;
