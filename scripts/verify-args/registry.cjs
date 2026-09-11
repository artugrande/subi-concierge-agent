// Argumentos con los que se desplegó SubiRegistry en Celo mainnet (scripts/deploy-core.ts).
module.exports = [
  "0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF",                 // hub de Self en mainnet
  "subi-space",                                                  // semilla del scope
  { olderThan: 18, forbiddenCountries: [], ofacEnabled: false }, // config de verificación
];
