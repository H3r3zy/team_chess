FROM node:16
LABEL authors="H3r3zy"

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

# Expose port
EXPOSE 8548

RUN npm run build

# Run app
CMD [ "npm", "run", "start" ]