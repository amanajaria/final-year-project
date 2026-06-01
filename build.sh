#!/bin/bash
set -o errexit

# Ensure Python 3.11 is used
python3.11 --version
python3.11 -m pip install --upgrade pip
python3.11 -m pip install -r requirements.txt
