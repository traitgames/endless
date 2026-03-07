const definition = Object.freeze({
  "id": "muskeg_mountains",
  "derive": {
    "type": "mountain",
    "from": "muskeg"
  },
  "settings": {
    "colors": {
      "ground": "#60716a",
      "water": "#55777c",
      "fog": "#9db3ac",
      "trunk": "#5e5041",
      "canopy": "#63816c"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 0.9900000000000001,
      "baseHeightMultiplier": 0.6496000000000001,
      "ridgeScaleMultiplier": 0.9675999999999999,
      "ridgeHeightMultiplier": 0.35100000000000003,
      "octaves": 5,
      "lacunarity": 1.82,
      "gain": 0.54,
      "warpStrength": 0.16,
      "warpScaleMultiplier": 1.3,
      "secondaryAmount": 0.1
    },
    "hasTrees": true,
    "fogDensityMultiplier": 1.4040000000000001,
    "humidityBand": "hydric",
    "waterlineMode": "wetland",
    "isMountainVariant": true,
    "baseBiomeId": "muskeg",
    "treeStyle": "muskeg",
    "treeDensityMultiplier": 0.378,
    "detailTextureId": 6
  }
});

export default definition;
