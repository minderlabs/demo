#!/bin/sh

#
# Node (Grunt)
#

npm install

echo "\n### NPM ###\n"
npm list --depth=0

#
# Python
#

virtualenv tools/python

source ./tools/python/bin/activate

pip install -U pip
pip install -U -r requirements.txt

echo "\n### PIP ###\n"
pip list

echo
