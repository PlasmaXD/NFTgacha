//const GachaNFT = artifacts.require("GachaNFT");
const GachaNFT = artifacts.require("GachaNFTAuto");

module.exports = function(deployer) {
    const _maxParticipants = 100; // 例として100を設定
    deployer.deploy(GachaNFT, _maxParticipants);
};