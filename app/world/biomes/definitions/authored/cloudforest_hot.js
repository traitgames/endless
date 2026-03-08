const definition = Object.freeze({
  "id": "cloudforest_hot",
  "label": "Cloudforest (Hot)",
  "category": "hot",
  "colors": {
    "ground": "#5b775d",
    "water": "#4f7e82",
    "fog": "#a9c0a0",
    "trunk": "#614734",
    "canopy": "#4e8a54"
  },
  "terrainProfile": {
    "noiseAlgorithm": "ridged",
    "noiseScaleMultiplier": 0.88,
    "baseHeightMultiplier": 1.22,
    "ridgeScaleMultiplier": 1.4,
    "ridgeHeightMultiplier": 1.2,
    "octaves": 5,
    "lacunarity": 2,
    "gain": 0.48,
    "warpStrength": 0.12,
    "warpScaleMultiplier": 1.45,
    "secondaryAmount": 0.11,
    "heightOffset": 0
  },
  "hasTrees": true,
  "fogDensityMultiplier": 1.2,
  "humidityBand": "hydric",
  "isMountainVariant": true,
  "baseBiomeId": "rocky_mountains",
  "treeStyle": "cloudforest",
  "treeDensityMultiplier": 0.66,
  "detailTextureId": 11
});

export default definition;
