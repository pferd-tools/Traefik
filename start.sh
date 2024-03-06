#!/bin/bash

GREEN='\033[42m'
NC='\033[0m'

NETWORK_NAME=${NETWORK_NAME:-"traefik"}
PROJECT_NAME=${PROJECT_NAME:-$NETWORK_NAME}

logger() {
  local text="$1"
    local width=$(tput cols)
    local padding=$(( (width - ${#text}) /  2  ))
    local separator="="
    local bg_color=$(tput setab   2) # Green background
    local reset_color=$(tput sgr0) # Reset color

    printf '%*s\n' "$width" | tr ' ' $separator
    printf '%*s\n' "$padding" "${bg_color}${text}${reset_color}"
    printf '%*s\n' "$width" | tr ' ' $separator
}

if [ "$1" = "down" ] && [ -f "generated-compose-traefik.yml" ]; then
  docker-compose -f generated-compose-traefik.yml -p "$PROJECT_NAME" down
else
  if [ "$1" = "down" ]; then
    echo "Generated docker compose file not found. Starting normally"
    shift 2
  fi

  logger "Starting generation"
  docker-compose -f compose-generator.yml -p "$PROJECT_NAME" up --build
  docker-compose -f compose-generator.yml -p "$PROJECT_NAME" down

  if [ "$1" != "generate" ]; then
      if [ "$1" = "--force" ]; then
          TRAEFIK_STATUS=""
          shift 1
      else
          TRAEFIK_STATUS=$(docker ps --format '{{.Names}}' | grep "traefik")
      fi

      if [[ -n "$TRAEFIK_STATUS" ]]; then
         logger "Nothing to do. Traefik already running. Use with '--force' to rebuild"
      else
        logger "Setting up"
          while (( "$#" )); do
            case "$1" in
                -n|--network)
                  NETWORK_NAME="$2"
                  shift   2
                  ;;
                -p|--project)
                  PROJECT_NAME="$2"
                  shift   2
                  ;;
                *) # If unknown option, just shift it out
                  shift
                  ;;
              esac
          done

          if ! docker network inspect "$NETWORK_NAME" >> /dev/null; then
              logger "Creating non-existent network $NETWORK_NAME"
              docker network create "$NETWORK_NAME"
          fi

          logger "Generating compose file"
          sed "s/\${NETWORK_NAME}/$NETWORK_NAME/g" compose-traefik.template.yml > generated-compose-traefik.yml

          logger "Running compose file"
          docker-compose -f generated-compose-traefik.yml -p "$PROJECT_NAME" up -d --build
      fi
      else
        logger "generation done"
    fi
fi