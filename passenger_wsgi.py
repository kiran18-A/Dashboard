import sys
import os

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(__file__))

# Import the Flask app object and name it 'application' for Passenger
from app import app as application
