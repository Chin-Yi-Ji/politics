# 先看政見：Zeabur 會自動偵測這個檔案並照它建置
FROM node:22-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# 先裝套件，程式沒改到 package 時可以重用這一層
COPY package.json package-lock.json ./
# 在 Mac 上跑過 npm install 後，鎖定檔有時會少記 Linux 用的套件，npm ci 會失敗；失敗時改用 npm install 補齊
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

COPY . .

# 來源模式在建置時就決定（首頁與對照表是建置時產生的）。
# 在 Zeabur 的環境變數設定 SOURCE_MODE 就會帶進來，沒設定就是 extended。
ARG SOURCE_MODE=extended
ENV SOURCE_MODE=$SOURCE_MODE

RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# next start 會讀 PORT；-H 0.0.0.0 讓容器外連得進來
CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0"]
