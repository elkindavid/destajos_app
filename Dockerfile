FROM python:3.11.13-slim

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    gcc \
    unixodbc \
    unixodbc-dev \
    && rm -rf /var/lib/apt/lists/*

FROM python:3.11-slim

# Variables de entorno para no interactuar
ENV ACCEPT_EULA=Y
ENV DEBIAN_FRONTEND=noninteractive

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    curl gnupg2 apt-transport-https unixodbc unixodbc-dev \
    build-essential libssl-dev libffi-dev libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Agregar repo de Microsoft
RUN curl -sSL https://packages.microsoft.com/keys/microsoft.asc | apt-key add - \
    && curl -sSL https://packages.microsoft.com/config/debian/11/prod.list \
       | tee /etc/apt/sources.list.d/mssql-release.list

# Instalar driver ODBC
RUN apt-get update && ACCEPT_EULA=Y apt-get install -y msodbcsql18 mssql-tools18

# Instalar pyodbc y demás requirements
RUN pip install --no-cache-dir pyodbc flask

# Copiar la app
WORKDIR /app
COPY . /app

CMD ["python", "app.py"]

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["gunicorn", "run:app"]
