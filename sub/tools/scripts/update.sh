#!/bin/sh

virtualenv virtual_env

source virtual_env/bin/activate

pip install --upgrade -r requirements.txt

pip list
