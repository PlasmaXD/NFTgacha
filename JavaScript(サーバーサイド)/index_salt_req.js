const express = require('express');
const Web3 = require('web3');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const port = 3002;
const GachaGameContract = require('./GachaNFTAuto.json');
const web3 = new Web3(new Web3.providers.WebsocketProvider('wss://sepolia.infura.io/ws/v3/infuraAPIkey'));

const abi = GachaGameContract.abi;

const deployedAddress = GachaGameContract.networks[11155111].address;
const contract = new web3.eth.Contract(abi, deployedAddress);
const ownerPrivateKey = process.env.OWNER_PRIVATE_KEY;

if (!ownerPrivateKey) {
  console.error("Error: OWNER_PRIVATE_KEY environment variable is not set");
  process.exit(1);
}
console.log(ownerPrivateKey);  // あなたのプライベートキーが表示されます
/**/
if (ownerPrivateKey.length !== 64 || !/^[\da-f]+$/i.test(ownerPrivateKey)) {
    console.error("Error: Private key must be 32 bytes long and in hexadecimal format");
  }
const ownerAddress = '';

//app.use(bodyParser.json()); // 追加

// サーバーシードの生成関数
const generateServerSeed = () => {
    const serverSeed = '0x' + crypto.randomBytes(32).toString('hex');
    const salt = '0x' + crypto.randomBytes(32).toString('hex'); // saltを生成
    const serverSeedHash = web3.utils.soliditySha3(serverSeed, salt); // saltを含めてハッシュ化
    return { serverSeed, salt, serverSeedHash };
};



const commitServerSeed = async (serverSeedHash, salt) => {

    const commitMethod = contract.methods.commit(serverSeedHash, salt);
    const encodedABI = commitMethod.encodeABI();

    const estimatedGas = await commitMethod.estimateGas({ from: ownerAddress });
    const gasWithBuffer = Math.floor(estimatedGas * 2.0);
    console.log('estimatedGas:', estimatedGas); 

    const tx = {
        to: deployedAddress,
        data: encodedABI,
        gas: gasWithBuffer,
    };


    console.log("Signing transaction...");
    const signedTx = await web3.eth.accounts.signTransaction(tx, ownerPrivateKey);
    console.log("Transaction signed:", signedTx);

    console.log("Sending transaction...");
    const receipt = await web3.eth.sendSignedTransaction(signedTx.raw || signedTx.rawTransaction);
    //console.log("Transaction sent:", receipt);

    return receipt;
};



// サーバーシードの生成
app.get('/generate-seed', (req, res) => {
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = web3.utils.sha3(serverSeed);
    res.json({ serverSeed, serverSeedHash });
});

// コミットエンドポイント
app.post('/commit', async (req, res) => {
    const { serverSeedHash, salt } = req.body;

    const tx = {
        to: deployedAddress,
        data: contract.methods.commit(serverSeedHash).encodeABI(),
        gas: 200000,
    };

    const signedTx = await web3.eth.accounts.signTransaction(tx, ownerPrivateKey);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.raw || signedTx.rawTransaction);
    res.json(receipt);
});

// TODO: `/listen-for-participation` の実装。イベントのリッスンを行い、participationが検出されたら次のステップをトリガー。

// リーベルエンドポイント
app.post('/reveal', async (req, res) => {
    const { serverSeed, salt } = req.body;

    // メッセージをハッシュ化（saltを含める）
    const messageHash = web3.utils.soliditySha3(serverSeed, salt);
    
    // メッセージにプレフィックスを追加し、ハッシュ化（Ethereumの標準に従う）
    const ethMessageHash = web3.utils.sha3("\x19Ethereum Signed Message:\n" + messageHash.length + messageHash);
    
    // メッセージを署名（署名するアカウントはweb3プロバイダでロック解除されている必要があります）
    const signature = await web3.eth.sign(ethMessageHash, ownerAddress);
    
    // スマートコントラクトのreveal関数を呼び出す
    const tx = {
        to: deployedAddress,
        data: contract.methods.reveal(serverSeed, signature).encodeABI(),
        gas: 300000,
    };

    // トランザクションを署名
    const signedTx = await web3.eth.accounts.signTransaction(tx, ownerPrivateKey);
    
    // トランザクションを送信
    const receipt = await web3.eth.sendSignedTransaction(signedTx.raw || signedTx.rawTransaction);
    res.json(receipt);
});


app.listen(port, async () => {
    console.log(`Server started on http://localhost:${port}`);

    // サーバーシードを生成
    const { serverSeed, salt, serverSeedHash } = generateServerSeed();
    console.log(`Generated Server Seed: ${serverSeed}`);
    console.log(`Generated Salt: ${salt}`);
    console.log(`Generated Server Seed Hash: ${serverSeedHash}`);

    // ここからRequestCommitイベントの購読を開始
    const requestCommitEvent = contract.events.RequestCommit({ fromBlock: 'latest' });

    requestCommitEvent.on('data', async (event) => {
        console.log('RequestCommit event detected:', event);

        // コミットを実行
        try {
            const receipt = await commitServerSeed(serverSeedHash, salt);
            console.log('Server Seed Hash committed:', receipt.transactionHash);
        } catch (error) {
            console.error('Error committing the server seed hash:', error);
        }
    });

    requestCommitEvent.on('error', (error) => {
        console.error('Error listening to RequestCommit event:', error);
    });

    // ここからparticipateイベントの購読を開始
    const participateEvent = contract.events.Participation({ fromBlock: 'latest' });
    const ownerAddress = '';

    participateEvent.on('data', async (event) => {
        console.log('Participate event detected:', event);
        console.log('Owner address:', ownerAddress); 

        try {
            const committedServerSeedHash = serverSeedHash; // コミットされたサーバーシードのハッシュ
            const generatedServerSeedHash = web3.utils.soliditySha3(serverSeed, salt); // サーバーシードとsaltを使用して再度ハッシュ化

            if (committedServerSeedHash === generatedServerSeedHash) {
                const messageHash = web3.utils.soliditySha3(serverSeed);
                const { signature } = web3.eth.accounts.sign(messageHash, ownerPrivateKey);
              
                const revealMethod = contract.methods.reveal(serverSeed, signature);
                const encodedABI = revealMethod.encodeABI();
    
                const estimatedGas = await revealMethod.estimateGas({ from: ownerAddress });
                console.log('estimatedGas:', estimatedGas); 

                const gasWithBuffer = Math.floor(estimatedGas * 2.0);

                const tx = {
                    to: deployedAddress,
                    data: encodedABI,
                    gas: gasWithBuffer,
                };

                const signedTx = await web3.eth.accounts.signTransaction(tx, ownerPrivateKey);
                const receipt = await web3.eth.sendSignedTransaction(signedTx.raw || signedTx.rawTransaction);
                console.log('Reveal transaction receipt:', receipt);
            } else {
                console.error('Error: The generated server seed hash does not match the committed one');
            }
        } catch (error) {
            console.error('Error executing reveal after participate event:', error);
        }
    });

    participateEvent.on('error', (error) => {
        console.error('Error listening to Participate event:', error);
    });
});

