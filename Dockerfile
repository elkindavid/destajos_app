FROM python:3.11.13-slim

# Instalar dependencias del sistema (ODBC + utilidades)
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    gnupg2 \
    apt-transport-https \
    unixodbc \
    unixodbc-dev \
    && rm -rf /var/lib/apt/lists/*

# Agregar repositorio de Microsoft
RUN curl -sSL https://packages.microsoft.com/keys/microsoft.asc | apt-key add - \
 && curl -sSL https://packages.microsoft.com/config/debian/11/prod.list | tee /etc/apt/sources.list.d/mssql-release.list

# Instalar drivers ODBC
RUN apt-get update && ACCEPT_EULA=Y apt-get install -y \
    msodbcsql18 \
    mssql-tools18 \
    && rm -rf /var/lib/apt/lists/*

# Agregar mssql-tools al PATH
ENV PATH="$PATH:/opt/mssql-tools18/bin"

# Crear directorio de la app
WORKDIR /app

# Instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código
COPY . .

# Ejecutar con Gunicorn (producción)
CMD ["gunicorn", "-b", "0.0.0.0:8000", "run:app"]
