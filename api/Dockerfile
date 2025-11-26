FROM node:18-bullseye

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN rm -rf tests

EXPOSE 3000

CMD ["npm", "start"]
