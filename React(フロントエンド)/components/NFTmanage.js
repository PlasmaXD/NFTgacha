import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import GachaNFT from '../contracts/GachaNFTAuto.json';
import { NFTStorage, File } from 'nft.storage';

const web3 = new Web3(window.ethereum);
const networkId = String(await web3.eth.net.getId());
const CONTRACT_ADDRESS = GachaNFT.networks[networkId].address;
const contract = new web3.eth.Contract(GachaNFT.abi, CONTRACT_ADDRESS);
const API_KEY = '';

const client = new NFTStorage({ token: API_KEY });

function App() {
  const [luckyNumber, setLuckyNumber] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [imageURL, setimageURL] = useState('');

  const [prize, setPrize] = useState({});
  const [bulkData, setBulkData] = useState([{ luckyNumber: "", name: "", description: "", imageURL: "" }]);
  
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  
  
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        const adminStatus = await checkIfAdmin();
        setIsAdmin(adminStatus);
      } catch (error) {
        console.error("An error occurred while checking admin status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);
  async function uploadImageToNFTStorage() {
    const metadata = await client.store({
        name: name,
        description: description,
        image: new File([image], 'prize-image.png', { type: 'image/png' })
    });
    return metadata.url;
  }


  async function checkIfAdmin() {
    const accounts = await web3.eth.getAccounts();
    const adminAddress = await contract.methods.owner().call();
    return accounts[0] === adminAddress;
  }
  async function handleSetPrize() {

    const isAdmin = await checkIfAdmin();
    if (!isAdmin) {
      alert("You are not the admin!");
      return;
    }
    const imageURL = await uploadImageToNFTStorage();
    const accounts = await web3.eth.getAccounts();
    await contract.methods.setPrize(luckyNumber, name, description, imageURL).send({ from: accounts[0] });
  }
  async function handleSetPrize2() {
    const accounts = await web3.eth.getAccounts();
    await contract.methods.setPrize(luckyNumber, name, description, imageURL).send({ from: accounts[0] });
}


function getHttpGatewayUrl(ipfsUri) {
  // 既にHTTP URLの場合、そのまま返す
  if (ipfsUri.startsWith('https://')) {
    return ipfsUri;
  }

  // IPFSのパスを抽出 ('bafybeieug...' と 'prize-image.png' の部分)
  const path = ipfsUri.split('ipfs://')[1];

  // CloudflareのIPFSゲートウェイを使用してHTTP URLを生成
  return `https://cloudflare-ipfs.com/ipfs/${path}`;
}


  async function handleGetPrize() {
    const result = await contract.methods.getPrize(luckyNumber).call();
    console.log("Prize data:", result);

    const metadataIPFSUrl = result[2];
    console.log("Original IPFS metadata URL:", metadataIPFSUrl);

    const metadataHTTPUrl = getHttpGatewayUrl(metadataIPFSUrl);
    console.log("Converted HTTP metadata URL:", metadataHTTPUrl);

    // metadata.jsonから実際のデータを取得
    const metadataResponse = await fetch(metadataHTTPUrl);
    const metadata = await metadataResponse.json();
    console.log("Metadata content:", metadata);

    const imageIPFSUrl = metadata.image;
    console.log("Original IPFS image URL:", imageIPFSUrl);

    const imageHTTPUrl = getHttpGatewayUrl(imageIPFSUrl);
    console.log("Converted HTTP image URL:", imageHTTPUrl);

    setPrize({
      name: result[0],
      description: result[1],
      imageURL: imageHTTPUrl
    });
}

  // setPrizesBulk関数を呼び出すための関数
  async function handleSetPrizesBulk() {
    const isAdmin = await checkIfAdmin();
  if (!isAdmin) {
    alert("You are not the admin!");
    return;
  }

    const luckyNumbers = bulkData.map(data => data.luckyNumber);
    const names = bulkData.map(data => data.name);
    const descriptions = bulkData.map(data => data.description);
    const imageURLs = bulkData.map(data => data.imageURL);
    const accounts = await web3.eth.getAccounts();

    await contract.methods.setPrizesBulk(luckyNumbers, names, descriptions, imageURLs).send({ from: accounts[0] });
  }
 // 一番下の入力セットを削除する関数
 function handleRemoveLastInputSet() {
  const newData = bulkData.slice(0, -1);  // 最後の要素を除外
  setBulkData(newData);
}
async function uploadMultipleImagesToNFTStorage(images) {
  const urls = [];

  for (let image of images) {
    const metadata = await client.store({
      name: "Bulk uploaded image",
      description: "An image uploaded in bulk",
      image: new File([image], 'prize-image.png', { type: 'image/png' })
    });
    urls.push(metadata.url);
  }

  return urls;
}


async function handleSetPrizesBulk() {
  const luckyNumbers = bulkData.map(data => data.luckyNumber);
  const names = bulkData.map(data => data.name);
  const descriptions = bulkData.map(data => data.description);
  const images = bulkData.map(data => data.image);
  const imageURLs = await uploadMultipleImagesToNFTStorage(images);  // Upload images and get their URLs
  const accounts = await web3.eth.getAccounts();

  await contract.methods.setPrizesBulk(luckyNumbers, names, descriptions, imageURLs).send({ from: accounts[0] });
}
// 複数の景品の確率を一括で設定する関数
async function handleSetPrizeProbabilitiesBulk() {
  const luckyNumbers = bulkData.map(data => data.luckyNumber);
  const probabilities = bulkData.map(data => data.probability);
  const accounts = await web3.eth.getAccounts();

  await contract.methods.setPrizeProbabilitiesBulk(luckyNumbers, probabilities).send({ from: accounts[0] });
}

if (isLoading) {
  return <p>Loading...</p>;
}

if (!isAdmin) {
  return <p>Access denied. You are not the admin.</p>;
}

  return (
    <div>
      {/* 景品のメタデータを設定するフォーム */}

      <div>
        <h2>Set Prize</h2>
        <input value={luckyNumber} onChange={e => setLuckyNumber(e.target.value)} placeholder="Lucky Number" />
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" />
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" />
        <input type="file" onChange={e => setImage(e.target.files[0])} />
        <button onClick={handleSetPrize}>Set Prize</button>
      </div>
 {/* 景品のメタデータを設定するフォーム2 */}
       <div>
            <h2>Set Prize2</h2>
            <input value={luckyNumber} onChange={e => setLuckyNumber(e.target.value)} placeholder="Lucky Number" />
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" />
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" />
            <input value={imageURL} onChange={e => setimageURL(e.target.value)} placeholder="Image URI" />
            <button onClick={handleSetPrize2}>Set Prize using URI</button>
        </div>
        {/* 複数の景品のメタデータを一括で設定するフォーム */}
    <div>
      <h2>Set Prizes in Bulk</h2>
      {bulkData.map((data, index) => (
        <div key={index}>
          <input value={data.luckyNumber} onChange={e => {
            const newData = [...bulkData];
            newData[index].luckyNumber = e.target.value;
            setBulkData(newData);
          }} placeholder="Lucky Number" />
          
          <input value={data.name} onChange={e => {
            const newData = [...bulkData];
            newData[index].name = e.target.value;
            setBulkData(newData);
          }} placeholder="Name" />
          
          <input value={data.description} onChange={e => {
            const newData = [...bulkData];
            newData[index].description = e.target.value;
            setBulkData(newData);
          }} placeholder="Description" />

          {/* Direct image upload for bulk setting */}
          <input type="file" onChange={e => {
            const newData = [...bulkData];
            newData[index].image = e.target.files[0];
            setBulkData(newData);
          }} />
        </div>
      ))}
      <button onClick={() => setBulkData([...bulkData, { luckyNumber: "", name: "", description: "", image: null }])}>Add Another Prize</button>
      <button onClick={handleRemoveLastInputSet}>Remove Last Prize</button>
      <button onClick={handleSetPrizesBulk}>Set Prizes in Bulk</button>
    </div>

{/* 複数の景品のメタデータをURLで一括で設定するフォーム */}

      <div>
        <h2>Set Prizes in Bulk URL</h2>
        {bulkData.map((data, index) => (
          <div key={index}>
            <input value={data.luckyNumber} onChange={e => {
              const newData = [...bulkData];
              newData[index].luckyNumber = e.target.value;
              setBulkData(newData);
            }} placeholder="Lucky Number" />
            <input value={data.name} onChange={e => {
              const newData = [...bulkData];
              newData[index].name = e.target.value;
              setBulkData(newData);
            }} placeholder="Name" />
            <input value={data.description} onChange={e => {
              const newData = [...bulkData];
              newData[index].description = e.target.value;
              setBulkData(newData);
            }} placeholder="Description" />
            <input value={data.imageURL} onChange={e => {
              const newData = [...bulkData];
              newData[index].imageURL = e.target.value;
              setBulkData(newData);
            }} placeholder="Image URL" />
          </div>
        ))}
        <button onClick={() => setBulkData([...bulkData, { luckyNumber: "", name: "", description: "", imageURL: "" }])}>Add Another Prize</button>
        <button onClick={handleRemoveLastInputSet}>Remove Last Prize</button>
        <button onClick={handleSetPrizesBulk}>Set Prizes in Bulk</button>
      </div>
      <div>
        <h2>Get Prize</h2>
        <input value={luckyNumber} onChange={e => setLuckyNumber(e.target.value)} placeholder="Lucky Number" />
        <button onClick={handleGetPrize}>Get Prize</button>

        {prize.name && (
          <div>
            <h3>{prize.name}</h3>
            <p>{prize.description}</p>
            <img src={prize.imageURL} alt={prize.name} width="300" />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
