#!/bin/sh

virtualenv venv

source venv/bin/activate

pip install --upgrade -r requirements.txt

pip list --format=columns
