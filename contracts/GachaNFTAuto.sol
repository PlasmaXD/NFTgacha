// SPDX-License-Identifier: MIT

pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

//truffle compile
//truffle migrate --network sepolia
//truffle migrate --network sepolia --reset
// スマートコントラクトの上部に追加
struct TokenInfo {
    address owner;
    uint256 tokenId;
    uint256 luckyNumber;
    Prize prize;
}

struct Prize {
    string name;
    string description;
    string imageURL; // 画像のURI (例: IPFS上のリンク)
}

contract GachaNFTAuto is ERC721Enumerable,AutomationCompatibleInterface {
    using ECDSA for bytes32;
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;  // Token ID counter for NFTs
  

//truffle migrate --network sepolia --reset
    address payable public owner;
    address payable public player;
    uint256 public maxParticipants;
    bytes32 public serverSeedHash;  // Server seed hash for commitment
    bytes32 public serverSeed;      // Server seed to be revealed later
    bytes32 public userSeed;
    uint256 public luckyNumber;
    bool public isRevealed;
    bytes32 public salt;  // 追加: ソルト
    uint256 public revealDeadline;



    // Store used userSeed
    mapping(address => mapping(bytes32 => bool)) public usedUserSeeds;
    mapping(uint256 => uint256) private tokenLuckyNumbers;   
    // ラッキーナンバーと景品のメタデータのマッピング
    mapping(uint256 => Prize) public prizeMapping;
    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => uint256) private luckyNumberCounts;



    // Events
    event Participation(address indexed player, bytes32 userSeed);
    event Commitment(bytes32 indexed serverSeedHash);
    event Reveal(bytes32 serverSeed, uint256 luckyNumber);
    event CommitRequested(address indexed user);
    event DebugLogEvent(string);  
    event NFTMinted(address indexed owner, uint256 tokenId);
  event RequestCommit(address indexed requester, string requestId);

  


constructor(uint256 _maxParticipants) ERC721("TokenName", "TokenSymbol") public {
    owner = payable(msg.sender);
    maxParticipants = _maxParticipants;
}

// 景品のメタデータを設定する関数
    function setPrize(uint256 luckyNumber, string memory name, string memory description, string memory imageURL) public {
        // 実際のアプリケーションでは、この関数をオーナーのみが実行できるようにすることを推奨します。
        Prize memory newPrize = Prize({
            name: name,
            description: description,
            imageURL: imageURL
        });

        prizeMapping[luckyNumber] = newPrize;
    }

    // 景品のメタデータを取得する関数
    function getPrize(uint256 luckyNumber) public view returns (string memory name, string memory description, string memory imageURL) {
        Prize memory prize = prizeMapping[luckyNumber];
        return (prize.name, prize.description, prize.imageURL);
    }
    function requestCommit(string calldata requestId) public {
        // ここにリクエスト処理を記述
        emit RequestCommit(msg.sender, requestId);
    }
    // Owner commits a hashed server seed
    function commit(bytes32 _serverSeedHash, bytes32 _salt) public {
        require(msg.sender == owner, "Only owner can commit");
        serverSeedHash = _serverSeedHash;
        salt = _salt;
        revealDeadline = block.timestamp + 1 minutes; // 1分後に設定

        emit Commitment(serverSeedHash);  // Emit Commitment event
    }

 function participate(bytes32 _userSeed, bytes memory _signature) public payable {
    // 1. メッセージを準備
    bytes32 messageHash = getMessageHash(_userSeed);
//    bytes32 message = keccak256(abi.encodePacked(msg.sender, _userSeed));
    bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);
    address recoveredAddress = recoverSigner(ethSignedMessageHash, _signature);

    require(recoveredAddress == msg.sender, "Invalid signature");       
    userSeed = _userSeed;
    player = payable(msg.sender);
    usedUserSeeds[msg.sender][_userSeed] = true;
    emit Participation(player, userSeed);  
    emit CommitRequested(msg.sender);
}


event RecoveredAddress(address indexed recovered);
event LogMessageHash(bytes32 indexed messageHash);
   function getMessageHash(bytes32 _message) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_message));
    }

    function getEthSignedMessageHash(bytes32 _messageHash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageHash));
    }

    function recoverSigner(bytes32 _ethSignedMessageHash, bytes memory _signature) internal pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

    function splitSignature(bytes memory _signature) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(_signature.length == 65, "invalid signature length");
        assembly {
            r := mload(add(_signature, 32))
            s := mload(add(_signature, 64))
            v := byte(0, mload(add(_signature, 96)))
        }
    }

    function reveal(bytes32 _serverSeed, bytes memory signature) public {
        require(serverSeedHash == keccak256(abi.encodePacked(_serverSeed, salt)), "Invalid server seed");
        serverSeed = _serverSeed;

        bytes32 messageHash = getMessageHash(_serverSeed);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);
        address recoveredAddress = recoverSigner(ethSignedMessageHash, signature);

        emit LogMessageHash(messageHash);
        emit RecoveredAddress(recoveredAddress);

        require(recoveredAddress == owner, "Invalid signature");
        
        bytes32 finalHash = keccak256(abi.encodePacked(serverSeed, userSeed, salt));
        luckyNumber = uint256(finalHash) % 10;
        luckyNumberCounts[luckyNumber] = luckyNumberCounts[luckyNumber] + 1;

        emit Reveal(serverSeed, luckyNumber);
         // mint NFT after the luckyNumber has been determined
        mintNFT(player, luckyNumber);
        
    }
 // Mint関数内でメタデータのURIを設定
function mintNFT(address recipient, uint256 _luckyNumber) internal {
    _tokenIdCounter.increment();
    uint256 newTokenId = _tokenIdCounter.current();
    _mint(recipient, newTokenId);
    
    tokenLuckyNumbers[newTokenId] = _luckyNumber;

    // tokenURIの設定
    Prize memory prize = prizeMapping[_luckyNumber];
    _tokenURIs[newTokenId] = prize.imageURL;
        emit NFTMinted(recipient, newTokenId);

}

// トークンIDに基づいてURIを返す
function tokenURI(uint256 tokenId) public view override returns (string memory) {
    return _tokenURIs[tokenId];
}
function getLuckyNumberForToken(uint256 tokenId) public view returns (uint256) {
    return tokenLuckyNumbers[tokenId];
}

function setPrizesBulk(
    uint256[] memory luckyNumbers, 
    string[] memory names, 
    string[] memory descriptions, 
    string[] memory imageURLs
) public {
    require(
        luckyNumbers.length == names.length && 
        names.length == descriptions.length && 
        descriptions.length == imageURLs.length, 
        "Array lengths mismatch"
    );

    for (uint i = 0; i < luckyNumbers.length; i++) {
        Prize memory newPrize = Prize({
            name: names[i],
            description: descriptions[i],
            imageURL: imageURLs[i]
        });

        prizeMapping[luckyNumbers[i]] = newPrize;
    }
}
 function getAllTokensInfo() public view returns (TokenInfo[] memory) {
        uint256 totalTokens = _tokenIdCounter.current();
        TokenInfo[] memory tokens = new TokenInfo[](totalTokens);

        for (uint256 i = 0; i < totalTokens; i++) {
            uint256 tokenId = i + 1;  // トークンIDは1から始まる
            address tokenOwner = ownerOf(tokenId);
            uint256 luckyNumber = getLuckyNumberForToken(tokenId);
            Prize memory prize = prizeMapping[luckyNumber];
            tokens[i] = TokenInfo(tokenOwner, tokenId, luckyNumber, prize);
        }
        return tokens;
    }

function getLuckyNumberCount(uint256 _luckyNumber) public view returns (uint256) {
    return luckyNumberCounts[_luckyNumber];
}


 // Chainlink Automation Networkによって呼び出される関数
    function checkUpkeep(bytes calldata /* checkData */) external override returns (bool upkeepNeeded, bytes memory /* performData */) {

        upkeepNeeded = (revealDeadline < block.timestamp) ;
        return (upkeepNeeded, bytes(""));
    }

    function performUpkeep(bytes calldata /* performData */) external override {

       bytes32 finalHash = keccak256(abi.encodePacked(userSeed));
       luckyNumber = uint256(finalHash) % 10;
       luckyNumberCounts[luckyNumber] = luckyNumberCounts[luckyNumber] + 1;


    // NFTをミント
        mintNFT(player, luckyNumber);
        emit Reveal(userSeed, luckyNumber);
    }
}
