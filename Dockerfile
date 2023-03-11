FROM node:16

# Create app directory
WORKDIR /usr/kubek

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy app sources
COPY ./ ./

# Add using ports
EXPOSE 3000 3001
CMD "node app.js"