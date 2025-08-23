import os
from dotenv import load_dotenv
load_dotenv()

class Config:
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-key")
    SQLALCHEMY_DATABASE_URI_SQLSERVER = os.getenv("SQLALCHEMY_DATABASE_URI_SQLSERVER", "")
    SQLALCHEMY_DATABASE_URI_SQLITE = os.getenv("SQLALCHEMY_DATABASE_URI_SQLITE", "")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    PREFERRED_URL_SCHEME = "https"
