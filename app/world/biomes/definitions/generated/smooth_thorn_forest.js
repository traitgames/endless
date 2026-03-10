const definition = Object.freeze({
  "id": "smooth_thorn_forest",
  "derive": {
    "type": "subdivision",
    "from": "thorn_forest",
    "mode": "smooth"
  },
  "settings": {
    "colors": {
      "ground": "#8f7859",
      "water": "#79876f",
      "fog": "#c7a98c",
      "trunk": "#64462f",
      "canopy": "#7e8d3d"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 1.2096000000000002,
      "baseHeightMultiplier": 0.5952,
      "ridgeScaleMultiplier": 1.092,
      "ridgeHeightMultiplier": 0.12600000000000003,
      "octaves": 2,
      "lacunarity": 2.04,
      "gain": 0.49,
      "secondaryAmount": 0.016,
      "warpStrength": 0,
      "warpScaleMultiplier": 1.55,
      "gradientCap": 0.05,
      "gradientSampleMeters": 6,
      "heightOffset": 5
    },
    "hasTrees": true,
    "fogDensityMultiplier": 0.92,
    "humidityBand": "hydric",
    "treeStyle": "thorn",
    "treeDensityMultiplier": 0.42,
    "detailTextureId": 9
  }
});

export default definition;
