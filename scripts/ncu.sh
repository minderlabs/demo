#!/bin/sh

MODULES=( "app" "core" "graphql" "scheduler" "services" "ux" )

#
# List and update deps.
#

UPDATE=0
for i in "$@"
do
case $i in
  --update)
  UPDATE=1
  ;;
esac
done

for mod in "${MODULES[@]}"; do
  echo "\n### [$mod] ###"
  pushd sub/$mod

  grunt npm-outdated

  if [ $UPDATE -eq 1 ]; then
    echo "Updating $@"
    grunt npm-update
  fi

  npm prune

  popd
done
