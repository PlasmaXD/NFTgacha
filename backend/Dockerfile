# ベースイメージとして公式の Node.js LTS-slim を使用
FROM node:lts-slim

# 作業ディレクトリの設定
WORKDIR /usr/src/app

# package.json と package-lock.json をコピーして依存関係をインストール
COPY package*.json ./
RUN npm install --only=production

# アプリケーションコードを全てコピー
COPY . ./

# Cloud Run では必ず環境変数 PORT でポートが指定されるので利用
EXPOSE ${PORT}

# サーバーの起動
CMD ["node", "app.js"]
