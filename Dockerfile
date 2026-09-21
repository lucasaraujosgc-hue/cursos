FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Courses and leads live here. Mount a volume on /data in production
# (ex: docker run -v cursos-data:/data ...) — sem isso os leads capturados
# somem a cada deploy. Na primeira subida o servidor copia os cursos do
# repositório para dentro do volume.
ENV DATA_DIR=/data
VOLUME ["/data"]

# Expose the port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
