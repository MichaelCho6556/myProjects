# backend/app.py
from flask import Flask, jsonify
import os
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

ANIME_FILENAME = "anime.csv"
MANGA_FILENAME = "manga.csv"

