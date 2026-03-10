const definition = Object.freeze({
  "id": "jagged_glacier",
  "derive": {
    "type": "subdivision",
    "from": "glacier",
    "mode": "jagged"
  },
  "settings": {
    "colors": {
      "ground": "#e1eaf4",
      "water": "#8cc0e5",
      "fog": "#dbecfc"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 0.2,
      "baseHeightMultiplier": 0.6,
      "ridgeScaleMultiplier": 0.2,
      "ridgeHeightMultiplier": 0.2,
      "octaves": 7,
      "lacunarity": 0.3,
      "gain": 0.5,
      "warpStrength": 3.1,
      "warpScaleMultiplier": 12,
      "secondaryAmount": 0.2,
      "heightOffset": -12,
      "heightMultiplier": -1,
      "gradientCap": 1.6,
      "gradientSampleMeters": 6
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.26,
    "humidityBand": "mesic",
    "detailTextureId": 1
  }
});

export default definition;
