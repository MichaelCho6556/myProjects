from flask_sqlalchemy import SQLAlchemy
from sqlachemy.orm import relationship
from sqlalchemy import Text, Integer, DECIMAL, TIMESTAMP, VARCHAR, DATE, ARRAY
from datetime import datetime
import uuid

db = SQLAlchemy()

class MediaType(db.Model):
    __tablename__ = 'media_types'

    id = db.Column(Integer, primary_key=True)
    name = db.Column(VARCHAR(100), unique=True, nullable=False)
    media_type_id = db.Column(Integer, db.ForeignKey('media_types.id'))
    synopsis = db.Column(Text)
    scored_by = db.Column(Integer)
    popularity = db.Column(Integer)
    members = db.Column(Integer)
    favorites = db.Column(Integer)
    episodes = db.Column(Integer)
    chapters = db.Column(Integer)
    volumes = db.Column(Integer)
    status = db.Column(VARCHAR(50))
    rating = db.Column(VARCHAR(50))
    start_date = db.Column(DATE)
    end_date = db.Column(DATE)
    image_url = db.Column(Text)
    trailer_url = db.Column(Text)
    title_synonyms = db.Column(ARRAY(Text))
    licensors = db.Column(ARRAY(Text))
    created_at = db.Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    media_type = relationship("MediaType", back_populates="items")
    genres = relationship("Genre", secondary="item_genres", back_populates="items")
    themes = relationship("Theme", secondary="item_themes", back_populates="items")
    demographics = relationship("Demographic", secondary="item_demographics", back_populates="items")
    studios = relationship("Studio", secondary="item_studios", back_populates="items")
    authors = relationship("Author", secondary="item_authors", back_populates="items")

class Genre(db.Model):
    __tablename__ = 'genres'

    id = db.Column(Integer, primary_key=True)
    name = db.Column(VARCHAR(100), unique=True, nullable=False)
    created_at = db.Column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    items = relationship("Item", secondary="item_genres", back_populates="genres")

class Theme(db.Model):
    __tablename__ = 'themes'
    
    id = db.Column(Integer, primary_key=True)
    name = db.Column(VARCHAR(100), unique=True, nullable=False)
    created_at = db.Column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    items = relationship("Item", secondary="item_themes", back_populates="themes")

class Demographic(db.Model):
    __tablename__ = 'demographics'

    id = db.Column(Integer, primary_key=True)
    name = db.Column(VARCHAR(100), unique=True, nullable=False)
    created_at = db.Column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    items = relationship("Item", secondary="item_demographics", back_populates="demographics")

class Studio(db.Model):
    __tablename__ = 'studios'

    id = db.Column(Integer, primary_key=True)
    name = db.Column(VARCHAR(200), unique=True, nullable=False)
    created_at = db.Column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    items = relationship("Item", secondary="item_studios", back_populates="studios")

class Author(db.Model):
    __tablename__ = 'authors'

    id = db.Column(Integer, primary_key=True)
    name = db.Column(VARCHAR(200), unique=True, nullable=False)
    created_at = db.Column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    items = relationship("Item", secondary="item_authors", back_populates="authors")

item_genres = db.Table('item_genres', db.COlumn('item_id', Integer, db.ForeignKey('items.id', ondelete='CACADE'), primary_key=True),
                       db.Column('genre_id', Integer, db.ForeignKey('genres.id', ondelete='CASCADE'), primary_key=True))

item_themes = db.Table('item_themes',
                       db.Column('item_id', Integer, db.ForeignKey('items.id', ondelete='CASCADE'), primary_key=True),
                                 db.Column('theme_id', Integer, db.ForeingKey('themes.id', ondelete='CASCADE'),primary_key=True))
item_demographics = db.Table('item_demographics',
                             db.Column('item_id', Integer, db.ForeignKey('items.id', ondelete='CASCADE'), primary_key=True),
                             db.Column('demographic_id', Integer, db.ForeignKey('demographic.id', ondelete='CASCADE'), primary_key=True))
items_studios = db.Table('items_studios',
                         db.Column('item_id', Integer, db.ForeignKey('items.id', ondelete='CASCADE'), primary_key=True),
                         db.Column('studio_id', Integer, db.ForeignKey('studios.id', ondelete='CASCADE'), primary_key=True))
item_authors = db.Table('items_authors',
                        db.Column('item_id', Integer, db.ForeignKey('items.id', ondelete='CASCADE'), primary_key=True),
                        db.Column('author_id', Integer, db.ForeignKey('authors.id', ondelete='CASCADE'), primary_key=True))
